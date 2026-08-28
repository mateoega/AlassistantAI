import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../lib/http-error.js';
import { supabaseService } from '../lib/supabase.js';
import { getVehicleTypeById } from './catalog.js';
import { getListing } from './listings.js';
import { estimarPrecio, type Estimacion } from './price-estimate.js';
import { analyzeVehicle, AnalysisError } from '../ia/analysis.js';
import { describePriceEstimate } from '../ia/price-context.js';
import { isAiConfigured } from '../ia/client.js';
import type { AnalysisRecord, AnalysisStatus, VehicleAnalysis } from '../ia/types.js';

/**
 * El análisis de una publicación: cuándo se corre, cuándo se reusa el guardado
 * y cuándo se considera viejo.
 *
 * DOS CLIENTES DE SUPABASE, A PROPÓSITO
 *
 *   Se LEE con el cliente del usuario, así que las reglas de acceso deciden:
 *   quien no puede ver un aviso tampoco puede analizarlo ni leer su análisis.
 *
 *   Se ESCRIBE con el cliente de servicio, porque la tabla `listing_analyses`
 *   no tiene ninguna política de escritura: nadie puede inventarse el análisis
 *   de un aviso desde el navegador. Ver la migración 008.
 */

/**
 * Cuánto se espera a un análisis que quedó "corriendo" antes de darlo por
 * caído. Cubre el caso de que el backend se reinicie a mitad de camino: sin
 * esto, esa publicación quedaría trabada para siempre.
 */
const RUNNING_TIMEOUT_MS = 3 * 60 * 1000;

interface AnalysisRow {
  status: AnalysisStatus;
  input_fingerprint: string;
  result: VehicleAnalysis | null;
  error_message: string | null;
  model: string | null;
  updated_at: string;
}

/** El análisis guardado de una publicación, si hay alguno. */
export async function getAnalysis(
  supabase: SupabaseClient,
  listingId: string,
): Promise<AnalysisRecord | null> {
  // Se pide la publicación aunque no se use del todo: es lo que hace cumplir
  // el permiso (si no la puede ver, esto tira 404) y de paso da la huella
  // actual para saber si el análisis quedó viejo.
  const listing = await getListing(supabase, listingId);
  const row = await readRow(supabase, listingId);

  if (!row) {
    return null;
  }

  // La huella actual se calcula con la estimación de AHORA. Sin esto, un
  // análisis guardado se vería siempre como viejo: la huella que se guardó
  // incluye la posición del precio frente al mercado.
  const estimacion = await estimarPrecio(supabase, listingId);

  return toRecord(row, fingerprintOf(listing, estimacion));
}

/**
 * Dispara el análisis y responde enseguida, sin esperar a que termine.
 *
 * POR QUÉ NO SE ESPERA
 *
 *   Analizar ocho fotos tarda entre diez y treinta segundos. Dejar el pedido
 *   HTTP colgado todo ese tiempo es frágil (se corta solo en el camino) y, si
 *   dos compradores aprietan el botón a la vez, se pagan dos análisis del
 *   mismo vehículo. Dejando la fila en "corriendo", el segundo ve que ya está
 *   en curso y espera el mismo resultado.
 *
 * QUIÉN TOMA EL TRABAJO LO DECIDE LA BASE, Y NO ESTE ARCHIVO
 *
 *   Hasta el 2026-08-27 acá se preguntaba si había uno corriendo y, si no,
 *   se escribía la fila. Son dos viajes con un hueco en el medio, y en ese
 *   hueco entran los dos pedidos simultáneos: los dos leen "no hay nada", los
 *   dos escriben, y los dos llaman a Gemini. Se reprodujo. La fila única
 *   evitaba el registro duplicado, no el gasto duplicado.
 *
 *   Ahora se pide el trabajo con `claim_listing_analysis`, que toma y anuncia
 *   en una sola operación indivisible. Quien lo toma se lleva un identificador
 *   de intento y es el único que arranca el modelo; quien llega segundo se
 *   lleva un `null` y acompaña el análisis que ya está corriendo. Ver la
 *   migración 016.
 */
export async function startAnalysis(
  supabase: SupabaseClient,
  listingId: string,
): Promise<AnalysisRecord> {
  if (!isAiConfigured()) {
    throw HttpError.unavailable('El asistente de IA todavía no está configurado en este servidor.', [
      'Falta completar GEMINI_API_KEY en el archivo .env de la raíz del proyecto.',
    ]);
  }

  const listing = await getListing(supabase, listingId);

  if (listing.photos.length === 0) {
    throw HttpError.badRequest('Esta publicación no tiene fotos, así que no hay nada para analizar.');
  }

  // La estimación se calcula ACÁ y no adentro del trabajo de fondo, porque acá
  // todavía tenemos el cliente del usuario y sus permisos. Es lo que le permite
  // al análisis hablar del precio.
  const estimacion = await estimarPrecio(supabase, listingId);

  const fingerprint = fingerprintOf(listing, estimacion);
  const service = supabaseService();

  const { data: attemptId, error } = await service.rpc('claim_listing_analysis', {
    p_listing_id: listingId,
    p_fingerprint: fingerprint,
    // La base y este archivo tienen que estar de acuerdo en cuánto se espera a
    // un análisis colgado, así que el número viaja desde acá y no se escribe
    // dos veces.
    p_timeout_seconds: Math.round(RUNNING_TIMEOUT_MS / 1000),
  });

  if (error) {
    throw new Error(`No se pudo registrar el análisis: ${error.message}`);
  }

  // No lo tomamos: hay otro corriendo y sin vencer. Se devuelve ESE, y no se
  // llama al modelo. Es el caso de los dos toques seguidos al botón.
  if (!attemptId) {
    const enCurso = await readRow(supabase, listingId);

    return enCurso
      ? toRecord(enCurso, fingerprint)
      : {
          // Que no esté la fila un instante después de que alguien la tomara
          // no debería pasar; si pasa, lo honesto es decir que está corriendo
          // y dejar que el navegador vuelva a preguntar.
          status: 'running',
          result: null,
          error_message: null,
          model: null,
          updated_at: new Date().toISOString(),
          is_stale: false,
        };
  }

  // Sigue en segundo plano. El `void` y el `catch` son deliberados: si esto
  // fallara sin capturar, tumbaría el proceso entero de Node.
  void runInBackground(listingId, listing, fingerprint, estimacion, attemptId as string);

  return {
    status: 'running',
    result: null,
    error_message: null,
    model: null,
    updated_at: new Date().toISOString(),
    is_stale: false,
  };
}

type PresentedListing = Awaited<ReturnType<typeof getListing>>;

async function runInBackground(
  listingId: string,
  listing: PresentedListing,
  fingerprint: string,
  estimacion: Estimacion,
  attemptId: string,
): Promise<void> {
  try {
    if (!listing.vehicle_type) {
      throw new AnalysisError('Esta publicación no tiene un tipo de vehículo válido.');
    }

    // El tipo COMPLETO, con los campos que declara el catálogo. Es lo que hace
    // que el prompt hable de motos en una moto y de camiones en un camión sin
    // tener ninguna lista de tipos escrita en el código.
    const vehicleType = await getVehicleTypeById(listing.vehicle_type.id);

    const { analysis, model } = await analyzeVehicle(
      {
        brand: listing.brand,
        model: listing.model,
        year: listing.year,
        price: listing.price,
        currency: listing.currency,
        kilometers: listing.kilometers,
        city: listing.city,
        province: listing.province,
        description: listing.description,
        specs: listing.specs,
        photoCount: listing.photos.length,
        priceEstimate: describePriceEstimate(estimacion),
      },
      vehicleType,
      listing.photos.map((photo) => photo.storage_path),
    );

    await saveOutcome(listingId, attemptId, {
      status: 'done',
      input_fingerprint: fingerprint,
      result: analysis,
      error_message: null,
      model,
    });
  } catch (error) {
    console.error(`[ia] falló el análisis de la publicación ${listingId}:`, error);

    await saveOutcome(listingId, attemptId, {
      status: 'failed',
      input_fingerprint: fingerprint,
      result: null,
      error_message:
        error instanceof AnalysisError
          ? error.message
          : 'No se pudo completar el análisis. Probá de nuevo en unos minutos.',
      model: null,
    });
  }
}

/**
 * Guarda lo que dio el análisis, PERO SOLO SI SIGUE SIENDO EL VIGENTE.
 *
 * El caso que cubre `attemptId`: un análisis se vence a los tres minutos y
 * alguien pide otro; el primero, que estaba lento pero vivo, vuelve después y
 * escribiría encima del que está corriendo — dejando en "listo" un resultado
 * viejo mientras la pantalla espera el nuevo. La comparación la hace la base,
 * en la misma sentencia que escribe. Ver la migración 016.
 */
async function saveOutcome(
  listingId: string,
  attemptId: string,
  row: Omit<AnalysisRow, 'updated_at'>,
): Promise<void> {
  try {
    const { data: guardado, error } = await supabaseService().rpc('finish_listing_analysis', {
      p_listing_id: listingId,
      p_attempt_id: attemptId,
      p_status: row.status,
      p_fingerprint: row.input_fingerprint,
      p_result: row.result,
      p_error_message: row.error_message,
      p_model: row.model,
    });

    if (error) {
      console.error(`[ia] no se pudo guardar el análisis de ${listingId}:`, error.message);
      return;
    }

    if (guardado === false) {
      // No es un error: es el trabajo que llegó tarde, encontrando que ya hay
      // otro intento en curso. Se anota porque, si aparece seguido, quiere
      // decir que el vencimiento de tres minutos quedó corto.
      console.warn(
        `[ia] el análisis de ${listingId} terminó fuera de tiempo y no se guardó: ya hay otro intento.`,
      );
    }
  } catch (error) {
    // Si ni siquiera se puede guardar el fracaso, la fila queda en "corriendo"
    // y el vencimiento de tres minutos la destraba.
    console.error(`[ia] no se pudo guardar el análisis de ${listingId}:`, error);
  }
}

async function readRow(
  supabase: SupabaseClient,
  listingId: string,
): Promise<AnalysisRow | null> {
  const { data, error } = await supabase
    .from('listing_analyses')
    .select('status, input_fingerprint, result, error_message, model, updated_at')
    .eq('listing_id', listingId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer el análisis: ${error.message}`);
  }

  return (data as AnalysisRow | null) ?? null;
}

function toRecord(row: AnalysisRow, currentFingerprint: string): AnalysisRecord {
  // Un análisis que quedó colgado se presenta como fallido, no como eterno.
  if (row.status === 'running' && hasTimedOut(row.updated_at)) {
    return {
      status: 'failed',
      result: null,
      error_message: 'El análisis quedó a medias. Probá de nuevo.',
      model: row.model,
      updated_at: row.updated_at,
      is_stale: false,
    };
  }

  return {
    status: row.status,
    result: row.result,
    error_message: row.error_message,
    model: row.model,
    updated_at: row.updated_at,
    is_stale: row.status === 'done' && row.input_fingerprint !== currentFingerprint,
  };
}

function hasTimedOut(updatedAt: string): boolean {
  return Date.now() - new Date(updatedAt).getTime() > RUNNING_TIMEOUT_MS;
}

/**
 * La huella de lo que se analizó.
 *
 * Incluye las fotos EN ORDEN y también los datos declarados. No alcanza con
 * las fotos: si el vendedor corrige el kilometraje, un análisis que decía "el
 * desgaste no cierra con los km declarados" quedó tan viejo como si hubiera
 * cambiado una imagen. El orden importa porque la foto principal es la que más
 * pesa en lo que el modelo mira primero.
 */
function fingerprintOf(listing: PresentedListing, estimacion?: Estimacion): string {
  const material = JSON.stringify({
    // La estimación entra en GRUESO, no con su valor exacto.
    //
    // El análisis ahora puede hablar del precio, así que un análisis hecho
    // cuando el aviso estaba "20% por encima" quedó viejo si hoy está dentro
    // del rango. Pero si entrara el número exacto, cada publicación nueva de
    // ese modelo invalidaría todos los análisis del modelo — y cada análisis
    // cuesta plata. Guardando solo la posición y la decena de desvío, la huella
    // cambia cuando cambia lo que el análisis dijo, no cuando se mueve un peso.
    precio_vs_mercado: estimacion?.disponible
      ? `${estimacion.posicion}:${Math.round(estimacion.desvio_porcentual / 10) * 10}`
      : 'sin_estimacion',
    photos: listing.photos.map((photo) => photo.storage_path),
    vehicle_type_id: listing.vehicle_type?.id ?? null,
    brand: listing.brand,
    model: listing.model,
    year: listing.year,
    price: listing.price,
    currency: listing.currency,
    kilometers: listing.kilometers,
    city: listing.city,
    description: listing.description,
    // Las claves se ordenan para que la misma ficha dé siempre la misma huella,
    // sin depender de en qué orden vino el objeto desde la base.
    specs: Object.keys(listing.specs)
      .sort()
      .map((key) => [key, listing.specs[key]]),
  });

  return createHash('sha256').update(material).digest('hex');
}

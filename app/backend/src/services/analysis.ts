import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../lib/http-error.js';
import { supabaseService } from '../lib/supabase.js';
import { getVehicleTypeById } from './catalog.js';
import { getListing } from './listings.js';
import { analyzeVehicle, AnalysisError } from '../ia/analysis.js';
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

  return toRecord(row, fingerprintOf(listing));
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

  const fingerprint = fingerprintOf(listing);
  const existing = await readRow(supabase, listingId);

  // Ya hay uno corriendo y todavía no se venció: se acompaña ese, no se
  // arranca otro.
  if (existing?.status === 'running' && !hasTimedOut(existing.updated_at)) {
    return toRecord(existing, fingerprint);
  }

  const service = supabaseService();

  const { error } = await service.from('listing_analyses').upsert(
    {
      listing_id: listingId,
      status: 'running',
      input_fingerprint: fingerprint,
      result: null,
      error_message: null,
      model: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'listing_id' },
  );

  if (error) {
    throw new Error(`No se pudo registrar el análisis: ${error.message}`);
  }

  // Sigue en segundo plano. El `void` y el `catch` son deliberados: si esto
  // fallara sin capturar, tumbaría el proceso entero de Node.
  void runInBackground(listingId, listing, fingerprint);

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
      },
      vehicleType,
      listing.photos.map((photo) => photo.storage_path),
    );

    await saveOutcome(listingId, {
      status: 'done',
      input_fingerprint: fingerprint,
      result: analysis,
      error_message: null,
      model,
    });
  } catch (error) {
    console.error(`[ia] falló el análisis de la publicación ${listingId}:`, error);

    await saveOutcome(listingId, {
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

async function saveOutcome(
  listingId: string,
  row: Omit<AnalysisRow, 'updated_at'>,
): Promise<void> {
  try {
    const { error } = await supabaseService()
      .from('listing_analyses')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('listing_id', listingId);

    if (error) {
      console.error(`[ia] no se pudo guardar el análisis de ${listingId}:`, error.message);
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
function fingerprintOf(listing: PresentedListing): string {
  const material = JSON.stringify({
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

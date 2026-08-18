import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../lib/http-error.js';
import { listProvinces, listVehicleTypes, getVehicleTypeById } from './catalog.js';
import { getListing } from './listings.js';
import { searchListings } from './listing-search.js';
import { getAnalysis } from './analysis.js';
import { describeVehicle } from '../ia/vehicle-context.js';
import { replyToChat, type ChatMessage, type ChatReply } from '../ia/chat.js';
import { isAiConfigured } from '../ia/client.js';
import type { VehicleAnalysis } from '../ia/types.js';

/**
 * El asistente conversacional: junta el contexto, llama al modelo y le presta
 * la búsqueda como herramienta.
 *
 * La conversación llega entera desde el navegador en cada pedido. No se guarda
 * nada: la charla vive mientras dura la visita.
 */

/**
 * Cuántos mensajes del historial se le mandan al modelo.
 *
 * Una conversación larga se paga entera en cada turno, así que se recorta a
 * los últimos intercambios, que es lo que el asistente necesita para no perder
 * el hilo.
 */
const MAX_HISTORY = 20;

const MAX_MESSAGE_LENGTH = 1500;

export async function chat(
  supabase: SupabaseClient,
  rawMessages: unknown,
  listingId: string | null,
): Promise<ChatReply> {
  if (!isAiConfigured()) {
    throw HttpError.unavailable('El asistente todavía no está configurado en este servidor.', [
      'Falta completar GEMINI_API_KEY en el archivo .env de la raíz del proyecto.',
    ]);
  }

  const messages = parseMessages(rawMessages);

  if (messages.length === 0) {
    throw HttpError.badRequest('Escribile algo al asistente para que pueda responderte.');
  }

  const [vehicleTypes, provinces, listingContext] = await Promise.all([
    listVehicleTypes(),
    listProvinces(),
    describeCurrentListing(supabase, listingId),
  ]);

  return replyToChat(
    messages,
    {
      vehicleTypes,
      provinces,
      currentListing: listingContext.listing,
      currentAnalysis: listingContext.analysis,
    },
    // La búsqueda corre con el cliente del usuario: las reglas de acceso de la
    // base siguen valiendo aunque el pedido venga de un modelo.
    (filters) => searchListings(supabase, filters),
  );
}

/**
 * El aviso que la persona tiene abierto, descrito con las mismas palabras que
 * usa el análisis de fotos. Si no se puede leer (no existe, o es un borrador
 * ajeno), el asistente simplemente responde sin ese contexto en vez de fallar.
 */
async function describeCurrentListing(
  supabase: SupabaseClient,
  listingId: string | null,
): Promise<{ listing: string | null; analysis: string | null }> {
  if (!listingId) {
    return { listing: null, analysis: null };
  }

  try {
    const listing = await getListing(supabase, listingId);

    if (!listing.vehicle_type) {
      return { listing: null, analysis: null };
    }

    const vehicleType = await getVehicleTypeById(listing.vehicle_type.id);

    const described = describeVehicle(
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
    );

    const analysis = await getAnalysis(supabase, listingId);

    return {
      listing: described,
      analysis:
        analysis?.status === 'done' && analysis.result && !analysis.is_stale
          ? describeAnalysis(analysis.result)
          : null,
    };
  } catch (error) {
    console.warn(`[ia] no se pudo armar el contexto de la publicación ${listingId}:`, error);
    return { listing: null, analysis: null };
  }
}

/** El análisis guardado, pasado a texto para que el asistente pueda citarlo. */
function describeAnalysis(analysis: VehicleAnalysis): string {
  const lines = [`Resumen: ${analysis.resumen}`];

  if (analysis.estado_observado.length > 0) {
    lines.push(
      '',
      'Lo que se ve en las fotos:',
      ...analysis.estado_observado.map((item) => `  - ${item.aspecto}: ${item.observacion}`),
    );
  }

  if (analysis.inconsistencias.length > 0) {
    lines.push(
      '',
      'Cosas que no cierran:',
      ...analysis.inconsistencias.map(
        (item) => `  - ${item.que} (${item.por_que_importa}) [confianza: ${item.confianza}]`,
      ),
    );
  }

  if (analysis.falta_ver.length > 0) {
    lines.push('', 'Lo que las fotos no muestran:', ...analysis.falta_ver.map((i) => `  - ${i}`));
  }

  if (analysis.preguntas_al_vendedor.length > 0) {
    lines.push(
      '',
      'Preguntas sugeridas al vendedor:',
      ...analysis.preguntas_al_vendedor.map((i) => `  - ${i}`),
    );
  }

  return lines.join('\n');
}

function parseMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) {
    throw HttpError.badRequest('La conversación llegó en un formato inesperado.');
  }

  const messages = raw
    .map((item) => {
      const entry = item as Record<string, unknown> | null;
      const role = entry?.role === 'model' ? 'model' : 'user';
      const text = typeof entry?.text === 'string' ? entry.text.trim() : '';

      return { role, text: text.slice(0, MAX_MESSAGE_LENGTH) } as ChatMessage;
    })
    .filter((message) => message.text);

  // Se conserva la cola, no la cabeza: lo último que se dijo es lo que importa
  // para seguir la conversación.
  return messages.slice(-MAX_HISTORY);
}

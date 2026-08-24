import type { SupabaseClient } from '@supabase/supabase-js';
import { photoPublicUrl } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import { getModerationState, type ModerationState } from './moderation.js';

/**
 * La mensajería interna: la conversación entre quien pregunta por un vehículo
 * y quien lo publicó.
 *
 * SEGURIDAD: todo pasa por el cliente del usuario que hizo el pedido, así que
 * las reglas de acceso de la base se aplican siempre. Una conversación ajena
 * no aparece aunque se acierte el identificador, y un mensaje no se puede
 * mandar a nombre de otro. Este archivo, además, filtra y comprueba — pero si
 * se olvidara de hacerlo, la base seguiría diciendo que no.
 *
 * NO SE PUEDE SABER CUÁNTOS CONSULTARON POR UN AVISO. No hay ruta ni consulta
 * que lo devuelva, igual que con los favoritos del Sprint 4: un "12 personas
 * preguntaron por este vehículo" sirve para apurar al que duda.
 */

/** Lo que se muestra de una conversación en la lista. */
export interface ConversationSummary {
  id: string;
  /** `null` si el aviso se borró. La conversación sigue existiendo igual. */
  listing_id: string | null;
  /** Copiado el día que empezó la charla, así sobrevive al aviso. */
  listing_title: string;
  /** Qué es quien consulta en esta conversación. */
  role: 'buyer' | 'seller';
  counterpart: { id: string; display_name: string | null };
  last_message: { body: string; mine: boolean } | null;
  last_message_at: string;
  unread_count: number;
  /**
   * El aviso, si todavía se puede ver. Queda en `null` cuando el vendedor lo
   * pausó o lo borró — desde afuera no se distingue, y la pantalla lo dice de
   * dos maneras distintas según haya o no `listing_id`.
   */
  listing: ConversationListing | null;
}

interface ConversationListing {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number | null;
  currency: string;
  status: string;
  photo_url: string | null;
}

export interface ConversationThread extends ConversationSummary {
  messages: ThreadMessage[];
  /**
   * Si hay un bloqueo de por medio y si esta conversación ya fue denunciada.
   *
   * Viaja con el hilo y no con la lista: la bandeja de entrada no necesita
   * saberlo —una conversación bloqueada se sigue leyendo igual— y preguntarlo
   * por cada fila de la lista sería un puñado de consultas para dibujar algo
   * que no se muestra.
   */
  moderation: ModerationState;
}

interface ThreadMessage {
  id: string;
  body: string;
  /** Si lo escribió quien está mirando. La pantalla lo usa para el lado y el color. */
  mine: boolean;
  created_at: string;
}

/** El largo máximo de un mensaje. El mismo número está en la migración 012. */
const MAX_BODY = 2000;

/**
 * Las columnas de la vista que resume cada conversación. La vista existe para
 * no tener que traerse todos los mensajes de todas las conversaciones solo
 * para saber cuál fue el último de cada una. Ver la migración 012.
 */
const OVERVIEW_SELECT = `
  id, listing_id, buyer_id, seller_id, listing_title,
  created_at, last_message_at, last_message_body, last_message_sender_id, unread_count
`;

interface OverviewRow {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  listing_title: string;
  created_at: string;
  last_message_at: string;
  last_message_body: string | null;
  last_message_sender_id: string | null;
  unread_count: number;
}

/**
 * Abre la conversación de un vehículo, o devuelve la que ya existía.
 *
 * Es idempotente a propósito: quien vuelve a un aviso que ya consultó espera
 * seguir la charla anterior, no empezar de cero. La base lo garantiza con la
 * clave única (aviso, comprador); acá se pregunta antes solo para no gastar un
 * error en algo previsible.
 */
export async function openConversation(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
): Promise<string> {
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, seller_id, brand, model, year, status')
    .eq('id', listingId)
    .maybeSingle();

  if (listingError) {
    throw new Error(`No se pudo leer la publicación: ${listingError.message}`);
  }

  // Si el usuario no tiene permiso de verla, la base no la devuelve. Desde
  // afuera, no existe.
  if (!listing) {
    throw HttpError.notFound('Esa publicación no existe o no tenés permiso para verla.');
  }

  const row = listing as {
    id: string;
    seller_id: string;
    brand: string;
    model: string;
    year: number;
    status: string;
  };

  if (row.seller_id === userId) {
    throw HttpError.badRequest('Es tu propia publicación: no podés escribirte a vos mismo.');
  }

  // Un aviso pausado o ya vendido no se consulta. Es la misma regla que la de
  // los botones de contacto del Sprint 1.6: escribirle a alguien por un
  // vehículo que ya no está en venta le hace perder el tiempo a los dos.
  if (row.status !== 'published') {
    throw HttpError.badRequest('Este vehículo ya no está disponible.');
  }

  const existing = await findConversation(supabase, listingId, userId);

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      listing_id: listingId,
      buyer_id: userId,
      seller_id: row.seller_id,
      listing_title: `${row.brand} ${row.model} ${row.year}`,
    })
    .select('id')
    .maybeSingle();

  // Dos pedidos casi simultáneos —dos clicks seguidos— pueden chocar contra la
  // clave única. No es un error para quien apretó: la conversación existe, que
  // es lo que pidió.
  if (error?.code === '23505') {
    const conversationId = await findConversation(supabase, listingId, userId);

    if (conversationId) {
      return conversationId;
    }
  }

  if (error || !data) {
    throw new Error(`No se pudo abrir la conversación: ${error?.message ?? 'sin datos'}`);
  }

  return (data as { id: string }).id;
}

async function findConversation(
  supabase: SupabaseClient,
  listingId: string,
  buyerId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo buscar la conversación: ${error.message}`);
  }

  return data ? (data as { id: string }).id : null;
}

/**
 * Quién está del otro lado de una conversación.
 *
 * Es lo único que hace falta para bloquear o desbloquear, y por eso no se
 * pide el hilo entero: traer todos los mensajes para leer un identificador
 * sería pedir la conversación completa para no mirarla.
 *
 * Si la conversación no es de este usuario, la base no la devuelve. Desde
 * afuera, no existe.
 */
export async function getCounterpartId(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('conversations')
    .select('buyer_id, seller_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer la conversación: ${error.message}`);
  }

  if (!data) {
    throw HttpError.notFound('Esa conversación no existe o no es tuya.');
  }

  const row = data as { buyer_id: string; seller_id: string };

  return row.buyer_id === userId ? row.seller_id : row.buyer_id;
}

/** Las conversaciones del usuario, las últimas primero. */
export async function listConversations(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from('conversation_overview')
    .select(OVERVIEW_SELECT)
    .order('last_message_at', { ascending: false });

  if (error) {
    throw new Error(`No se pudieron leer las conversaciones: ${error.message}`);
  }

  const rows = (data ?? []) as OverviewRow[];

  return presentConversations(supabase, userId, rows);
}

/**
 * Una conversación con todos sus mensajes.
 *
 * No pagina: una charla por un vehículo son unos pocos mensajes, y cortarla
 * obligaría a resolver "traer los anteriores" en la pantalla para un caso que
 * hoy no existe. Si algún día pasa, el índice por (conversación, fecha) ya
 * está puesto.
 */
export async function getConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<ConversationThread> {
  const { data, error } = await supabase
    .from('conversation_overview')
    .select(OVERVIEW_SELECT)
    .eq('id', conversationId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer la conversación: ${error.message}`);
  }

  if (!data) {
    throw HttpError.notFound('Esa conversación no existe o no es tuya.');
  }

  const row = data as OverviewRow;
  const [summary] = await presentConversations(supabase, userId, [row]);

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, body, sender_id, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    throw new Error(`No se pudieron leer los mensajes: ${messagesError.message}`);
  }

  const moderation = await getModerationState(
    supabase,
    userId,
    conversationId,
    summary!.counterpart.id,
  );

  return {
    ...summary!,
    moderation,
    messages: ((messages ?? []) as { id: string; body: string; sender_id: string; created_at: string }[]).map(
      (message) => ({
        id: message.id,
        body: message.body,
        mine: message.sender_id === userId,
        created_at: message.created_at,
      }),
    ),
  };
}

/**
 * Manda un mensaje.
 *
 * Escribir cuenta como haber leído: nadie contesta sin haber mirado lo que le
 * escribieron, y dejar la conversación marcada como no leída después de
 * responder sería un globito que no se apaga nunca.
 */
export async function sendMessage(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  rawBody: unknown,
): Promise<ThreadMessage> {
  const body = parseBody(rawBody);

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: userId, body })
    .select('id, body, sender_id, created_at')
    .maybeSingle();

  // 42501 es "la base rechazó la escritura por sus reglas de acceso". Desde el
  // Sprint 6 hay dos motivos posibles: la conversación no es de este usuario, o
  // hay un bloqueo de por medio. Distinguirlos importa — un "no existe" sobre
  // una conversación que está en pantalla es un error incomprensible.
  if (error?.code === '42501') {
    throw (await isBlocked(supabase, userId, conversationId))
      ? HttpError.badRequest('No se puede escribir en esta conversación.')
      : HttpError.notFound('Esa conversación no existe o no es tuya.');
  }

  if (error) {
    throw new Error(`No se pudo mandar el mensaje: ${error.message}`);
  }

  // Sin fila devuelta, la base no escribió nada: la conversación no existe.
  if (!data) {
    throw HttpError.notFound('Esa conversación no existe o no es tuya.');
  }

  await markRead(supabase, userId, conversationId);

  const message = data as { id: string; body: string; sender_id: string; created_at: string };

  return {
    id: message.id,
    body: message.body,
    mine: message.sender_id === userId,
    created_at: message.created_at,
  };
}

/**
 * Si el rechazo vino de un bloqueo.
 *
 * NO DICE QUIÉN BLOQUEÓ A QUIÉN, ni acá ni en la pantalla. Quien bloqueó ya lo
 * sabe, y al otro enterarse no le sirve para nada bueno.
 */
async function isBlocked(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const counterpartId = await getCounterpartId(supabase, userId, conversationId);
  const state = await getModerationState(supabase, userId, conversationId, counterpartId);

  return state.blocked;
}

function parseBody(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw HttpError.badRequest('El mensaje está vacío.', ['Escribí algo antes de enviar.']);
  }

  const body = raw.trim();

  if (body.length > MAX_BODY) {
    throw HttpError.badRequest('El mensaje es demasiado largo.', [
      `No puede superar los ${MAX_BODY} caracteres, y tiene ${body.length}.`,
    ]);
  }

  return body;
}

/** Deja marcado hasta cuándo leyó este usuario esta conversación. */
export async function markRead(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<void> {
  const { error } = await supabase
    .from('conversation_reads')
    .upsert(
      { conversation_id: conversationId, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: 'conversation_id,user_id' },
    );

  // 42501 es "la base rechazó la escritura por sus reglas de acceso": la
  // conversación no existe o no es de este usuario. Para quien preguntó son la
  // misma cosa, y ninguna de las dos es un error del servidor.
  if (error?.code === '42501') {
    throw HttpError.notFound('Esa conversación no existe o no es tuya.');
  }

  if (error) {
    throw new Error(`No se pudo marcar la conversación como leída: ${error.message}`);
  }
}

/**
 * Cuántos mensajes sin leer tiene el usuario en total. Es lo único que
 * necesita el globito de la navegación, que pregunta cada tanto desde todas
 * las pantallas: por eso devuelve un número y no la lista entera.
 */
export async function countUnread(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.from('conversation_overview').select('unread_count');

  if (error) {
    throw new Error(`No se pudieron contar los mensajes sin leer: ${error.message}`);
  }

  return ((data ?? []) as { unread_count: number }[]).reduce(
    (total, row) => total + Number(row.unread_count ?? 0),
    0,
  );
}

/**
 * Completa las conversaciones con lo que no está en la vista: quién es el
 * otro y qué vehículo era.
 *
 * Son dos consultas más para toda la lista, no dos por conversación. Es la
 * misma razón por la que los favoritos se piden una sola vez para toda la
 * aplicación en vez de una por tarjeta.
 */
async function presentConversations(
  supabase: SupabaseClient,
  userId: string,
  rows: OverviewRow[],
): Promise<ConversationSummary[]> {
  if (rows.length === 0) {
    return [];
  }

  const counterpartIds = rows.map((row) => (row.buyer_id === userId ? row.seller_id : row.buyer_id));
  const listingIds = rows.map((row) => row.listing_id).filter((id): id is string => id !== null);

  const [names, listings] = await Promise.all([
    fetchNames(supabase, counterpartIds),
    fetchListings(supabase, listingIds),
  ]);

  return rows.map((row) => {
    const iAmBuyer = row.buyer_id === userId;
    const counterpartId = iAmBuyer ? row.seller_id : row.buyer_id;

    return {
      id: row.id,
      listing_id: row.listing_id,
      listing_title: row.listing_title,
      role: iAmBuyer ? 'buyer' : 'seller',
      counterpart: { id: counterpartId, display_name: names.get(counterpartId) ?? null },
      last_message: row.last_message_body
        ? { body: row.last_message_body, mine: row.last_message_sender_id === userId }
        : null,
      last_message_at: row.last_message_at,
      unread_count: Number(row.unread_count ?? 0),
      listing: (row.listing_id && listings.get(row.listing_id)) || null,
    };
  });
}

async function fetchNames(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, string | null>> {
  const unique = [...new Set(ids)];

  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', unique);

  if (error) {
    throw new Error(`No se pudieron leer los nombres: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as { id: string; display_name: string | null }[]).map((profile) => [
      profile.id,
      profile.display_name,
    ]),
  );
}

/**
 * Los avisos de los que se está hablando, para la miniatura y el enlace.
 *
 * Los que el usuario ya no puede ver —pausados por el vendedor— simplemente no
 * vuelven, y la conversación queda con el vehículo en `null`. No se usa la
 * clave de servicio para forzarlos: si el vendedor sacó el aviso de circulación,
 * la plataforma no tiene por qué seguir mostrándoselo a nadie.
 */
async function fetchListings(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, ConversationListing>> {
  const unique = [...new Set(ids)];

  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('listings')
    .select(
      'id, brand, model, year, price, currency, status, photos:listing_photos ( storage_path, sort_order )',
    )
    .in('id', unique);

  if (error) {
    throw new Error(`No se pudieron leer las publicaciones: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as (Omit<ConversationListing, 'photo_url'> & {
    photos: { storage_path: string; sort_order: number }[];
  })[];

  return new Map(
    rows.map((row) => {
      const cover = [...(row.photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];

      return [
        row.id,
        {
          id: row.id,
          brand: row.brand,
          model: row.model,
          year: row.year,
          price: row.price,
          currency: row.currency,
          status: row.status,
          photo_url: cover ? photoPublicUrl(cover.storage_path) : null,
        },
      ];
    }),
  );
}

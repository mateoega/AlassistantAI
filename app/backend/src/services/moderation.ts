import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from '../lib/http-error.js';

/**
 * Bloquear y denunciar.
 *
 * Son las dos cosas que le faltaban a la mensajería del Sprint 5 para poder
 * abrirla a gente que no conocemos. Hacen cosas distintas: bloquear corta la
 * conversación en el acto y no lo decide nadie más que quien bloquea; denunciar
 * deja constancia para que alguien la mire. La pantalla las ofrece juntas
 * porque casi siempre se quieren las dos, pero ninguna depende de la otra.
 *
 * SEGURIDAD: todo pasa por el cliente del usuario. Las reglas de acceso de la
 * base ya impiden bloquear a nombre de otro, denunciar una conversación ajena y
 * —lo más importante— mandar un mensaje donde hay un bloqueo de por medio. Este
 * archivo comprueba antes para poder dar mensajes claros; si se olvidara de
 * hacerlo, la base seguiría diciendo que no. Ver la migración 013.
 */

/**
 * Los motivos que ofrece la pantalla.
 *
 * Viven acá y no en el frontend porque son parte de lo que la API acepta, y no
 * un adorno de la interfaz. La base los repite en un `check` como red de abajo
 * (migración 013): si acá se agrega uno, hay que agregarlo también allá.
 *
 * Son pocos y anchos a propósito. Una lista larga de motivos obliga a quien
 * está incómodo a clasificar lo que le pasó antes de poder pedir ayuda.
 */
export const REPORT_REASONS = [
  { value: 'estafa', label: 'Parece una estafa' },
  { value: 'acoso', label: 'Me trata mal o me acosa' },
  { value: 'spam', label: 'Manda publicidad o mensajes masivos' },
  { value: 'otro', label: 'Otra cosa' },
] as const;

type ReportReason = (typeof REPORT_REASONS)[number]['value'];

const MAX_DETAIL = 1000;

/** Con quién habla el usuario en esta conversación, y si hay un bloqueo. */
export interface ModerationState {
  /** Quien está del otro lado. */
  counterpart_id: string;
  /** Si fui yo el que bloqueó. Solo esto se puede deshacer desde la pantalla. */
  blocked_by_me: boolean;
  /**
   * Si hay un bloqueo, venga de donde venga. Cuando es `true` y `blocked_by_me`
   * es `false`, la pantalla dice que no se puede escribir **sin decir quién lo
   * decidió**: enterarse de que a uno lo bloquearon no ayuda a nadie y es la
   * clase de dato que empieza discusiones.
   */
  blocked: boolean;
  /** Si ya denuncié esta conversación. Se puede denunciar una sola vez. */
  reported_by_me: boolean;
}

/**
 * El estado de moderación de una conversación, para quien la está mirando.
 *
 * Son tres preguntas cortas contra la base y no una por mensaje: se piden una
 * sola vez al abrir el hilo.
 */
export async function getModerationState(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  counterpartId: string,
): Promise<ModerationState> {
  const [mine, either, reported] = await Promise.all([
    blockedByMe(supabase, userId, counterpartId),
    blockedWith(supabase, counterpartId),
    alreadyReported(supabase, userId, conversationId),
  ]);

  return {
    counterpart_id: counterpartId,
    blocked_by_me: mine,
    blocked: either,
    reported_by_me: reported,
  };
}

/** Bloquea a la otra persona de una conversación. */
export async function blockCounterpart(
  supabase: SupabaseClient,
  userId: string,
  counterpartId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_blocks')
    .upsert(
      { blocker_id: userId, blocked_id: counterpartId },
      { onConflict: 'blocker_id,blocked_id' },
    );

  if (error) {
    throw new Error(`No se pudo bloquear: ${error.message}`);
  }
}

/**
 * Deshace un bloqueo propio.
 *
 * Si la otra persona también bloqueó, esto no la desbloquea a ella: cada
 * bloqueo es de quien lo puso. Para quien deshace el suyo, la conversación
 * puede seguir sin poder escribirse, y la pantalla lo dice.
 */
export async function unblockCounterpart(
  supabase: SupabaseClient,
  userId: string,
  counterpartId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', userId)
    .eq('blocked_id', counterpartId);

  if (error) {
    throw new Error(`No se pudo deshacer el bloqueo: ${error.message}`);
  }
}

/**
 * Deja una denuncia sobre una conversación.
 *
 * NO BLOQUEA POR SU CUENTA. Denunciar y bloquear son decisiones distintas: hay
 * quien quiere avisar de una estafa y seguir la conversación para no perder el
 * rastro, y hay quien quiere cortar sin denunciar nada. La pantalla ofrece
 * bloquear en el mismo lugar; hacerlo automático sería decidir por la persona.
 */
export async function reportConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  rawReason: unknown,
  rawDetail: unknown,
): Promise<void> {
  const reason = parseReason(rawReason);
  const detail = parseDetail(rawDetail);

  const { error } = await supabase.from('conversation_reports').insert({
    conversation_id: conversationId,
    reporter_id: userId,
    reason,
    detail,
  });

  // 23505 es la clave única: ya había denunciado esta conversación. No es un
  // error de quien apretó — lo que quería (que quede constancia) ya pasó.
  if (error?.code === '23505') {
    throw HttpError.badRequest('Ya denunciaste esta conversación.', [
      'Queda registrada una sola vez. Si hay algo más para contar, escribinos.',
    ]);
  }

  // 42501 es "la base rechazó la escritura": la conversación no existe o no es
  // de este usuario. Desde afuera son la misma cosa.
  if (error?.code === '42501') {
    throw HttpError.notFound('Esa conversación no existe o no es tuya.');
  }

  if (error) {
    throw new Error(`No se pudo registrar la denuncia: ${error.message}`);
  }
}

function parseReason(raw: unknown): ReportReason {
  const found = REPORT_REASONS.find((option) => option.value === raw);

  if (!found) {
    throw HttpError.badRequest('Elegí un motivo para la denuncia.');
  }

  return found.value;
}

function parseDetail(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return null;
  }

  const detail = raw.trim();

  if (detail.length > MAX_DETAIL) {
    throw HttpError.badRequest('El detalle es demasiado largo.', [
      `No puede superar los ${MAX_DETAIL} caracteres, y tiene ${detail.length}.`,
    ]);
  }

  return detail;
}

async function blockedByMe(
  supabase: SupabaseClient,
  userId: string,
  counterpartId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', userId)
    .eq('blocked_id', counterpartId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudieron leer los bloqueos: ${error.message}`);
  }

  return data !== null;
}

/**
 * Si hay un bloqueo en cualquiera de las dos direcciones.
 *
 * Se pregunta con una función de la base y no con una consulta porque la fila
 * del bloqueo ajeno **no es visible** para quien pregunta, a propósito. Ver la
 * migración 013.
 */
async function blockedWith(supabase: SupabaseClient, counterpartId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('blocked_with', { other: counterpartId });

  if (error) {
    throw new Error(`No se pudo comprobar el bloqueo: ${error.message}`);
  }

  return data === true;
}

async function alreadyReported(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('conversation_reports')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('reporter_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudieron leer las denuncias: ${error.message}`);
  }

  return data !== null;
}

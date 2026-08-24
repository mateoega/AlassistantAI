import { Router } from 'express';
import { auth, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../lib/http-error.js';
import {
  countUnread,
  getConversation,
  getCounterpartId,
  listConversations,
  markRead,
  openConversation,
  sendMessage,
} from '../services/conversations.js';
import {
  REPORT_REASONS,
  blockCounterpart,
  reportConversation,
  unblockCounterpart,
} from '../services/moderation.js';

/**
 * La mensajería interna: comprador y vendedor hablando adentro de la
 * plataforma.
 *
 * Reemplaza el contacto por WhatsApp que el Sprint 1.6 había puesto como
 * provisorio. Nadie puede leer una conversación de la que no es parte, y no
 * hay ninguna ruta que diga cuántas personas preguntaron por un aviso.
 *
 * Acá viven también bloquear y denunciar (Sprint 6): son acciones sobre una
 * conversación, y es donde la persona las va a buscar.
 */
export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);

/** GET /api/conversations → la bandeja de entrada. */
conversationsRouter.get('/', async (req, res) => {
  const { userId, supabase } = auth(req);
  res.json({ conversations: await listConversations(supabase, userId) });
});

/**
 * GET /api/conversations/unread → cuántos mensajes sin leer hay en total.
 *
 * Va aparte de la lista porque lo pregunta el globito de la navegación desde
 * cualquier pantalla y cada tanto: traerse la bandeja entera para mostrar un
 * número sería pedir mil veces más de lo que se muestra.
 */
conversationsRouter.get('/unread', async (req, res) => {
  const { supabase } = auth(req);
  res.json({ count: await countUnread(supabase) });
});

/**
 * POST /api/conversations { listing_id } → abre la conversación de ese
 * vehículo, o devuelve la que ya existía.
 *
 * Devuelve siempre el identificador, sin distinguir si la acaba de crear:
 * quien apretó "Consultar al vendedor" quiere llegar a la charla, y que sea
 * nueva o vieja no le cambia nada.
 */
conversationsRouter.post('/', async (req, res) => {
  const { userId, supabase } = auth(req);
  const listingId = (req.body ?? {})['listing_id'];

  if (typeof listingId !== 'string' || listingId.trim() === '') {
    throw HttpError.badRequest('Falta indicar de qué publicación se trata.');
  }

  res.json({ id: await openConversation(supabase, userId, listingId.trim()) });
});

/**
 * Los motivos que se pueden elegir al denunciar.
 *
 * Los manda el servidor y no los escribe la pantalla, por lo mismo que el
 * formulario de publicar no tiene una lista de tipos de vehículo adentro: lo
 * que la API acepta lo decide la API.
 *
 * Va antes de las rutas con `:id` a propósito — si no, "report-reasons" se
 * leería como el identificador de una conversación.
 */
conversationsRouter.get('/report-reasons', (_req, res) => {
  res.json({ reasons: REPORT_REASONS });
});

/** GET /api/conversations/:id → la conversación con todos sus mensajes. */
conversationsRouter.get('/:id', async (req, res) => {
  const { userId, supabase } = auth(req);
  res.json({ conversation: await getConversation(supabase, userId, requireId(req.params.id)) });
});

/** POST /api/conversations/:id/messages { body } → escribir. */
conversationsRouter.post('/:id/messages', async (req, res) => {
  const { userId, supabase } = auth(req);
  const message = await sendMessage(
    supabase,
    userId,
    requireId(req.params.id),
    (req.body ?? {})['body'],
  );

  res.status(201).json({ message });
});

/**
 * POST /api/conversations/:id/read → marcar como leída.
 *
 * Es una acción explícita de la pantalla y no un efecto de haber pedido la
 * conversación: un pedido que además cambia el estado sorprende, y hace
 * imposible releer un hilo sin que se apague el globito.
 */
conversationsRouter.post('/:id/read', async (req, res) => {
  const { userId, supabase } = auth(req);
  await markRead(supabase, userId, requireId(req.params.id));
  res.status(204).end();
});

/**
 * POST /api/conversations/:id/block → bloquear a la otra persona.
 * DELETE /api/conversations/:id/block → deshacerlo.
 *
 * Se bloquea desde una conversación y no desde un perfil: es donde aparece el
 * problema, y es la única pantalla donde las dos personas ya se cruzaron.
 */
conversationsRouter.post('/:id/block', async (req, res) => {
  const { userId, supabase } = auth(req);
  const counterpartId = await getCounterpartId(supabase, userId, requireId(req.params.id));

  await blockCounterpart(supabase, userId, counterpartId);
  res.status(204).end();
});

conversationsRouter.delete('/:id/block', async (req, res) => {
  const { userId, supabase } = auth(req);
  const counterpartId = await getCounterpartId(supabase, userId, requireId(req.params.id));

  await unblockCounterpart(supabase, userId, counterpartId);
  res.status(204).end();
});

/**
 * POST /api/conversations/:id/report { reason, detail? } → denunciar.
 *
 * No bloquea por su cuenta: son dos decisiones y las toma la persona, no la
 * plataforma. Ver `services/moderation.ts`.
 */
conversationsRouter.post('/:id/report', async (req, res) => {
  const { userId, supabase } = auth(req);
  const body = (req.body ?? {}) as { reason?: unknown; detail?: unknown };

  await reportConversation(supabase, userId, requireId(req.params.id), body.reason, body.detail);
  res.status(204).end();
});

function requireId(id: string | undefined): string {
  if (!id) {
    throw HttpError.notFound();
  }
  return id;
}

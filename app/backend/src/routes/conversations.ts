import { Router } from 'express';
import { auth, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../lib/http-error.js';
import {
  countUnread,
  getConversation,
  listConversations,
  markRead,
  openConversation,
  sendMessage,
} from '../services/conversations.js';

/**
 * La mensajería interna: comprador y vendedor hablando adentro de la
 * plataforma.
 *
 * Reemplaza el contacto por WhatsApp que el Sprint 1.6 había puesto como
 * provisorio. Nadie puede leer una conversación de la que no es parte, y no
 * hay ninguna ruta que diga cuántas personas preguntaron por un aviso.
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

function requireId(id: string | undefined): string {
  if (!id) {
    throw HttpError.notFound();
  }
  return id;
}

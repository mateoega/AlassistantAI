import { Router } from 'express';
import { auth, requireAuth } from '../middleware/auth.js';
import { chat } from '../services/assistant.js';

/**
 * El chat del asistente.
 *
 * Una sola ruta y sin estado: la conversación entera viaja en cada pedido y no
 * se guarda nada del lado del servidor. Ver `services/assistant.ts`.
 */
export const assistantRouter = Router();

assistantRouter.use(requireAuth);

/**
 * POST /api/assistant/chat
 *   { messages: [{ role: 'user' | 'model', text: string }], listing_id?: string }
 *
 * `listing_id` es el aviso que la persona tiene abierto, si hay alguno: es lo
 * que le permite al asistente responder sobre "este vehículo".
 */
assistantRouter.post('/chat', async (req, res) => {
  const { supabase } = auth(req);
  const body = (req.body ?? {}) as { messages?: unknown; listing_id?: unknown };
  const listingId = typeof body.listing_id === 'string' ? body.listing_id : null;

  res.json(await chat(supabase, body.messages, listingId));
});

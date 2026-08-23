import { Router } from 'express';
import { auth, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../lib/http-error.js';
import {
  addFavorite,
  listFavoriteIds,
  listFavorites,
  removeFavorite,
} from '../services/favorites.js';

/**
 * Los vehículos guardados de cada usuario.
 *
 * Es la primera parte de la API que existe para el que compra: todo lo demás
 * gira alrededor del aviso. Nadie puede ver los favoritos de otro, ni contar
 * cuántas veces se guardó una publicación — no hay ruta que lo permita, y
 * tampoco lo permitirían las reglas de acceso de la base.
 */
export const favoritesRouter = Router();

favoritesRouter.use(requireAuth);

/**
 * GET /api/favorites → los guardados, con la publicación entera, para la
 * pantalla de favoritos.
 */
favoritesRouter.get('/', async (req, res) => {
  const { userId, supabase } = auth(req);
  res.json(await listFavorites(supabase, userId));
});

/**
 * GET /api/favorites/ids → solo los identificadores.
 *
 * Es lo que le alcanza al muro para saber cuáles de las tarjetas que muestra
 * ya están guardadas. Va aparte y no dentro de cada publicación para no
 * cargarle a la consulta del muro algo que solo le importa a quien mira.
 */
favoritesRouter.get('/ids', async (req, res) => {
  const { userId, supabase } = auth(req);
  res.json({ ids: await listFavoriteIds(supabase, userId) });
});

/**
 * PUT    /api/favorites/:listingId → guardar
 * DELETE /api/favorites/:listingId → sacar
 *
 * Los dos son idempotentes a propósito: el botón se aprieta rápido y dos veces
 * seguidas, y el resultado tiene que depender de lo que se pidió y no de
 * cuántos pedidos llegaron.
 */
favoritesRouter.put('/:listingId', async (req, res) => {
  const { userId, supabase } = auth(req);
  await addFavorite(supabase, userId, requireId(req.params.listingId));
  res.status(204).end();
});

favoritesRouter.delete('/:listingId', async (req, res) => {
  const { userId, supabase } = auth(req);
  await removeFavorite(supabase, userId, requireId(req.params.listingId));
  res.status(204).end();
});

function requireId(id: string | undefined): string {
  if (!id) {
    throw HttpError.notFound();
  }
  return id;
}

import { Router } from 'express';
import { auth, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../lib/http-error.js';
import { parseListingInput } from '../validation/listing-input.js';
import {
  createListing,
  deleteListing,
  getListing,
  listListings,
  setListingStatus,
  updateListing,
  type ListingScope,
} from '../services/listings.js';
import { LISTING_STATUSES, type ListingStatus } from '../validation/listing-input.js';

export const listingsRouter = Router();

// Todo lo de publicaciones requiere sesión iniciada.
listingsRouter.use(requireAuth);

/**
 * GET /api/listings?scope=public|mine&page=0
 *   public → el muro: solo las disponibles, de todos los usuarios
 *   mine   → las propias, en cualquier estado
 */
listingsRouter.get('/', async (req, res) => {
  const { userId, supabase } = auth(req);
  const scope: ListingScope = req.query.scope === 'mine' ? 'mine' : 'public';
  const page = Math.max(0, Number(req.query.page) || 0);

  res.json(await listListings(supabase, scope, userId, page));
});

listingsRouter.get('/:id', async (req, res) => {
  const { supabase } = auth(req);
  res.json({ listing: await getListing(supabase, requireId(req.params.id)) });
});

listingsRouter.post('/', async (req, res) => {
  const { userId, supabase } = auth(req);
  const { input, errors } = parseListingInput(req.body);

  const listing = await createListing(supabase, userId, input, errors);
  res.status(201).json({ listing });
});

listingsRouter.put('/:id', async (req, res) => {
  const { userId, supabase } = auth(req);
  const { input, errors } = parseListingInput(req.body);

  const listing = await updateListing(supabase, userId, requireId(req.params.id), input, errors);
  res.json({ listing });
});

/**
 * POST /api/listings/:id/status  { status: 'published' | 'paused' | 'sold' | 'draft' }
 *
 * Cambiar de estado va por su propia ruta y no por la edición: publicar,
 * pausar o marcar como vendido son decisiones, no efectos secundarios de
 * corregir un dato.
 */
listingsRouter.post('/:id/status', async (req, res) => {
  const { supabase } = auth(req);
  const status = (req.body as { status?: unknown } | undefined)?.status;

  if (!LISTING_STATUSES.includes(status as ListingStatus)) {
    throw HttpError.badRequest('Ese estado de publicación no existe.');
  }

  res.json({
    listing: await setListingStatus(supabase, requireId(req.params.id), status as ListingStatus),
  });
});

listingsRouter.delete('/:id', async (req, res) => {
  const { supabase } = auth(req);
  await deleteListing(supabase, requireId(req.params.id));
  res.status(204).end();
});

function requireId(id: string | undefined): string {
  if (!id) {
    throw HttpError.notFound();
  }
  return id;
}

import { Router } from 'express';
import { auth, optionalAuth, requireAuth, visitor } from '../middleware/auth.js';
import { limitarIa } from '../middleware/rate-limit.js';
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
import { getAnalysis, startAnalysis } from '../services/analysis.js';
import { estimarPrecio } from '../services/price-estimate.js';
import { buildSpecFilters, type ListingFilters } from '../services/listing-filters.js';
import { listVehicleTypes } from '../services/catalog.js';

export const listingsRouter = Router();

// La sesión se pide POR RUTA y no de una sola vez para todo el router.
//
// Mirar no necesita cuenta: el muro, la ficha de un vehículo, su análisis ya
// hecho y su precio de referencia se abren sin sesión. Hacer sí: publicar,
// editar, cambiar de estado, borrar y pedir un análisis nuevo la exigen.
//
// La línea `listingsRouter.use(requireAuth)` que estaba acá era cómoda y por
// eso duró seis sprints: una sola línea cerraba todo. El costo era que para
// ver un aviso había que crear una cuenta, que en un clasificado es la
// barrera más cara que existe.
//
// En las rutas abiertas, `optionalAuth` deja el cliente anónimo cuando no hay
// sesión, y de ahí en adelante **qué se puede ver lo decide la base**: las
// políticas de `anon` de la migración 014 alcanzan lo publicado y lo vendido,
// y nada más. Acá no hay ningún filtro escrito a mano que las duplique.

/**
 * GET /api/listings?scope=public|mine&page=0
 *   public → el muro: solo las disponibles, de todos los usuarios
 *   mine   → las propias, en cualquier estado
 *
 * El muro acepta además los filtros de la barra de búsqueda (`q`, `tipo`,
 * `marca`, `provincia`, `precio_min`...). No hay una ruta `/buscar` aparte
 * porque buscar no es ir a otro lado: es el mismo muro con menos vehículos.
 */
listingsRouter.get('/', optionalAuth, async (req, res) => {
  const { userId, supabase } = visitor(req);
  const scope: ListingScope = req.query.scope === 'mine' ? 'mine' : 'public';

  // Lo único de esta ruta que no se puede mirar sin cuenta. No es una regla de
  // seguridad —sin sesión la base no devolvería borradores de nadie— sino de
  // sentido: sin identidad no hay "mis".
  if (scope === 'mine' && !userId) {
    throw HttpError.unauthorized();
  }
  const page = Math.max(0, Number(req.query.page) || 0);

  const filters = parseFilters(req.query);
  filters.specs = await parseSpecFilters(filters.vehicle_type_slug, req.query);

  res.json(await listListings(supabase, scope, userId, page, filters));
});

/**
 * Los filtros sobre la ficha específica (cilindrada, cantidad de puertas, aire
 * acondicionado) solo existen cuando se eligió un tipo de vehículo.
 *
 * No es una limitación técnica: sin tipo no se sabe qué campos hay ni qué
 * significan. "Puertas" no quiere decir lo mismo en un auto que en un camión,
 * y en una moto no quiere decir nada.
 *
 * Las claves salen del catálogo, nunca de la dirección. Ver `buildSpecFilters`.
 */
async function parseSpecFilters(typeSlug: string | undefined, query: Record<string, unknown>) {
  if (!typeSlug) {
    return [];
  }

  const type = (await listVehicleTypes()).find((candidate) => candidate.slug === typeSlug);

  return type ? buildSpecFilters(type.fields, query) : [];
}

listingsRouter.get('/:id', optionalAuth, async (req, res) => {
  const { supabase } = visitor(req);
  res.json({ listing: await getListing(supabase, requireId(req.params.id)) });
});

listingsRouter.post('/', requireAuth, async (req, res) => {
  const { userId, supabase } = auth(req);
  const { input, errors } = parseListingInput(req.body);

  const listing = await createListing(supabase, userId, input, errors);
  res.status(201).json({ listing });
});

listingsRouter.put('/:id', requireAuth, async (req, res) => {
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
listingsRouter.post('/:id/status', requireAuth, async (req, res) => {
  const { supabase } = auth(req);
  const status = (req.body as { status?: unknown } | undefined)?.status;

  if (!LISTING_STATUSES.includes(status as ListingStatus)) {
    throw HttpError.badRequest('Ese estado de publicación no existe.');
  }

  res.json({
    listing: await setListingStatus(supabase, requireId(req.params.id), status as ListingStatus),
  });
});

/**
 * El análisis de IA de una publicación.
 *
 * Es una herramienta del COMPRADOR: cualquiera que pueda ver el aviso puede
 * pedir su análisis, no solo el dueño. Quién puede ver qué lo siguen decidiendo
 * las reglas de acceso de la base, no este archivo.
 *
 *   GET  → el análisis guardado, si hay. `null` si nadie lo pidió todavía.
 *   POST → lo dispara. Responde enseguida, con el análisis "corriendo": el
 *          navegador vuelve a preguntar con el GET hasta que esté listo.
 */
listingsRouter.get('/:id/analysis', optionalAuth, async (req, res) => {
  const { supabase } = visitor(req);
  res.json({ analysis: await getAnalysis(supabase, requireId(req.params.id)) });
});

// Pedir uno nuevo sí necesita cuenta: cada análisis es una llamada paga al
// modelo. Leer el que ya existe no cuesta nada; generarlo, sí.
//
// Y va con el mismo freno que el chat: el análisis de fotos gasta de la MISMA
// cuota diaria de Gemini que el asistente, así que un límite que solo cubriera
// el chat dejaría abierta la otra mitad de la canilla. Tener cuenta no es un
// límite: crear una es gratis. Ver `middleware/rate-limit.ts`.
listingsRouter.post('/:id/analysis', requireAuth, limitarIa, async (req, res) => {
  const { supabase } = auth(req);
  res.status(202).json({ analysis: await startAnalysis(supabase, requireId(req.params.id)) });
});

/**
 * GET /api/listings/:id/estimacion
 *
 * Cuánto piden por vehículos parecidos, y dónde queda este entre ellos.
 *
 * Es una herramienta del comprador, igual que el análisis: la puede pedir
 * cualquiera que vea el aviso, no solo el dueño. A diferencia del análisis, se
 * calcula en el momento y no se guarda — no cuesta plata, y cambia cada vez
 * que se publica un aviso parecido.
 */
listingsRouter.get('/:id/estimacion', optionalAuth, async (req, res) => {
  const { supabase } = visitor(req);
  res.json({ estimacion: await estimarPrecio(supabase, requireId(req.params.id)) });
});

listingsRouter.delete('/:id', requireAuth, async (req, res) => {
  const { supabase } = auth(req);
  await deleteListing(supabase, requireId(req.params.id));
  res.status(204).end();
});

/**
 * Traduce lo que viene en la dirección a filtros de búsqueda.
 *
 * Todo lo que no se entiende se descarta en silencio y el filtro queda sin
 * poner: una dirección escrita a mano con `precio_max=barato` muestra el muro
 * sin ese filtro, que es mejor que un error en la cara de quien mira.
 */
function parseFilters(query: Record<string, unknown>): ListingFilters {
  const filters: ListingFilters = {};

  const text = str(query.q);
  if (text) filters.text = text;

  const tipo = str(query.tipo);
  if (tipo) filters.vehicle_type_slug = tipo;

  const marca = str(query.marca);
  if (marca) filters.brand = marca;

  const provincia = str(query.provincia);
  if (provincia) filters.province_slug = provincia;

  const moneda = str(query.moneda)?.toUpperCase();
  if (moneda === 'ARS' || moneda === 'USD') filters.currency = moneda;

  const precioMin = num(query.precio_min);
  if (precioMin !== undefined) filters.price_min = precioMin;

  const precioMax = num(query.precio_max);
  if (precioMax !== undefined) filters.price_max = precioMax;

  const anioMin = num(query.anio_min);
  if (anioMin !== undefined) filters.year_min = anioMin;

  const anioMax = num(query.anio_max);
  if (anioMax !== undefined) filters.year_max = anioMax;

  const kmMax = num(query.km_max);
  if (kmMax !== undefined) filters.kilometers_max = kmMax;

  return filters;
}

function str(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function num(value: unknown): number | undefined {
  const text = str(value);
  if (text === undefined) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * El identificador que viene en la dirección, comprobado.
 *
 * Recibe `unknown` a propósito. Al pedir la sesión por ruta —`get('/:id',
 * optionalAuth, ...)` en vez de un `use()` para todo el router— los tipos de
 * Express pasan a describir `req.params.id` como `string | string[]`, porque
 * esa forma de declarar una ruta admite parámetros repetidos. Escribir un
 * `as string` para callar al compilador sería tapar la única advertencia
 * verdadera que hay acá: que lo que llega en la dirección lo escribe quien
 * hace el pedido, y hasta que no se lo mira no se sabe qué es.
 */
function requireId(id: unknown): string {
  if (typeof id !== 'string' || !id) {
    throw HttpError.notFound();
  }
  return id;
}

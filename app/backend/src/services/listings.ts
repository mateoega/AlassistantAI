import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PHOTOS_BUCKET, photoPublicUrl } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import { getVehicleTypeById, listVehicleTypes } from './catalog.js';
import { describeSpecs, type SpecDisplay } from './spec-display.js';
import { validateSpecs } from '../validation/specs.js';
import {
  assertPhotosBelongTo,
  type ListingInput,
  type ListingStatus,
} from '../validation/listing-input.js';
import type { SpecValue, VehicleType } from '../types.js';

export type { SpecDisplay };

/**
 * Todo lo que se hace acá pasa por el cliente de Supabase del usuario que hizo
 * el pedido, así que las reglas de acceso de la base se aplican siempre: nadie
 * puede leer un borrador ajeno ni editar una publicación que no es suya,
 * aunque este código tuviera un error.
 */

const LISTING_SELECT = `
  id, seller_id, brand, model, year, price, currency,
  kilometers, city, description, specs,
  status, published_at, sold_at, created_at, updated_at,
  vehicle_type:vehicle_types ( id, slug, name, name_plural ),
  province:provinces ( id, slug, name ),
  seller:profiles ( id, display_name, phone ),
  photos:listing_photos ( id, storage_path, sort_order )
`;

export type ListingScope = 'public' | 'mine';

/** Cuántas publicaciones trae cada página del listado. */
export const PAGE_SIZE = 24;

export async function listListings(
  supabase: SupabaseClient,
  scope: ListingScope,
  userId: string,
  page = 0,
) {
  const from = page * PAGE_SIZE;
  // Se pide una de más para saber si hay página siguiente, sin tener que hacer
  // una segunda consulta contando el total.
  const to = from + PAGE_SIZE;

  let query = supabase.from('listings').select(LISTING_SELECT);

  if (scope === 'mine') {
    query = query.eq('seller_id', userId).order('created_at', { ascending: false });
  } else {
    // El muro: solo lo que está efectivamente disponible. Un aviso pausado o
    // ya vendido no tiene por qué ocupar lugar acá.
    query = query.eq('status', 'published').order('published_at', { ascending: false });
  }

  const { data, error } = await query.range(from, to);

  if (error) {
    throw new Error(`No se pudieron leer las publicaciones: ${error.message}`);
  }

  const rows = data ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const typesById = await vehicleTypesById();

  return {
    listings: rows
      .slice(0, PAGE_SIZE)
      .map((row) => presentListing(row as unknown as ListingRow, typesById)),
    page,
    has_more: hasMore,
  };
}

export async function getListing(supabase: SupabaseClient, listingId: string) {
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('id', listingId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer la publicación: ${error.message}`);
  }

  // Si el usuario no tiene permiso, la base simplemente no devuelve la fila.
  // Desde afuera, no existe — que es exactamente lo que se quiere.
  if (!data) {
    throw HttpError.notFound('Esa publicación no existe o no tenés permiso para verla.');
  }

  const typesById = await vehicleTypesById();
  return presentListing(data as unknown as ListingRow, typesById);
}

export async function createListing(
  supabase: SupabaseClient,
  userId: string,
  input: ListingInput,
  commonErrors: string[],
) {
  const listingId = input.id ?? randomUUID();
  const { vehicleType } = await validateAgainstCatalog(input, commonErrors);

  assertPhotosBelongTo(input.photos, userId, listingId);

  const { error } = await supabase.from('listings').insert({
    id: listingId,
    seller_id: userId,
    ...toRow(input, vehicleType),
    ...statusFields(input.status, null),
  });

  if (error) {
    throw new Error(`No se pudo guardar la publicación: ${error.message}`);
  }

  await replacePhotos(supabase, listingId, input.photos);

  return getListing(supabase, listingId);
}

export async function updateListing(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
  input: ListingInput,
  commonErrors: string[],
) {
  const { vehicleType } = await validateAgainstCatalog(input, commonErrors);

  assertPhotosBelongTo(input.photos, userId, listingId);

  const current = await currentStatus(supabase, listingId);

  const { data, error } = await supabase
    .from('listings')
    .update({
      ...toRow(input, vehicleType),
      ...statusFields(input.status, current.published_at),
    })
    .eq('id', listingId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo actualizar la publicación: ${error.message}`);
  }

  if (!data) {
    throw HttpError.notFound('Esa publicación no existe o no es tuya.');
  }

  await replacePhotos(supabase, listingId, input.photos);

  return getListing(supabase, listingId);
}

/**
 * Cambia solo el estado, sin tocar los datos del vehículo.
 *
 * Es lo que usan los botones de publicar, pausar, marcar como vendido y
 * volver a publicar. Están separados de la edición a propósito: cambiar de
 * estado es una decisión, no un efecto secundario de corregir un dato.
 */
export async function setListingStatus(
  supabase: SupabaseClient,
  listingId: string,
  status: ListingStatus,
) {
  const current = await currentStatus(supabase, listingId);

  // Misma regla que al crear: sin fotos no sale al público. Este camino no
  // pasa por el formulario, así que la comprobación tiene que estar también acá.
  if (status === 'published') {
    const { count } = await supabase
      .from('listing_photos')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId);

    if (!count) {
      throw HttpError.badRequest('No se puede publicar sin fotos.', [
        'Agregá al menos una foto del vehículo. Podés hacerlo desde "Editar".',
      ]);
    }
  }

  const { data, error } = await supabase
    .from('listings')
    .update(statusFields(status, current.published_at))
    .eq('id', listingId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo cambiar el estado de la publicación: ${error.message}`);
  }

  if (!data) {
    throw HttpError.notFound('Esa publicación no existe o no es tuya.');
  }

  return getListing(supabase, listingId);
}

/** Estado actual, para no pisar la fecha de publicación original. */
async function currentStatus(
  supabase: SupabaseClient,
  listingId: string,
): Promise<{ published_at: string | null }> {
  const { data } = await supabase
    .from('listings')
    .select('published_at')
    .eq('id', listingId)
    .maybeSingle();

  return { published_at: (data as { published_at: string | null } | null)?.published_at ?? null };
}

export async function deleteListing(supabase: SupabaseClient, listingId: string): Promise<void> {
  // Las fotos se borran primero: una vez borrada la publicación, ya no se
  // sabría qué archivos le pertenecían y quedarían ocupando lugar para siempre.
  const { data: photos } = await supabase
    .from('listing_photos')
    .select('storage_path')
    .eq('listing_id', listingId);

  const paths = (photos ?? []).map((photo) => (photo as { storage_path: string }).storage_path);

  if (paths.length > 0) {
    await supabase.storage.from(PHOTOS_BUCKET).remove(paths);
  }

  const { data, error } = await supabase
    .from('listings')
    .delete()
    .eq('id', listingId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo borrar la publicación: ${error.message}`);
  }

  if (!data) {
    throw HttpError.notFound('Esa publicación no existe o no es tuya.');
  }
}

// ---------------------------------------------------------------------------
// Validación contra el catálogo
// ---------------------------------------------------------------------------

/**
 * Acá se junta todo: los errores de los campos comunes y los de la ficha
 * específica del tipo de vehículo, para devolvérselos al usuario de una sola
 * vez en lugar de que los descubra de a uno.
 */
async function validateAgainstCatalog(
  input: ListingInput,
  commonErrors: string[],
): Promise<{ vehicleType: VehicleType }> {
  if (!input.vehicle_type_id) {
    throw HttpError.badRequest('No se pudo guardar la publicación.', [
      ...commonErrors,
      'Elegí un tipo de vehículo.',
    ]);
  }

  const vehicleType = await getVehicleTypeById(input.vehicle_type_id);
  const specs = validateSpecs(vehicleType.fields, input.specs);
  const allErrors = [...commonErrors, ...specs.errors];

  // Una publicación sin fotos no le sirve a nadie: el comprador no puede ver
  // qué está comprando y el análisis de IA no tiene qué mirar. Se exige solo
  // al publicar — un borrador puede guardarse a medio hacer.
  if (input.status === 'published' && input.photos.length === 0) {
    allErrors.push('Agregá al menos una foto del vehículo para poder publicarlo.');
  }

  if (allErrors.length > 0) {
    throw HttpError.badRequest('Revisá los datos de la publicación.', allErrors);
  }

  // Se guarda la ficha ya limpia, no la que llegó del navegador.
  input.specs = specs.value;

  return { vehicleType };
}

function toRow(input: ListingInput, vehicleType: VehicleType) {
  return {
    vehicle_type_id: vehicleType.id,
    brand: input.brand,
    model: input.model,
    year: input.year,
    price: input.price,
    currency: input.currency,
    kilometers: input.kilometers,
    province_id: input.province_id,
    city: input.city,
    description: input.description,
    specs: input.specs,
  };
}

/**
 * Las fechas que acompañan a cada estado.
 *
 * `published_at` se conserva: es la fecha en que el aviso salió al público por
 * primera vez, y no tiene por qué cambiar porque después se haya editado,
 * pausado o vendido. Solo se estrena si todavía no existía.
 */
function statusFields(status: ListingStatus, existingPublishedAt: string | null) {
  const now = new Date().toISOString();

  return {
    status,
    published_at: status === 'draft' ? null : (existingPublishedAt ?? now),
    sold_at: status === 'sold' ? now : null,
  };
}

async function replacePhotos(
  supabase: SupabaseClient,
  listingId: string,
  photos: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('listing_photos')
    .delete()
    .eq('listing_id', listingId);

  if (deleteError) {
    throw new Error(`No se pudieron actualizar las fotos: ${deleteError.message}`);
  }

  if (photos.length === 0) {
    return;
  }

  const rows = photos.map((storagePath, index) => ({
    listing_id: listingId,
    storage_path: storagePath,
    sort_order: index,
  }));

  const { error } = await supabase.from('listing_photos').insert(rows);

  if (error) {
    throw new Error(`No se pudieron guardar las fotos: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Cómo se le devuelve una publicación al frontend
// ---------------------------------------------------------------------------

interface ListingRow {
  id: string;
  seller_id: string;
  brand: string;
  model: string;
  year: number;
  price: string | number;
  currency: 'ARS' | 'USD';
  kilometers: string | number;
  city: string;
  description: string | null;
  specs: Record<string, SpecValue> | null;
  status: ListingStatus;
  published_at: string | null;
  sold_at: string | null;
  created_at: string;
  updated_at: string;
  vehicle_type: {
    id: string;
    slug: string;
    name: string;
    name_plural: string;
  } | null;
  province: { id: string; slug: string; name: string } | null;
  seller: { id: string; display_name: string | null; phone: string | null } | null;
  photos: { id: string; storage_path: string; sort_order: number }[] | null;
}

async function vehicleTypesById(): Promise<Map<string, VehicleType>> {
  const types = await listVehicleTypes();
  return new Map(types.map((type) => [type.id, type]));
}

function presentListing(row: ListingRow, typesById: Map<string, VehicleType>) {
  const vehicleType = row.vehicle_type ? typesById.get(row.vehicle_type.id) : undefined;

  return {
    id: row.id,
    seller_id: row.seller_id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    price: Number(row.price),
    currency: row.currency,
    kilometers: Number(row.kilometers),
    city: row.city,
    province: row.province,
    description: row.description,
    status: row.status,
    published_at: row.published_at,
    sold_at: row.sold_at,
    created_at: row.created_at,
    vehicle_type: row.vehicle_type,
    seller: row.seller,
    photos: [...(row.photos ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((photo) => ({
        id: photo.id,
        storage_path: photo.storage_path,
        url: photoPublicUrl(photo.storage_path),
      })),
    specs: row.specs ?? {},
    // La ficha específica ya traducida a "etiqueta: valor" en español, para
    // que la pantalla de detalle solo tenga que mostrarla.
    specs_display: describeSpecs(row.specs ?? {}, vehicleType?.fields ?? []),
  };
}


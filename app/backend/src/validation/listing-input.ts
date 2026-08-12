import { HttpError } from '../lib/http-error.js';
import type { SpecValue } from '../types.js';

/**
 * Validación de los campos COMUNES de una publicación (los que tiene
 * cualquier vehículo). Los campos específicos de cada tipo se validan aparte,
 * contra el catálogo, en `specs.ts`.
 */

export interface ListingInput {
  id?: string;
  vehicle_type_id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  currency: 'ARS' | 'USD';
  kilometers: number;
  province_id: string;
  city: string;
  description: string | null;
  specs: Record<string, unknown>;
  photos: string[];
  status: ListingStatus;
}

/**
 * draft      borrador, solo lo ve su dueño
 * published  disponible, aparece en el muro
 * paused     fuera del muro, sin borrar nada
 * sold       vendido; queda como registro
 */
export type ListingStatus = 'draft' | 'published' | 'paused' | 'sold';

export const LISTING_STATUSES: ListingStatus[] = ['draft', 'published', 'paused', 'sold'];

const MAX_PHOTOS = 12;
const MAX_DESCRIPTION = 2000;
const OLDEST_YEAR = 1900;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseListingInput(body: unknown): { input: ListingInput; errors: string[] } {
  const errors: string[] = [];

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw HttpError.badRequest('Los datos de la publicación llegaron en un formato inesperado.');
  }

  const raw = body as Record<string, unknown>;
  const nextYear = new Date().getFullYear() + 1;

  const input: ListingInput = {
    id: optionalUuid(raw.id, 'identificador de la publicación', errors),
    vehicle_type_id: requiredUuid(raw.vehicle_type_id, 'Tipo de vehículo', errors),
    brand: requiredText(raw.brand, 'Marca', 60, errors),
    model: requiredText(raw.model, 'Modelo', 60, errors),
    year: requiredNumber(raw.year, 'Año', { min: OLDEST_YEAR, max: nextYear, integer: true }, errors),
    price: requiredNumber(raw.price, 'Precio', { min: 0, max: 999_999_999_999 }, errors),
    currency: requiredCurrency(raw.currency, errors),
    kilometers: requiredNumber(raw.kilometers, 'Kilometraje', { min: 0, max: 99_999_999 }, errors),
    province_id: requiredUuid(raw.province_id, 'Provincia', errors),
    city: requiredText(raw.city, 'Ciudad', 80, errors),
    description: optionalDescription(raw.description, errors),
    specs: isPlainObject(raw.specs) ? raw.specs : {},
    photos: parsePhotos(raw.photos, errors),
    status: parseStatus(raw.status, errors),
  };

  return { input, errors };
}

/**
 * Las fotos se suben directo del navegador a Supabase Storage, así que lo que
 * llega acá son rutas de archivo. Antes de guardarlas hay que confirmar que
 * pertenecen a este usuario y a esta publicación — si no, alguien podría
 * apropiarse de las fotos de otro simplemente mandando su ruta.
 */
export function assertPhotosBelongTo(
  photos: string[],
  userId: string,
  listingId: string,
): void {
  const expectedPrefix = `${userId}/${listingId}/`;
  const invalid = photos.filter((photoPath) => !photoPath.startsWith(expectedPrefix));

  if (invalid.length > 0) {
    throw HttpError.badRequest('Alguna de las fotos no corresponde a esta publicación.');
  }
}

// ---------------------------------------------------------------------------

function requiredText(raw: unknown, label: string, maxLength: number, errors: string[]): string {
  if (typeof raw !== 'string' || raw.trim() === '') {
    errors.push(`Falta completar "${label}".`);
    return '';
  }

  const text = raw.trim();

  if (text.length > maxLength) {
    errors.push(`"${label}" no puede superar los ${maxLength} caracteres.`);
    return text.slice(0, maxLength);
  }

  return text;
}

interface NumberRules {
  min: number;
  max: number;
  integer?: boolean;
}

function requiredNumber(raw: unknown, label: string, rules: NumberRules, errors: string[]): number {
  if (raw === undefined || raw === null || raw === '') {
    errors.push(`Falta completar "${label}".`);
    return rules.min;
  }

  const parsed = typeof raw === 'number' ? raw : Number(String(raw).trim().replace(',', '.'));

  if (!Number.isFinite(parsed)) {
    errors.push(`"${label}" tiene que ser un número.`);
    return rules.min;
  }

  if (rules.integer && !Number.isInteger(parsed)) {
    errors.push(`"${label}" tiene que ser un número entero.`);
    return rules.min;
  }

  if (parsed < rules.min || parsed > rules.max) {
    errors.push(`"${label}" tiene que estar entre ${rules.min} y ${rules.max}.`);
    return rules.min;
  }

  return parsed;
}

function requiredUuid(raw: unknown, label: string, errors: string[]): string {
  if (typeof raw !== 'string' || !UUID_PATTERN.test(raw)) {
    errors.push(`Falta elegir "${label}".`);
    return '';
  }
  return raw;
}

function optionalUuid(raw: unknown, label: string, errors: string[]): string | undefined {
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  if (typeof raw !== 'string' || !UUID_PATTERN.test(raw)) {
    errors.push(`El ${label} no es válido.`);
    return undefined;
  }
  return raw;
}

function requiredCurrency(raw: unknown, errors: string[]): 'ARS' | 'USD' {
  if (raw === 'ARS' || raw === 'USD') {
    return raw;
  }
  errors.push('Elegí la moneda del precio: pesos o dólares.');
  return 'ARS';
}

function optionalDescription(raw: unknown, errors: string[]): string | null {
  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
    return null;
  }

  if (typeof raw !== 'string') {
    errors.push('La descripción tiene que ser un texto.');
    return null;
  }

  const text = raw.trim();

  if (text.length > MAX_DESCRIPTION) {
    errors.push(`La descripción no puede superar los ${MAX_DESCRIPTION} caracteres.`);
    return text.slice(0, MAX_DESCRIPTION);
  }

  return text;
}

function parsePhotos(raw: unknown, errors: string[]): string[] {
  if (raw === undefined || raw === null) {
    return [];
  }

  if (!Array.isArray(raw) || raw.some((item) => typeof item !== 'string')) {
    errors.push('Las fotos llegaron en un formato inesperado.');
    return [];
  }

  const photos = (raw as string[]).map((item) => item.trim()).filter(Boolean);

  if (photos.length > MAX_PHOTOS) {
    errors.push(`No se pueden cargar más de ${MAX_PHOTOS} fotos por publicación.`);
    return photos.slice(0, MAX_PHOTOS);
  }

  return photos;
}

function parseStatus(raw: unknown, errors: string[]): ListingStatus {
  if (raw === undefined || raw === null || raw === '') {
    return 'draft';
  }
  if (LISTING_STATUSES.includes(raw as ListingStatus)) {
    return raw as ListingStatus;
  }
  errors.push('El estado de la publicación no es válido.');
  return 'draft';
}

function isPlainObject(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

export type { SpecValue };

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Búsqueda de publicaciones con filtros.
 *
 * Nace como la herramienta que usa el asistente cuando el comprador le pide
 * "mostrame motos hasta dos millones", pero está escrita para que el Sprint 4
 * la reuse tal cual en la pantalla de búsqueda: es la misma consulta con otra
 * puerta de entrada. Por eso los filtros son los que va a necesitar esa
 * pantalla y no solo los que hoy usa el chat.
 *
 * SEGURIDAD: recibe el cliente del usuario, no el de servicio. Las reglas de
 * acceso de la base siguen mandando, así que un borrador ajeno no aparece
 * nunca — ni aunque el modelo lo pidiera explícitamente.
 */

export interface ListingSearchFilters {
  /** Slug del tipo de vehículo, tal como está en el catálogo ('moto', 'camion'). */
  vehicle_type_slug?: string;
  brand?: string;
  /** Busca en marca y modelo a la vez. */
  text?: string;
  price_min?: number;
  price_max?: number;
  currency?: 'ARS' | 'USD';
  year_min?: number;
  year_max?: number;
  kilometers_max?: number;
  /** Slug de la provincia, tal como está en el catálogo. */
  province_slug?: string;
}

export interface ListingSearchResult {
  id: string;
  titulo: string;
  tipo: string | null;
  precio: number;
  moneda: 'ARS' | 'USD';
  kilometros: number;
  anio: number;
  ubicacion: string;
}

/**
 * Cuántos resultados vuelven como máximo.
 *
 * Es bajo a propósito: estos resultados van dentro de una conversación, y una
 * lista de treinta vehículos no la lee nadie. Mejor pocos y que el asistente
 * pida acotar la búsqueda.
 */
const MAX_RESULTS = 8;

const SEARCH_SELECT = `
  id, brand, model, year, price, currency, kilometers, city,
  vehicle_type:vehicle_types ( slug, name ),
  province:provinces ( slug, name )
`;

interface SearchRow {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: string | number;
  currency: 'ARS' | 'USD';
  kilometers: string | number;
  city: string;
  vehicle_type: { slug: string; name: string } | null;
  province: { slug: string; name: string } | null;
}

export async function searchListings(
  supabase: SupabaseClient,
  filters: ListingSearchFilters,
): Promise<ListingSearchResult[]> {
  let query = supabase
    .from('listings')
    .select(SEARCH_SELECT)
    // Solo lo que está efectivamente a la venta: recomendar un vehículo ya
    // vendido o pausado es hacerle perder el tiempo a quien pregunta.
    .eq('status', 'published');

  if (filters.vehicle_type_slug) {
    const typeId = await idOf(supabase, 'vehicle_types', filters.vehicle_type_slug);
    if (!typeId) {
      return [];
    }
    query = query.eq('vehicle_type_id', typeId);
  }

  if (filters.province_slug) {
    const provinceId = await idOf(supabase, 'provinces', filters.province_slug);
    if (!provinceId) {
      return [];
    }
    query = query.eq('province_id', provinceId);
  }

  // La marca se guarda como texto libre, así que se compara sin distinguir
  // mayúsculas ni acentos parciales: `ilike` con comodines a los costados
  // encuentra "Volkswagen" buscando "volks".
  if (filters.brand) {
    query = query.ilike('brand', `%${escapeLike(filters.brand)}%`);
  }

  if (filters.text) {
    const term = `%${escapeLike(filters.text)}%`;
    query = query.or(`brand.ilike.${term},model.ilike.${term}`);
  }

  if (filters.currency) {
    query = query.eq('currency', filters.currency);
  }

  if (filters.price_min !== undefined) {
    query = query.gte('price', filters.price_min);
  }
  if (filters.price_max !== undefined) {
    query = query.lte('price', filters.price_max);
  }
  if (filters.year_min !== undefined) {
    query = query.gte('year', filters.year_min);
  }
  if (filters.year_max !== undefined) {
    query = query.lte('year', filters.year_max);
  }
  if (filters.kilometers_max !== undefined) {
    query = query.lte('kilometers', filters.kilometers_max);
  }

  const { data, error } = await query
    .order('published_at', { ascending: false })
    .limit(MAX_RESULTS);

  if (error) {
    throw new Error(`No se pudo buscar publicaciones: ${error.message}`);
  }

  return ((data ?? []) as unknown as SearchRow[]).map((row) => ({
    id: row.id,
    titulo: `${row.brand} ${row.model} ${row.year}`,
    tipo: row.vehicle_type?.name ?? null,
    precio: Number(row.price),
    moneda: row.currency,
    kilometros: Number(row.kilometers),
    anio: row.year,
    ubicacion: row.province ? `${row.city}, ${row.province.name}` : row.city,
  }));
}

/** Traduce un slug del catálogo al id que guarda la publicación. */
async function idOf(
  supabase: SupabaseClient,
  table: 'vehicle_types' | 'provinces',
  slug: string,
): Promise<string | null> {
  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('slug', slug.trim().toLowerCase())
    .maybeSingle();

  return (data as { id: string } | null)?.id ?? null;
}

/**
 * `%` y `_` son comodines dentro de un `ilike`. Si alguien busca un modelo que
 * los contenga, se escapan para que se busquen como texto y no como patrón.
 */
function escapeLike(text: string): string {
  return text.trim().replace(/[%_\\]/g, (match) => `\\${match}`);
}

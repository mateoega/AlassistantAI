import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Los filtros de búsqueda de publicaciones, en un solo lugar.
 *
 * Existen dos puertas de entrada a la misma búsqueda: el asistente, cuando el
 * comprador le pide "mostrame motos hasta dos millones" (Sprint 2), y la barra
 * de búsqueda del muro (Sprint 4). Lo que cambia entre las dos es qué se
 * devuelve y cuántos —el chat quiere pocos y en texto, el muro quiere la
 * tarjeta completa y paginada—, pero **qué significa cada filtro tiene que ser
 * idéntico**: si buscar "volks" encuentra "Volkswagen" escribiéndolo en la
 * barra, tiene que encontrarlo también pidiéndoselo al asistente.
 *
 * Por eso acá vive la traducción de filtros a consulta, y no en ninguno de los
 * dos servicios que la usan.
 */

export interface ListingFilters {
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

/**
 * El pedazo de la consulta de Supabase que se usa acá. Se describe así, y no
 * con el tipo del cliente, para que la misma función sirva para las dos
 * consultas —que piden columnas distintas— sin pelearse con los tipos.
 */
export interface FilterableQuery {
  eq(column: string, value: unknown): this;
  gte(column: string, value: unknown): this;
  lte(column: string, value: unknown): this;
  ilike(column: string, pattern: string): this;
  or(filters: string): this;
}

/**
 * Aplica los filtros a una consulta ya empezada.
 *
 * Devuelve `null` cuando un filtro apunta a algo que no existe en el catálogo
 * —un tipo de vehículo o una provincia con un slug inventado—. No es un error:
 * es una búsqueda que no puede tener resultados, y quien llama corta ahí en
 * vez de preguntarle a la base por un id nulo.
 *
 * La consulta vuelve adentro de un objeto y no suelta por un motivo concreto:
 * una consulta de Supabase también es una promesa, así que devolverla pelada
 * desde una función `async` haría que el `await` de quien llama la ejecute ahí
 * mismo, sin darle lugar a ordenarla ni paginarla.
 */
export async function applyListingFilters<Q extends FilterableQuery>(
  supabase: SupabaseClient,
  query: Q,
  filters: ListingFilters,
): Promise<{ query: Q } | null> {
  let result = query;

  if (filters.vehicle_type_slug) {
    const typeId = await idOf(supabase, 'vehicle_types', filters.vehicle_type_slug);
    if (!typeId) {
      return null;
    }
    result = result.eq('vehicle_type_id', typeId);
  }

  if (filters.province_slug) {
    const provinceId = await idOf(supabase, 'provinces', filters.province_slug);
    if (!provinceId) {
      return null;
    }
    result = result.eq('province_id', provinceId);
  }

  // La marca se guarda como texto libre, así que se compara sin distinguir
  // mayúsculas ni acentos parciales: `ilike` con comodines a los costados
  // encuentra "Volkswagen" buscando "volks".
  if (filters.brand) {
    result = result.ilike('brand', `%${escapeLike(filters.brand)}%`);
  }

  if (filters.text) {
    const term = `%${escapeLike(filters.text)}%`;
    result = result.or(`brand.ilike.${term},model.ilike.${term}`);
  }

  if (filters.currency) {
    result = result.eq('currency', filters.currency);
  }

  if (filters.price_min !== undefined) {
    result = result.gte('price', filters.price_min);
  }
  if (filters.price_max !== undefined) {
    result = result.lte('price', filters.price_max);
  }
  if (filters.year_min !== undefined) {
    result = result.gte('year', filters.year_min);
  }
  if (filters.year_max !== undefined) {
    result = result.lte('year', filters.year_max);
  }
  if (filters.kilometers_max !== undefined) {
    result = result.lte('kilometers', filters.kilometers_max);
  }

  return { query: result };
}

/** ¿Hay algún filtro puesto? Sirve para saber si el muro está filtrado o entero. */
export function hasAnyFilter(filters: ListingFilters): boolean {
  return Object.values(filters).some((value) => value !== undefined && value !== '');
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

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  applyListingFilters,
  fallbackPorParecido,
  type ListingFilters,
} from './listing-filters.js';

/**
 * Búsqueda de publicaciones para el asistente.
 *
 * Es la herramienta que usa el chat cuando el comprador le pide "mostrame
 * motos hasta dos millones". Qué significa cada filtro no se decide acá:
 * vive en `listing-filters.ts`, compartido con el muro, para que la barra de
 * búsqueda y el asistente busquen igual.
 *
 * Lo propio de este archivo es el formato de la respuesta —texto corto, para
 * leer dentro de una conversación— y el tope de resultados.
 *
 * SEGURIDAD: recibe el cliente del usuario, no el de servicio. Las reglas de
 * acceso de la base siguen mandando, así que un borrador ajeno no aparece
 * nunca — ni aunque el modelo lo pidiera explícitamente.
 */

/** El nombre con el que el asistente conoce a los filtros, desde el Sprint 2. */
export type ListingSearchFilters = ListingFilters;

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
 * pida acotar la búsqueda. El muro, que muestra tarjetas y pagina, tiene su
 * propio tope y no comparte este.
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
  const base = supabase
    .from('listings')
    .select(SEARCH_SELECT)
    // Solo lo que está efectivamente a la venta: recomendar un vehículo ya
    // vendido o pausado es hacerle perder el tiempo a quien pregunta.
    .eq('status', 'published');

  const filtered = await applyListingFilters(supabase, base, filters);

  // Un filtro que no existe en el catálogo: la búsqueda no puede tener
  // resultados y no hace falta molestar a la base para saberlo.
  if (!filtered) {
    return [];
  }

  const { data, error } = await filtered.query
    .order('published_at', { ascending: false })
    .limit(MAX_RESULTS);

  if (error) {
    throw new Error(`No se pudo buscar publicaciones: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as SearchRow[];

  /*
   * SI NO ENCONTRÓ NADA, SE BUSCA LO PARECIDO — igual que en el muro.
   *
   * La regla del proyecto es que un filtro signifique lo mismo por las dos
   * puertas: si escribir "hilix" en la barra rescata las Hilux, pedírselo al
   * asistente tiene que rescatarlas también. Si no, el asistente contesta "no
   * hay ninguna publicada" por un error de tipeo, que es la peor forma
   * posible de equivocarse: suena a un dato y es un error de escritura.
   *
   * El asistente no recibe un aviso aparte de que estos son aproximados: lo
   * que le llega es una lista de vehículos, y de ahí en más razona igual. El
   * cartel es cosa de la pantalla, donde se puede mostrar sin gastar tokens.
   */
  if (rows.length === 0) {
    const parecidos = await fallbackPorParecido(supabase, filters);

    if (parecidos) {
      return searchListings(supabase, parecidos);
    }
  }

  return rows.map((row) => ({
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

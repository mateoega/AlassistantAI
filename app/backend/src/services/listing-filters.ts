import type { SupabaseClient } from '@supabase/supabase-js';
import type { VehicleTypeField } from '../types.js';

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

/**
 * Un filtro sobre la ficha específica del vehículo: "cilindrada desde 250",
 * "caja automática", "con aire acondicionado".
 *
 * La clave NUNCA llega directo de quien hace el pedido: la arma
 * `buildSpecFilters` a partir del catálogo. Es lo que impide que alguien
 * escriba cualquier cosa en la dirección y termine metiéndola en la consulta.
 */
export interface SpecFilter {
  key: string;
  op: 'eq' | 'gte' | 'lte';
  value: string | number | boolean;
  /** Los números se comparan como números y no como texto. Ver `applyListingFilters`. */
  numeric: boolean;
}

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
  /** Filtros sobre la ficha específica del tipo de vehículo. */
  specs?: SpecFilter[];
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

  /* -------------------------------------------------------------------------
   * LA BÚSQUEDA LIBRE SE PARTE EN PALABRAS, Y CADA UNA TIENE QUE ESTAR.
   *
   * Antes se buscaba el texto ENTERO adentro de una sola columna, y por eso
   * "Toyota Hilux" no devolvía nada: "Toyota" vive en `brand`, "Hilux" en
   * `model`, y ninguna de las dos contiene la frase completa. Buscando cada
   * palabra por separado, a "Toyota" la encuentra la marca y a "Hilux" el
   * modelo. Lo reportó el cliente el 2026-09-04: cada palabra suelta
   * funcionaba, las dos juntas no devolvían nada.
   *
   * CADA PALABRA TIENE QUE APARECER —se acumulan con Y— pero cada una puede
   * aparecer en cualquiera de las dos columnas —adentro de una palabra es O—.
   * Eso es lo que hace que el orden no importe ("hilux toyota" da lo mismo) y
   * que agregar una palabra siempre achique la lista en vez de agrandarla, que
   * es lo que espera cualquiera que sigue escribiendo.
   *
   * SIGUE SIENDO "CONTIENE", así que lo que ya andaba no se toca: "volks"
   * encuentra "Volkswagen", y "ilux" y "hilu" encuentran "Hilux".
   *
   * LO QUE ESTO NO ARREGLA, y conviene saberlo antes de prometerlo: un error
   * de tipeo de verdad ("hilix"), una letra de más, o los acentos —quien
   * escribe "citroen" no encuentra "Citroën"—. Para eso hace falta Postgres:
   * `unaccent` y `pg_trgm` con su índice, buscando por parecido cuando la
   * búsqueda exacta no devolvió nada. Es una migración y va aparte.
   *
   * Se cortan en `MAX_PALABRAS` porque cada palabra es una condición más en la
   * dirección de la consulta, y una búsqueda de treinta palabras no es una
   * búsqueda.
   * ---------------------------------------------------------------------- */
  if (filters.text) {
    for (const palabra of searchWords(filters.text)) {
      const term = quoteForOr(`%${escapeLike(palabra)}%`);
      result = result.or(`brand.ilike.${term},model.ilike.${term}`);
    }
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

  for (const spec of filters.specs ?? []) {
    // `specs->clave` compara dentro del JSON, respetando el tipo del dato;
    // `specs->>clave` lo saca como texto. Para los números la diferencia no es
    // cosmética: como texto, "1000" es MENOR que "800", así que un filtro de
    // carga mínima de 800 kg se comía todas las camionetas de una tonelada.
    // Se midió contra la base: 8 resultados en vez de 23.
    const column = spec.numeric ? `specs->${spec.key}` : `specs->>${spec.key}`;

    if (spec.op === 'gte') {
      result = result.gte(column, spec.value);
    } else if (spec.op === 'lte') {
      result = result.lte(column, spec.value);
    } else {
      result = result.eq(column, spec.value);
    }
  }

  return { query: result };
}

/**
 * Traduce lo que vino en la dirección a filtros sobre la ficha, **usando el
 * catálogo como única lista de claves válidas**.
 *
 * Recibe los campos que el tipo de vehículo declara y busca, para cada uno,
 * los parámetros `f_<clave>` (igual a), `f_<clave>_min` y `f_<clave>_max`.
 * Lo que no corresponda a un campo declarado no existe: ni se filtra ni se
 * avisa. Por eso una clave inventada en la dirección no llega nunca a la
 * consulta.
 *
 * Los rangos solo se arman para campos numéricos, y la igualdad solo para
 * opciones y sí/no. No es una restricción arbitraria: es lo que el catálogo
 * dice que es cada campo.
 */
export function buildSpecFilters(
  fields: VehicleTypeField[],
  params: Record<string, unknown>,
): SpecFilter[] {
  const filters: SpecFilter[] = [];

  for (const field of fields) {
    const numeric = field.data_type === 'number' || field.data_type === 'integer';

    if (numeric) {
      const min = numberParam(params[`f_${field.key}_min`]);
      if (min !== undefined) {
        filters.push({ key: field.key, op: 'gte', value: min, numeric: true });
      }

      const max = numberParam(params[`f_${field.key}_max`]);
      if (max !== undefined) {
        filters.push({ key: field.key, op: 'lte', value: max, numeric: true });
      }

      continue;
    }

    const raw = textParam(params[`f_${field.key}`]);
    if (raw === undefined) {
      continue;
    }

    if (field.data_type === 'boolean') {
      if (raw === 'true' || raw === 'false') {
        filters.push({ key: field.key, op: 'eq', value: raw === 'true', numeric: true });
      }
      continue;
    }

    if (field.data_type === 'select') {
      // Una opción que el catálogo no declara no se busca: devolvería vacío
      // igual, pero es mejor que no llegue a la consulta.
      const exists = (field.options ?? []).some((option) => option.value === raw);
      if (exists) {
        filters.push({ key: field.key, op: 'eq', value: raw, numeric: false });
      }
      continue;
    }

    filters.push({ key: field.key, op: 'eq', value: raw, numeric: false });
  }

  return filters;
}

/**
 * Un filtro de ficha pedido por el asistente, todavía sin validar: la clave es
 * la que dijo el modelo y el valor viene como texto.
 *
 * No es lo mismo que `SpecFilter`. Un `SpecRequest` es una intención; un
 * `SpecFilter` ya pasó por el catálogo.
 */
export interface SpecRequest {
  key: string;
  op: 'eq' | 'gte' | 'lte';
  value: string;
}

/**
 * Lo que el asistente pidió filtrar de la ficha, pasado por el catálogo.
 *
 * POR QUÉ NO TIENE VALIDACIÓN PROPIA
 *
 *   Traduce cada pedido al mismo nombre de parámetro que usaría la dirección
 *   (`f_engine_displacement_cc_min=250`) y deja que lo valide `buildSpecFilters`,
 *   que es la función que ya usa el muro. Así las dos puertas de entrada no solo
 *   comparten qué significa cada filtro: comparten qué filtro es válido.
 *
 *   Escribir acá una validación paralela sería la forma más fácil de que el
 *   asistente y la barra de búsqueda empiecen a diferir de a poco.
 */
export function specFiltersFromRequests(
  fields: VehicleTypeField[],
  requests: SpecRequest[],
): SpecFilter[] {
  const params: Record<string, unknown> = {};

  for (const request of requests) {
    const suffix = request.op === 'gte' ? '_min' : request.op === 'lte' ? '_max' : '';
    params[`f_${request.key}${suffix}`] = request.value;
  }

  return buildSpecFilters(fields, params);
}

function textParam(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text === '' ? undefined : text;
}

function numberParam(value: unknown): number | undefined {
  const text = textParam(value);
  if (text === undefined) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
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

/** Cuántas palabras de la búsqueda se miran. Ver el comentario de `filters.text`. */
const MAX_PALABRAS = 6;

/**
 * Parte lo que escribió la persona en palabras buscables.
 *
 * Separa por cualquier espacio y descarta los pedazos vacíos, que es lo que
 * dejan un espacio de más al final o dos seguidos en el medio —los dos son
 * moneda corriente escribiendo en un celular—. No saca los puntos ni las
 * equis de adentro de una palabra: "1.4" y "4x4" son modelos, no basura.
 */
function searchWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean).slice(0, MAX_PALABRAS);
}

/**
 * Deja un valor listo para meterlo adentro de un `or(...)` de PostgREST.
 *
 * Ahí las condiciones se separan con comas, así que una coma adentro de lo que
 * escribió la persona parte la condición al medio y la consulta vuelve con un
 * error. Entre comillas eso no pasa; adentro de las comillas hay que escapar
 * la comilla y la barra invertida.
 *
 * EL ORDEN IMPORTA, y es el contrario al que parece: primero se escapa para el
 * `like` (`escapeLike`) y recién después para el transporte. PostgREST desarma
 * las comillas antes de que el patrón llegue al `like`, así que la barra que
 * protege a un `%` buscado como texto tiene que viajar duplicada para llegar
 * entera. Al revés, el escape del `like` se perdería en el camino.
 */
function quoteForOr(value: string): string {
  return `"${value.replace(/["\\]/g, (match) => `\\${match}`)}"`;
}

import { supabasePublic } from '../lib/supabase.js';
import { HttpError } from '../lib/http-error.js';
import type { Brand, City, Province, VehicleType, VehicleTypeField } from '../types.js';

/**
 * Lectura del catálogo: qué tipos de vehículo existen y qué campos pide cada
 * uno. Es la fuente de verdad tanto para dibujar el formulario (frontend)
 * como para validarlo (backend).
 *
 * SE GUARDA EN MEMORIA POR UNOS MINUTOS, y esto no es una optimización
 * prematura: el catálogo lo lee TODO. Cada respuesta del asistente arranca
 * pidiendo los tipos y las provincias para armar el prompt; cada búsqueda del
 * muro los pide para dibujar los filtros; cada publicación que se guarda pide
 * su tipo para validar la ficha. Son cuatro consultas a Supabase que se
 * repiten decenas de veces por minuto para traer siempre lo mismo, y contra
 * una base que está del otro lado de internet cada una cuesta entre 50 y 300
 * milisegundos. Sobre una respuesta de IA que ya tarda, eso es tiempo que la
 * persona mira una pantalla quieta.
 *
 * Se puede guardar porque el catálogo es PÚBLICO e IGUAL PARA TODOS: se lee
 * con la clave anónima (`supabasePublic`), así que acá no hay dato de nadie ni
 * respuesta que dependa de quién pregunta. Guardar en memoria algo que se lee
 * con la sesión del usuario sería otra cosa muy distinta, y no se hace.
 *
 * El precio de tenerlo guardado: cargar un tipo de vehículo nuevo en la base
 * tarda hasta CATALOG_TTL_MS en aparecer. Es el mismo trato que ya tiene la
 * cotización del dólar en `exchange-rate.ts`.
 */

/** Cuánto vale lo guardado antes de volver a preguntar. */
const CATALOG_TTL_MS = 5 * 60_000;

interface Cached<T> {
  value: T;
  expires: number;
}

/**
 * Guarda lo que devuelve `read` por un rato.
 *
 * La promesa se guarda ANTES de que termine, a propósito: si llegan cinco
 * pedidos juntos con la memoria vencida —lo normal cuando se despierta el
 * servidor— los cinco esperan la misma consulta en vez de disparar cinco. Y si
 * esa consulta falla, lo guardado se tira para que el pedido siguiente vuelva
 * a intentar en vez de heredar el error por cinco minutos.
 */
function remember<T>(slot: { current: Cached<Promise<T>> | null }, read: () => Promise<T>): Promise<T> {
  const now = Date.now();

  if (slot.current && slot.current.expires > now) {
    return slot.current.value;
  }

  const value = read().catch((error: unknown) => {
    slot.current = null;
    throw error;
  });

  slot.current = { value, expires: now + CATALOG_TTL_MS };

  return value;
}

const vehicleTypesCache: { current: Cached<Promise<VehicleType[]>> | null } = { current: null };
const provincesCache: { current: Cached<Promise<Province[]>> | null } = { current: null };

/**
 * Tira lo guardado. Para los scripts que cargan catálogo y para las pruebas:
 * la aplicación no la llama, se espera al vencimiento.
 */
export function forgetCatalog(): void {
  vehicleTypesCache.current = null;
  provincesCache.current = null;
}

interface VehicleTypeRow {
  id: string;
  slug: string;
  name: string;
  name_plural: string;
  sort_order: number;
  annual_depreciation: string | number;
  wear_per_10k_km: string | number;
  fields: VehicleTypeField[] | null;
}

const VEHICLE_TYPE_SELECT = `
  id, slug, name, name_plural, sort_order,
  annual_depreciation, wear_per_10k_km,
  fields:vehicle_type_fields (
    id, key, label, data_type, options, unit,
    is_required, min_value, max_value, help_text, sort_order
  )
`;

/** Todos los tipos activos, con sus campos específicos, listos para el formulario. */
export function listVehicleTypes(): Promise<VehicleType[]> {
  return remember(vehicleTypesCache, async () => {
    const { data, error } = await supabasePublic
      .from('vehicle_types')
      .select(VEHICLE_TYPE_SELECT)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`No se pudo leer el catálogo de tipos de vehículo: ${error.message}`);
    }

    return ((data ?? []) as VehicleTypeRow[]).map(toVehicleType);
  });
}

/**
 * Un tipo puntual. Se usa antes de guardar una publicación, para saber contra
 * qué campos hay que validar la ficha `specs`.
 *
 * Sale de la misma lista que `listVehicleTypes` y no de una consulta propia:
 * son los mismos tipos activos con los mismos campos, y así una sola consulta
 * sirve para las dos cosas. La condición `is_active` viaja adentro de la lista,
 * así que un tipo dado de baja sigue dando el mismo error que antes.
 */
export async function getVehicleTypeById(vehicleTypeId: string): Promise<VehicleType> {
  const found = (await listVehicleTypes()).find((type) => type.id === vehicleTypeId);

  if (!found) {
    throw HttpError.badRequest('El tipo de vehículo elegido no existe o ya no está disponible.');
  }

  return found;
}

export function listProvinces(): Promise<Province[]> {
  return remember(provincesCache, async () => {
    const { data, error } = await supabasePublic
      .from('provinces')
      .select('id, slug, name')
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`No se pudieron leer las provincias: ${error.message}`);
    }

    return (data ?? []) as Province[];
  });
}

/**
 * Localidades sugeridas. Se devuelven todas de una: son unas pocas centenas y
 * el formulario filtra mientras el usuario escribe, sin ir y volver al
 * servidor en cada tecla.
 */
export async function listCities(): Promise<City[]> {
  const { data, error } = await supabasePublic
    .from('cities')
    .select('id, name, province_id')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`No se pudieron leer las localidades: ${error.message}`);
  }

  return (data ?? []) as City[];
}

interface BrandRow {
  id: string;
  name: string;
  brand_vehicle_types: { vehicle_type_id: string }[] | null;
}

/**
 * Marcas sugeridas, cada una con los tipos de vehículo en los que aparece.
 * Se devuelven todas de una: son unas cien y el formulario filtra por el tipo
 * elegido sin volver a consultar el servidor.
 */
export async function listBrands(): Promise<Brand[]> {
  const { data, error } = await supabasePublic
    .from('brands')
    .select('id, name, brand_vehicle_types ( vehicle_type_id )')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`No se pudieron leer las marcas: ${error.message}`);
  }

  return ((data ?? []) as BrandRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    vehicle_type_ids: (row.brand_vehicle_types ?? []).map((link) => link.vehicle_type_id),
  }));
}

function toVehicleType(row: VehicleTypeRow): VehicleType {
  return {
    ...row,
    // Postgres devuelve los `numeric` como texto para no perder precisión.
    annual_depreciation: Number(row.annual_depreciation),
    wear_per_10k_km: Number(row.wear_per_10k_km),
    // El orden de los campos embebidos no está garantizado por la consulta,
    // y el formulario los muestra en el orden que define el catálogo.
    fields: [...(row.fields ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  };
}

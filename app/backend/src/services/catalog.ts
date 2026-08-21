import { supabasePublic } from '../lib/supabase.js';
import { HttpError } from '../lib/http-error.js';
import type { Brand, City, Province, VehicleType, VehicleTypeField } from '../types.js';

/**
 * Lectura del catálogo: qué tipos de vehículo existen y qué campos pide cada
 * uno. Es la fuente de verdad tanto para dibujar el formulario (frontend)
 * como para validarlo (backend).
 */

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
export async function listVehicleTypes(): Promise<VehicleType[]> {
  const { data, error } = await supabasePublic
    .from('vehicle_types')
    .select(VEHICLE_TYPE_SELECT)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`No se pudo leer el catálogo de tipos de vehículo: ${error.message}`);
  }

  return ((data ?? []) as VehicleTypeRow[]).map(toVehicleType);
}

/**
 * Un tipo puntual. Se usa antes de guardar una publicación, para saber contra
 * qué campos hay que validar la ficha `specs`.
 */
export async function getVehicleTypeById(vehicleTypeId: string): Promise<VehicleType> {
  const { data, error } = await supabasePublic
    .from('vehicle_types')
    .select(VEHICLE_TYPE_SELECT)
    .eq('id', vehicleTypeId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer el tipo de vehículo: ${error.message}`);
  }

  if (!data) {
    throw HttpError.badRequest('El tipo de vehículo elegido no existe o ya no está disponible.');
  }

  return toVehicleType(data as VehicleTypeRow);
}

export async function listProvinces(): Promise<Province[]> {
  const { data, error } = await supabasePublic
    .from('provinces')
    .select('id, slug, name')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`No se pudieron leer las provincias: ${error.message}`);
  }

  return (data ?? []) as Province[];
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

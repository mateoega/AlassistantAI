/** Tipos compartidos por todo el backend. */

export type FieldDataType = 'text' | 'number' | 'integer' | 'boolean' | 'select';

export interface FieldOption {
  value: string;
  label: string;
}

/**
 * Definición de un campo específico de un tipo de vehículo, tal como está
 * cargada en la tabla `vehicle_type_fields`. Es lo que el frontend usa para
 * dibujar el formulario y lo que el backend usa para validarlo.
 */
export interface VehicleTypeField {
  id: string;
  key: string;
  label: string;
  data_type: FieldDataType;
  options: FieldOption[] | null;
  unit: string | null;
  is_required: boolean;
  min_value: number | null;
  max_value: number | null;
  help_text: string | null;
  sort_order: number;
}

export interface VehicleType {
  id: string;
  slug: string;
  name: string;
  name_plural: string;
  sort_order: number;

  /**
   * Cuánto valor pierde por año un vehículo de este tipo (0.08 = 8% anual) y
   * cuánto pierde por cada 10.000 km. Los usa la estimación de precio del
   * Sprint 3 para comparar avisos de años y kilometrajes distintos.
   *
   * Viven en el catálogo y no en el código a propósito: un tipo de vehículo
   * nuevo tiene que funcionar cargando una fila, sin redesplegar. Ver la
   * migración 20260821000001.
   */
  annual_depreciation: number;
  wear_per_10k_km: number;

  fields: VehicleTypeField[];
}

export interface Province {
  id: string;
  slug: string;
  name: string;
}

/** Localidad sugerida al cargar una publicación. La lista es parcial y ampliable. */
export interface City {
  id: string;
  name: string;
  province_id: string;
}

/**
 * Marca sugerida al cargar una publicación, con los tipos de vehículo en los
 * que aparece: Honda hace autos, motos y cuatriciclos, así que al publicar un
 * camión no tiene que ofrecerse.
 */
export interface Brand {
  id: string;
  name: string;
  vehicle_type_ids: string[];
}

/** Valor admitido dentro de la ficha flexible `specs`. */
export type SpecValue = string | number | boolean;

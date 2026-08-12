/**
 * Tipos que devuelve la API del backend.
 *
 * Nada de acá menciona autos, motos ni camiones: los tipos de vehículo y sus
 * campos llegan del catálogo en tiempo de ejecución.
 */

export type FieldDataType = 'text' | 'number' | 'integer' | 'boolean' | 'select';

export interface FieldOption {
  value: string;
  label: string;
}

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
  fields: VehicleTypeField[];
}

export interface Province {
  id: string;
  slug: string;
  name: string;
}

/** Localidad sugerida. La lista es parcial: la ciudad se guarda como texto libre. */
export interface City {
  id: string;
  name: string;
  province_id: string;
}

/**
 * Marca sugerida, con los tipos de vehículo en los que aparece. Honda hace
 * autos, motos y cuatriciclos; al publicar un camión no debe ofrecerse.
 * La lista es parcial: la marca se guarda como texto libre.
 */
export interface Brand {
  id: string;
  name: string;
  vehicle_type_ids: string[];
}

export interface Profile {
  id: string;
  display_name: string | null;
  phone: string | null;
}

/**
 * draft      borrador, solo lo ve su dueño
 * published  disponible, aparece en el muro
 * paused     fuera del muro, sin borrar nada
 * sold       vendido; queda como registro y se sigue viendo por enlace
 */
export type ListingStatus = 'draft' | 'published' | 'paused' | 'sold';

export const STATUS_LABEL: Record<ListingStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  paused: 'Pausado',
  sold: 'Vendido',
};

export interface ListingPhoto {
  id: string;
  storage_path: string;
  url: string;
}

export interface SpecDisplay {
  key: string;
  label: string;
  value: string;
}

export interface Listing {
  id: string;
  seller_id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  currency: 'ARS' | 'USD';
  kilometers: number;
  city: string;
  province: Province | null;
  description: string | null;
  status: ListingStatus;
  published_at: string | null;
  sold_at: string | null;
  created_at: string;
  vehicle_type: Pick<VehicleType, 'id' | 'slug' | 'name' | 'name_plural'> | null;
  seller: Profile | null;
  photos: ListingPhoto[];
  specs: Record<string, string | number | boolean>;
  /** La ficha específica ya traducida a "etiqueta: valor", lista para mostrar. */
  specs_display: SpecDisplay[];
}

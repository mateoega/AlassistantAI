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

/**
 * El análisis de IA de una publicación.
 *
 * Es una herramienta para quien COMPRA: describe lo que se ve en las fotos y
 * lo que no cierra con lo declarado. No dice si el precio está bien ni si
 * conviene comprar — eso necesita referencias de mercado y llega en el
 * Sprint 3. La forma la define app/backend/src/ia/types.ts.
 */
export type Confidence = 'alta' | 'media' | 'baja';

export interface ObservedAspect {
  aspecto: string;
  observacion: string;
}

export interface Inconsistency {
  que: string;
  por_que_importa: string;
  confianza: Confidence;
}

export interface VehicleAnalysis {
  resumen: string;
  estado_observado: ObservedAspect[];
  inconsistencias: Inconsistency[];
  falta_ver: string[];
  preguntas_al_vendedor: string[];
}

/** Un aviso encontrado por el asistente al buscar entre las publicaciones. */
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

export type AnalysisStatus = 'running' | 'done' | 'failed';

export interface AnalysisRecord {
  status: AnalysisStatus;
  result: VehicleAnalysis | null;
  error_message: string | null;
  model: string | null;
  updated_at: string;
  /** Las fotos o los datos cambiaron desde que se hizo: puede no corresponder. */
  is_stale: boolean;
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

/**
 * La estimación de precio del Sprint 3.
 *
 * Su forma la define `app/backend/src/services/price-estimate.ts`. Es una
 * unión: o hay estimación, o hay un motivo por el que no la hay. No existe el
 * estado intermedio de "estimación vacía" a propósito — un rango sin datos
 * detrás es exactamente lo que la plataforma no quiere mostrar.
 */
export interface EstimateComparable {
  id: string;
  titulo: string;
  anio: number;
  kilometros: number;
  precio: number;
  moneda: 'ARS' | 'USD';
  precio_ajustado: number;
  vendido: boolean;
}

export interface ExternalReference {
  fuente: string;
  valor: number;
  minimo: number | null;
  maximo: number | null;
  moneda: 'ARS' | 'USD';
  anio_fuente: number;
  versiones: number;
}

export interface PriceEstimateAvailable {
  disponible: true;
  origen: 'comparables' | 'referencia';
  moneda: 'ARS' | 'USD';
  minimo: number;
  maximo: number;
  central: number;
  confianza: Confidence;
  precio_pedido: number;
  posicion: 'dentro' | 'por_encima' | 'por_debajo';
  desvio_porcentual: number;
  comparables: EstimateComparable[];
  referencia_externa: ExternalReference | null;
  cotizacion: { pesos_por_dolar: number; fuente: string; obtenida_en: string } | null;
  calculado_en: string;
}

export interface PriceEstimateUnavailable {
  disponible: false;
  motivo: string;
  comparables_encontrados: number;
}

export type PriceEstimate = PriceEstimateAvailable | PriceEstimateUnavailable;

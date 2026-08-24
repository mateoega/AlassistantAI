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

/**
 * El perfil propio, tal como lo devuelve `/api/profile`.
 *
 * El teléfono es solo para uno mismo: desde el Sprint 5 no viaja dentro de las
 * publicaciones, porque el contacto pasó a ser la mensajería interna y no hay
 * ninguna pantalla que lo muestre a otro.
 */
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
  seller: Pick<Profile, 'id' | 'display_name'> | null;
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
  /** Lo que dice la fuente externa, aunque no alcance para estimar. */
  referencia_externa: ExternalReference | null;
}

export type PriceEstimate = PriceEstimateAvailable | PriceEstimateUnavailable;

/**
 * La mensajería interna del Sprint 5.
 *
 * Su forma la define `app/backend/src/services/conversations.ts`. Dos detalles
 * que no se ven en los nombres:
 *
 *   `listing_title` viene copiado del día que empezó la charla, así que la
 *   conversación se puede mostrar aunque el aviso ya no exista.
 *
 *   `listing` en `null` con `listing_id` cargado significa que el vendedor lo
 *   pausó; con `listing_id` en `null`, que lo borró. Son cosas distintas y la
 *   pantalla las dice distinto.
 */
export interface ConversationListing {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number | null;
  currency: 'ARS' | 'USD';
  status: ListingStatus;
  photo_url: string | null;
}

export interface Conversation {
  id: string;
  listing_id: string | null;
  listing_title: string;
  /** Qué soy yo acá: el que preguntó o el que publicó. */
  role: 'buyer' | 'seller';
  counterpart: { id: string; display_name: string | null };
  last_message: { body: string; mine: boolean } | null;
  last_message_at: string;
  unread_count: number;
  listing: ConversationListing | null;
}

export interface ConversationMessage {
  id: string;
  body: string;
  /** Si lo escribí yo. Define de qué lado de la pantalla va. */
  mine: boolean;
  created_at: string;
}

/**
 * Si hay un bloqueo de por medio y si ya se denunció esta conversación.
 *
 * `blocked` es "hay un bloqueo, venga de donde venga" y `blocked_by_me` es "lo
 * puse yo". La pantalla usa los dos para decir cosas distintas: quien bloqueó
 * ve que puede deshacerlo, y quien fue bloqueado ve que no se puede escribir,
 * **sin que se le diga quién lo decidió**.
 */
export interface ConversationModeration {
  counterpart_id: string;
  blocked: boolean;
  blocked_by_me: boolean;
  reported_by_me: boolean;
}

export interface ConversationThread extends Conversation {
  messages: ConversationMessage[];
  moderation: ConversationModeration;
}

/** Un motivo de denuncia, tal como lo declara el backend. */
export interface ReportReason {
  value: string;
  label: string;
}

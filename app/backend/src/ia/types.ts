/**
 * Qué devuelve el análisis de una publicación.
 *
 * Es lo que se guarda en `listing_analyses.result` y lo que muestra el panel
 * del comprador, así que cambiar esta forma implica tocar la base, el backend
 * y el frontend a la vez.
 *
 * DECISIÓN DE PRODUCTO: acá no hay veredicto ni precio.
 *
 *   El análisis describe lo que se ve y señala lo que no cierra, pero no
 *   dictamina si el vehículo es una buena compra. Todavía no tiene contra qué
 *   comparar: las referencias de precios de mercado llegan en el Sprint 3.
 *   Un veredicto sin esos datos sería una opinión con cara de dato, y la
 *   confianza es justamente lo que la plataforma vende.
 */

/** Qué tan seguro está el análisis de lo que señala. */
export type Confidence = 'alta' | 'media' | 'baja';

export const CONFIDENCE_LEVELS: Confidence[] = ['alta', 'media', 'baja'];

export interface ObservedAspect {
  /**
   * Qué parte del vehículo. Los aspectos los propone el modelo según el tipo:
   * en una moto puede ser la cadena, en un camión la caja de carga. No hay
   * lista de aspectos escrita en el código, por la misma razón que no hay
   * lista de tipos de vehículo.
   */
  aspecto: string;
  observacion: string;
}

export interface Inconsistency {
  /** Qué no cierra, en una frase. */
  que: string;
  /** Por qué le importa a quien está por comprar. */
  por_que_importa: string;
  confianza: Confidence;
}

export interface VehicleAnalysis {
  /** Dos o tres frases en lenguaje simple. Es lo primero que se lee. */
  resumen: string;
  estado_observado: ObservedAspect[];
  /** Puede venir vacío: que no se detecte nada raro también es información. */
  inconsistencias: Inconsistency[];
  /** Qué no se puede evaluar con las fotos que hay. */
  falta_ver: string[];
  preguntas_al_vendedor: string[];
}

/** Cómo viaja el análisis del backend al frontend. */
export type AnalysisStatus = 'running' | 'done' | 'failed';

export interface AnalysisRecord {
  status: AnalysisStatus;
  result: VehicleAnalysis | null;
  error_message: string | null;
  model: string | null;
  updated_at: string;
  /**
   * Las fotos o los datos declarados cambiaron desde que se hizo el análisis,
   * así que lo que dice puede no corresponder a lo que se está viendo.
   */
  is_stale: boolean;
}

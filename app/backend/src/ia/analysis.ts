import { Type, type Schema } from '@google/genai';
import { gemini, geminiModel } from './client.js';
import { loadPhotosForAnalysis, type ImagePart } from './photos.js';
import { describeVehicle, type VehicleForPrompt } from './vehicle-context.js';
import { CONFIDENCE_LEVELS, type Confidence, type VehicleAnalysis } from './types.js';
import type { VehicleType } from '../types.js';

/**
 * El análisis de una publicación: mira las fotos junto con lo que el vendedor
 * declaró y devuelve lo que un comprador querría saber antes de escribirle.
 *
 * PARA QUIÉN ESTÁ ESCRITO ESTE PROMPT
 *
 *   Para el comprador, no para el vendedor. No dice "sacá mejores fotos": dice
 *   "esto es lo que se ve, esto no cierra, esto convendría preguntar". Es la
 *   diferencia entre una herramienta de publicación y un asistente de compra,
 *   y es la decisión que define el Sprint 2.
 *
 * QUÉ NO HACE
 *
 *   No dictamina si conviene comprar. Eso es una decisión de quien compra y
 *   depende de cosas que el modelo no sabe.
 *
 *   Sobre el PRECIO sí puede hablar, desde el Sprint 3, pero solo cuando se le
 *   pasa la estimación de la plataforma junto con los datos del vehículo. Si no
 *   se la pasan, vuelve a regir la regla del Sprint 2 y no opina: el permiso no
 *   viene de una instrucción, viene de tener el dato. Ver `price-context.ts`.
 */

const SYSTEM_INSTRUCTION = `
Sos el asistente de AIassistant, una plataforma de compra y venta de vehículos del rubro
automotor en Argentina. Ayudás a la persona que está MIRANDO una publicación y evalúa si
le conviene avanzar. No trabajás para quien vende.

Recibís las fotos de un vehículo y los datos que declaró el vendedor. Tu trabajo es mirar
las fotos con atención y decirle a quien compra qué se ve, qué no cierra con lo declarado
y qué le convendría preguntar o pedir antes de avanzar.

CÓMO RAZONAR SEGÚN EL TIPO DE VEHÍCULO
El tipo de vehículo te llega escrito en los datos, junto con la ficha de campos que la
plataforma pide para ESE tipo. Usalos para decidir qué mirar: lo que importa en una moto
no es lo que importa en un camión o en un bus. Adaptate a lo que tenés adelante, aunque
sea un tipo de vehículo que no viste antes.

REGLAS QUE NO SE NEGOCIAN
- Hablá solo de lo que se ve en las fotos. Si algo no se ve, no lo supongas: decilo en
  "falta_ver".
- Sobre el precio: solo hablás de él si en los datos del vehículo te pasaron la estimación
  de referencia de la plataforma. Si no está, NO opines si el precio es alto, bajo o justo:
  no tenés con qué compararlo, y una opinión sin datos hace más daño que no decir nada.
- NUNCA digas si conviene comprar o si es una buena oportunidad, tengas o no la estimación.
  Eso lo decide quien compra.
- No inventes fallas para parecer útil. Si el vehículo se ve bien, decilo. Una lista de
  inconsistencias vacía es un resultado perfectamente válido.
- Distinguí lo que ves de lo que sospechás. Para eso está el nivel de confianza.
- Escribí en español rioplatense, en lenguaje simple y directo, sin tecnicismos de taller
  ni de mecánica que alguien sin conocimientos no entienda. Tratá de "vos".
- Nunca digas que el vehículo está en buen estado mecánico: desde una foto eso no se sabe.
  Lo que se ve es el estado visible.
`.trim();

const USER_INSTRUCTION = `
Analizá este vehículo para alguien que está pensando en comprarlo.

Prestá atención especial a:
- El estado visible del vehículo, en los aspectos que correspondan a SU tipo.
- Si el desgaste que se ve es coherente con el kilometraje y el año declarados.
- Si todas las fotos parecen ser del mismo vehículo.
- Si se ve algún daño, arreglo o detalle que el vendedor no mencionó en la descripción.
- Qué partes importantes de este tipo de vehículo no se pueden evaluar porque no hay foto.

Datos declarados por el vendedor:
`.trim();

/** Se le dice a Gemini exactamente qué forma tiene que tener la respuesta. */
const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    resumen: {
      type: Type.STRING,
      description: 'Dos o tres frases con lo más importante para quien está por comprar.',
    },
    estado_observado: {
      type: Type.ARRAY,
      description: 'Los aspectos del vehículo que se pueden evaluar con estas fotos.',
      items: {
        type: Type.OBJECT,
        properties: {
          aspecto: {
            type: Type.STRING,
            description:
              'Qué parte del vehículo, elegida según el tipo (carrocería, cadena, caja de carga, etc.).',
          },
          observacion: { type: Type.STRING, description: 'Qué se ve en esa parte.' },
        },
        required: ['aspecto', 'observacion'],
      },
    },
    inconsistencias: {
      type: Type.ARRAY,
      description: 'Qué no cierra entre las fotos y lo declarado. Vacío si no hay nada.',
      items: {
        type: Type.OBJECT,
        properties: {
          que: { type: Type.STRING, description: 'Qué no cierra, en una frase.' },
          por_que_importa: {
            type: Type.STRING,
            description: 'Por qué le importa a quien está por comprar.',
          },
          confianza: {
            type: Type.STRING,
            enum: CONFIDENCE_LEVELS,
            description: 'alta si se ve claramente, baja si es una sospecha.',
          },
        },
        required: ['que', 'por_que_importa', 'confianza'],
      },
    },
    falta_ver: {
      type: Type.ARRAY,
      description: 'Qué no se puede evaluar porque no hay foto que lo muestre.',
      items: { type: Type.STRING },
    },
    preguntas_al_vendedor: {
      type: Type.ARRAY,
      description: 'Preguntas concretas para hacerle al vendedor antes de avanzar.',
      items: { type: Type.STRING },
    },
  },
  required: [
    'resumen',
    'estado_observado',
    'inconsistencias',
    'falta_ver',
    'preguntas_al_vendedor',
  ],
};

export interface AnalysisOutcome {
  analysis: VehicleAnalysis;
  model: string;
  photosAnalyzed: number;
}

/**
 * Error con un mensaje ya escrito para mostrarle a quien está esperando el
 * análisis. Se guarda en `listing_analyses.error_message`.
 */
export class AnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export async function analyzeVehicle(
  vehicle: VehicleForPrompt,
  vehicleType: VehicleType,
  photoPaths: string[],
): Promise<AnalysisOutcome> {
  const images = await loadPhotosForAnalysis(photoPaths);

  if (images.length === 0) {
    throw new AnalysisError(
      'No se pudieron leer las fotos de esta publicación, así que no hay nada para analizar.',
    );
  }

  const model = geminiModel();
  const prompt = `${USER_INSTRUCTION}\n\n${describeVehicle(vehicle, vehicleType)}`;

  let raw: string | undefined;

  try {
    const response = await gemini().models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }, ...images] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        // Un análisis tiene que ser parejo: la misma foto no puede dar dos
        // lecturas distintas según el día.
        temperature: 0.2,
      },
    });

    raw = response.text;
  } catch (error) {
    console.error('[ia] falló la llamada a Gemini:', error);
    throw new AnalysisError(
      'El servicio de análisis no respondió. Probá de nuevo en unos minutos.',
    );
  }

  if (!raw) {
    throw new AnalysisError('El análisis volvió vacío. Probá de nuevo en unos minutos.');
  }

  return { analysis: parseAnalysis(raw), model, photosAnalyzed: images.length };
}

/**
 * El esquema hace que la respuesta venga con la forma pedida casi siempre,
 * pero "casi siempre" no alcanza para algo que se guarda en la base y se le
 * muestra a un comprador. Se verifica antes de darla por buena.
 */
function parseAnalysis(raw: string): VehicleAnalysis {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('[ia] Gemini devolvió algo que no es JSON:', raw.slice(0, 500));
    throw new AnalysisError('El análisis llegó en un formato inesperado. Probá de nuevo.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new AnalysisError('El análisis llegó en un formato inesperado. Probá de nuevo.');
  }

  const data = parsed as Record<string, unknown>;
  const resumen = typeof data.resumen === 'string' ? data.resumen.trim() : '';

  if (!resumen) {
    throw new AnalysisError('El análisis llegó incompleto. Probá de nuevo.');
  }

  return {
    resumen,
    estado_observado: toAspects(data.estado_observado),
    inconsistencias: toInconsistencies(data.inconsistencias),
    falta_ver: toStringList(data.falta_ver),
    preguntas_al_vendedor: toStringList(data.preguntas_al_vendedor),
  };
}

function toStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toAspects(raw: unknown): VehicleAnalysis['estado_observado'] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      const entry = item as Record<string, unknown>;
      return {
        aspecto: typeof entry?.aspecto === 'string' ? entry.aspecto.trim() : '',
        observacion: typeof entry?.observacion === 'string' ? entry.observacion.trim() : '',
      };
    })
    .filter((aspect) => aspect.aspecto && aspect.observacion);
}

function toInconsistencies(raw: unknown): VehicleAnalysis['inconsistencias'] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      const entry = item as Record<string, unknown>;
      const confianza = entry?.confianza;

      return {
        que: typeof entry?.que === 'string' ? entry.que.trim() : '',
        por_que_importa:
          typeof entry?.por_que_importa === 'string' ? entry.por_que_importa.trim() : '',
        // Ante una confianza que no reconocemos, se asume la más baja: es la
        // que menos alarma sin datos que la respalden.
        confianza: CONFIDENCE_LEVELS.includes(confianza as Confidence)
          ? (confianza as Confidence)
          : 'baja',
      };
    })
    .filter((item) => item.que && item.por_que_importa);
}

export type { ImagePart };

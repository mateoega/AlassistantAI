import { Type, type Content, type FunctionDeclaration, type Schema } from '@google/genai';
import { gemini, geminiModel } from './client.js';
import type { ListingSearchFilters, ListingSearchResult } from '../services/listing-search.js';
import type { Province, VehicleType } from '../types.js';
import { REGLAS_DE_PRECIO } from './price-context.js';
import { HttpError } from '../lib/http-error.js';

/**
 * El asistente conversacional que acompaña al comprador.
 *
 * QUÉ LO HACE DISTINTO DE UN CHAT GENÉRICO
 *
 *   Sabe qué aviso hay en pantalla, conoce el catálogo real de la plataforma y
 *   puede buscar entre las publicaciones que existen de verdad. Un chat que no
 *   sabe nada de eso es un ChatGPT metido en una página.
 *
 * SIN ESTADO EN EL SERVIDOR
 *
 *   La conversación entera viaja en cada pedido desde el navegador. No hay
 *   tabla de conversaciones ni historial guardado: la charla vive mientras
 *   dura la visita. Fue una decisión, no una omisión — guardar conversaciones
 *   es buena parte de lo que cuesta la mensajería del Sprint 5.
 *
 * LAS FOTOS NO VIAJAN ACÁ
 *
 *   Mandar las imágenes en cada mensaje sería lento y caro. En cambio, si la
 *   publicación ya tiene un análisis hecho, se le pasa ESE texto al asistente:
 *   así puede hablar de lo que se ve en las fotos sin volver a mirarlas.
 */

export type ChatRole = 'user' | 'model';

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

/** Qué sabe el asistente cuando arranca a responder. */
export interface ChatContext {
  vehicleTypes: VehicleType[];
  provinces: Province[];
  /** El aviso abierto en pantalla, ya descrito en palabras. */
  currentListing: string | null;
  /** El análisis de ese aviso, si alguien ya lo pidió. */
  currentAnalysis: string | null;
  /**
   * La estimación de precio del aviso en pantalla, ya contada en palabras.
   * Cuando es `null`, el asistente no habla de precios: la restricción del
   * Sprint 2 sigue valiendo para ese vehículo. Ver `price-context.ts`.
   */
  currentEstimate: string | null;
}

/** Cómo se ejecuta la búsqueda. La provee el backend, que tiene la sesión. */
export type SearchRunner = (filters: ListingSearchFilters) => Promise<ListingSearchResult[]>;

/**
 * Cuántas veces se le permite al modelo encadenar búsquedas antes de contestar.
 * Con dos alcanza para "buscá motos" y después "probá subiendo el presupuesto";
 * el tope existe para que una conversación no se vaya de costo por un bucle.
 */
const MAX_TOOL_ROUNDS = 3;

const SEARCH_TOOL_NAME = 'buscar_publicaciones';

const SEARCH_PARAMETERS: Schema = {
  type: Type.OBJECT,
  properties: {
    vehicle_type_slug: {
      type: Type.STRING,
      description:
        'Identificador del tipo de vehículo, exactamente como figura en la lista de tipos que te pasaron. No lo inventes.',
    },
    brand: { type: Type.STRING, description: 'Marca, por ejemplo "Volkswagen" o "Honda".' },
    text: { type: Type.STRING, description: 'Texto libre que busca en marca y modelo.' },
    price_min: { type: Type.NUMBER, description: 'Precio mínimo.' },
    price_max: { type: Type.NUMBER, description: 'Precio máximo.' },
    currency: {
      type: Type.STRING,
      enum: ['ARS', 'USD'],
      description: 'Moneda del precio. ARS son pesos argentinos.',
    },
    year_min: { type: Type.INTEGER, description: 'Año más viejo aceptable.' },
    year_max: { type: Type.INTEGER, description: 'Año más nuevo aceptable.' },
    kilometers_max: { type: Type.INTEGER, description: 'Kilometraje máximo.' },
    province_slug: {
      type: Type.STRING,
      description:
        'Identificador de la provincia, exactamente como figura en la lista que te pasaron.',
    },
  },
};

const SEARCH_DECLARATION: FunctionDeclaration = {
  name: SEARCH_TOOL_NAME,
  description:
    'Busca publicaciones de vehículos que están a la venta en la plataforma. Usala cuando la persona ' +
    'pida ver vehículos, pregunte qué hay disponible, o quiera comparar con otras opciones. ' +
    'Devuelve pocos resultados: si son muchos, pedile que acote la búsqueda.',
  parameters: SEARCH_PARAMETERS,
};

function systemInstruction(context: ChatContext): string {
  // El catálogo se lee de la base, no está escrito acá. Un tipo de vehículo
  // cargado hoy desde el panel de Supabase aparece en esta lista sin tocar
  // código, igual que en el formulario y en el análisis.
  const types = context.vehicleTypes
    .map((type) => `${type.slug} (${type.name_plural})`)
    .join(', ');

  const provinces = context.provinces
    .map((province) => `${province.slug} (${province.name})`)
    .join(', ');

  const parts = [
    `
Sos el asistente de AIassistant, una plataforma argentina de compra y venta de vehículos de todo
el rubro automotor. Acompañás a la persona que está BUSCANDO o MIRANDO un vehículo. No trabajás
para quien vende.

CÓMO HABLÁS
- Español rioplatense, tratando de "vos". Simple y directo, sin tecnicismos de taller.
- Respuestas cortas. Esto es un chat al costado de la pantalla, no un informe.
- Si no sabés algo, decilo. No inventes datos de un vehículo que no tenés.

QUÉ PODÉS Y QUÉ NO
- Podés buscar publicaciones reales de la plataforma con la herramienta ${SEARCH_TOOL_NAME}.
  Usá los identificadores de las listas de abajo, nunca inventes uno.
- Cuando muestres resultados, listalos con marca, modelo, año, precio y ubicación.
- Sobre precios: solo podés hablar del precio de un vehículo si más abajo te pasaron la
  estimación de la plataforma para ESE vehículo. Si no te la pasaron, no la tenés: decilo con
  naturalidad y ofrecé lo que sí podés hacer. Nunca estimes un precio de memoria.
- No sos un mecánico ni un perito. Lo que decís es orientativo y no reemplaza ver el vehículo.
`.trim(),
    `Tipos de vehículo de la plataforma: ${types}.`,
    `Provincias: ${provinces}.`,
  ];

  if (context.currentListing) {
    parts.push(
      [
        'La persona está mirando esta publicación en este momento. Cuando pregunte por "este vehículo"',
        'o "el que estoy viendo", se refiere a esta:',
        '',
        context.currentListing,
      ].join('\n'),
    );
  }

  if (context.currentEstimate) {
    parts.push(
      [
        'Precio de referencia de esa publicación, calculado por la plataforma:',
        '',
        context.currentEstimate,
        '',
        REGLAS_DE_PRECIO,
      ].join('\n'),
    );
  }

  if (context.currentAnalysis) {
    parts.push(
      [
        'La plataforma ya analizó las fotos de esa publicación. Podés usar y citar este análisis',
        'para responder sobre el estado del vehículo (vos no estás viendo las fotos directamente):',
        '',
        context.currentAnalysis,
      ].join('\n'),
    );
  } else if (context.currentListing) {
    parts.push(
      'Nadie pidió todavía el análisis de fotos de esa publicación. Si la persona pregunta por el ' +
        'estado del vehículo, contale que puede apretar "Analizar esta publicación" en la pantalla.',
    );
  }

  return parts.join('\n\n');
}

export interface ChatReply {
  text: string;
  /** Los avisos que el asistente encontró, para poder enlazarlos en pantalla. */
  results: ListingSearchResult[];
}

/**
 * Llama al modelo y traduce sus caídas a algo que se pueda leer en pantalla.
 *
 * POR QUÉ EXISTE
 *
 *   Cuando Google devuelve 503 —"este modelo está con mucha demanda"—, el
 *   error viajaba como un problema interno y en pantalla se leía "ocurrió un
 *   problema en el servidor". Eso manda a buscar la falla en el lugar
 *   equivocado: no hay nada roto de este lado, hay que esperar un momento.
 *
 *   Es la misma lección del 2026-08-17, cuando un fallo del proveedor de IA se
 *   presentó como un error genérico y costó encontrarlo.
 */
async function pedirAlModelo<T>(llamada: () => Promise<T>): Promise<T> {
  try {
    return await llamada();
  } catch (error) {
    const status = (error as { status?: number } | null)?.status;

    if (status === 503 || status === 429) {
      throw HttpError.unavailable(
        'El asistente está con mucha demanda en este momento. Probá de nuevo en unos segundos.',
      );
    }

    throw error;
  }
}

export async function replyToChat(
  messages: ChatMessage[],
  context: ChatContext,
  runSearch: SearchRunner,
): Promise<ChatReply> {
  const model = geminiModel();

  const history: Content[] = messages.map((message) => ({
    role: message.role,
    parts: [{ text: message.text }],
  }));

  const found: ListingSearchResult[] = [];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const response = await pedirAlModelo(() =>
      gemini().models.generateContent({
        model,
        contents: history,
        config: {
          systemInstruction: systemInstruction(context),
          tools: [{ functionDeclarations: [SEARCH_DECLARATION] }],
          temperature: 0.4,
        },
      }),
    );

    const calls = response.functionCalls ?? [];

    // Sin pedido de búsqueda, esto ya es la respuesta final.
    if (calls.length === 0) {
      return { text: response.text?.trim() ?? '', results: found };
    }

    // En la última vuelta permitida ya no se ejecutan más búsquedas: se le pide
    // que responda con lo que tiene.
    if (round === MAX_TOOL_ROUNDS) {
      break;
    }

    /**
     * El turno del modelo se reenvía TAL CUAL vino, no reconstruido a partir de
     * `calls`. Desde Gemini 3, cada pedido de herramienta viaja acompañado de
     * una firma interna (`thoughtSignature`) que hay que devolver intacta en la
     * vuelta siguiente. Rearmar la parte con solo `functionCall` la pierde, y la
     * API rechaza todo el pedido con un 400 — que era el error que dejaba al
     * chat contestando "ocurrió un problema en el servidor" apenas intentaba
     * buscar publicaciones.
     */
    const modelTurn = response.candidates?.[0]?.content;
    history.push(
      modelTurn?.parts?.length
        ? { role: 'model', parts: modelTurn.parts }
        : { role: 'model', parts: calls.map((call) => ({ functionCall: call })) },
    );

    const answers = await Promise.all(
      calls.map(async (call) => {
        if (call.name !== SEARCH_TOOL_NAME) {
          return {
            functionResponse: {
              name: call.name ?? 'desconocida',
              response: { error: 'Esa herramienta no existe.' },
            },
          };
        }

        try {
          const results = await runSearch(toFilters(call.args));
          found.push(...results);

          return {
            functionResponse: {
              name: SEARCH_TOOL_NAME,
              response: { resultados: results, cantidad: results.length },
            },
          };
        } catch (error) {
          console.error('[ia] falló la búsqueda pedida por el asistente:', error);
          return {
            functionResponse: {
              name: SEARCH_TOOL_NAME,
              response: { error: 'No se pudo completar la búsqueda.' },
            },
          };
        }
      }),
    );

    history.push({ role: 'user', parts: answers });
  }

  return {
    text: 'Encontré resultados pero no llegué a resumirlos. Probá preguntándome de nuevo, más acotado.',
    results: found,
  };
}

/**
 * Lo que devuelve el modelo es texto, no un objeto de confianza. Se convierte
 * campo por campo y se descarta lo que no encaje, en vez de pasárselo tal cual
 * a una consulta contra la base.
 */
function toFilters(args: unknown): ListingSearchFilters {
  if (typeof args !== 'object' || args === null) {
    return {};
  }

  const raw = args as Record<string, unknown>;
  const filters: ListingSearchFilters = {};

  const slug = text(raw.vehicle_type_slug);
  if (slug) filters.vehicle_type_slug = slug;

  const brand = text(raw.brand);
  if (brand) filters.brand = brand;

  const free = text(raw.text);
  if (free) filters.text = free;

  const province = text(raw.province_slug);
  if (province) filters.province_slug = province;

  if (raw.currency === 'ARS' || raw.currency === 'USD') {
    filters.currency = raw.currency;
  }

  const priceMin = number(raw.price_min);
  if (priceMin !== undefined) filters.price_min = priceMin;

  const priceMax = number(raw.price_max);
  if (priceMax !== undefined) filters.price_max = priceMax;

  const yearMin = number(raw.year_min);
  if (yearMin !== undefined) filters.year_min = yearMin;

  const yearMax = number(raw.year_max);
  if (yearMax !== undefined) filters.year_max = yearMax;

  const kmMax = number(raw.kilometers_max);
  if (kmMax !== undefined) filters.kilometers_max = kmMax;

  return filters;
}

function text(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function number(raw: unknown): number | undefined {
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

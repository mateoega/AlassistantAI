import {
  Type,
  type Content,
  type FunctionCall,
  type FunctionDeclaration,
  type Part,
  type Schema,
} from '@google/genai';
import { gemini, geminiModel } from './client.js';
import type { ListingSearchFilters, ListingSearchResult } from '../services/listing-search.js';
import type { SpecRequest } from '../services/listing-filters.js';
import type { Province, VehicleType, VehicleTypeField } from '../types.js';
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

/**
 * Lo que el modelo pidió buscar: los filtros comunes ya convertidos, y los de
 * la ficha **tal como los pidió, sin validar**.
 *
 * Los de la ficha viajan aparte porque acá no se puede decidir si son válidos:
 * qué campos tiene una moto lo dice el catálogo, y el catálogo se lee en el
 * backend. Este archivo no inventa una lista de campos por tipo — es la misma
 * regla por la que el prompt del análisis sale del catálogo y no del código.
 */
export interface ChatSearchRequest {
  filters: ListingSearchFilters;
  specRequests: SpecRequest[];
}

/** Cómo se ejecuta la búsqueda. La provee el backend, que tiene la sesión. */
export type SearchRunner = (request: ChatSearchRequest) => Promise<ListingSearchResult[]>;

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
    ficha: {
      type: Type.ARRAY,
      description:
        'Filtros por los datos propios del tipo de vehículo: cilindrada en motos, capacidad de ' +
        'carga en camiones, aire acondicionado en buses. Solo se pueden usar junto con ' +
        'vehicle_type_slug, y solo con las claves que la lista de ese tipo declara.',
      items: {
        type: Type.OBJECT,
        properties: {
          clave: {
            type: Type.STRING,
            description: 'La clave del campo, tal cual figura en la lista del tipo de vehículo.',
          },
          operador: {
            type: Type.STRING,
            enum: ['igual', 'minimo', 'maximo'],
            description:
              '"minimo" y "maximo" son solo para campos numéricos; "igual" para los de opciones y ' +
              'los de sí/no.',
          },
          valor: {
            type: Type.STRING,
            description:
              'El valor buscado. Para sí/no va "true" o "false"; para los de opciones, el valor ' +
              'declarado en la lista, no su etiqueta.',
          },
        },
        required: ['clave', 'operador', 'valor'],
      },
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
- TEXTO PLANO, SIN MARKDOWN. La pantalla muestra tu respuesta tal cual la escribís: no
  interpreta asteriscos ni almohadillas. Un "**Precio:**" se lee con los asteriscos puestos.
  Para enumerar usá un guion al principio del renglón, y para destacar algo, escribilo primero.

QUÉ PODÉS Y QUÉ NO
- Podés buscar publicaciones reales de la plataforma con la herramienta ${SEARCH_TOOL_NAME}.
  Usá los identificadores de las listas de abajo, nunca inventes uno.
- Para filtrar por los datos propios de un tipo —cilindrada, capacidad de carga, aire
  acondicionado— usá el parámetro "ficha" junto con el tipo de vehículo. Las claves posibles son
  las de la lista de más abajo y ninguna otra: una clave que no esté ahí se ignora, y la búsqueda
  vuelve sin ese filtro. Si te piden filtrar por algo que ese tipo no declara, decilo en vez de
  buscar como si nada.
- Cuando muestres resultados, listalos con marca, modelo, año, precio y ubicación.
- Sobre precios: solo podés hablar del precio de un vehículo si más abajo te pasaron la
  estimación de la plataforma para ESE vehículo. Si no te la pasaron, no la tenés: decilo con
  naturalidad y ofrecé lo que sí podés hacer. Nunca estimes un precio de memoria.
- No sos un mecánico ni un perito. Lo que decís es orientativo y no reemplaza ver el vehículo.
`.trim(),
    `Tipos de vehículo de la plataforma: ${types}.`,
    `Provincias: ${provinces}.`,
    describeSpecFields(context.vehicleTypes),
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

/**
 * Qué se puede filtrar en cada tipo de vehículo, contado en palabras.
 *
 * Sale entero del catálogo: los campos, sus claves, sus unidades y sus
 * opciones. Un tipo cargado hoy desde el panel de Supabase queda filtrable por
 * sus campos sin tocar este archivo, igual que aparece solo en el formulario.
 *
 * Los campos de texto libre quedan afuera a propósito: un filtro de igualdad
 * exacta sobre texto escrito a mano no encuentra nada, y hacerle creer al
 * modelo que puede usarlo termina en una búsqueda vacía sin explicación.
 */
function describeSpecFields(vehicleTypes: VehicleType[]): string {
  const lines = vehicleTypes
    .map((type) => {
      const fields = type.fields.filter((field) => field.data_type !== 'text');

      if (fields.length === 0) {
        return null;
      }

      return `- ${type.slug}: ${fields.map(describeField).join('; ')}`;
    })
    .filter((line): line is string => line !== null);

  if (lines.length === 0) {
    return 'Ningún tipo de vehículo declara campos propios filtrables.';
  }

  return ['Campos propios de cada tipo, para el parámetro "ficha":', ...lines].join('\n');
}

function describeField(field: VehicleTypeField): string {
  if (field.data_type === 'boolean') {
    return `${field.key} (${field.label}, sí/no)`;
  }

  if (field.data_type === 'select') {
    const options = (field.options ?? []).map((option) => option.value).join('|');
    return `${field.key} (${field.label}, opciones: ${options})`;
  }

  const unit = field.unit ? ` en ${field.unit}` : '';
  return `${field.key} (${field.label}, número${unit})`;
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

/**
 * Se llama con cada pedacito de respuesta apenas llega del modelo.
 *
 * Existe para que la respuesta aparezca escribiéndose en vez de golpe. Es
 * opcional: quien no la pasa recibe el texto entero al final y no se entera de
 * que por dentro la respuesta llegó de a partes.
 */
export type ChatDelta = (text: string) => void;

/**
 * En qué anda el asistente mientras no escribe nada.
 *
 * Una respuesta puede tardar bastante y el silencio es todo igual desde
 * afuera: no se distingue "está pensando" de "se colgó". La diferencia más
 * grande la hacen las búsquedas — cuando el modelo pide buscar publicaciones,
 * la vuelta entera se va sin una sola letra en pantalla, y esa es justo la
 * pregunta que más tarda. Con esto la pantalla puede decir qué está pasando.
 *
 *   pensando   el modelo está armando la respuesta
 *   buscando   se está ejecutando una búsqueda que el modelo pidió
 *
 * Es opcional, como `onDelta`: quien no la pasa no se entera de nada de esto.
 */
export type ChatStep = (step: 'pensando' | 'buscando') => void;

export async function replyToChat(
  messages: ChatMessage[],
  context: ChatContext,
  runSearch: SearchRunner,
  onDelta?: ChatDelta,
  onStep?: ChatStep,
): Promise<ChatReply> {
  const model = geminiModel();

  const history: Content[] = messages.map((message) => ({
    role: message.role,
    parts: [{ text: message.text }],
  }));

  const found: ListingSearchResult[] = [];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    /**
     * En la primera vuelta NO se avisa nada, y es a propósito.
     *
     * Que está pensando la pantalla ya lo sabe —fue ella la que mandó la
     * pregunta—, así que avisarlo no agrega nada. Lo que sí importa es que
     * mientras no salió un solo byte, un error todavía puede viajar como
     * respuesta HTTP normal: si acá se mandara un aviso, hasta un "el modelo
     * está saturado" tendría que llegar disfrazado adentro de una respuesta
     * 200. Ver el comentario de la ruta `/chat/stream`.
     *
     * De la segunda vuelta en adelante ya hubo una llamada al modelo que
     * anduvo, y ahí sí conviene contar que se volvió a pensar después de
     * buscar.
     */
    if (round > 0) {
      onStep?.('pensando');
    }

    const response = await streamRound(model, history, context, onDelta);

    const calls = response.functionCalls;

    // Sin pedido de búsqueda, esto ya es la respuesta final.
    if (calls.length === 0) {
      return { text: response.text.trim(), results: found };
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
    history.push(
      response.parts.length > 0
        ? { role: 'model', parts: response.parts }
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
          onStep?.('buscando');

          const results = await runSearch(toRequest(call.args));
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

/** Una vuelta del modelo, ya juntada de todos los pedacitos que fueron llegando. */
interface RoundResult {
  text: string;
  functionCalls: FunctionCall[];
  /**
   * El turno del modelo tal como vino, parte por parte. Se reenvía intacto en
   * la vuelta siguiente por la firma que Gemini 3 exige devolver.
   */
  parts: Part[];
}

/**
 * Una vuelta de conversación, leída de a pedazos.
 *
 * POR QUÉ SE PIDE SIEMPRE ASÍ, INCLUSO CUANDO NADIE MIRA
 *
 *   Se podría pedir la respuesta entera cuando no hay nadie escuchando los
 *   pedacitos, y de a partes cuando sí. Serían dos caminos distintos hacia el
 *   mismo lugar, y el que se usa menos es el que se rompe sin que nadie se
 *   entere. Acá el camino es uno solo: la respuesta siempre llega de a partes,
 *   y `onDelta` decide si alguien las mira mientras llegan.
 *
 * LO QUE HAY QUE JUNTAR, Y POR QUÉ
 *
 *   El texto, para poder devolverlo entero al final. Los pedidos de búsqueda,
 *   que pueden aparecer en cualquier pedazo. Y las partes crudas del turno: sin
 *   ellas se pierde la firma interna que Gemini 3 manda con cada pedido de
 *   herramienta y que hay que devolver intacta, o la API rechaza el pedido
 *   siguiente con un 400. Es el error del 2026-08-17.
 */
async function streamRound(
  model: string,
  history: Content[],
  context: ChatContext,
  onDelta?: ChatDelta,
): Promise<RoundResult> {
  const stream = await pedirAlModelo(() =>
    gemini().models.generateContentStream({
      model,
      contents: history,
      config: {
        systemInstruction: systemInstruction(context),
        tools: [{ functionDeclarations: [SEARCH_DECLARATION] }],
        temperature: 0.4,
      },
    }),
  );

  const result: RoundResult = { text: '', functionCalls: [], parts: [] };

  await pedirAlModelo(async () => {
    for await (const chunk of stream) {
      const piece = chunk.text ?? '';

      if (piece) {
        result.text += piece;
        onDelta?.(piece);
      }

      result.functionCalls.push(...(chunk.functionCalls ?? []));
      result.parts.push(...(chunk.candidates?.[0]?.content?.parts ?? []));
    }
  });

  return result;
}

/**
 * Lo que devuelve el modelo es texto, no un objeto de confianza. Se convierte
 * campo por campo y se descarta lo que no encaje, en vez de pasárselo tal cual
 * a una consulta contra la base.
 *
 * Los filtros de la ficha se copian **sin validar** y se validan en el backend
 * contra el catálogo, que es el único que sabe qué campos declara cada tipo. Es
 * la misma regla que protege a la barra de búsqueda: una clave inventada no
 * llega nunca a la consulta, venga de la dirección o de un modelo.
 */
function toRequest(args: unknown): ChatSearchRequest {
  return { filters: toFilters(args), specRequests: toSpecRequests(args) };
}

function toSpecRequests(args: unknown): SpecRequest[] {
  if (typeof args !== 'object' || args === null) {
    return [];
  }

  const raw = (args as Record<string, unknown>).ficha;

  if (!Array.isArray(raw)) {
    return [];
  }

  const requests: SpecRequest[] = [];

  for (const item of raw) {
    const entry = item as Record<string, unknown> | null;
    const key = text(entry?.clave);
    const value = text(entry?.valor) ?? numberAsText(entry?.valor);
    const operator = entry?.operador;

    if (!key || value === undefined) {
      continue;
    }

    if (operator === 'minimo') {
      requests.push({ key, op: 'gte', value });
    } else if (operator === 'maximo') {
      requests.push({ key, op: 'lte', value });
    } else if (operator === 'igual') {
      requests.push({ key, op: 'eq', value });
    }
  }

  return requests;
}

/** El modelo a veces manda el valor como número aunque el esquema pida texto. */
function numberAsText(raw: unknown): string | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw);
  }

  if (typeof raw === 'boolean') {
    return String(raw);
  }

  return undefined;
}

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

'use client';

import { supabase } from './supabase';

const API_URL = (process.env.NEXT_PUBLIC_API_URL as string) ?? 'http://localhost:4000';

/**
 * Error de la API con los mensajes ya escritos en español por el backend.
 * `details` trae la lista de campos a corregir cuando la validación falla.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * La respuesta se cortó porque alguien la cortó: la persona apretó "Cancelar".
 *
 * Es su propio tipo y no un `ApiError` porque no es una falla y no se muestra
 * como tal — no hay nada que avisarle a quien acaba de decidirlo. La pantalla
 * lo distingue para no dibujar un cartel de error sobre una decisión.
 */
export class CancelledError extends Error {
  constructor() {
    super('La consulta se canceló.');
    this.name = 'CancelledError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

/**
 * Llama al backend adjuntando el token de la sesión actual.
 * El backend lo verifica y actúa en nombre de este usuario.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (payload as { error?: string } | null)?.error ??
        'No se pudo conectar con el servidor. ¿Está levantado el backend?',
      (payload as { details?: string[] } | null)?.details ?? [],
    );
  }

  return payload as T;
}

/** Por qué se cortó la lectura, si se cortó. */
type Motivo = 'inactividad' | 'total' | 'usuario' | null;

export interface StreamOptions {
  /** Para cancelar desde la pantalla. */
  signal?: AbortSignal;
  /** Cuánto silencio se tolera entre dos pedacitos. */
  inactividadMs?: number;
  /** Cuánto puede durar la respuesta entera, pase lo que pase. */
  totalMs?: number;
}

/**
 * Los números por defecto, medidos y no elegidos de memoria.
 *
 * En la bitácora del 2026-08-24 quedó registrado el peor caso real de una
 * respuesta con búsqueda: pedacitos a los 7,0s, 7,1s y 28s. El silencio más
 * largo entre dos señales fue de unos veinte segundos, así que 45 deja el
 * doble de margen antes de dar por muerta una respuesta que está viva.
 *
 * El techo total son tres minutos: más que eso ya no es una espera, es una
 * pantalla abandonada.
 */
const INACTIVIDAD_MS = 45_000;
const TOTAL_MS = 3 * 60_000;

/**
 * Igual que `api`, pero para una respuesta que llega de a pedazos.
 *
 * El backend manda eventos SSE y esto los va entregando con `onDelta` a medida
 * que aparecen. Devuelve lo mismo que devolvería el pedido normal, así que
 * quien la usa no tiene que armar la respuesta juntando los pedacitos.
 *
 * NO ES `EventSource`. Esa API no deja mandar el encabezado de sesión, y todos
 * los pedidos de esta aplicación van firmados como el usuario que los hace.
 *
 * Si algo falla ANTES del primer pedacito, el backend contesta con un error
 * HTTP normal y acá sale un `ApiError` igual que en cualquier otra llamada. Si
 * falla después, llega como un evento `error` — y también sale un `ApiError`,
 * para que la pantalla no tenga que distinguir dos formas de fallar.
 *
 * `onStep` recibe los avisos de en qué anda el servidor mientras todavía no
 * mandó texto ("buscando", "pensando"). Es opcional: sin ella, esos eventos se
 * ignoran y la llamada se comporta igual que antes.
 *
 * ESTA LECTURA SIEMPRE TERMINA. Son tres cosas, y las tres se agregaron el
 * 2026-08-27 porque no había ninguna:
 *
 *   TERMINA CON `done` O CON `error`. Antes se seguía leyendo hasta que el
 *   servidor cerrara la conexión. En el camino normal la cierra —`res.end()`
 *   está ahí—, pero "el camino normal" no es una garantía: alcanza con un
 *   intermediario que sostenga la conexión abierta para que una respuesta ya
 *   completa se quede sin entregar y el botón de enviar siga bloqueado. Se
 *   reprodujo con un servidor simulado que manda `done` y no cierra.
 *
 *   TIENE UN LÍMITE DE SILENCIO. Si pasan `inactividadMs` sin llegar un solo
 *   byte, se corta. Es el límite que importa: mide lo que se siente —que no
 *   pasa nada— y no castiga a una respuesta larga que está llegando bien.
 *
 *   TIENE UN LÍMITE TOTAL, como red de última instancia, para la conexión que
 *   gotea para siempre sin decir nada.
 *
 * Y SE PUEDE CANCELAR desde afuera con `signal`. Cortar de este lado no le
 * ahorra al servidor la llamada al modelo —eso ya se gastó—, pero le devuelve
 * a la persona el control de una espera que no termina.
 */
export async function apiStream<T>(
  path: string,
  body: unknown,
  onDelta: (text: string) => void,
  onStep?: (step: string) => void,
  options: StreamOptions = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const inactividadMs = options.inactividadMs ?? INACTIVIDAD_MS;
  const totalMs = options.totalMs ?? TOTAL_MS;

  // Un solo controlador para las tres formas de cortar —silencio, duración
  // total y la persona— porque `fetch` entiende una sola señal. `motivo` es lo
  // que después distingue una espera vencida de una cancelación.
  const control = new AbortController();
  let motivo: Motivo = null;

  // Se lee a través de una función a propósito: `motivo` se escribe dentro de
  // los relojes y de la señal de afuera, y leyéndolo derecho el compilador lo
  // daría por nulo para siempre.
  const motivoDelCorte = (): Motivo => motivo;

  const cortar = (razon: Exclude<Motivo, null>) => {
    if (motivo === null) {
      motivo = razon;
      control.abort();
    }
  };

  const alCancelar = () => cortar('usuario');
  options.signal?.addEventListener('abort', alCancelar, { once: true });

  if (options.signal?.aborted) {
    cortar('usuario');
  }

  const relojTotal = setTimeout(() => cortar('total'), totalMs);
  let relojSilencio = setTimeout(() => cortar('inactividad'), inactividadMs);

  // Se llama con CADA pedazo que llega, incluso con uno que no traiga un
  // evento entero: lo que se mide es si la conexión da señales de vida, no si
  // dijo algo con sentido.
  const hayVida = () => {
    clearTimeout(relojSilencio);
    relojSilencio = setTimeout(() => cortar('inactividad'), inactividadMs);
  };

  try {
    return await leerStream<T>(
      `${API_URL}${path}`,
      body,
      token,
      control.signal,
      onDelta,
      onStep,
      hayVida,
    );
  } catch (error) {
    // `fetch` y `read` avisan de los tres cortes de la misma manera: como un
    // aborto. Cuál de los tres fue lo dice el motivo, y de eso depende qué se
    // le dice a la persona — o si no se le dice nada.
    const razon = motivoDelCorte();

    if (razon === 'usuario') {
      throw new CancelledError();
    }

    if (razon !== null) {
      throw new ApiError(
        408,
        'La respuesta tardó demasiado y se cortó. Probá de nuevo.',
        razon === 'inactividad'
          ? ['El servidor dejó de responder mientras escribía.']
          : ['La respuesta superó los tres minutos.'],
      );
    }

    throw error;
  } finally {
    clearTimeout(relojTotal);
    clearTimeout(relojSilencio);
    options.signal?.removeEventListener('abort', alCancelar);
  }
}

/** La lectura en sí. Los relojes y el corte los pone `apiStream`. */
async function leerStream<T>(
  url: string,
  body: unknown,
  token: string | undefined,
  signal: AbortSignal,
  onDelta: (text: string) => void,
  onStep: ((step: string) => void) | undefined,
  hayVida: () => void,
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => null);

    throw new ApiError(
      response.status,
      (payload as { error?: string } | null)?.error ??
        'No se pudo conectar con el servidor. ¿Está levantado el backend?',
      (payload as { details?: string[] } | null)?.details ?? [],
    );
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

  let buffer = '';
  let result: T | null = null;
  let failure: ApiError | null = null;

  /**
   * La lectura termina de dos maneras: porque el servidor cerró (`done`) o
   * porque ya llegó el evento final. La segunda es la que faltaba: sin ella,
   * una conexión que no cierra deja esto esperando para siempre con la
   * respuesta entera ya en la mano.
   */
  let terminado = false;

  while (!terminado) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    hayVida();
    buffer += value;

    // Un evento termina en un renglón en blanco. Lo que quede después del
    // último corte es un evento a medio llegar: se guarda para la vuelta
    // siguiente en vez de intentar leerlo por la mitad.
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const event = readEvent(chunk);

      if (!event) {
        continue;
      }

      if (event.name === 'delta') {
        onDelta((event.payload as { text?: string }).text ?? '');
      } else if (event.name === 'paso') {
        const paso = (event.payload as { paso?: string }).paso;
        if (paso) {
          onStep?.(paso);
        }
      } else if (event.name === 'done') {
        result = event.payload as T;
        terminado = true;
      } else if (event.name === 'error') {
        const payload = event.payload as { error?: string; details?: string[] };
        failure = new ApiError(500, payload.error ?? 'Falló la respuesta.', payload.details ?? []);
        terminado = true;
      }
    }
  }

  // Se suelta la conexión sin esperar a que el otro lado la cierre. Si ya
  // estaba cerrada esto no hace nada; si no, es lo que evita dejarla colgada.
  void reader.cancel().catch(() => {});

  if (failure) {
    throw failure;
  }

  if (result === null) {
    throw new ApiError(500, 'La respuesta se cortó por la mitad. Probá de nuevo.');
  }

  return result;
}

/** Un evento SSE: el nombre y lo que trae, ya convertido. */
function readEvent(chunk: string): { name: string; payload: unknown } | null {
  let name = 'message';
  const dataLines: string[] = [];

  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) {
      name = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  try {
    return { name, payload: JSON.parse(dataLines.join('\n')) };
  } catch {
    return null;
  }
}

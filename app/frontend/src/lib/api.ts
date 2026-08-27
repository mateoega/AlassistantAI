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
 */
export async function apiStream<T>(
  path: string,
  body: unknown,
  onDelta: (text: string) => void,
  onStep?: (step: string) => void,
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
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

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

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
      } else if (event.name === 'error') {
        const payload = event.payload as { error?: string; details?: string[] };
        failure = new ApiError(500, payload.error ?? 'Falló la respuesta.', payload.details ?? []);
      }
    }
  }

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

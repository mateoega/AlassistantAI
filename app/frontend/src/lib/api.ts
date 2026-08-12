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

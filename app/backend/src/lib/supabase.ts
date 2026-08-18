import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { HttpError } from './http-error.js';

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
} as const;

/**
 * Cliente sin usuario, con la clave pública. Sirve para leer los catálogos
 * (que son públicos) y para verificar el token de quien hace un pedido.
 */
export const supabasePublic: SupabaseClient = createClient(
  env.supabaseUrl,
  env.supabaseAnonKey,
  clientOptions,
);

/**
 * Cliente que actúa EN NOMBRE del usuario que hizo el pedido.
 *
 * Esto es deliberado: cada consulta pasa por las reglas de acceso (RLS) de la
 * base con la identidad real del usuario. Si el código del backend tuviera un
 * error y pidiera una publicación ajena, la base igual la rechazaría. La
 * seguridad no depende de que este código esté bien escrito.
 */
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    ...clientOptions,
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

/**
 * Cliente con la clave de SERVICIO, que se saltea todas las reglas de acceso
 * de la base.
 *
 * PELIGRO: puede leer y escribir cualquier fila de cualquier usuario. Por eso
 * tiene un único uso permitido en todo el proyecto: guardar los análisis de IA
 * en `listing_analyses`, una tabla donde ningún usuario puede escribir.
 *
 * El razonamiento está en la migración 008: el análisis es una afirmación de
 * la plataforma sobre un vehículo, no un dato que carga un usuario. Si se
 * pudiera escribir con la clave pública, un vendedor podría inventarse el
 * análisis de su propio aviso.
 *
 * Para TODO lo demás va `createUserClient()`, para que las reglas de la base
 * se sigan aplicando con la identidad real de quien hizo el pedido.
 */
let serviceClient: SupabaseClient | null = null;

export function supabaseService(): SupabaseClient {
  if (!env.supabaseServiceKey) {
    throw HttpError.unavailable(
      'El asistente de IA todavía no está configurado en este servidor.',
      ['Falta completar SUPABASE_SERVICE_KEY en el archivo .env de la raíz del proyecto.'],
    );
  }

  serviceClient ??= createClient(env.supabaseUrl, env.supabaseServiceKey, clientOptions);
  return serviceClient;
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

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

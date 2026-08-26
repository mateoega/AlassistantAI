import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      /**
       * Lo carga el middleware `requireAuth`. Si está presente, el pedido
       * viene de un usuario con sesión válida.
       */
      auth?: {
        userId: string;
        /** Cliente de Supabase que actúa con la identidad de este usuario. */
        supabase: SupabaseClient;
      };

      /**
       * Lo carga `optionalAuth`, en las rutas que se pueden mirar sin cuenta.
       *
       * Siempre trae un cliente de Supabase con el que consultar; lo que
       * cambia es CON QUÉ IDENTIDAD. Si hay sesión, es la de la persona y
       * `userId` la nombra. Si no la hay, es el cliente anónimo y `userId` es
       * `null`: la base va a aplicar las políticas de `anon`, que solo dejan
       * ver lo publicado.
       *
       * Nunca es un cliente con más permisos de los que corresponden. Que una
       * ruta sea pública no significa que consulte sin reglas.
       */
      visitor?: {
        userId: string | null;
        supabase: SupabaseClient;
      };
    }
  }
}

export {};

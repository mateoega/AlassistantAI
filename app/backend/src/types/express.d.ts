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
    }
  }
}

export {};

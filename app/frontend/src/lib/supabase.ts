'use client';

import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase para el navegador.
 *
 * Usa la clave pública (`anon`), que está pensada para ser visible: los
 * permisos reales los controla la base con sus reglas de acceso (RLS), no el
 * secreto de la clave.
 *
 * Se usa para exactamente dos cosas — las dos excepciones a "todo pasa por el
 * backend", registradas en la bitácora:
 *   1. El login y el manejo de la sesión.
 *   2. Subir las fotos a Storage.
 *
 * Todo lo demás (leer y escribir publicaciones) va por la API del backend.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

export const PHOTOS_BUCKET = 'vehicle-photos';

import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import type { NextConfig } from 'next';

/**
 * Las claves viven en un único `.env` en la raíz del repositorio, no uno por
 * carpeta. Acá se lee ese archivo y se pasan al navegador SOLO las que son
 * públicas por diseño (la URL de Supabase y la clave `anon`).
 *
 * La clave de servicio de Supabase y la de Gemini NUNCA se listan acá: si
 * estuvieran, terminarían dentro del código que descarga cualquier visitante.
 */
loadDotenv({ path: path.resolve(process.cwd(), '../../.env'), quiet: true });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copiá .env.example de la raíz del proyecto a .env y completala.`,
    );
  }
  return value;
}

/**
 * En el panel de Supabase hay varias direcciones a la vista. La que hace falta
 * es la del proyecto a secas (https://xxxx.supabase.co); la del endpoint REST
 * (.../rest/v1) es la que más se confunde. Se acepta cualquiera y se normaliza.
 */
function supabaseUrl(): string {
  const url = required('SUPABASE_URL').replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');

  if (!/^https?:\/\//i.test(url)) {
    throw new Error(
      'SUPABASE_URL tiene que empezar con https://. Copiala del panel de Supabase, en Project Settings > API > Project URL.',
    );
  }

  return url;
}

const nextConfig: NextConfig = {
  /**
   * Dónde deja Next.js los archivos que compila.
   *
   * Por defecto usa `.next`, la misma carpeta para desarrollo y para
   * producción. Eso trae un problema real: si alguien corre `npm run build`
   * mientras `npm run dev` está levantado, el build borra los archivos que el
   * servidor de desarrollo está sirviendo, y la aplicación queda en pantalla
   * blanca con "Cargando…" hasta que se reinicia todo.
   *
   * Definiendo NEXT_DIST_DIR se puede compilar en otra carpeta y evitarlo:
   *   $env:NEXT_DIST_DIR = '.next-build'; npm run build
   */
  distDir: process.env.NEXT_DIST_DIR?.trim() || '.next',

  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: required('SUPABASE_ANON_KEY'),
    NEXT_PUBLIC_API_URL: process.env.API_URL?.trim() || 'http://localhost:4000',
  },
};

export default nextConfig;

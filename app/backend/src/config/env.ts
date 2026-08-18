import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

/**
 * Las variables de entorno viven en un único archivo `.env` en la raíz del
 * repositorio (no uno por carpeta), para que el equipo tenga un solo lugar
 * donde completar las claves. Ver `.env.example`.
 */
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../../..');

loadDotenv({ path: path.join(repoRoot, '.env'), quiet: true });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. ` +
        `Copiá el archivo .env.example de la raíz del proyecto a .env y completala. ` +
        `Se busca en: ${path.join(repoRoot, '.env')}`,
    );
  }
  return value;
}

/**
 * En el panel de Supabase hay varias direcciones a la vista y es fácil copiar
 * la equivocada. Lo que hace falta es la del proyecto a secas
 * (https://xxxx.supabase.co); la del endpoint REST (.../rest/v1) es la que
 * más se confunde. Se acepta cualquiera de las dos y se normaliza.
 */
export function normalizeSupabaseUrl(raw: string): string {
  const url = raw.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');

  if (!/^https?:\/\//i.test(url)) {
    throw new Error(
      `SUPABASE_URL tiene que empezar con https://. Valor recibido: "${raw}". ` +
        `Copiala del panel de Supabase, en Project Settings > API > Project URL.`,
    );
  }

  return url;
}

/** Vacío se trata como "no configurada", no como cadena vacía. */
function optional(name: string): string | null {
  return process.env[name]?.trim() || null;
}

export const env = {
  port: Number(process.env.PORT?.trim() || 4000),
  supabaseUrl: normalizeSupabaseUrl(required('SUPABASE_URL')),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),

  /**
   * Estas tres son OPCIONALES a propósito: el backend tiene que arrancar sin
   * ellas, como promete `.env.example`. Sin ellas todo el flujo de
   * publicaciones funciona igual; lo único que no anda es el asistente de IA,
   * y las rutas que lo usan avisan qué falta completar en vez de romper el
   * arranque del servidor.
   */
  geminiApiKey: optional('GEMINI_API_KEY'),

  /**
   * Modelo de la familia Flash con capacidad de visión. Se deja configurable
   * para poder cambiarlo sin tocar código cuando Google publique uno nuevo.
   */
  geminiModel: optional('GEMINI_MODEL') ?? 'gemini-3.6-flash',

  /**
   * Clave de servicio: se saltea las reglas de acceso de la base. Su ÚNICO uso
   * en todo el proyecto es guardar los análisis de IA, que ningún usuario
   * puede escribir. Ver `lib/supabase.ts` y la migración 008.
   */
  supabaseServiceKey: optional('SUPABASE_SERVICE_KEY'),

  /**
   * De dónde se aceptan pedidos. En desarrollo, el frontend de Next.js.
   */
  allowedOrigins: (process.env.FRONTEND_URL?.trim() || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;

/** Prefijo público de las fotos guardadas en Supabase Storage. */
export const PHOTOS_BUCKET = 'vehicle-photos';
export const photoPublicUrl = (storagePath: string): string =>
  `${env.supabaseUrl}/storage/v1/object/public/${PHOTOS_BUCKET}/${storagePath}`;

import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';

/**
 * La conexión con Gemini. Es el único archivo del proyecto que conoce la clave
 * de IA, y corre exclusivamente en el servidor.
 *
 * La clave se lee de la variable de entorno `GEMINI_API_KEY` y nunca viaja al
 * frontend. Si algún día hiciera falta algo parecido en el navegador, esta
 * clave no puede ir ahí: habría que hacerlo pasar por el backend igual.
 */

let client: GoogleGenAI | null = null;

export function gemini(): GoogleGenAI {
  if (!env.geminiApiKey) {
    // No es un error del usuario: es una instalación a medio configurar. Se
    // avisa qué falta en vez de devolver un "algo salió mal".
    throw HttpError.unavailable('El asistente de IA todavía no está configurado en este servidor.', [
      'Falta completar GEMINI_API_KEY en el archivo .env de la raíz del proyecto.',
      'La clave se saca de https://aistudio.google.com/apikey',
    ]);
  }

  client ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

/** Con qué modelo se está trabajando. Se guarda junto a cada análisis. */
export function geminiModel(): string {
  return env.geminiModel;
}

/** Si el asistente puede funcionar en esta instalación. */
export function isAiConfigured(): boolean {
  return Boolean(env.geminiApiKey);
}

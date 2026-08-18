import sharp from 'sharp';
import { photoPublicUrl } from '../config/env.js';

/**
 * Prepara las fotos de una publicación para mandárselas a Gemini.
 *
 * POR QUÉ SE ACHICAN
 *
 *   Una foto sacada con un celular actual pesa varios megabytes. Diez de esas
 *   en un solo pedido lo hacen fallar por tamaño, tardan una eternidad en
 *   viajar y se pagan caras. Y no se gana nada: los modelos de visión trabajan
 *   sobre una versión reducida de la imagen igual, así que mandar 4000px de
 *   ancho es pagar por detalle que el modelo nunca va a mirar.
 *
 *   1024px de lado mayor es suficiente para ver un rayón, una mancha de óxido
 *   o el desgaste de un neumático, que es lo que el análisis tiene que
 *   detectar.
 */

/** Lado mayor al que se reduce cada foto antes de enviarla. */
const MAX_SIDE = 1024;

/** Calidad del JPEG resultante. 80 no muestra artefactos a simple vista. */
const JPEG_QUALITY = 80;

/**
 * Cuántas fotos entran en un análisis.
 *
 * Una publicación admite hasta 12. Se mandan las primeras 8 (las que el
 * vendedor ordenó como más importantes): a partir de ahí cada foto extra suma
 * costo y demora sin cambiar las conclusiones.
 */
export const MAX_PHOTOS_PER_ANALYSIS = 8;

/** Cuánto se espera por cada foto antes de darla por perdida. */
const DOWNLOAD_TIMEOUT_MS = 20_000;

export interface ImagePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

/**
 * Baja las fotos del bucket, las achica y las devuelve listas para el pedido.
 *
 * Una foto que no se pueda bajar o procesar se saltea en vez de tirar todo
 * abajo: es mejor analizar siete fotos que no analizar nada. Si no queda
 * ninguna, quien llama decide qué hacer.
 */
export async function loadPhotosForAnalysis(storagePaths: string[]): Promise<ImagePart[]> {
  const selected = storagePaths.slice(0, MAX_PHOTOS_PER_ANALYSIS);

  const results = await Promise.all(selected.map((path) => loadOne(path)));

  return results.filter((part): part is ImagePart => part !== null);
}

async function loadOne(storagePath: string): Promise<ImagePart | null> {
  try {
    const response = await fetch(photoPublicUrl(storagePath), {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`[ia] no se pudo bajar la foto ${storagePath}: HTTP ${response.status}`);
      return null;
    }

    const original = Buffer.from(await response.arrayBuffer());

    const resized = await sharp(original)
      // `withoutEnlargement` evita agrandar una foto que ya era chica: sería
      // pagar por píxeles inventados.
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      // `rotate()` sin argumentos aplica la orientación que la cámara dejó
      // anotada en el archivo. Sin esto, una foto sacada en vertical llega
      // acostada y el análisis describe un vehículo de costado.
      .rotate()
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    return {
      inlineData: {
        mimeType: 'image/jpeg',
        data: resized.toString('base64'),
      },
    };
  } catch (error) {
    console.warn(`[ia] no se pudo procesar la foto ${storagePath}:`, error);
    return null;
  }
}

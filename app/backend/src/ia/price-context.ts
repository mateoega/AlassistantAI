import type { Estimacion } from '../services/price-estimate.js';

/**
 * La estimación de precio, contada en palabras para que la lea un modelo.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 *
 *   El Sprint 2 le prohibió explícitamente a la IA opinar sobre precios, y el
 *   motivo estaba escrito: no tenía con qué comparar, y una opinión sin datos
 *   hace más daño que no decir nada. Este archivo es lo que levanta esa
 *   prohibición — no la levanta una instrucción nueva en el prompt, la levanta
 *   el hecho de que ahora hay un dato para pasarle.
 *
 *   Por eso, cuando no hay estimación, esto devuelve `null` y la restricción
 *   del Sprint 2 sigue vigente para ese vehículo. La IA no habla de precios
 *   porque tenga permiso: habla cuando tiene con qué.
 */

/** Cuánto puede desviarse el precio pedido antes de que valga la pena marcarlo. */
const DESVIO_QUE_IMPORTA = 8;

export function describePriceEstimate(estimacion: Estimacion): string | null {
  if (!estimacion.disponible) {
    return null;
  }

  const moneda = estimacion.moneda === 'USD' ? 'dólares' : 'pesos';
  const lineas: string[] = [
    `La plataforma estimó un precio de referencia para este vehículo: entre ${formatear(estimacion.minimo)} y ${formatear(estimacion.maximo)} ${moneda}.`,
    `El vendedor pide ${formatear(estimacion.precio_pedido)} ${moneda}.`,
  ];

  if (estimacion.origen === 'comparables') {
    lineas.push(
      `Sale de comparar con ${estimacion.comparables.length} publicaciones parecidas de la propia plataforma, corregidas por año y kilómetros.`,
    );
  } else {
    lineas.push(
      'Sale de una fuente de precios externa, porque no hay suficientes publicaciones parecidas acá. Ese valor NO está ajustado por kilómetros.',
    );
  }

  if (estimacion.confianza === 'baja') {
    lineas.push(
      'La confianza de esta estimación es BAJA: hay muy pocos datos detrás. Decilo si vas a mencionarla.',
    );
  }

  if (estimacion.posicion !== 'dentro' && Math.abs(estimacion.desvio_porcentual) >= DESVIO_QUE_IMPORTA) {
    const direccion = estimacion.posicion === 'por_encima' ? 'POR ENCIMA' : 'POR DEBAJO';
    lineas.push(
      `El precio pedido está ${Math.abs(estimacion.desvio_porcentual)}% ${direccion} de la referencia.`,
    );
  } else {
    lineas.push('El precio pedido está dentro de lo que se pide por vehículos parecidos.');
  }

  return lineas.join('\n');
}

/**
 * Cómo se le permite hablar de precios a la IA cuando hay estimación.
 *
 * Se manda junto con el dato, no en el prompt fijo, para que las dos cosas
 * viajen siempre juntas: si no hay estimación, tampoco hay permiso.
 */
export const REGLAS_DE_PRECIO = `
CÓMO HABLAR DEL PRECIO
- Podés decir si el precio pedido está por encima, por debajo o dentro de la referencia, y en
  cuánto. Es un dato, y está calculado.
- NO digas si conviene comprar, si es una ganga o si es un mal negocio. Eso es una decisión de
  quien compra, y depende de cosas que vos no sabés.
- Un precio por debajo de la referencia NO es automáticamente una oportunidad: puede haber un
  motivo. Si lo mencionás, mencioná también que conviene entender por qué.
- Si la confianza de la estimación es baja, decilo cuando la uses. Un número con pocos datos
  atrás sigue siendo mejor que nada, pero no se presenta como si fuera firme.
- Nunca inventes un precio de mercado que no esté en la referencia que te pasaron.
`.trim();

function formatear(monto: number): string {
  return new Intl.NumberFormat('es-AR').format(Math.round(monto));
}

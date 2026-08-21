/**
 * La cotización del dólar, para poder comparar precios entre sí.
 *
 * POR QUÉ HACE FALTA
 *
 *   Las publicaciones se cargan en pesos o en dólares, y las dos cosas
 *   conviven en el muro. Para estimar un precio hay que comparar avisos
 *   parecidos, y no se pueden comparar dos números en monedas distintas. Todo
 *   se lleva a dólares para hacer la cuenta y vuelve a la moneda del aviso
 *   para mostrarse.
 *
 * POR QUÉ EL DÓLAR "BLUE" Y NO EL OFICIAL
 *
 *   Porque es el que usa el mercado de vehículos usados en la Argentina: los
 *   avisos en dólares se pagan en billetes, no al tipo de cambio del banco.
 *   Estimar con el oficial daría precios en pesos sistemáticamente más altos
 *   que los reales. Si la fuente del blue no responde, se cae al oficial, que
 *   es mejor que no poder comparar nada.
 *
 * DE DÓNDE SALE
 *
 *   De dolarapi.com: es gratuita, no pide clave y es la referencia que usan
 *   casi todos los proyectos argentinos. Como cualquier fuente externa, puede
 *   no responder — y este módulo está escrito para que eso NO rompa la
 *   estimación: sin cotización, se comparan solo los avisos que ya están en la
 *   misma moneda. Ver `docs/para_mas_adelante.md`.
 */

const FUENTES = [
  'https://dolarapi.com/v1/dolares/blue',
  'https://dolarapi.com/v1/dolares/oficial',
] as const;

/**
 * Cuánto vale una cotización antes de volver a pedirla.
 *
 * Media hora es holgado: el dólar no se mueve tanto en ese lapso como para
 * cambiar una estimación, y evita pedirle la cotización a un servicio gratuito
 * una vez por cada aviso que alguien mira.
 */
const VIGENCIA_MS = 30 * 60 * 1000;

/**
 * Cuánto se espera a que conteste antes de seguir sin cotización. Corto a
 * propósito: esto corre dentro de un pedido que el comprador está esperando.
 */
const TIMEOUT_MS = 4000;

export interface Cotizacion {
  /** Cuántos pesos vale un dólar. */
  pesos_por_dolar: number;
  fuente: string;
  obtenida_en: string;
}

let cache: { valor: Cotizacion; vence: number } | null = null;

/**
 * La cotización vigente, o `null` si ninguna fuente respondió.
 *
 * Devolver `null` en vez de tirar un error es deliberado: quien llama tiene
 * que poder seguir sin cotización, no abortar.
 */
export async function getCotizacion(): Promise<Cotizacion | null> {
  if (cache && cache.vence > Date.now()) {
    return cache.valor;
  }

  for (const url of FUENTES) {
    const valor = await pedir(url);

    if (valor) {
      cache = { valor, vence: Date.now() + VIGENCIA_MS };
      return valor;
    }
  }

  // Una cotización vencida sigue siendo mejor que ninguna: el dólar de hace un
  // rato se parece mucho más al de ahora que no poder comparar precios.
  return cache?.valor ?? null;
}

async function pedir(url: string): Promise<Cotizacion | null> {
  try {
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

    if (!respuesta.ok) {
      return null;
    }

    const datos = (await respuesta.json()) as { compra?: unknown; venta?: unknown; nombre?: unknown };
    const compra = Number(datos.compra);
    const venta = Number(datos.venta);

    // Se usa el promedio entre compra y venta: un vehículo publicado en
    // dólares no se está comprando ni vendiendo billetes, así que quedarse con
    // cualquiera de las dos puntas inclinaría la estimación para un lado.
    const promedio = [compra, venta].filter((n) => Number.isFinite(n) && n > 0);

    if (promedio.length === 0) {
      return null;
    }

    return {
      pesos_por_dolar: promedio.reduce((a, b) => a + b, 0) / promedio.length,
      fuente: typeof datos.nombre === 'string' ? `dólar ${datos.nombre.toLowerCase()}` : 'dólar',
      obtenida_en: new Date().toISOString(),
    };
  } catch {
    // Sin internet, con la fuente caída o fuera de tiempo: se prueba la
    // siguiente. No se registra como error del sistema porque no lo es.
    return null;
  }
}

/** Solo para las pruebas: olvida la cotización guardada. */
export function _resetCotizacionCache(): void {
  cache = null;
}

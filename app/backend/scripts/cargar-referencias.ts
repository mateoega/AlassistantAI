/**
 * Carga las referencias de precio de mercado en la tabla `market_references`.
 *
 * Sprint 3, capa 2. Busca en una fuente externa cuánto vale cada modelo que hay
 * publicado en la plataforma, y lo guarda por marca, familia de modelo y año.
 *
 * NO ES PARTE DE LA APLICACIÓN. Es una herramienta que se corre a mano, como el
 * cargador de datos de prueba. La aplicación solo lee esa tabla.
 *
 * POR QUÉ SE CARGA Y NO SE CONSULTA EN VIVO
 *
 *   La fuente gratuita corta a los pocos pedidos por minuto. Consultarla cada
 *   vez que alguien mira un aviso es imposible, y ataría el tiempo de respuesta
 *   de la aplicación a un servicio de terceros. Ver la migración 010.
 *
 * QUÉ MODELOS CARGA
 *
 *   Solo los que hacen falta: las combinaciones de marca y familia de modelo
 *   que existen hoy en las publicaciones. No tiene sentido bajarse el mercado
 *   entero para estimar setenta avisos.
 *
 *   No hay ninguna lista de tipos de vehículo acá. Si la fuente no conoce una
 *   marca —no tiene camiones ni motos—, la búsqueda vuelve vacía y el modelo
 *   se saltea solo. Es la misma regla de siempre: el código no sabe qué tipos
 *   existen.
 *
 * USA LA CLAVE DE SERVICIO, y es la segunda excepción consciente a la regla del
 * proyecto (la primera es el cargador de datos de prueba). La tabla no tiene
 * políticas de escritura a propósito: un precio de referencia es una afirmación
 * de la plataforma, no un dato que carga un usuario.
 */
import '../src/config/env.js';
import { supabaseService } from '../src/lib/supabase.js';
import { familiaDeModelo, normalizar } from '../src/services/price-estimate.js';

/** Cómo se identifica esta fuente en la columna `source` de la tabla. */
const FUENTE = 'argautos';

const BASE = 'https://argautos.com/api/v1';

/**
 * Cuánto se espera entre pedidos.
 *
 * La fuente permite unos pocos por minuto a quien no tiene clave. Veintiún
 * segundos es ir despacio a propósito: es un servicio gratuito y este script se
 * corre de vez en cuando, no hay ningún apuro. Si igual contesta 429, se
 * respeta el tiempo que pida.
 */
const ESPERA_MS = 21_000;

/** Precios por debajo de esto son ruido de la fuente, no un vehículo. */
const PRECIO_MINIMO_USD = 200;

interface ResultadoBusqueda {
  brand: string;
  brand_slug: string;
  model: string;
  version: string;
  price: string;
  /** El año al que corresponde el precio. 0 significa 0 km. */
  price_year: number;
}

const args = process.argv.slice(2);
const soloArg = valorDe('--solo');
const rehacer = args.includes('--rehacer');

async function main(): Promise<void> {
  const service = supabaseService();

  const objetivos = await modelosPublicados(service);
  const filtrados = soloArg
    ? objetivos.filter((o) => `${o.marca} ${o.familia}`.includes(normalizar(soloArg)))
    : objetivos;

  if (filtrados.length === 0) {
    console.log('No hay modelos para cargar.');
    return;
  }

  const yaCargados = rehacer ? new Set<string>() : await familiasYaCargadas(service);

  const pendientes = filtrados.filter((o) => !yaCargados.has(`${o.marca}|${o.familia}`));
  const salteados = filtrados.length - pendientes.length;

  console.log(`${filtrados.length} modelos publicados en la plataforma.`);
  if (salteados > 0) {
    console.log(`${salteados} ya tienen referencias cargadas (usá --rehacer para volver a bajarlos).`);
  }
  console.log(`A consultar: ${pendientes.length}. Esto tarda: se le habla despacio a la fuente.\n`);

  let conReferencias = 0;
  let sinReferencias = 0;
  let filasTotales = 0;

  for (const [indice, objetivo] of pendientes.entries()) {
    const etiqueta = `${objetivo.marca} ${objetivo.familia}`;
    process.stdout.write(`[${indice + 1}/${pendientes.length}] ${etiqueta.padEnd(30)} `);

    try {
      const filas = await referenciasDe(objetivo);

      if (filas.length === 0) {
        sinReferencias += 1;
        console.log('sin datos en la fuente');
        continue;
      }

      const { error } = await service
        .from('market_references')
        .upsert(filas, { onConflict: 'source,brand,model_family,year' });

      if (error) {
        throw new Error(error.message);
      }

      conReferencias += 1;
      filasTotales += filas.length;
      const años = filas.map((f) => f.year).sort((a, b) => a - b);
      console.log(`${filas.length} años (${años[0]}–${años[años.length - 1]})`);
    } catch (error) {
      sinReferencias += 1;
      console.log(`falló: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(
    `\nListo. ${conReferencias} modelos con referencias (${filasTotales} filas), ${sinReferencias} sin datos.`,
  );
}

interface Objetivo {
  marca: string;
  familia: string;
}

/** Las combinaciones de marca y familia que hay publicadas hoy. */
async function modelosPublicados(service: ReturnType<typeof supabaseService>): Promise<Objetivo[]> {
  const { data, error } = await service
    .from('listings')
    .select('brand, model')
    .in('status', ['published', 'sold', 'paused']);

  if (error) {
    throw new Error(`No se pudieron leer las publicaciones: ${error.message}`);
  }

  const unicos = new Map<string, Objetivo>();

  for (const fila of (data ?? []) as Array<{ brand: string; model: string }>) {
    const objetivo = { marca: normalizar(fila.brand), familia: familiaDeModelo(fila.model) };
    unicos.set(`${objetivo.marca}|${objetivo.familia}`, objetivo);
  }

  return [...unicos.values()].sort((a, b) => `${a.marca}${a.familia}`.localeCompare(`${b.marca}${b.familia}`));
}

async function familiasYaCargadas(
  service: ReturnType<typeof supabaseService>,
): Promise<Set<string>> {
  const { data } = await service
    .from('market_references')
    .select('brand, model_family')
    .eq('source', FUENTE);

  return new Set(
    ((data ?? []) as Array<{ brand: string; model_family: string }>).map(
      (fila) => `${fila.brand}|${fila.model_family}`,
    ),
  );
}

interface FilaReferencia {
  source: string;
  brand: string;
  model_family: string;
  year: number;
  price_usd: number;
  price_min_usd: number;
  price_max_usd: number;
  versions: number;
  label: string;
}

/**
 * Todas las referencias de un modelo, agrupadas por año.
 *
 * La fuente devuelve una fila por versión ("Corolla 4P 1,8 SEG CVT 2016"), cada
 * una con su precio y su año. Acá se juntan todas las versiones del mismo año y
 * se guarda la MEDIANA, más el mínimo y el máximo: un Corolla 2019 no vale lo
 * mismo en XEI que en SEG, y esconder esa diferencia detrás de un solo número
 * sería fingir una precisión que la fuente no tiene.
 */
async function referenciasDe(objetivo: Objetivo): Promise<FilaReferencia[]> {
  const resultados = await buscarTodas(objetivo.familia);

  const porAño = new Map<number, { precios: number[]; etiqueta: string }>();

  for (const resultado of resultados) {
    // La búsqueda es por texto: puede traer otras marcas y otros modelos que
    // contengan el mismo término. Se filtra por marca y por familia.
    if (normalizar(resultado.brand) !== objetivo.marca) {
      continue;
    }
    if (familiaDeModelo(resultado.model) !== objetivo.familia) {
      continue;
    }

    const precio = Number(resultado.price);
    // `price_year` en 0 significa 0 km. No entra: la plataforma vende usados, y
    // un precio de cero kilómetro arrastraría la referencia para arriba.
    if (!resultado.price_year || !Number.isFinite(precio) || precio < PRECIO_MINIMO_USD) {
      continue;
    }

    const entrada = porAño.get(resultado.price_year) ?? { precios: [], etiqueta: resultado.model };
    entrada.precios.push(precio);
    porAño.set(resultado.price_year, entrada);
  }

  return [...porAño.entries()].map(([año, { precios, etiqueta }]) => {
    const ordenados = [...precios].sort((a, b) => a - b);

    return {
      source: FUENTE,
      brand: objetivo.marca,
      model_family: objetivo.familia,
      year: año,
      price_usd: redondear(mediana(ordenados)),
      price_min_usd: redondear(ordenados[0]!),
      price_max_usd: redondear(ordenados[ordenados.length - 1]!),
      versions: ordenados.length,
      label: etiqueta,
    };
  });
}

/** Recorre las páginas de la búsqueda hasta que no quedan más. */
async function buscarTodas(termino: string): Promise<ResultadoBusqueda[]> {
  const todas: ResultadoBusqueda[] = [];

  for (let pagina = 1; pagina <= 6; pagina += 1) {
    const url = `${BASE}/search?q=${encodeURIComponent(termino)}&page=${pagina}`;
    const datos = await pedirConEspera(url);
    const resultados = (datos.data ?? []) as ResultadoBusqueda[];

    todas.push(...resultados);

    // La última página viene incompleta o vacía.
    if (resultados.length < 25) {
      break;
    }
  }

  return todas;
}

interface RespuestaApi {
  data?: unknown;
  retry_after?: number;
}

/**
 * Un pedido a la fuente, yendo despacio y respetando lo que pida cuando frena.
 */
async function pedirConEspera(url: string, intento = 1): Promise<RespuestaApi> {
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(20_000) });

  if (respuesta.status === 429) {
    const cuerpo = (await respuesta.json().catch(() => ({}))) as RespuestaApi;
    const espera = ((cuerpo.retry_after ?? 60) + 2) * 1000;

    if (intento > 4) {
      throw new Error('la fuente sigue frenando los pedidos después de varios intentos');
    }

    process.stdout.write(`(esperando ${Math.round(espera / 1000)}s) `);
    await dormir(espera);
    return pedirConEspera(url, intento + 1);
  }

  if (!respuesta.ok) {
    throw new Error(`la fuente respondió ${respuesta.status}`);
  }

  const datos = (await respuesta.json()) as RespuestaApi;

  // La pausa va DESPUÉS de cada pedido logrado, no antes: así el próximo modelo
  // arranca con el crédito ya recuperado.
  await dormir(ESPERA_MS);

  return datos;
}

function mediana(ordenados: number[]): number {
  const medio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0
    ? (ordenados[medio - 1]! + ordenados[medio]!) / 2
    : ordenados[medio]!;
}

function redondear(monto: number): number {
  return Math.round(monto);
}

function dormir(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

function valorDe(bandera: string): string | null {
  const indice = args.indexOf(bandera);
  return indice >= 0 ? (args[indice + 1] ?? null) : null;
}

await main();

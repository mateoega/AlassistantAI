import type { SupabaseClient } from '@supabase/supabase-js';
import { getListing } from './listings.js';
import { getVehicleTypeById } from './catalog.js';
import { getCotizacion, type Cotizacion } from './exchange-rate.js';
import type { VehicleType } from '../types.js';

/**
 * Estimación de precio a partir de las publicaciones de la propia plataforma.
 *
 * Es la primera de las tres capas que decidió el Sprint 3 (ver
 * `docs/roadmap.md`) y la única que funciona para los siete tipos de vehículo
 * desde el primer día: compara el aviso contra otros parecidos que están
 * publicados acá mismo, corrigiendo por año y por kilómetros.
 *
 * QUÉ NO HACE
 *
 *   No dice si conviene comprar. Dice cuánto piden por vehículos parecidos y
 *   dónde queda este entre ellos. La diferencia no es de redacción: lo primero
 *   es un consejo financiero, lo segundo es un dato con su método a la vista.
 *
 * POR QUÉ NO SE GUARDA EN LA BASE
 *
 *   A diferencia del análisis de fotos del Sprint 2, esto no cuesta plata ni
 *   tarda: es una consulta y una cuenta. Guardarlo traería el problema de
 *   siempre — saber cuándo quedó viejo — y acá queda viejo con cada aviso
 *   nuevo que se publica, que es justamente lo que tiene que reflejar.
 *
 * SEGURIDAD: usa el cliente del usuario. Las reglas de acceso siguen mandando,
 * así que los borradores ajenos no entran en la comparación ni por accidente.
 */

/**
 * Cuántos avisos parecidos hacen falta para animarse a estimar.
 *
 * Dos, y no tres. Se midió contra la base real antes de decidirlo: con tres,
 * solo 10 de 68 publicaciones recibían estimación; con dos, 27. Los dos casos
 * plantados a propósito en los datos de prueba se siguen detectando igual de
 * fuerte (+65% y -21%), así que bajar el mínimo compró cobertura sin perder la
 * capacidad de señalar lo que no cierra.
 *
 * LO QUE COSTÓ, Y CÓMO SE PAGA
 *
 *   Una estimación armada con dos avisos está más cerca de una anécdota que de
 *   un dato. Por eso, cuando se calcula con dos, la confianza se informa como
 *   "baja" y la pantalla muestra CUÁLES son los dos avisos. La promesa de la
 *   plataforma no es saberlo todo: es no esconder con qué está hablando.
 *
 *   Con uno solo no se estima nunca. Un único aviso no es un mercado, es un
 *   vecino con una idea.
 *
 * POR QUÉ IMPORTA MÁS DE LO QUE PARECE
 *
 *   Para motos, camiones, buses y cuatriciclos no hay fuente externa gratuita
 *   (ver `docs/para_mas_adelante.md`). En esos tipos, o se compara contra los
 *   pocos avisos propios, o no hay estimación en absoluto.
 */
const MINIMO_COMPARABLES = 2;

/**
 * Cuántos años de diferencia se toleran para considerar dos vehículos
 * comparables.
 *
 * Seis, que es donde deja de sumar: medido contra la base real, ampliarla más
 * no encuentra ni un comparable nuevo. Puede parecer mucho para un auto, pero
 * la diferencia de años ya se corrige con la depreciación del tipo — de eso se
 * trata el ajuste. Lo que la ventana evita es comparar cosas que ni siquiera
 * son la misma generación del modelo.
 */
const VENTANA_ANIOS = 6;

/**
 * Cuántos comparables aporta como máximo un mismo vendedor.
 *
 * Sin este tope, alguien con seis avisos del mismo modelo fijaría él solo el
 * precio de referencia de ese modelo. Es una plataforma que vende confianza:
 * el que publica no puede ser también el que decide contra qué se lo compara.
 */
const MAXIMO_POR_VENDEDOR = 2;

/*
 * CÓMO PIERDE VALOR CADA TIPO DE VEHÍCULO
 *
 * Un camión no se deprecia como una moto, y 300.000 km en un camión son
 * normales mientras que en un auto son muchos. Esos dos coeficientes NO están
 * escritos acá: viven en el catálogo (`vehicle_types.annual_depreciation` y
 * `wear_per_10k_km`) y se leen con el tipo de vehículo.
 *
 * Es la regla del proyecto: agregar un tipo nuevo tiene que funcionar cargando
 * una fila en el catálogo, sin tocar código ni redesplegar. Un diccionario de
 * slugs en este archivo dejaría a cada tipo nuevo con valores de auto hasta el
 * próximo despliegue. Ver `app/CLAUDE.md` y la migración 20260821000001.
 */

/**
 * Hasta dónde puede corregir el ajuste por kilómetros.
 *
 * Sin tope, comparar un aviso de 20.000 km contra uno de 341.000 daría una
 * corrección del 40% y el resultado diría más del ajuste que del mercado.
 * Topeado, un aviso muy alejado aporta menos en vez de distorsionar.
 */
const AJUSTE_KM_MINIMO = 0.7;
const AJUSTE_KM_MAXIMO = 1.4;

/**
 * Ancho mínimo del rango que se muestra, hacia cada lado del valor central.
 *
 * Con pocos comparables el rango puede salir tan angosto que parezca una
 * precisión que no tenemos. Un piso del 8% evita prometer exactitud.
 */
const ANCHO_MINIMO_RANGO = 0.08;

export interface Comparable {
  id: string;
  titulo: string;
  anio: number;
  kilometros: number;
  precio: number;
  moneda: 'ARS' | 'USD';
  /** El precio llevado al año y los kilómetros del aviso que se está mirando. */
  precio_ajustado: number;
  vendido: boolean;
}

/**
 * Lo que dice una fuente de afuera sobre este modelo y año.
 *
 * NO está ajustada por kilómetros: la fuente publica el valor del modelo, no
 * el de este vehículo en particular, y no dice contra qué kilometraje lo
 * calculó. Inventar ese ajuste sería agregarle una precisión que el dato no
 * tiene. Por eso se muestra al lado del rango propio y no mezclada con él.
 */
export interface ReferenciaExterna {
  fuente: string;
  valor: number;
  minimo: number | null;
  maximo: number | null;
  moneda: 'ARS' | 'USD';
  /** El año de la fuente, que puede no ser exactamente el del aviso. */
  anio_fuente: number;
  /** Cuántas versiones del modelo promedió la fuente para ese año. */
  versiones: number;
}

export interface EstimacionDisponible {
  disponible: true;

  /**
   * De dónde salió el rango:
   *   'comparables' → de los avisos publicados en la plataforma (ajustados por
   *                   año y kilómetros). Es el mejor caso.
   *   'referencia'  → no había avisos parecidos suficientes y se usó la fuente
   *                   externa, que no ajusta por kilómetros.
   */
  origen: 'comparables' | 'referencia';
  moneda: 'ARS' | 'USD';
  minimo: number;
  maximo: number;
  central: number;
  confianza: 'alta' | 'media' | 'baja';
  precio_pedido: number;
  /** Dónde cae el precio pedido respecto del rango estimado. */
  posicion: 'dentro' | 'por_encima' | 'por_debajo';
  /** Diferencia porcentual contra el valor central. Positivo = más caro. */
  desvio_porcentual: number;
  comparables: Comparable[];
  /** Lo que dice la fuente externa, cuando la hay. Se muestra siempre que exista. */
  referencia_externa: ReferenciaExterna | null;
  cotizacion: Cotizacion | null;
  calculado_en: string;
}

export interface EstimacionNoDisponible {
  disponible: false;
  motivo: string;
  comparables_encontrados: number;
}

interface FilaReferencia {
  source: string;
  year: number;
  price_usd: string | number;
  price_min_usd: string | number | null;
  price_max_usd: string | number | null;
  versions: number;
}

export type Estimacion = EstimacionDisponible | EstimacionNoDisponible;

interface FilaComparable {
  id: string;
  seller_id: string;
  brand: string;
  model: string;
  year: number;
  price: string | number;
  currency: 'ARS' | 'USD';
  kilometers: string | number;
  status: string;
}

export async function estimarPrecio(
  supabase: SupabaseClient,
  listingId: string,
): Promise<Estimacion> {
  // Pedir la publicación es también lo que hace cumplir el permiso: si el
  // usuario no la puede ver, esto corta acá con un 404.
  const aviso = await getListing(supabase, listingId);
  const familia = familiaDeModelo(aviso.model);

  // Sin tipo de vehículo no hay contra qué comparar: el tipo es lo que define
  // el conjunto. Es un caso que la validación no deja crear, pero un aviso
  // viejo o roto no tiene por qué tumbar la pantalla de detalle.
  if (!aviso.vehicle_type) {
    return {
      disponible: false,
      motivo: 'Esta publicación no tiene un tipo de vehículo válido, así que no hay con qué compararla.',
      comparables_encontrados: 0,
    };
  }

  // El tipo COMPLETO, con sus coeficientes de depreciación y desgaste. Es lo
  // que hace que un camión se compare como camión sin que este archivo sepa
  // que los camiones existen.
  const tipo = await getVehicleTypeById(aviso.vehicle_type.id);

  const { data, error } = await supabase
    .from('listings')
    .select('id, seller_id, brand, model, year, price, currency, kilometers, status')
    // Publicadas y vendidas. Las vendidas entran a propósito: un aviso que
    // efectivamente se vendió es la señal de precio más fuerte que tenemos.
    .in('status', ['published', 'sold'])
    .eq('vehicle_type_id', aviso.vehicle_type.id)
    .ilike('brand', aviso.brand.trim())
    .gte('year', aviso.year - VENTANA_ANIOS)
    .lte('year', aviso.year + VENTANA_ANIOS)
    .neq('id', listingId)
    .limit(100);

  if (error) {
    throw new Error(`No se pudieron buscar publicaciones comparables: ${error.message}`);
  }

  const mismaFamilia = ((data ?? []) as unknown as FilaComparable[]).filter(
    (fila) => familiaDeModelo(fila.model) === familia,
  );

  const cotizacion = await getCotizacion();
  const precioPedidoUsd = aDolares(Number(aviso.price), aviso.currency, cotizacion);

  if (precioPedidoUsd === null) {
    return {
      disponible: false,
      motivo:
        'No se pudo obtener la cotización del dólar para comparar precios entre monedas distintas. Probá de nuevo en un rato.',
      comparables_encontrados: mismaFamilia.length,
    };
  }

  const comparables = armarComparables(mismaFamilia, aviso, tipo, cotizacion);
  const referencia = await buscarReferencia(supabase, aviso, tipo, cotizacion);

  // Camino principal: los avisos de la propia plataforma. Son los únicos que se
  // pueden ajustar por kilómetros, así que cuando alcanzan, mandan ellos.
  if (comparables.length >= MINIMO_COMPARABLES) {
    return calcular(
      comparables,
      aviso.currency,
      precioPedidoUsd,
      Number(aviso.price),
      cotizacion,
      referencia,
    );
  }

  // Camino de respaldo: no hay con qué comparar acá adentro, pero una fuente de
  // afuera sabe cuánto vale este modelo. Vale menos que lo anterior y se dice.
  if (referencia) {
    return desdeReferencia(referencia, aviso, precioPedidoUsd, comparables, cotizacion);
  }

  return {
    disponible: false,
    motivo:
      comparables.length === 0
        ? 'Todavía no hay otras publicaciones de este modelo con las que comparar, y ninguna fuente de precios que consultamos lo tiene cargado.'
        : `Hay ${comparables.length} ${comparables.length === 1 ? 'publicación parecida' : 'publicaciones parecidas'} y hacen falta al menos ${MINIMO_COMPARABLES} para estimar un precio con algo de fundamento.`,
    comparables_encontrados: comparables.length,
  };
}

/**
 * Lo que dice la fuente externa sobre este modelo y año.
 *
 * Se queda con el año más cercano al del aviso y lo corrige con la
 * depreciación del tipo, igual que se hace con los comparables. Si la fuente
 * no conoce el modelo —no tiene camiones ni motos, por ejemplo— devuelve
 * `null` y la estimación sigue sin ella. Que la aplicación funcione cuando la
 * fuente no está es la razón por la que las referencias viven en nuestra
 * propia base y no se consultan en vivo.
 */
async function buscarReferencia(
  supabase: SupabaseClient,
  aviso: Aviso,
  tipo: VehicleType,
  cotizacion: Cotizacion | null,
): Promise<ReferenciaExterna | null> {
  const { data, error } = await supabase
    .from('market_references')
    .select('source, year, price_usd, price_min_usd, price_max_usd, versions')
    .eq('brand', normalizar(aviso.brand))
    .eq('model_family', familiaDeModelo(aviso.model))
    .gte('year', aviso.year - VENTANA_ANIOS)
    .lte('year', aviso.year + VENTANA_ANIOS);

  if (error || !data || data.length === 0) {
    return null;
  }

  const filas = data as unknown as FilaReferencia[];
  const masCercana = filas.reduce((mejor, fila) =>
    Math.abs(fila.year - aviso.year) < Math.abs(mejor.year - aviso.year) ? fila : mejor,
  );

  const factorAnios = (1 - tipo.annual_depreciation) ** (masCercana.year - aviso.year);
  const aMoneda = (valorUsd: number): number =>
    redondear(desdeDolares(valorUsd, aviso.currency, cotizacion), aviso.currency);
  const opcional = (valor: string | number | null): number | null =>
    valor === null ? null : aMoneda(Number(valor) * factorAnios);

  return {
    fuente: masCercana.source,
    valor: aMoneda(Number(masCercana.price_usd) * factorAnios),
    minimo: opcional(masCercana.price_min_usd),
    maximo: opcional(masCercana.price_max_usd),
    moneda: aviso.currency,
    anio_fuente: masCercana.year,
    versiones: masCercana.versions,
  };
}

/**
 * La estimación cuando lo único que hay es la fuente externa.
 *
 * El rango sale de la diferencia entre versiones del mismo modelo (un Corolla
 * 2019 no vale lo mismo en XEI que en SEG). Si la fuente no distingue
 * versiones, se abre un 10% a cada lado para no fingir exactitud.
 *
 * La confianza nunca es "alta" por este camino: falta el ajuste por
 * kilómetros, que es justamente lo que más mueve el precio de un usado.
 */
function desdeReferencia(
  referencia: ReferenciaExterna,
  aviso: Aviso,
  precioPedidoUsd: number,
  comparables: Comparable[],
  cotizacion: Cotizacion | null,
): EstimacionDisponible {
  const central = referencia.valor;
  const minimo = referencia.minimo ?? Math.round(central * 0.9);
  const maximo = referencia.maximo ?? Math.round(central * 1.1);

  const enUsd = (monto: number): number =>
    aviso.currency === 'USD' ? monto : monto / (cotizacion?.pesos_por_dolar ?? 1);

  return {
    disponible: true,
    origen: 'referencia',
    moneda: aviso.currency,
    minimo,
    maximo,
    central,
    // Con dos o más versiones detrás, la fuente al menos promedió algo; con una
    // sola, es un dato suelto.
    confianza: referencia.versiones >= 2 ? 'media' : 'baja',
    precio_pedido: Number(aviso.price),
    posicion:
      precioPedidoUsd > enUsd(maximo)
        ? 'por_encima'
        : precioPedidoUsd < enUsd(minimo)
          ? 'por_debajo'
          : 'dentro',
    desvio_porcentual: Math.round(((precioPedidoUsd - enUsd(central)) / enUsd(central)) * 100),
    comparables,
    referencia_externa: referencia,
    cotizacion,
    calculado_en: new Date().toISOString(),
  };
}

type Aviso = Awaited<ReturnType<typeof getListing>>;

function armarComparables(
  filas: FilaComparable[],
  aviso: Aviso,
  tipo: VehicleType,
  cotizacion: Cotizacion | null,
): Comparable[] {
  const porVendedor = new Map<string, number>();
  const comparables: Comparable[] = [];

  // Se ordenan por cercanía de año antes de aplicar el tope por vendedor, para
  // que el tope descarte los avisos menos parecidos y no los primeros que
  // vinieron de la base.
  const ordenadas = [...filas].sort(
    (a, b) => Math.abs(a.year - aviso.year) - Math.abs(b.year - aviso.year),
  );

  for (const fila of ordenadas) {
    const usados = porVendedor.get(fila.seller_id) ?? 0;
    if (usados >= MAXIMO_POR_VENDEDOR) {
      continue;
    }

    const precioUsd = aDolares(Number(fila.price), fila.currency, cotizacion);
    if (precioUsd === null) {
      continue;
    }

    porVendedor.set(fila.seller_id, usados + 1);

    comparables.push({
      id: fila.id,
      titulo: `${fila.brand} ${fila.model} ${fila.year}`,
      anio: fila.year,
      kilometros: Number(fila.kilometers),
      precio: Number(fila.price),
      moneda: fila.currency,
      precio_ajustado: ajustar(precioUsd, fila, aviso, tipo),
      vendido: fila.status === 'sold',
    });
  }

  return comparables;
}

/**
 * Lleva el precio de un comparable al año y los kilómetros del aviso que se
 * está mirando, para que los números que se promedian hablen todos del mismo
 * vehículo hipotético.
 */
function ajustar(
  precioUsd: number,
  comparable: FilaComparable,
  aviso: Aviso,
  tipo: VehicleType,
): number {
  const depreciacion = tipo.annual_depreciation;
  const desgaste = tipo.wear_per_10k_km;

  // Si el comparable es más nuevo que el aviso, el exponente es positivo y el
  // factor baja el precio: el aviso es más viejo, vale menos.
  const factorAnios = (1 - depreciacion) ** (comparable.year - aviso.year);

  // Si el comparable tiene más kilómetros que el aviso, la diferencia es
  // positiva y el factor sube el precio: el aviso está menos usado.
  const diferenciaKm = Number(comparable.kilometers) - aviso.kilometers;
  const factorKm = acotar(1 + (desgaste * diferenciaKm) / 10_000, AJUSTE_KM_MINIMO, AJUSTE_KM_MAXIMO);

  return precioUsd * factorAnios * factorKm;
}

function calcular(
  comparables: Comparable[],
  moneda: 'ARS' | 'USD',
  precioPedidoUsd: number,
  precioPedido: number,
  cotizacion: Cotizacion | null,
  referencia: ReferenciaExterna | null,
): EstimacionDisponible {
  const ajustados = comparables.map((c) => c.precio_ajustado).sort((a, b) => a - b);

  // Se usa la MEDIANA y no el promedio: un solo aviso disparatado —el que pide
  // el doble de lo que vale, o el que remata— movería el promedio y no mueve
  // la mediana. Es la diferencia entre una estimación robusta y una que
  // cualquiera puede correr publicando un número absurdo.
  const central = percentil(ajustados, 0.5);
  const p25 = percentil(ajustados, 0.25);
  const p75 = percentil(ajustados, 0.75);

  // El rango nunca se muestra más angosto que ±8%: con pocos comparables, un
  // rango de tres dólares de ancho sería una precisión inventada.
  const minimo = Math.min(p25, central * (1 - ANCHO_MINIMO_RANGO));
  const maximo = Math.max(p75, central * (1 + ANCHO_MINIMO_RANGO));

  const dispersion = central > 0 ? (p75 - p25) / central : 1;

  // "baja" no es un adorno: es la etiqueta que acompaña a una estimación
  // armada con el mínimo de avisos posible, y la pantalla tiene que mostrarla
  // junto a los comparables que se usaron. Ver el comentario de
  // MINIMO_COMPARABLES.
  const confianza: 'alta' | 'media' | 'baja' =
    comparables.length <= 2
      ? 'baja'
      : comparables.length >= 5 && dispersion <= 0.25
        ? 'alta'
        : 'media';

  const aMoneda = (valorUsd: number): number =>
    redondear(desdeDolares(valorUsd, moneda, cotizacion), moneda);

  return {
    disponible: true,
    origen: 'comparables',
    moneda,
    minimo: aMoneda(minimo),
    maximo: aMoneda(maximo),
    central: aMoneda(central),
    confianza,
    precio_pedido: precioPedido,
    posicion:
      precioPedidoUsd > maximo ? 'por_encima' : precioPedidoUsd < minimo ? 'por_debajo' : 'dentro',
    desvio_porcentual: Math.round(((precioPedidoUsd - central) / central) * 100),
    // Se devuelven ordenados por año descendente, que es como se leen: del más
    // nuevo al más viejo.
    comparables: [...comparables].sort((a, b) => b.anio - a.anio),
    referencia_externa: referencia,
    cotizacion,
    calculado_en: new Date().toISOString(),
  };
}

/**
 * Texto comparable: minúscula, sin acentos y sin signos.
 *
 * Es lo que permite que "Mercedes-Benz" de una publicación y "MERCEDES BENZ"
 * de una fuente externa se reconozcan como la misma marca.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

/**
 * La familia del modelo: "Corolla XEI 1.8" y "Corolla SEG 2.0 CVT" son los dos
 * un Corolla y tienen que compararse entre sí.
 *
 * ES UNA HEURÍSTICA, Y SE SABE. El modelo se escribe libre (ver
 * `docs/para_mas_adelante.md`), así que no hay forma exacta de saber dónde
 * termina el nombre del modelo y dónde empieza la versión. Se toma la primera
 * palabra, salvo que sea muy corta —"CB 190R", "ZB 110", "GT 250"—, donde el
 * nombre real necesita también la segunda.
 *
 * El día que exista un catálogo de modelos, esta función desaparece.
 */
export function familiaDeModelo(model: string): string {
  const palabras = normalizar(model).split(' ').filter(Boolean);

  if (palabras.length === 0) {
    return '';
  }

  const primera = palabras[0]!;
  const necesitaSegunda = primera.length <= 3 && !/\d/.test(primera) && palabras.length > 1;

  return necesitaSegunda ? `${primera} ${palabras[1]}` : primera;
}

function aDolares(
  monto: number,
  moneda: 'ARS' | 'USD',
  cotizacion: Cotizacion | null,
): number | null {
  if (moneda === 'USD') {
    return monto;
  }
  return cotizacion ? monto / cotizacion.pesos_por_dolar : null;
}

function desdeDolares(
  montoUsd: number,
  moneda: 'ARS' | 'USD',
  cotizacion: Cotizacion | null,
): number {
  if (moneda === 'USD') {
    return montoUsd;
  }
  // Si se llegó hasta acá con un aviso en pesos, hubo cotización: sin ella la
  // estimación se corta antes.
  return montoUsd * (cotizacion?.pesos_por_dolar ?? 1);
}

/**
 * Redondea a una precisión creíble. Un rango que dice "USD 14.237" finge una
 * exactitud que no tiene; "USD 14.200" dice lo mismo sin mentir.
 */
function redondear(monto: number, moneda: 'ARS' | 'USD'): number {
  const paso = moneda === 'USD' ? 100 : 100_000;
  return Math.round(monto / paso) * paso;
}

/** Percentil por interpolación sobre una lista YA ordenada de menor a mayor. */
function percentil(ordenados: number[], p: number): number {
  if (ordenados.length === 0) {
    return 0;
  }
  if (ordenados.length === 1) {
    return ordenados[0]!;
  }

  const posicion = (ordenados.length - 1) * p;
  const abajo = Math.floor(posicion);
  const arriba = Math.ceil(posicion);

  if (abajo === arriba) {
    return ordenados[abajo]!;
  }

  return ordenados[abajo]! + (ordenados[arriba]! - ordenados[abajo]!) * (posicion - abajo);
}

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

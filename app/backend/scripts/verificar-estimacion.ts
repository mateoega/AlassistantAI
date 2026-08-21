/**
 * Verificación a mano de la estimación de precio del Sprint 3.
 *
 * Corre la estimación REAL (el mismo código que usa la API) contra la base
 * real, y muestra qué le da a cada publicación. Los dos casos plantados a
 * propósito en los datos de prueba tienen que hacer ruido:
 *
 *   - corolla-2015-raro: un Corolla 2015 con 38.000 km a USD 27.000
 *   - hilux-2018-castigada: una Hilux con 341.000 km a precio de remate
 *
 * Usa la clave de servicio para poder mirar todo sin iniciar sesión. Es una
 * herramienta de desarrollo: no se despliega ni la invoca ningún usuario.
 */
import '../src/config/env.js';
import { supabaseService } from '../src/lib/supabase.js';
import { estimarPrecio } from '../src/services/price-estimate.js';

const service = supabaseService();

const { data, error } = await service
  .from('listings')
  .select('id, brand, model, year, kilometers, price, currency, status, vehicle_type:vehicle_types(slug)')
  .in('status', ['published', 'sold'])
  .order('brand');

if (error) {
  console.error('No se pudieron leer las publicaciones:', error.message);
  process.exit(1);
}

const avisos = (data ?? []) as unknown as Array<{
  id: string;
  brand: string;
  model: string;
  year: number;
  kilometers: string | number;
  price: string | number;
  currency: 'ARS' | 'USD';
  vehicle_type: { slug: string } | null;
}>;

const soloFiltro = process.argv[2]?.toLowerCase();

let conEstimacion = 0;
let sinEstimacion = 0;
const ruidosos: string[] = [];

for (const aviso of avisos) {
  const titulo = `${aviso.brand} ${aviso.model} ${aviso.year}`;

  if (soloFiltro && !titulo.toLowerCase().includes(soloFiltro)) {
    continue;
  }

  const resultado = await estimarPrecio(service, aviso.id);
  const pedido = `${aviso.currency} ${Number(aviso.price).toLocaleString('es-AR')}`;
  const km = `${Number(aviso.kilometers).toLocaleString('es-AR')} km`;

  if (!resultado.disponible) {
    sinEstimacion += 1;
    console.log(`· ${titulo.padEnd(42)} ${pedido.padStart(16)}  ${km.padStart(12)}  → sin estimar (${resultado.comparables_encontrados} comparables)`);
    continue;
  }

  conEstimacion += 1;

  const rango = `${resultado.moneda} ${resultado.minimo.toLocaleString('es-AR')} – ${resultado.maximo.toLocaleString('es-AR')}`;
  const signo = resultado.desvio_porcentual > 0 ? '+' : '';
  const marca =
    resultado.posicion === 'dentro' ? ' ' : resultado.posicion === 'por_encima' ? '↑' : '↓';

  if (resultado.posicion !== 'dentro') {
    ruidosos.push(`${marca} ${titulo} — pide ${pedido}, estimado ${rango} (${signo}${resultado.desvio_porcentual}%)`);
  }

  const origen =
    resultado.origen === 'referencia'
      ? `ref. ${resultado.referencia_externa?.fuente ?? 'externa'}`
      : `${resultado.comparables.length} comp.${resultado.referencia_externa ? ' + ref.' : ''}`;

  console.log(
    `${marca} ${titulo.padEnd(42)} ${pedido.padStart(16)}  ${km.padStart(12)}  → ${rango} ` +
      `(${signo}${resultado.desvio_porcentual}%, ${origen}, confianza ${resultado.confianza})`,
  );
}

console.log(`\nCon estimación: ${conEstimacion}   ·   Sin estimación: ${sinEstimacion}`);

if (ruidosos.length > 0) {
  console.log('\nLos que quedan fuera del rango estimado:');
  for (const linea of ruidosos) {
    console.log(`  ${linea}`);
  }
}

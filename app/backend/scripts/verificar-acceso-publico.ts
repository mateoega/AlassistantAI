/**
 * Comprueba la migración 014 con la clave ANÓNIMA — la misma que usa el
 * navegador de alguien que no inició sesión. Con la clave de servicio esto no
 * probaría nada: esa clave se saltea las reglas de acceso.
 */
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadDotenv({ path: path.resolve(process.cwd(), '../../.env'), quiet: true });

const anon = createClient(
  process.env.SUPABASE_URL!.trim(),
  process.env.SUPABASE_ANON_KEY!.trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main() {
  let ok = 0;
  let fallos = 0;

  function check(nombre: string, pasa: boolean, detalle = '') {
    if (pasa) { ok++; console.log(`  OK   ${nombre}${detalle ? ' — ' + detalle : ''}`); }
    else { fallos++; console.log(`  FALLA ${nombre}${detalle ? ' — ' + detalle : ''}`); }
  }

  console.log('\nLO QUE UN VISITANTE SIN CUENTA SÍ TIENE QUE PODER\n');

  const { data: pubs, error: e1 } = await anon
    .from('listings').select('id, status, seller:profiles(display_name)').limit(100);
  check('lee las publicaciones', !e1 && (pubs?.length ?? 0) > 0, e1 ? e1.message : `${pubs?.length} avisos`);
  check('todas son publicadas o vendidas',
    !!pubs && pubs.every((l: any) => ['published', 'sold'].includes(l.status)),
    [...new Set((pubs ?? []).map((l: any) => l.status))].join(', '));
  check('ve el nombre del vendedor',
    !!pubs && pubs.some((l: any) => l.seller?.display_name));

  const primera = pubs?.[0] as any;
  const { data: fotos, error: e2 } = await anon
    .from('listing_photos').select('id').eq('listing_id', primera?.id);
  check('ve las fotos de un aviso', !e2 && (fotos?.length ?? 0) > 0, e2 ? e2.message : `${fotos?.length} fotos`);

  const { error: e3 } = await anon.from('listing_analyses').select('id').limit(1);
  check('puede leer análisis ya hechos', !e3, e3?.message);

  const { data: tipos, error: e4 } = await anon.from('vehicle_types').select('slug');
  check('sigue viendo el catálogo', !e4 && (tipos?.length ?? 0) > 0, `${tipos?.length} tipos`);

  console.log('\nLO QUE UN VISITANTE SIN CUENTA NO TIENE QUE PODER\n');

  const { data: borradores } = await anon.from('listings').select('id').eq('status', 'draft');
  check('NO ve borradores', (borradores?.length ?? 0) === 0, `devolvió ${borradores?.length ?? 0}`);

  const { data: pausados } = await anon.from('listings').select('id').eq('status', 'paused');
  check('NO ve pausados', (pausados?.length ?? 0) === 0, `devolvió ${pausados?.length ?? 0}`);

  const { data: tel, error: e5 } = await anon.from('profiles').select('phone').limit(1);
  check('NO puede pedir el teléfono', !!e5 || (tel?.length ?? 0) === 0,
    e5 ? 'rechazado por la base' : `devolvió ${tel?.length} filas`);

  const { error: e6 } = await anon.from('favorites').select('listing_id').limit(1);
  const { data: favs } = await anon.from('favorites').select('listing_id').limit(1);
  check('NO ve favoritos de nadie', !!e6 || (favs?.length ?? 0) === 0);

  const { error: e7 } = await anon.from('messages').select('id').limit(1);
  const { data: msgs } = await anon.from('messages').select('id').limit(1);
  check('NO ve mensajes de nadie', !!e7 || (msgs?.length ?? 0) === 0);

  const { error: e8 } = await anon.from('listings').insert({ brand: 'X', model: 'Y' } as any);
  check('NO puede publicar', !!e8, e8 ? 'rechazado' : 'PUDO INSERTAR');

  const { data: upd } = await anon.from('listings').update({ price: 1 }).eq('id', primera?.id).select('id');
  check('NO puede editar un aviso ajeno', (upd?.length ?? 0) === 0);

  console.log(`\n${ok} en verde, ${fallos} en rojo\n`);
  process.exit(fallos === 0 ? 0 : 1);

}

void main();

/**
 * Carga las publicaciones de prueba en Supabase.
 *
 * QUÉ HACE
 *   1. Lee el catálogo de vehículos de `demo-vehicles.ts`.
 *   2. Verifica que cada uno sea válido contra los catálogos de la base
 *      (tipo, marca, provincia y ficha específica). Si algo no cierra, corta
 *      ANTES de escribir nada.
 *   3. Busca fotos reales de cada vehículo en Wikimedia Commons (licencia
 *      libre), las descarga y las sube a Supabase Storage.
 *   4. Crea o actualiza las publicaciones.
 *
 * SE PUEDE CORRER MÁS DE UNA VEZ. El id de cada publicación se calcula a
 * partir de su `key`, así que la segunda corrida actualiza las mismas filas en
 * vez de duplicarlas. Las fotos ya descargadas quedan en caché local.
 *
 * POR QUÉ USA LA CLAVE DE SERVICIO
 *   El proyecto tiene una regla: la clave de servicio se usa solo para guardar
 *   los análisis de IA (ver app/CLAUDE.md). Este script es la excepción
 *   consciente, y no forma parte de la aplicación: es una herramienta de
 *   desarrollo que se corre a mano desde la máquina de quien programa. Crear
 *   publicaciones a nombre de cuatro vendedores distintos exige saltear las
 *   reglas de acceso; la alternativa sería iniciar sesión como cada uno.
 *   Nada de este archivo se despliega ni lo puede invocar un usuario.
 *
 * USO
 *   npm run seed:demo                 carga todo (fotos incluidas)
 *   npm run seed:demo -- --sin-fotos  solo los datos, no toca fotos
 *   npm run seed:demo -- --solo corolla-2015,hilux-2020
 *   npm run seed:demo -- --borrar     borra SOLO las publicaciones de prueba
 *   npm run seed:demo -- --borrar-todo
 *                                     borra TODAS las publicaciones de la
 *                                     base, sean de prueba o no. Cuidado.
 */

import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { config as loadDotenv } from 'dotenv';
import { DEMO_VEHICLES, type DemoVehicle } from './demo-vehicles.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../..');
const CACHE_DIR = path.join(HERE, '.cache-fotos');
const ATTRIBUTION_FILE = path.join(HERE, 'fotos-usadas.json');

loadDotenv({ path: path.join(REPO_ROOT, '.env'), quiet: true });

/**
 * Los usuarios de prueba que ya existen en Supabase Auth. El índice es el que
 * usa el campo `seller` del catálogo de datos.
 *
 *   0, 1, 2  vendedores ajenos: sirven para probar la vista del COMPRADOR
 *            (contactar, analizar, no poder editar).
 *   3        la cuenta propia: sus publicaciones aparecen en "Mis
 *            publicaciones", con borrador y pausada incluidos.
 */
const SELLERS = ['prueba1@gmail.com', 'prueba2@gmail.com', 'prueba3@gmail.com', 'alistarpro@gmail.com'];

/** Teléfono de contacto de prueba, para que ande el botón de WhatsApp. */
const SELLER_PHONES = ['1155550101', '1155550202', '1155550303', '1155550404'];

/** Cuántas fotos se le ponen a cada publicación, como máximo. */
const PHOTOS_PER_LISTING = 3;

const BUCKET = 'vehicle-photos';

/**
 * Namespace fijo para calcular los ids. Que sea fijo es lo que hace que la
 * misma `key` dé siempre el mismo id de publicación, corrida tras corrida.
 */
const NAMESPACE = '6f1c3a52-4b6e-4a53-9d5e-1b7c9a0f2e31';

const args = process.argv.slice(2);
const options = {
  skipPhotos: args.includes('--sin-fotos'),
  deleteDemo: args.includes('--borrar'),
  deleteAll: args.includes('--borrar-todo'),
  only: readList('--solo'),
};

function readList(flag: string): string[] | null {
  const i = args.indexOf(flag);
  if (i === -1) return null;
  return (args[i + 1] ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/**
 * Id estable a partir de un texto (UUID versión 5). Es lo que permite volver a
 * correr el script sin duplicar: la misma clave da siempre el mismo id.
 */
function stableId(name: string): string {
  const ns = Buffer.from(NAMESPACE.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(Buffer.concat([ns, Buffer.from(name, 'utf8')])).digest();
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = (b[6]! & 0x0f) | 0x50; // versión 5
  b[8] = (b[8]! & 0x3f) | 0x80; // variante RFC 4122
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Conexión
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_KEY?.trim();

if (!supabaseUrl || !serviceKey) {
  fail(
    'Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en el .env de la raíz del proyecto.\n' +
      '  La clave de servicio está en el panel de Supabase, en Project Settings > API.',
  );
}

const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// Catálogos de la base
// ---------------------------------------------------------------------------

interface Catalogs {
  types: Map<string, { id: string; slug: string; name: string; name_plural: string }>;
  fieldsByType: Map<string, TypeField[]>;
  provinces: Map<string, { id: string; slug: string; name: string }>;
  citiesByProvince: Map<string, { name: string }[]>;
  brands: Map<string, { id: string; slug: string; name: string }>;
  sellerIds: string[];
}

interface TypeField {
  vehicle_type_id: string;
  key: string;
  data_type: string;
  options: { value: string; label: string }[] | null;
  min_value: number | null;
  max_value: number | null;
}

async function loadCatalogs(): Promise<Catalogs> {
  const [types, fields, provinces, cities, brands, users] = await Promise.all([
    db.from('vehicle_types').select('id, slug, name, name_plural'),
    db.from('vehicle_type_fields').select('vehicle_type_id, key, data_type, options, min_value, max_value'),
    db.from('provinces').select('id, slug, name'),
    db.from('cities').select('province_id, name'),
    db.from('brands').select('id, slug, name'),
    db.auth.admin.listUsers({ perPage: 200 }),
  ]);

  for (const result of [types, fields, provinces, cities, brands]) {
    if (result.error) fail(`No se pudieron leer los catálogos: ${result.error.message}`);
  }
  if (users.error) fail(`No se pudieron leer los usuarios: ${users.error.message}`);

  const byEmail = new Map(users.data.users.map((u) => [u.email?.toLowerCase(), u.id]));
  const sellerIds = SELLERS.map((email) => {
    const id = byEmail.get(email);
    if (!id) {
      fail(
        `No existe el usuario de prueba ${email} en Supabase Auth.\n` +
          `  Crealo desde el panel (Authentication > Users), o cambiá la lista SELLERS ` +
          `al principio de este archivo por las cuentas que sí existan.`,
      );
    }
    return id;
  });

  return {
    types: new Map(types.data!.map((t) => [t.slug, t])),
    fieldsByType: groupBy(fields.data as TypeField[], 'vehicle_type_id'),
    provinces: new Map(provinces.data!.map((p) => [p.slug, p])),
    citiesByProvince: groupBy(cities.data as { province_id: string; name: string }[], 'province_id'),
    brands: new Map(brands.data!.map((b) => [b.slug, b])),
    sellerIds,
  };
}

function groupBy<T extends Record<string, any>>(rows: T[], key: keyof T): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row[key]) ?? [];
    list.push(row);
    map.set(row[key], list);
  }
  return map;
}

/**
 * Revisa el catálogo de datos contra el de la base ANTES de escribir.
 *
 * Es la misma idea que la validación del backend: la ficha `specs` solo puede
 * tener campos que el tipo de vehículo declaró, con valores que existan. Un
 * error acá es un error de tipeo en `demo-vehicles.ts`, y conviene que
 * aparezca como una lista clara y no como una fila rara en la base.
 */
function check(vehicles: DemoVehicle[], cat: Catalogs): string[] {
  const errors: string[] = [];
  const seenKeys = new Set<string>();

  for (const v of vehicles) {
    const where = `[${v.key}]`;

    if (seenKeys.has(v.key)) errors.push(`${where} la clave está repetida.`);
    seenKeys.add(v.key);

    const type = cat.types.get(v.type);
    if (!type) {
      errors.push(`${where} el tipo "${v.type}" no existe en vehicle_types.`);
      continue;
    }
    if (!cat.brands.has(v.brand)) errors.push(`${where} la marca "${v.brand}" no existe en brands.`);
    if (!cat.provinces.has(v.province)) {
      errors.push(`${where} la provincia "${v.province}" no existe en provinces.`);
    }
    if (v.seller < 0 || v.seller >= cat.sellerIds.length) {
      errors.push(`${where} el vendedor ${v.seller} no existe (hay ${cat.sellerIds.length}).`);
    }

    const fieldsByKey = new Map((cat.fieldsByType.get(type.id) ?? []).map((f) => [f.key, f]));

    for (const [key, value] of Object.entries(v.specs ?? {})) {
      const field = fieldsByKey.get(key);
      if (!field) {
        errors.push(`${where} el dato "${key}" no corresponde a un ${type.name.toLowerCase()}.`);
        continue;
      }
      const error = checkValue(field, value);
      if (error) errors.push(`${where} "${key}": ${error}`);
    }
  }

  return errors;
}

function checkValue(field: TypeField, value: unknown): string | null {
  switch (field.data_type) {
    case 'select': {
      const valid = (field.options ?? []).map((o) => o.value);
      return valid.includes(value as string)
        ? null
        : `"${value}" no está entre las opciones (${valid.join(', ')}).`;
    }
    case 'boolean':
      return typeof value === 'boolean' ? null : 'tiene que ser true o false.';
    case 'integer':
      if (!Number.isInteger(value)) return 'tiene que ser un número entero.';
      return outOfRange(field, value as number);
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) return 'tiene que ser un número.';
      return outOfRange(field, value);
    default:
      return typeof value === 'string' ? null : 'tiene que ser texto.';
  }
}

function outOfRange(field: TypeField, value: number): string | null {
  if (field.min_value != null && value < Number(field.min_value)) {
    return `no puede ser menor a ${field.min_value}.`;
  }
  if (field.max_value != null && value > Number(field.max_value)) {
    return `no puede ser mayor a ${field.max_value}.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fotos: Wikimedia Commons
//
// Se usan fotos reales de vehículos publicadas con licencia libre. NO son fotos
// del vehículo exacto del aviso: son del mismo modelo, o de uno parecido. Para
// probar la aplicación alcanza, y es lo más honesto que se puede conseguir sin
// inventar imágenes. La autoría y la licencia de cada una quedan registradas en
// `fotos-usadas.json`.
// ---------------------------------------------------------------------------

const USER_AGENT = 'AIassistant-datos-de-prueba/0.1 (proyecto educativo; contacto vía repositorio)';

interface CommonsPhoto {
  title: string;
  url: string;
  page: string;
  author: string;
  license: string;
}

/**
 * Wikimedia corta el paso cuando se le piden muchas cosas seguidas (error 429)
 * y tiene todo el derecho: es un servicio gratuito. Así que se le habla
 * despacio y, si igual corta, se espera lo que pida y se reintenta.
 */
async function politeFetch(url: string, attempt = 1): Promise<Response> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

  if (response.status === 429 || response.status === 503) {
    if (attempt > 4) throw new Error(`Wikimedia sigue respondiendo ${response.status}; probá de nuevo más tarde`);
    const pedido = Number(response.headers.get('retry-after'));
    const espera = Number.isFinite(pedido) && pedido > 0 ? pedido * 1000 : 5000 * 2 ** (attempt - 1);
    console.warn(`    Wikimedia pidió esperar (${response.status}). Reintento en ${Math.round(espera / 1000)}s…`);
    await sleep(espera);
    return politeFetch(url, attempt + 1);
  }

  if (!response.ok) throw new Error(`Wikimedia respondió ${response.status}`);
  return response;
}

/** Consultas a probar, de la más específica a la más general. */
function searchQueries(v: DemoVehicle, cat: Catalogs): string[] {
  const brand = cat.brands.get(v.brand)!.name;
  const type = cat.types.get(v.type)!;
  const firstWord = v.model.split(/\s+/)[0];

  if (v.photoQuery) return [v.photoQuery, `${brand} ${firstWord}`, `${brand} ${type.name}`];

  return [`${brand} ${firstWord} ${v.year}`, `${brand} ${firstWord}`, `${brand} ${type.name}`];
}

async function searchCommons(query: string): Promise<CommonsPhoto[]> {
  const cacheFile = path.join(CACHE_DIR, `busqueda-${createHash('sha1').update(query).digest('hex')}.json`);

  try {
    return JSON.parse(await fs.readFile(cacheFile, 'utf8'));
  } catch {
    /* no estaba en caché: se busca */
  }

  const endpoint =
    'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: `filetype:bitmap ${query}`,
      gsrnamespace: '6',
      gsrlimit: '12',
      prop: 'imageinfo',
      iiprop: 'url|mime|extmetadata',
      iiurlwidth: '1200',
    });

  const response = await politeFetch(endpoint);
  const json = (await response.json()) as any;
  const pages: any[] = Object.values(json.query?.pages ?? {});

  const results: CommonsPhoto[] = pages
    .map((page) => {
      const info = page.imageinfo?.[0];
      if (!info || info.mime !== 'image/jpeg') return null;
      const meta = info.extmetadata ?? {};
      return {
        title: page.title,
        url: info.thumburl ?? info.url,
        page: info.descriptionurl,
        author: stripHtml(meta.Artist?.value) ?? 'Autor no declarado',
        license: meta.LicenseShortName?.value ?? 'Ver la página del archivo',
      };
    })
    .filter((x): x is CommonsPhoto => x !== null);

  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cacheFile, JSON.stringify(results, null, 2));
  await sleep(1200); // no apurar a Wikimedia
  return results;
}

function stripHtml(text: string | undefined): string | null {
  if (!text) return null;
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

async function download(photo: CommonsPhoto): Promise<Buffer> {
  const cacheFile = path.join(CACHE_DIR, createHash('sha1').update(photo.url).digest('hex') + '.jpg');

  try {
    return await fs.readFile(cacheFile);
  } catch {
    /* no estaba en caché: se descarga */
  }

  const response = await politeFetch(photo.url);
  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cacheFile, bytes);
  await sleep(600);
  return bytes;
}

/**
 * Elige las fotos de un vehículo.
 *
 * `taken` lleva la cuenta de qué imágenes ya se repartieron por consulta, así
 * dos Corolla de años distintos no terminan con exactamente la misma foto.
 */
async function pickPhotos(
  v: DemoVehicle,
  cat: Catalogs,
  taken: Map<string, Set<string>>,
): Promise<CommonsPhoto[]> {
  for (const query of searchQueries(v, cat)) {
    let results: CommonsPhoto[];
    try {
      results = await searchCommons(query);
    } catch (error) {
      console.warn(`    aviso: falló la búsqueda "${query}" (${(error as Error).message})`);
      continue;
    }

    const used = taken.get(query) ?? new Set<string>();
    const free = results.filter((r) => !used.has(r.url));
    // Si ya se repartieron todas, se permite repetir antes que dejar el aviso
    // sin fotos.
    const chosen = (free.length ? free : results).slice(0, PHOTOS_PER_LISTING);

    if (chosen.length) {
      for (const photo of chosen) used.add(photo.url);
      taken.set(query, used);
      return chosen;
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

async function deleteListings(ids: string[]): Promise<number> {
  if (!ids.length) return 0;

  // Primero las fotos del Storage: si se borra la publicación antes, se pierde
  // la lista de rutas y los archivos quedan huérfanos ocupando lugar.
  const { data: photos } = await db.from('listing_photos').select('storage_path').in('listing_id', ids);
  const paths = (photos ?? []).map((p) => p.storage_path);

  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await db.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (error) console.warn(`  aviso: quedaron fotos sin borrar en el Storage (${error.message})`);
  }

  const { error } = await db.from('listings').delete().in('id', ids);
  if (error) fail(`No se pudieron borrar las publicaciones: ${error.message}`);

  return ids.length;
}

function toRow(v: DemoVehicle, cat: Catalogs, now: string) {
  const type = cat.types.get(v.type)!;
  const province = cat.provinces.get(v.province)!;
  const brand = cat.brands.get(v.brand)!;
  const status = v.status ?? 'published';

  const cities = cat.citiesByProvince.get(province.id) ?? [];
  // Se elige una ciudad del catálogo, siempre la misma para la misma clave:
  // así los datos no bailan entre corridas.
  const city =
    v.city ??
    (cities.length
      ? cities[parseInt(stableId(v.key).slice(0, 8), 16) % cities.length]!.name
      : province.name);

  return {
    id: stableId(v.key),
    seller_id: cat.sellerIds[v.seller]!,
    vehicle_type_id: type.id,
    brand: brand.name,
    model: v.model,
    year: v.year,
    price: v.price,
    currency: v.currency,
    kilometers: v.km,
    province_id: province.id,
    city,
    description: v.description ?? null,
    specs: v.specs ?? {},
    status,
    published_at: status === 'draft' ? null : now,
    sold_at: status === 'sold' ? now : null,
  };
}

/**
 * Descarga y sube las fotos de un aviso.
 *
 * Una foto que falla se saltea, no tumba el aviso entero: devuelve las que sí
 * se pudieron subir, y quien llama decide qué hacer si no quedó ninguna.
 */
async function uploadPhotos(
  v: DemoVehicle,
  row: ReturnType<typeof toRow>,
  photos: CommonsPhoto[],
): Promise<{ paths: string[]; uploaded: CommonsPhoto[] }> {
  const paths: string[] = [];
  const uploaded: CommonsPhoto[] = [];

  for (const [i, photo] of photos.entries()) {
    try {
      const bytes = await download(photo);
      const storagePath = `${row.seller_id}/${row.id}/${stableId(`${v.key}-foto-${i}`)}.jpg`;

      const { error } = await db.storage.from(BUCKET).upload(storagePath, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });

      if (error) throw new Error(error.message);
      paths.push(storagePath);
      uploaded.push(photo);
    } catch (error) {
      console.warn(`    aviso: ${v.key} — foto ${i + 1} salteada (${(error as Error).message})`);
    }
  }

  return { paths, uploaded };
}

async function savePhotoRows(listingId: string, paths: string[]): Promise<void> {
  const { error: deleteError } = await db.from('listing_photos').delete().eq('listing_id', listingId);
  if (deleteError) throw new Error(`no se pudieron limpiar las fotos anteriores: ${deleteError.message}`);

  if (!paths.length) return;

  const { error } = await db.from('listing_photos').insert(
    paths.map((storage_path, i) => ({
      id: randomUUID(),
      listing_id: listingId,
      storage_path,
      sort_order: i,
    })),
  );
  if (error) throw new Error(`no se pudieron guardar las fotos: ${error.message}`);
}

/** Sin teléfono no anda el botón de contacto, y es de lo primero que se prueba. */
async function fillMissingPhones(cat: Catalogs): Promise<void> {
  for (const [i, id] of cat.sellerIds.entries()) {
    const { data } = await db.from('profiles').select('phone').eq('id', id).maybeSingle();
    if (data && !data.phone) {
      await db.from('profiles').update({ phone: SELLER_PHONES[i] }).eq('id', id);
    }
  }
}

// ---------------------------------------------------------------------------
// Programa
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const cat = await loadCatalogs();

  const selection = options.only
    ? DEMO_VEHICLES.filter((v) => options.only!.includes(v.key))
    : DEMO_VEHICLES;

  if (options.only && selection.length !== options.only.length) {
    const found = new Set(selection.map((v) => v.key));
    fail(
      `No existen estas claves en demo-vehicles.ts: ${options.only.filter((k) => !found.has(k)).join(', ')}`,
    );
  }

  // --- Borrados -------------------------------------------------------------
  if (options.deleteAll) {
    const { data } = await db.from('listings').select('id');
    const removed = await deleteListings((data ?? []).map((l) => l.id));
    console.log(`✓ Se borraron TODAS las publicaciones de la base (${removed}).`);
    if (!options.deleteDemo) return;
  }

  if (options.deleteDemo) {
    const ids = selection.map((v) => stableId(v.key));
    const { data } = await db.from('listings').select('id').in('id', ids);
    const removed = await deleteListings((data ?? []).map((l) => l.id));
    console.log(`✓ Se borraron ${removed} publicaciones de prueba.`);
    return;
  }

  // --- Revisión previa ------------------------------------------------------
  const errors = check(selection, cat);
  if (errors.length) {
    fail(`El catálogo de datos tiene ${errors.length} problema(s):\n\n  ` + errors.join('\n  '));
  }
  console.log(`✓ ${selection.length} vehículos revisados contra los catálogos de la base.\n`);

  await fillMissingPhones(cat);

  // --- Carga ----------------------------------------------------------------
  const now = new Date().toISOString();
  const taken = new Map<string, Set<string>>();
  const attribution: Record<string, unknown> = {};
  const withoutPhotos: string[] = [];
  let done = 0;

  for (const v of selection) {
    const row = toRow(v, cat, now);

    let paths: string[] = [];

    if (!options.skipPhotos) {
      const found = await pickPhotos(v, cat, taken);
      const { paths: subidas, uploaded } = await uploadPhotos(v, row, found);
      paths = subidas;

      if (!paths.length) withoutPhotos.push(v.key);

      // Una publicación sin fotos no puede salir al muro: es la regla del
      // Sprint 1.6. Si no se pudo conseguir ninguna, el aviso entra como
      // borrador en vez de aparecer publicado y vacío.
      if (!paths.length && row.status !== 'draft') {
        row.status = 'draft';
        row.published_at = null;
        row.sold_at = null;
      }

      attribution[v.key] = uploaded.map((p) => ({
        archivo: p.title,
        autor: p.author,
        licencia: p.license,
        pagina: p.page,
      }));

      // Se guarda aviso por aviso, no al final: si la corrida se interrumpe a
      // mitad de camino, el registro de autoría de lo ya subido igual queda
      // escrito. Es lo que exige la licencia de las fotos.
      await saveAttribution(attribution);
    }

    const { error } = await db.from('listings').upsert(row, { onConflict: 'id' });
    if (error) fail(`No se pudo guardar "${v.key}": ${error.message}`);

    if (!options.skipPhotos) await savePhotoRows(row.id, paths);

    done += 1;
    const brand = cat.brands.get(v.brand)!.name;
    console.log(
      `  ${String(done).padStart(2)}/${selection.length}  ${brand} ${v.model} ${v.year}` +
        `  ${row.status}  ${paths.length} foto(s)`,
    );
  }

  console.log(`\n✓ Listo: ${done} publicaciones cargadas.`);
  if (withoutPhotos.length) {
    console.log(
      `\n  Sin fotos (quedaron como borrador): ${withoutPhotos.join(', ')}\n` +
        `  Poneles una consulta mejor en el campo "photoQuery" de demo-vehicles.ts y volvé a correr:\n` +
        `      npm run seed:demo -- --solo ${withoutPhotos.join(',')}`,
    );
  }
  if (!options.skipPhotos) {
    console.log(`\n  Autoría y licencia de las fotos: app/backend/scripts/fotos-usadas.json`);
  }
}

/**
 * Deja el registro de autoría con lo de esta corrida, sin perder lo de las
 * anteriores: correr el script para tres avisos no puede borrar la atribución
 * de los otros sesenta.
 */
async function saveAttribution(current: Record<string, unknown>): Promise<void> {
  let previous: Record<string, unknown> = {};
  try {
    previous = JSON.parse(await fs.readFile(ATTRIBUTION_FILE, 'utf8'));
  } catch {
    /* todavía no existía */
  }

  const merged = { ...previous, ...current };
  const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
  await fs.writeFile(ATTRIBUTION_FILE, JSON.stringify(sorted, null, 2) + '\n');
}

main().catch((error) => fail(error.stack ?? String(error)));

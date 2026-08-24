/**
 * Verifica el recorrido completo con cuentas reales, contra el backend real.
 *
 * QUÉ CIERRA ESTE SCRIPT
 *
 *   El Sprint 1 terminó con una línea abierta: "falta verificar el recorrido
 *   completo con una cuenta real — publicar, editar, marcar como vendido".
 *   Requería iniciar sesión, así que quedó para el equipo, y ahí quedó cinco
 *   sprints. Mientras tanto se verificaron así la estimación (Sprint 3), los
 *   favoritos (Sprint 4) y la mensajería (Sprint 5): el recorrido del que
 *   PUBLICA era la única parte de la aplicación que nadie había mirado andando
 *   con un usuario de verdad.
 *
 * CÓMO ENTRA SIN CONTRASEÑAS
 *
 *   No hay ninguna contraseña en este archivo ni en el `.env`. Con la clave de
 *   servicio se pide un enlace de acceso de un solo uso para cada cuenta de
 *   prueba (`generateLink`) y se lo canjea por una sesión (`verifyOtp`). De ahí
 *   en adelante, cada llamada va a la API firmada como ese usuario, igual que
 *   la haría el navegador: las reglas de acceso de la base se aplican tal cual.
 *
 * POR QUÉ USA LA CLAVE DE SERVICIO
 *
 *   Es el tercer uso permitido, y está anotado en `app/CLAUDE.md`: los enlaces
 *   de acceso y la limpieza al final. Es una herramienta de desarrollo que se
 *   corre a mano, no se despliega y ningún usuario la puede invocar.
 *
 * NO ENSUCIA LA BASE
 *
 *   Todo lo que crea lleva una marca (`VERIFICACIÓN AUTOMÁTICA`) y se borra al
 *   final, incluidas las fotos de Storage, la conversación y el bloqueo. Si el
 *   script se corta por la mitad, la corrida siguiente limpia lo que quedó
 *   antes de empezar.
 *
 * USO
 *   npm run dev            (en otra terminal: el backend tiene que estar vivo)
 *   npm run verificar:recorrido
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadDotenv } from 'dotenv';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.join(HERE, '../../../.env'), quiet: true });

const SUPABASE_URL = requireEnv('SUPABASE_URL').replace(/\/+$/, '');
const ANON_KEY = requireEnv('SUPABASE_ANON_KEY');
const SERVICE_KEY = requireEnv('SUPABASE_SERVICE_KEY');
const API = process.env.API_URL?.trim() || `http://localhost:${process.env.PORT?.trim() || 4000}`;

/** Las cuentas de prueba que ya existen, las mismas que usa `seed-demo.ts`. */
const VENDEDOR = 'prueba1@gmail.com';
const COMPRADOR = 'prueba2@gmail.com';
const TERCERO = 'prueba3@gmail.com';

/**
 * La marca que hace reconocibles a los datos de esta verificación. Va en el
 * modelo del vehículo, que es un campo de texto libre y se ve en el listado.
 */
const MARCA_DE_PRUEBA = 'VERIFICACIÓN AUTOMÁTICA';

const BUCKET = 'vehicle-photos';

const service = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Contador de comprobaciones
// ---------------------------------------------------------------------------

let pasaron = 0;
const fallaron: string[] = [];

function check(nombre: string, condicion: boolean, detalle?: string): void {
  if (condicion) {
    pasaron += 1;
    console.log(`  ✓ ${nombre}`);
    return;
  }

  fallaron.push(nombre);
  console.log(`  ✗ ${nombre}${detalle ? `\n      ${detalle}` : ''}`);
}

function paso(titulo: string): void {
  console.log(`\n${titulo}`);
}

// ---------------------------------------------------------------------------
// Entrar como un usuario, sin contraseñas
// ---------------------------------------------------------------------------

interface Sesion {
  email: string;
  userId: string;
  token: string;
  /** Cliente de Supabase con la identidad de esta persona, para Storage. */
  supabase: SupabaseClient;
}

async function entrarComo(email: string): Promise<Sesion> {
  const { data: link, error: linkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (linkError || !link?.properties?.hashed_token) {
    throw new Error(
      `No se pudo pedir el enlace de acceso para ${email}: ${linkError?.message ?? 'sin datos'}.\n` +
        `  ¿Existe esa cuenta en Supabase Auth? Las crea el equipo desde el panel.`,
    );
  }

  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token,
  });

  if (error || !data.session) {
    throw new Error(`No se pudo iniciar sesión como ${email}: ${error?.message ?? 'sin sesión'}.`);
  }

  return {
    email,
    userId: data.session.user.id,
    token: data.session.access_token,
    supabase,
  };
}

// ---------------------------------------------------------------------------
// Llamar a la API como lo haría el navegador
// ---------------------------------------------------------------------------

interface Respuesta<T> {
  status: number;
  ok: boolean;
  body: T;
}

async function llamar<T = any>(
  sesion: Sesion | null,
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE',
  ruta: string,
  cuerpo?: unknown,
): Promise<Respuesta<T>> {
  const response = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(sesion ? { Authorization: `Bearer ${sesion.token}` } : {}),
    },
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });

  const body = response.status === 204 ? (null as T) : ((await response.json().catch(() => null)) as T);

  return { status: response.status, ok: response.ok, body };
}

// ---------------------------------------------------------------------------
// La verificación
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`Verificando el recorrido completo contra ${API}\n`);

  const salud = await fetch(`${API}/api/health`).catch(() => null);

  if (!salud?.ok) {
    fail(`El backend no responde en ${API}. Levantalo con "npm run dev" en otra terminal.`);
  }

  await limpiar('Limpieza previa (por si quedó algo de una corrida cortada)');

  const vendedor = await entrarComo(VENDEDOR);
  const comprador = await entrarComo(COMPRADOR);
  const tercero = await entrarComo(TERCERO);

  paso('1. Entrar con cuentas reales');
  check('El vendedor obtiene sesión sin usar contraseña', Boolean(vendedor.token));
  check('El comprador obtiene sesión sin usar contraseña', Boolean(comprador.token));
  check(
    'La API reconoce al vendedor',
    (await llamar(vendedor, 'GET', '/api/listings?scope=mine')).ok,
  );
  check('Sin sesión, la API rechaza', (await llamar(null, 'GET', '/api/listings')).status === 401);

  // --- El catálogo, para armar un vehículo válido sin inventar nada ---------

  const catalogo = await llamar<{ vehicle_types: TipoDeVehiculo[] }>(
    vendedor,
    'GET',
    '/api/catalog/vehicle-types',
  );
  const provincias = await llamar<{ provinces: { id: string; slug: string }[] }>(
    vendedor,
    'GET',
    '/api/catalog/provinces',
  );

  const tipo = catalogo.body.vehicle_types[0];
  const provincia = provincias.body.provinces[0];

  if (!tipo || !provincia) {
    fail('El catálogo vino vacío: sin tipos de vehículo o sin provincias no hay nada que publicar.');
  }

  const specs = fichaValida(tipo);

  // --- 2. Crear un borrador ------------------------------------------------

  paso('2. Publicar');

  const datos = {
    vehicle_type_id: tipo.id,
    brand: 'Volkswagen',
    model: MARCA_DE_PRUEBA,
    year: 2018,
    price: 15_000_000,
    currency: 'ARS',
    kilometers: 90_000,
    province_id: provincia.id,
    city: 'La Plata',
    description: 'Publicación creada por la verificación automática. Se borra al terminar.',
    specs,
    photos: [] as string[],
    status: 'draft',
  };

  const creado = await llamar<{ listing: { id: string; status: string } }>(
    vendedor,
    'POST',
    '/api/listings',
    datos,
  );

  check('Se crea el borrador', creado.status === 201, JSON.stringify(creado.body));

  const listingId = creado.body?.listing?.id;

  if (!listingId) {
    fail('Sin publicación creada no se puede seguir.');
  }

  check('Nace como borrador', creado.body.listing.status === 'draft');

  const sinFotos = await llamar(vendedor, 'POST', `/api/listings/${listingId}/status`, {
    status: 'published',
  });
  check(
    'No se puede publicar sin fotos',
    sinFotos.status === 400,
    `Respondió ${sinFotos.status}: ${JSON.stringify(sinFotos.body)}`,
  );

  // --- 3. Subir una foto, como lo hace el navegador ------------------------

  const foto = await sharp({
    create: { width: 320, height: 240, channels: 3, background: { r: 200, g: 205, b: 210 } },
  })
    .jpeg()
    .toBuffer();

  const rutaFoto = `${vendedor.userId}/${listingId}/verificacion.jpg`;

  const { error: subidaError } = await vendedor.supabase.storage
    .from(BUCKET)
    .upload(rutaFoto, foto, { contentType: 'image/jpeg', upsert: true });

  check('El vendedor sube una foto a su propia carpeta', !subidaError, subidaError?.message);

  // La carpeta lleva el id del dueño: subir a la de otro tiene que fallar.
  const { error: ajenaError } = await comprador.supabase.storage
    .from(BUCKET)
    .upload(`${vendedor.userId}/${listingId}/ajena.jpg`, foto, { contentType: 'image/jpeg' });

  check('Nadie sube fotos a la carpeta de otro', Boolean(ajenaError));

  const conFoto = await llamar<{ listing: { photos: unknown[] } }>(
    vendedor,
    'PUT',
    `/api/listings/${listingId}`,
    { ...datos, id: listingId, photos: [rutaFoto] },
  );

  check('La foto queda asociada a la publicación', conFoto.body?.listing?.photos?.length === 1);
  check(
    'Guardar cambios no publica por su cuenta',
    (conFoto.body as any)?.listing?.status === 'draft',
  );

  const publicado = await llamar<{ listing: { status: string; published_at: string | null } }>(
    vendedor,
    'POST',
    `/api/listings/${listingId}/status`,
    { status: 'published' },
  );

  check('Con una foto ya se puede publicar', publicado.body?.listing?.status === 'published');
  check('Queda registrada la fecha de publicación', Boolean(publicado.body?.listing?.published_at));

  // --- 4. Se ve en el muro y se encuentra buscando -------------------------

  paso('3. Aparece en el muro y se encuentra');

  check('Está en el muro público', await estaEnElMuro(comprador, listingId));
  check(
    'Se encuentra buscando por el modelo',
    await estaEnElMuro(comprador, listingId, `&q=${encodeURIComponent(MARCA_DE_PRUEBA)}`),
  );
  check(
    'Un filtro que no coincide no lo trae',
    !(await estaEnElMuro(comprador, listingId, '&anio_min=2030')),
  );

  // --- 5. Editar -----------------------------------------------------------

  paso('4. Editar');

  const editado = await llamar<{ listing: { price: number; status: string } }>(
    vendedor,
    'PUT',
    `/api/listings/${listingId}`,
    { ...datos, id: listingId, photos: [rutaFoto], price: 14_000_000, status: 'published' },
  );

  check('Se puede editar el precio', Number(editado.body?.listing?.price) === 14_000_000);
  check('Editar no cambia el estado: sigue publicada', editado.body?.listing?.status === 'published');

  const ajeno = await llamar(comprador, 'PUT', `/api/listings/${listingId}`, {
    ...datos,
    id: listingId,
    photos: [],
    price: 1,
  });

  check(
    'Nadie edita la publicación de otro',
    ajeno.status === 404 || ajeno.status === 403,
    `Respondió ${ajeno.status}`,
  );

  const borradoAjeno = await llamar(comprador, 'DELETE', `/api/listings/${listingId}`);
  check(
    'Nadie borra la publicación de otro',
    borradoAjeno.status === 404 || borradoAjeno.status === 403,
    `Respondió ${borradoAjeno.status}`,
  );

  // --- 6. Consultar al vendedor -------------------------------------------

  paso('5. El comprador consulta');

  const conversacion = await llamar<{ id: string }>(comprador, 'POST', '/api/conversations', {
    listing_id: listingId,
  });

  check('Se abre la conversación desde el aviso', conversacion.status === 200);

  const conversationId = conversacion.body?.id;

  const mensaje = await llamar(comprador, 'POST', `/api/conversations/${conversationId}/messages`, {
    body: '¿Sigue disponible? (mensaje de la verificación automática)',
  });

  check('El comprador puede escribir', mensaje.status === 201);

  const respuesta = await llamar(vendedor, 'POST', `/api/conversations/${conversationId}/messages`, {
    body: 'Sí, sigue disponible.',
  });

  check('El vendedor puede contestar', respuesta.status === 201);

  const espia = await llamar(tercero, 'GET', `/api/conversations/${conversationId}`);
  check('Un tercero no ve la conversación', espia.status === 404);

  // --- 7. Bloquear y denunciar (Sprint 6) ---------------------------------

  paso('6. Bloquear y denunciar');

  const motivos = await llamar<{ reasons: { value: string }[] }>(
    comprador,
    'GET',
    '/api/conversations/report-reasons',
  );

  check('Los motivos de denuncia los manda el servidor', (motivos.body?.reasons?.length ?? 0) > 0);

  const denuncia = await llamar(comprador, 'POST', `/api/conversations/${conversationId}/report`, {
    reason: motivos.body.reasons[0]!.value,
    detail: 'Denuncia de la verificación automática.',
  });

  check('Se puede denunciar la conversación', denuncia.status === 204, JSON.stringify(denuncia.body));

  const repetida = await llamar(comprador, 'POST', `/api/conversations/${conversationId}/report`, {
    reason: motivos.body.reasons[0]!.value,
  });

  check('No se denuncia dos veces la misma conversación', repetida.status === 400);

  const motivoInventado = await llamar(
    comprador,
    'POST',
    `/api/conversations/${conversationId}/report`,
    { reason: 'porque-si' },
  );

  check('Un motivo inventado se rechaza', motivoInventado.status === 400);

  const bloqueo = await llamar(comprador, 'POST', `/api/conversations/${conversationId}/block`);
  check('El comprador puede bloquear al vendedor', bloqueo.status === 204);

  const bloqueado = await llamar(vendedor, 'POST', `/api/conversations/${conversationId}/messages`, {
    body: 'Hola de nuevo.',
  });

  check(
    'El bloqueado no puede escribir',
    bloqueado.status === 400,
    `Respondió ${bloqueado.status}: ${JSON.stringify(bloqueado.body)}`,
  );

  const bloqueador = await llamar(
    comprador,
    'POST',
    `/api/conversations/${conversationId}/messages`,
    { body: 'Yo tampoco debería poder.' },
  );

  check('El que bloqueó tampoco puede escribir', bloqueador.status === 400);

  const hilo = await llamar<{ conversation: { messages: unknown[]; moderation: any } }>(
    vendedor,
    'GET',
    `/api/conversations/${conversationId}`,
  );

  check('Los mensajes anteriores se siguen leyendo', (hilo.body?.conversation?.messages?.length ?? 0) >= 2);
  check('El hilo avisa que hay un bloqueo', hilo.body?.conversation?.moderation?.blocked === true);
  check(
    'Al bloqueado no se le dice que fue él el bloqueado',
    hilo.body?.conversation?.moderation?.blocked_by_me === false,
  );

  const { data: espiaBloqueo } = await vendedor.supabase.from('user_blocks').select('blocker_id');
  check(
    'Nadie puede leer quién lo bloqueó',
    (espiaBloqueo ?? []).every((fila: any) => fila.blocker_id === vendedor.userId),
  );

  const { data: espiaDenuncia } = await vendedor.supabase.from('conversation_reports').select('id');
  check('El denunciado no ve la denuncia', (espiaDenuncia ?? []).length === 0);

  await llamar(comprador, 'DELETE', `/api/conversations/${conversationId}/block`);

  const despues = await llamar(vendedor, 'POST', `/api/conversations/${conversationId}/messages`, {
    body: 'Ahora sí.',
  });

  check('Al desbloquear se vuelve a poder escribir', despues.status === 201);

  // --- 8. Pausar y vender --------------------------------------------------

  paso('7. Pausar y marcar como vendido');

  await llamar(vendedor, 'POST', `/api/listings/${listingId}/status`, { status: 'paused' });

  check('Pausada, sale del muro', !(await estaEnElMuro(comprador, listingId)));

  const pausadaDirecta = await llamar(comprador, 'GET', `/api/listings/${listingId}`);
  check('Pausada, tampoco se abre por enlace directo', pausadaDirecta.status === 404);

  const consultaPausada = await llamar(tercero, 'POST', '/api/conversations', {
    listing_id: listingId,
  });
  check('No se consulta por un aviso pausado', consultaPausada.status >= 400);

  const vendida = await llamar<{ listing: { status: string } }>(
    vendedor,
    'POST',
    `/api/listings/${listingId}/status`,
    { status: 'sold' },
  );

  check('Se puede marcar como vendida', vendida.body?.listing?.status === 'sold');
  check('Vendida, sale del muro', !(await estaEnElMuro(comprador, listingId)));

  const vendidaDirecta = await llamar<{ listing: { status: string } }>(
    comprador,
    'GET',
    `/api/listings/${listingId}`,
  );

  check(
    'Vendida, se sigue viendo por enlace: quien la tenía guardada entiende qué pasó',
    vendidaDirecta.body?.listing?.status === 'sold',
  );

  const consultaVendida = await llamar(tercero, 'POST', '/api/conversations', {
    listing_id: listingId,
  });
  check('No se consulta por un aviso vendido', consultaVendida.status >= 400);

  const conversacionVieja = await llamar<{ conversation: { listing_title: string } }>(
    comprador,
    'GET',
    `/api/conversations/${conversationId}`,
  );

  check(
    'La conversación sobrevive al aviso y dice de qué vehículo era',
    conversacionVieja.body?.conversation?.listing_title?.includes(MARCA_DE_PRUEBA) === true,
  );

  // --- 9. Borrar -----------------------------------------------------------

  paso('8. Borrar');

  const borrado = await llamar(vendedor, 'DELETE', `/api/listings/${listingId}`);
  check('El dueño puede borrar su publicación', borrado.status === 204);

  const despuesDeBorrar = await llamar(vendedor, 'GET', `/api/listings/${listingId}`);
  check('Ya no existe', despuesDeBorrar.status === 404);

  await limpiar('9. Limpieza');

  // --- Resultado -----------------------------------------------------------

  console.log(`\n${'─'.repeat(60)}`);

  if (fallaron.length === 0) {
    console.log(`Todo en verde: ${pasaron} comprobaciones.`);
    return;
  }

  console.log(`${pasaron} en verde, ${fallaron.length} en rojo:`);
  for (const nombre of fallaron) {
    console.log(`  · ${nombre}`);
  }
  process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

interface TipoDeVehiculo {
  id: string;
  slug: string;
  fields: {
    key: string;
    data_type: 'text' | 'number' | 'integer' | 'boolean' | 'select';
    options: { value: string }[] | null;
    is_required: boolean;
    min_value: number | null;
    max_value: number | null;
  }[];
}

/**
 * Una ficha válida para ese tipo, armada desde el catálogo.
 *
 * No hay ninguna lista de campos escrita acá: si mañana alguien agrega un tipo
 * de vehículo desde el panel de Supabase, este script sigue funcionando. Es la
 * misma regla que rige al formulario y a los prompts.
 */
function fichaValida(tipo: TipoDeVehiculo): Record<string, unknown> {
  const specs: Record<string, unknown> = {};

  for (const campo of tipo.fields) {
    if (!campo.is_required) {
      continue;
    }

    if (campo.data_type === 'boolean') {
      specs[campo.key] = true;
    } else if (campo.data_type === 'select') {
      specs[campo.key] = campo.options?.[0]?.value ?? '';
    } else if (campo.data_type === 'text') {
      specs[campo.key] = 'verificación';
    } else {
      specs[campo.key] = campo.min_value ?? 1;
    }
  }

  return specs;
}

async function estaEnElMuro(sesion: Sesion, listingId: string, extra = ''): Promise<boolean> {
  const { body } = await llamar<{ listings: { id: string }[] }>(
    sesion,
    'GET',
    `/api/listings?scope=public${extra}`,
  );

  return (body?.listings ?? []).some((listing) => listing.id === listingId);
}

/**
 * Borra todo lo que crea esta verificación.
 *
 * Corre al principio y al final: si una corrida se cortó por la mitad, la
 * siguiente empieza con la base limpia en vez de chocar contra los restos.
 */
async function limpiar(titulo: string): Promise<void> {
  paso(titulo);

  const { data: avisos } = await service
    .from('listings')
    .select('id, seller_id')
    .eq('model', MARCA_DE_PRUEBA);

  const ids = (avisos ?? []).map((fila: { id: string }) => fila.id);

  if (ids.length > 0) {
    const { data: fotos } = await service
      .from('listing_photos')
      .select('storage_path')
      .in('listing_id', ids);

    const rutas = (fotos ?? []).map((f: { storage_path: string }) => f.storage_path);

    if (rutas.length > 0) {
      await service.storage.from(BUCKET).remove(rutas);
    }

    await service.from('listings').delete().in('id', ids);
  }

  // Las conversaciones sobreviven al aviso a propósito, así que hay que
  // borrarlas por su cuenta. Las denuncias se van con ellas (cascada).
  const { data: charlas } = await service
    .from('conversations')
    .select('id')
    .ilike('listing_title', `%${MARCA_DE_PRUEBA}%`);

  const charlaIds = (charlas ?? []).map((fila: { id: string }) => fila.id);

  if (charlaIds.length > 0) {
    await service.from('conversations').delete().in('id', charlaIds);
  }

  // Los bloqueos entre las cuentas de prueba, que no cuelgan de ningún aviso.
  const { data: usuarios } = await service.auth.admin.listUsers({ perPage: 200 });
  const idsDePrueba = (usuarios?.users ?? [])
    .filter((u) => [VENDEDOR, COMPRADOR, TERCERO].includes(u.email?.toLowerCase() ?? ''))
    .map((u) => u.id);

  if (idsDePrueba.length > 0) {
    await service.from('user_blocks').delete().in('blocker_id', idsDePrueba);
  }

  console.log(
    `  · ${ids.length} publicación(es), ${charlaIds.length} conversación(es) y los bloqueos de prueba, borrados.`,
  );
}

function requireEnv(nombre: string): string {
  const valor = process.env[nombre]?.trim();

  if (!valor) {
    fail(
      `Falta ${nombre} en el .env de la raíz.` +
        (nombre === 'SUPABASE_SERVICE_KEY'
          ? ' Se necesita para pedir los enlaces de acceso y para limpiar al final.'
          : ''),
    );
  }

  return valor!;
}

function fail(mensaje: string): never {
  console.error(`\n${mensaje}\n`);
  process.exit(1);
}

await main();

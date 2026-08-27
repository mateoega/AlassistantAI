import { Router } from 'express';
import { auth, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../lib/http-error.js';

/**
 * El perfil del vendedor: nombre y teléfono de contacto.
 *
 * El teléfono se muestra en la publicación, así que tiene que haber un lugar
 * donde cargarlo. Antes no existía y siempre salía vacío.
 */
export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get('/', async (req, res) => {
  const { userId, supabase } = auth(req);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, phone, terms_accepted_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer el perfil: ${error.message}`);
  }

  res.json({
    profile: data ?? { id: userId, display_name: null, phone: null, terms_accepted_at: null },
  });
});

profileRouter.put('/', async (req, res) => {
  const { userId, supabase } = auth(req);
  const body = (req.body ?? {}) as Record<string, unknown>;
  const errors: string[] = [];

  const displayName = optionalText(body.display_name, 'Tu nombre', 80, errors);
  const phone = optionalText(body.phone, 'Teléfono', 40, errors);

  if (!displayName) {
    errors.push('Falta completar "Tu nombre".');
  }

  if (errors.length > 0) {
    throw HttpError.badRequest('Revisá los datos de tu perfil.', errors);
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, phone })
    .eq('id', userId)
    .select('id, display_name, phone, terms_accepted_at')
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo guardar el perfil: ${error.message}`);
  }

  if (!data) {
    throw HttpError.notFound('No se encontró tu perfil.');
  }

  res.json({ profile: data });
});

/**
 * Dejar constancia de que esta persona aceptó los términos de `/legales`.
 *
 * QUIÉN LA LLAMA. El cartel de aceptación que se muestra la primera vez. Al que
 * se registra hoy la fecha se la pone el disparador de la base al crear la
 * cuenta, así que esta ruta es para los otros dos casos: las cuentas que ya
 * existían antes de que la aceptación existiera, y cualquiera cuyo perfil haya
 * quedado sin la marca.
 *
 * LA FECHA LA PONE EL SERVIDOR, no el navegador — igual que en el disparador.
 * Y NO SE PISA una aceptación anterior: la constancia que vale es la primera,
 * y volver a entrar no debería mover esa fecha hacia adelante.
 *
 * Es idempotente a propósito: el cartel puede llamarla dos veces —dos pestañas
 * abiertas, un reintento— y la segunda no cambia nada.
 */
profileRouter.post('/terms', async (req, res) => {
  const { userId, supabase } = auth(req);

  const { data, error } = await supabase
    .from('profiles')
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq('id', userId)
    .is('terms_accepted_at', null)
    .select('terms_accepted_at')
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo registrar la aceptación: ${error.message}`);
  }

  // `data` viene vacío cuando ya estaba aceptado: la condición `is null` no
  // encontró ninguna fila. No es un error — es el caso normal de la segunda
  // llamada.
  res.json({ terms_accepted_at: data?.terms_accepted_at ?? null });
});

function optionalText(
  raw: unknown,
  label: string,
  maxLength: number,
  errors: string[],
): string | null {
  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
    return null;
  }

  if (typeof raw !== 'string') {
    errors.push(`"${label}" tiene que ser un texto.`);
    return null;
  }

  const text = raw.trim();

  if (text.length > maxLength) {
    errors.push(`"${label}" no puede superar los ${maxLength} caracteres.`);
    return text.slice(0, maxLength);
  }

  return text;
}

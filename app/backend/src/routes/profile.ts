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
    .select('id, display_name, phone')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer el perfil: ${error.message}`);
  }

  res.json({ profile: data ?? { id: userId, display_name: null, phone: null } });
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
    .select('id, display_name, phone')
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo guardar el perfil: ${error.message}`);
  }

  if (!data) {
    throw HttpError.notFound('No se encontró tu perfil.');
  }

  res.json({ profile: data });
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

import type { NextFunction, Request, Response } from 'express';
import { createUserClient, supabasePublic } from '../lib/supabase.js';
import { HttpError } from '../lib/http-error.js';

/**
 * Verifica el token que manda el frontend y deja en `req.auth` la identidad
 * del usuario más un cliente de Supabase que actúa en su nombre.
 *
 * El login lo maneja la librería de Supabase en el navegador; acá solo se
 * comprueba que el token sea auténtico y no haya vencido.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';

  if (!token) {
    throw HttpError.unauthorized();
  }

  const { data, error } = await supabasePublic.auth.getUser(token);

  if (error || !data.user) {
    throw HttpError.unauthorized('Tu sesión venció. Iniciá sesión de nuevo.');
  }

  req.auth = {
    userId: data.user.id,
    supabase: createUserClient(token),
  };

  next();
}

/** Atajo para leer `req.auth` sabiendo que `requireAuth` ya corrió. */
export function auth(req: Request): NonNullable<Request['auth']> {
  if (!req.auth) {
    throw HttpError.unauthorized();
  }
  return req.auth;
}

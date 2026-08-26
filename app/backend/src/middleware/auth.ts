import type { NextFunction, Request, Response } from 'express';
import { createUserClient, supabasePublic } from '../lib/supabase.js';
import { HttpError } from '../lib/http-error.js';

/** Saca el token del encabezado `Authorization: Bearer ...`. Vacío si no hay. */
function bearerToken(req: Request): string {
  const header = req.header('authorization') ?? '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

/**
 * Comprueba el token contra Supabase y arma la identidad del pedido.
 *
 * Devuelve `null` si no vino token. Si vino uno inválido o vencido NO devuelve
 * `null`: eso es un error y se avisa. La diferencia importa — mirar sin cuenta
 * es una forma legítima de usar la aplicación; mirar con una sesión rota es
 * alguien a quien hay que decirle que vuelva a entrar.
 */
async function identify(req: Request): Promise<{ userId: string; supabase: ReturnType<typeof createUserClient> } | null> {
  const token = bearerToken(req);

  if (!token) {
    return null;
  }

  const { data, error } = await supabasePublic.auth.getUser(token);

  if (error || !data.user) {
    throw HttpError.unauthorized('Tu sesión venció. Iniciá sesión de nuevo.');
  }

  return { userId: data.user.id, supabase: createUserClient(token) };
}

/**
 * Exige sesión. Deja en `req.auth` la identidad del usuario más un cliente de
 * Supabase que actúa en su nombre.
 *
 * El login lo maneja la librería de Supabase en el navegador; acá solo se
 * comprueba que el token sea auténtico y no haya vencido.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const identity = await identify(req);

  if (!identity) {
    throw HttpError.unauthorized();
  }

  req.auth = identity;
  req.visitor = identity;

  next();
}

/**
 * Deja pasar con sesión y sin ella. Es lo que hace público al muro.
 *
 * Con sesión se comporta igual que `requireAuth` —incluso deja `req.auth`
 * puesto, así que una ruta puede mirar si quien pregunta es el dueño—. Sin
 * sesión deja el cliente anónimo, y de ahí en adelante **quien decide qué se
 * puede ver es la base, no este código**: las políticas de `anon` solo
 * alcanzan lo publicado y lo vendido.
 *
 * Esa es la razón de que la ruta pública no tenga ningún filtro extra escrito
 * a mano. Un filtro acá sería una segunda regla que puede quedar desalineada
 * con la primera; la única que manda está en la migración.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const identity = await identify(req);

  if (identity) {
    req.auth = identity;
    req.visitor = identity;
  } else {
    req.visitor = { userId: null, supabase: supabasePublic };
  }

  next();
}

/** Atajo para leer `req.auth` sabiendo que `requireAuth` ya corrió. */
export function auth(req: Request): NonNullable<Request['auth']> {
  if (!req.auth) {
    throw HttpError.unauthorized();
  }
  return req.auth;
}

/**
 * Atajo para leer `req.visitor` sabiendo que `optionalAuth` (o `requireAuth`)
 * ya corrió. `userId` es `null` cuando la persona no tiene sesión.
 */
export function visitor(req: Request): NonNullable<Request['visitor']> {
  if (!req.visitor) {
    throw HttpError.unauthorized();
  }
  return req.visitor;
}

import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';

/** Cualquier ruta que no exista. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Esa dirección no existe en la API.' });
}

/**
 * Único lugar donde se convierten los errores en respuestas.
 *
 * Los `HttpError` llevan un mensaje pensado para el usuario y se devuelven tal
 * cual. Cualquier otro error es un problema nuestro: se registra completo en la
 * consola del servidor, pero al usuario se le muestra un mensaje genérico —
 * los detalles internos no salen al navegador.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: error.message,
      ...(error.details?.length ? { details: error.details } : {}),
    });
    return;
  }

  console.error('[error inesperado]', error);

  res.status(500).json({
    error: 'Ocurrió un problema en el servidor. Probá de nuevo en un momento.',
  });
}

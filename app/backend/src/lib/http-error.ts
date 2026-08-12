/**
 * Error con código HTTP y mensaje ya escrito en español, listo para mostrarle
 * al usuario. Cualquier otro error que no sea de este tipo se considera un
 * problema interno y no se le muestra al usuario tal cual.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: string[],
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message: string, details?: string[]): HttpError {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = 'Necesitás iniciar sesión para hacer esto.'): HttpError {
    return new HttpError(401, message);
  }

  static notFound(message = 'No se encontró lo que buscabas.'): HttpError {
    return new HttpError(404, message);
  }
}

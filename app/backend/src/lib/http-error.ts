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

  /**
   * Demasiados pedidos. `details` es el lugar donde va cuánto hay que esperar:
   * el mensaje dice qué pasó y el detalle dice hasta cuándo.
   */
  static tooManyRequests(message: string, details?: string[]): HttpError {
    return new HttpError(429, message, details);
  }

  /**
   * Algo que el servidor ofrece pero que en esta instalación no está listo —
   * típicamente, una clave de API sin completar. No es culpa de quien hizo el
   * pedido, así que el mensaje explica qué falta configurar en vez de sonar a
   * error del usuario.
   */
  static unavailable(message: string, details?: string[]): HttpError {
    return new HttpError(503, message, details);
  }
}

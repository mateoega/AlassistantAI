import { Router } from 'express';
import { optionalAuth, visitor } from '../middleware/auth.js';
import { chat } from '../services/assistant.js';
import { HttpError } from '../lib/http-error.js';

/**
 * El chat del asistente.
 *
 * Sin estado: la conversación entera viaja en cada pedido y no se guarda nada
 * del lado del servidor. Ver `services/assistant.ts`.
 *
 * DOS RUTAS, UNA SOLA IMPLEMENTACIÓN. `/chat` devuelve la respuesta terminada
 * y `/chat/stream` la va mandando mientras el modelo escribe. Por dentro las
 * dos llaman a la misma función: la única diferencia es si alguien mira los
 * pedacitos pasar. La pantalla usa la segunda; la primera queda porque es la
 * que se puede probar con `curl` y la que sirve de red si el navegador no
 * soporta leer una respuesta de a partes.
 */
export const assistantRouter = Router();

/**
 * El asistente se puede usar sin cuenta.
 *
 * Es una decisión de producto tomada al abrir el muro: quien está mirando un
 * vehículo y tiene una duda la tiene EN ESE MOMENTO, no después de crear una
 * cuenta. Mandarlo a registrarse es perder la pregunta.
 *
 * `optionalAuth` deja el cliente anónimo cuando no hay sesión, así que la
 * herramienta de búsqueda del asistente ve exactamente lo mismo que el muro
 * público: lo publicado y lo vendido. No hay forma de que le cuente a una
 * visita algo que la visita no podría abrir por su cuenta.
 *
 * LO QUE ESTO CUESTA, dicho en voz alta: cada respuesta es una llamada paga a
 * Gemini y sin sesión no hay a quién limitarle el uso. Hoy no hay límite por
 * dirección de IP. Si la factura del modelo aparece rara, este es el primer
 * lugar donde mirar.
 */
assistantRouter.use(optionalAuth);

/**
 * POST /api/assistant/chat
 *   { messages: [{ role: 'user' | 'model', text: string }], listing_id?: string }
 *
 * `listing_id` es el aviso que la persona tiene abierto, si hay alguno: es lo
 * que le permite al asistente responder sobre "este vehículo".
 */
assistantRouter.post('/chat', async (req, res) => {
  const { supabase } = visitor(req);
  const body = (req.body ?? {}) as { messages?: unknown; listing_id?: unknown };
  const listingId = typeof body.listing_id === 'string' ? body.listing_id : null;

  res.json(await chat(supabase, body.messages, listingId));
});

/**
 * POST /api/assistant/chat/stream — lo mismo, pero contestando mientras piensa.
 *
 * Manda eventos en formato SSE (`text/event-stream`):
 *
 *   paso   { paso }                 en qué anda mientras todavía no escribe nada
 *   delta  { text }                 un pedacito de la respuesta, apenas llega
 *   done   { text, results }        la respuesta entera y los avisos encontrados
 *   error  { error, details }       algo falló DESPUÉS de haber empezado a escribir
 *
 * PARA QUÉ ESTÁ `paso`. Una pregunta que hace buscar publicaciones se pasa
 * vueltas enteras del modelo sin mandar una sola letra, y desde el navegador
 * ese silencio es idéntico al de "se colgó" — que es exactamente lo que
 * reportó el cliente al probar desde el celular. Contar en qué anda cuesta unos
 * bytes y convierte una espera muda en una espera con noticias.
 *
 * LOS ENCABEZADOS NO SE MANDAN HASTA QUE HAY ALGO QUE MANDAR. Es a propósito:
 * mientras no se escribió un solo byte, un error todavía puede viajar como una
 * respuesta HTTP normal —con su código y su mensaje— y lo contesta el manejador
 * de errores de siempre. Si se abriera el stream de entrada, hasta un "falta la
 * clave de Gemini" tendría que llegar como un evento adentro de una respuesta
 * 200, que es exactamente el tipo de error disfrazado que costó encontrar en el
 * Sprint 2. `paso` respeta esa regla: el primero no sale hasta que hubo una
 * llamada al modelo que anduvo — ver el comentario del bucle en `ia/chat.ts`.
 *
 * NO SE USA `EventSource`. Esa API del navegador no permite mandar el
 * encabezado de sesión, y acá cada pedido va firmado como el usuario que
 * pregunta: la respuesta se lee con `fetch`.
 */
assistantRouter.post('/chat/stream', async (req, res) => {
  const { supabase } = visitor(req);
  const body = (req.body ?? {}) as { messages?: unknown; listing_id?: unknown };
  const listingId = typeof body.listing_id === 'string' ? body.listing_id : null;

  let started = false;

  const send = (event: string, payload: unknown): void => {
    if (!started) {
      started = true;
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        // Algunos intermediarios juntan la respuesta antes de entregarla, que
        // es justo lo contrario de lo que se busca acá.
        'X-Accel-Buffering': 'no',
      });
    }

    res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    const reply = await chat(
      supabase,
      body.messages,
      listingId,
      (text) => send('delta', { text }),
      (paso) => send('paso', { paso }),
    );

    send('done', reply);
    res.end();
  } catch (error) {
    // Todavía no salió nada: que lo conteste el manejador de errores, con su
    // código HTTP y su mensaje, como cualquier otra ruta.
    if (!started) {
      throw error;
    }

    send('error', {
      error:
        error instanceof HttpError
          ? error.message
          : 'Ocurrió un problema en el servidor. Probá de nuevo en un momento.',
      ...(error instanceof HttpError && error.details?.length ? { details: error.details } : {}),
    });

    if (!(error instanceof HttpError)) {
      console.error('[error inesperado] al transmitir la respuesta del asistente', error);
    }

    res.end();
  }
});

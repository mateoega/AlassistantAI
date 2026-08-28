import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';

/**
 * El freno de mano del consumo de IA.
 *
 * POR QUÉ EXISTE. El asistente y el análisis de fotos se pueden usar sin
 * cuenta —es una decisión de producto, ver `routes/assistant.ts`— y cada
 * respuesta es una llamada paga a Gemini. Hasta acá no había NADA que
 * impidiera que un solo navegador con el dedo apoyado en "Enviar" se comiera
 * la cuota del día entero: el 2026-08-27 una tarde de pruebas honestas alcanzó
 * para agotarla (ver la bitácora), y eso fue sin nadie intentándolo.
 *
 * DOS FRENOS, PORQUE PROTEGEN DE COSAS DISTINTAS
 *
 *   POR VISITANTE — que uno solo no arruine la prueba de los demás. Se cuenta
 *   por usuario cuando hay sesión y por dirección de IP cuando no la hay. No
 *   es infalible: quien cambia de red cambia de cuenta de pedidos. No importa
 *   — esto no es una defensa contra un atacante decidido, es evitar que el uso
 *   normal (o un botón que se toca de nervioso) se lleve puesta la cuota.
 *
 *   GLOBAL DEL DÍA — el techo de la factura. Es el único que sirve cuando
 *   quien insiste son veinte visitantes distintos, y el único que se puede
 *   comparar contra la cuota real de Google. Si se agota, se agotó para todos
 *   y hasta mañana: eso es exactamente lo que hay que decirle a la persona, y
 *   no "probá de nuevo en unos segundos", que es la mentira que ya costó una
 *   tarde de diagnóstico.
 *
 * SE FRENA ANTES DE LLAMAR AL MODELO. Va como middleware delante de la ruta,
 * así que cuando dice que no, no hubo llamada a Gemini. Ese es el punto
 * entero: un límite que corta después de gastar no ahorra nada.
 *
 * LA CUENTA VIVE EN LA MEMORIA DE ESTE PROCESO. Con una sola instancia —que es
 * lo que hay hoy en Render, plan free— alcanza. Con dos, cada una llevaría su
 * propia cuenta y el límite efectivo sería el doble del escrito. Cuando eso
 * pase, esto se muda a la base o a Redis; mientras tanto queda dicho acá para
 * que nadie lo descubra por la factura.
 *
 * Y SE PIERDE AL REINICIAR. Render duerme el servicio gratuito por
 * inactividad: al despertar, el contador del día arranca de cero. Es una fuga
 * conocida del techo diario, y el motivo de que el número por defecto sea
 * conservador.
 */

interface Ventana {
  /** Cuántos pedidos se contaron en la ventana actual. */
  cantidad: number;
  /** Cuándo vence, en milisegundos. */
  vence: number;
}

/** Un contador de ventana fija: cuenta hasta un tope y se reinicia al vencer. */
class Contador {
  private readonly ventanas = new Map<string, Ventana>();
  private ultimaLimpieza = Date.now();

  constructor(
    private readonly tope: number,
    private readonly duracionMs: number,
  ) {}

  /**
   * Suma uno y dice si todavía había lugar. Si devuelve `false` NO consume el
   * pedido: quien ya se pasó del límite no empuja su propia ventana hacia
   * adelante insistiendo.
   */
  intentar(clave: string): { permitido: boolean; esperaSegundos: number } {
    const ahora = Date.now();
    const actual = this.ventanas.get(clave);

    if (!actual || actual.vence <= ahora) {
      this.ventanas.set(clave, { cantidad: 1, vence: ahora + this.duracionMs });
      this.limpiar(ahora);
      return { permitido: true, esperaSegundos: 0 };
    }

    if (actual.cantidad >= this.tope) {
      return { permitido: false, esperaSegundos: Math.ceil((actual.vence - ahora) / 1000) };
    }

    actual.cantidad += 1;
    return { permitido: true, esperaSegundos: 0 };
  }

  /**
   * Saca las ventanas vencidas para que el mapa no crezca sin fin.
   *
   * Se hace de a ratos y no en cada pedido: recorrer el mapa entero en cada
   * llamada sería pagar el costo del caso raro en el caso normal. Con el
   * volumen de esta aplicación, una limpieza por minuto sobra.
   */
  private limpiar(ahora: number): void {
    if (ahora - this.ultimaLimpieza < 60_000) {
      return;
    }

    this.ultimaLimpieza = ahora;

    for (const [clave, ventana] of this.ventanas) {
      if (ventana.vence <= ahora) {
        this.ventanas.delete(clave);
      }
    }
  }
}

const porVisitante = new Contador(env.iaLimiteVisitante, env.iaVentanaMinutos * 60_000);
const global = new Contador(env.iaLimiteDiario, 24 * 60 * 60 * 1000);

/**
 * A quién se le cuenta este pedido.
 *
 * Con sesión, al usuario: cambiar de red o de pestaña no le da un cupo nuevo.
 * Sin sesión, a la IP —que es todo lo que hay—. `req.ip` solo dice la verdad
 * detrás del proxy de Render si `trust proxy` está puesto; ver `index.ts`.
 */
function claveDe(req: Request): string {
  const userId = req.visitor?.userId ?? req.auth?.userId ?? null;
  return userId ? `usuario:${userId}` : `ip:${req.ip ?? 'desconocida'}`;
}

/**
 * Middleware: frena el pedido antes de que llegue a la ruta que gasta IA.
 *
 * Se pone DESPUÉS de `optionalAuth` o `requireAuth`, porque necesita saber si
 * hay usuario para contarle a él y no a su IP.
 */
export function limitarIa(req: Request, _res: Response, next: NextFunction): void {
  // El freno del visitante se consulta PRIMERO, y no al revés: si se mirara
  // el techo del día antes, cada insistencia de alguien que ya está frenado
  // le comería presupuesto a los demás sin llegar nunca al modelo.
  const visitante = porVisitante.intentar(claveDe(req));

  if (!visitante.permitido) {
    throw HttpError.tooManyRequests(
      'Hiciste muchas consultas seguidas. Esperá un momento y probá de nuevo.',
      [`Podés volver a preguntar en unos ${visitante.esperaSegundos} segundos.`],
    );
  }

  const dia = global.intentar('todos');

  if (!dia.permitido) {
    throw HttpError.tooManyRequests(
      'Hoy se alcanzó el límite de consultas al asistente de esta plataforma. ' +
        'Volvé a probar mañana.',
      [
        'Es un tope propio del servidor, puesto para no agotar la cuota del modelo.',
        `Se libera en aproximadamente ${Math.ceil(dia.esperaSegundos / 3600)} h.`,
      ],
    );
  }

  next();
}

'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiStream, ApiError, CancelledError } from '@/lib/api';
import {
  useAssistant,
  type AssistantStep,
  type ChatMessage,
} from '@/components/AssistantProvider';
import { useMobileNavVisible } from '@/components/MobileNav';
import { RocketIcon, inputClass } from '@/components/ui';
import { formatPrice, formatKilometers } from '@/lib/format';
import type { ListingSearchResult } from '@/lib/types';

/**
 * El asistente que acompaña al comprador en toda la aplicación.
 *
 * Un botón flotante lo abre desde cualquier pantalla y el panel se queda con
 * la conversación aunque la persona navegue: entra a un aviso, vuelve al muro,
 * y el hilo sigue donde estaba.
 *
 * SABE QUÉ ESTÁS MIRANDO. Si la ruta es la de un vehículo, se le manda ese id
 * al backend, y ahí el asistente puede responder sobre "este vehículo" con los
 * datos reales de la publicación y su análisis de fotos, si ya se hizo.
 *
 * EN CELULAR NO PUEDE TAPAR NI LA BARRA INFERIOR NI EL CONTENIDO. El panel
 * abierto cubre la pantalla entera a propósito, con su propia salida. El botón
 * cerrado es lo que costó trabajo: es un círculo chico, se apoya encima de la
 * barra de abajo cuando la hay, el pie le reserva el lugar, y mientras la
 * persona baja leyendo se corre solo. Ver `useVisibleWhileReading` y el
 * comentario largo donde se dibuja el botón.
 */

/**
 * Lo primero que se lee al abrir el asistente, antes de escribir nada.
 *
 * Dice para quién trabaja —el que compra— y qué se le puede pedir: quien abre
 * un chat por primera vez no sabe, y si no se lo dicen, prueba una vez y no
 * vuelve.
 *
 * SOLO PROMETE LO QUE SABE HACER. Decía además "o sobre cómo funciona la
 * aplicación", y era mentira: el asistente conoce el catálogo, el aviso que
 * hay en pantalla y su análisis, pero nadie le contó cómo funciona la
 * plataforma. Preguntado por eso contestaba "no tengo esa información" — la
 * primera pregunta de alguien que le creyó al saludo terminaba en un no. Las
 * tres cosas que sí hace están nombradas una por una arriba, y las
 * sugerencias de abajo son de lo mismo.
 *
 * Si algún día se le pasa cómo funciona la plataforma, esta frase vuelve.
 *
 * NO SE MANDA AL MODELO. Vive solo en la pantalla: `messages` sigue arrancando
 * vacío, así que este texto no viaja en el historial ni gasta una llamada. Lo
 * que el asistente contesta sale de su prompt, que está en el backend.
 */
/**
 * Cuánto "escribe" el asistente antes de soltar el saludo.
 *
 * Cinco segundos los pidió el cliente, y son bastante: es el tiempo que tarda
 * una persona en escribir un párrafo, que es exactamente la sensación buscada.
 * Corre una sola vez por visita.
 */
const DEMORA_DEL_SALUDO_MS = 5000;

const WELCOME =
  'Hola. Estoy para ayudarte a hacer una compra inteligente: puedo mirar un vehículo con ' +
  'ojo crítico, contarte de dónde sale su precio de referencia y buscarte otras opciones. ' +
  'Preguntame lo que quieras sobre un aviso.';

/**
 * Si el botón flotante tiene que estar a la vista en este momento.
 *
 * EL PROBLEMA QUE RESUELVE. Achicarlo a un círculo y subirlo por encima de la
 * barra no alcanzó: en el muro las tarjetas ocupan el ancho entero, así que un
 * botón fijo abajo a la derecha se apoya SIEMPRE sobre alguna. Se midió
 * recorriendo el muro de arriba abajo — 13 posiciones de scroll, 13 tarjetas
 * tapadas, y en una de ellas el corazón de guardar. Con un botón quieto no hay
 * lugar en la pantalla donde eso no pase.
 *
 * LA SALIDA. Mientras la persona baja —que es cuando está mirando— el botón se
 * va. Apenas sube un poco, vuelve. Es lo que hace cualquier aplicación con
 * barra flotante, y da lo que pidió el cliente: leyendo no hay nada encima del
 * contenido, y el asistente sigue a un gesto de distancia.
 *
 * SOLO EN CELULAR. De 768px para arriba la pantalla es ancha, el botón queda
 * en un margen donde no hay nada, y un botón que aparece y desaparece con la
 * rueda del mouse sería un tic molesto. El corte es el mismo `md` que usan la
 * barra de abajo y la de arriba.
 *
 * Arriba de todo siempre se ve: es donde se entra a cada pantalla, y es el
 * momento en que hay que poder encontrarlo sin saber que existe.
 */
function useVisibleWhileReading(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const small = window.matchMedia('(max-width: 767px)');
    let last = window.scrollY;

    function onScroll() {
      const now = window.scrollY;
      const moved = now - last;

      // El umbral evita que el temblor del dedo, o el rebote del final de la
      // página, lo hagan parpadear.
      if (Math.abs(moved) > 8) {
        setVisible(!small.matches || moved < 0 || now < 80);
        last = now;
      }
    }

    // Al pasar a pantalla ancha tiene que volver, aunque se hubiera ido
    // scrolleando en angosta.
    function onChange() {
      setVisible(true);
      last = window.scrollY;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    small.addEventListener('change', onChange);

    return () => {
      window.removeEventListener('scroll', onScroll);
      small.removeEventListener('change', onChange);
    };
  }, []);

  return visible;
}

export function AssistantChat() {
  const pathname = usePathname();
  const {
    open,
    setOpen,
    messages,
    setMessages,
    thinking,
    setThinking,
    streamingText,
    setStreamingText,
    step,
    setStep,
  } = useAssistant();

  /**
   * EL SALUDO SE ESCRIBE SOLO LA PRIMERA VEZ DE CADA VISITA.
   *
   * `saludando` es el rato de los tres puntitos; `yaSaludo` recuerda que el
   * saludo ya llegó, para que cerrar y volver a abrir el panel no obligue a
   * esperar de nuevo los cinco segundos. Los dos viven acá y no en el proveedor
   * porque son presentación: el saludo NO ES UN MENSAJE DEL HILO —si lo fuera,
   * viajaría al modelo como parte de la conversación en cada pregunta.
   */
  const [saludando, setSaludando] = useState(false);
  const [yaSaludo, setYaSaludo] = useState(false);

  useEffect(() => {
    if (!open || messages.length > 0 || yaSaludo) {
      return;
    }

    setSaludando(true);
    const reloj = setTimeout(() => {
      setSaludando(false);
      setYaSaludo(true);
    }, DEMORA_DEL_SALUDO_MS);

    return () => clearTimeout(reloj);
  }, [open, messages.length, yaSaludo]);

  const navVisible = useMobileNavVisible();
  const buttonVisible = useVisibleWhileReading();

  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Con qué se corta la respuesta que está en curso, si la persona lo pide.
   *
   * POR QUÉ HACE FALTA UN BOTÓN PARA ESTO. Mientras el asistente contesta, el
   * de enviar está bloqueado: si la respuesta no llega y no falla, la única
   * salida era cerrar el panel y volver a abrirlo —que no cancela nada, solo
   * deja de mirarlo—. Ahora `apiStream` corta sola a los 45 segundos de
   * silencio, pero eso es el techo: cuarenta y cinco segundos mirando puntitos
   * es mucho tiempo para alguien que ya se dio cuenta de que preguntó mal.
   *
   * LO QUE NO HACE: no le ahorra la llamada al modelo al servidor, que ya
   * salió y se va a pagar igual. Devuelve el control de la pantalla, que es
   * otra cosa y es la que se le estaba negando a la persona.
   */
  const corte = useRef<AbortController | null>(null);

  // El id del aviso abierto, si la persona está en una pantalla de vehículo.
  const listingId = pathname.startsWith('/vehiculo/') ? pathname.split('/')[2] : undefined;

  // Acompaña la respuesta mientras se escribe: sin `streamingText` acá, el
  // texto crecería por debajo del borde de la pantalla.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking, streamingText]);

  // El asistente también atiende sin cuenta. Quien mira un vehículo y tiene
  // una duda la tiene en ese momento: mandarlo a registrarse es perder la
  // pregunta. Sin sesión, el backend consulta con el cliente anónimo y la base
  // le muestra exactamente lo mismo que el muro público.
  if (pathname === '/login') {
    return null;
  }

  async function send(text: string) {
    const question = text.trim();

    if (!question || thinking) {
      return;
    }

    const next: ChatMessage[] = [...messages, { role: 'user', text: question }];

    setMessages(next);
    setDraft('');
    setProblem(null);
    setThinking(true);
    setStreamingText('');
    setStep('pensando');

    try {
      // La respuesta llega de a pedazos y se va mostrando. Lo que vuelve al
      // final es la respuesta entera: el hilo se arma con eso y no juntando los
      // pedacitos a mano, para que lo que queda guardado sea exactamente lo que
      // el servidor dio por respuesta.
      const control = new AbortController();
      corte.current = control;

      const reply = await apiStream<{ text: string; results: ListingSearchResult[] }>(
        '/api/assistant/chat/stream',
        {
          messages: next.map((message) => ({ role: message.role, text: message.text })),
          ...(listingId ? { listing_id: listingId } : {}),
        },
        (delta) => setStreamingText((current) => current + delta),
        // El servidor avisa cuándo sale a buscar publicaciones. Es la vuelta
        // que más tarda y la que no manda una sola letra mientras corre.
        (paso) => setStep(paso === 'buscando' ? 'buscando' : 'pensando'),
        { signal: control.signal },
      );

      setMessages([
        ...next,
        {
          role: 'model',
          text: reply.text || 'No supe qué responder a eso. ¿Lo probamos de otra forma?',
          results: reply.results,
        },
      ]);
    } catch (error) {
      // Cancelar no es fallar: lo decidió la persona y ya sabe lo que pasó. Un
      // cartel acá sería contarle un problema que ella misma provocó.
      if (!(error instanceof CancelledError)) {
        setProblem(
          error instanceof ApiError
            ? [error.message, ...error.details].join(' ')
            : 'No se pudo hablar con el asistente.',
        );
      }

      // La pregunta se conserva en la caja para que no haya que reescribirla.
      // Vale para las tres formas de no llegar a una respuesta: el error del
      // servidor, la espera que se venció y la cancelación.
      setDraft(question);
      setMessages(messages);
    } finally {
      corte.current = null;
      setThinking(false);
      setStreamingText('');
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir el chat con IA"
        style={{
          // A un dedo del borde de abajo, respetando la franja de gestos de los
          // celulares sin botón físico.
          //
          // ANTES ESTE NÚMERO DEPENDÍA DE LA BARRA DE ABAJO (4,25rem para
          // apoyarse encima de ella). Ya no puede pasar: donde hay barra, el
          // asistente vive ADENTRO de la barra y este botón no se dibuja.
          '--assistant-bottom': 'calc(1rem + env(safe-area-inset-bottom))',
        } as CSSProperties}
        className={[
          'fixed right-4 z-40 items-center justify-center rounded-full bg-ai',
          // DÓNDE APARECE ESTE BOTÓN (2026-09-04). Solo donde no hay barra de
          // abajo: de tablet para arriba siempre, y en celular únicamente sin
          // sesión —ahí la barra no se dibuja, y al asistente se lo puede usar
          // sin cuenta—. Con la barra puesta, el lugar del asistente es el
          // botón violeta del medio: dos accesos a lo mismo, uno encima del
          // otro, es lo que el cliente ya reportó una vez.
          //
          // El corte `md` es el mismo `md:hidden` de la barra. Si cambia allá,
          // cambia acá: entre 640 y 768 la barra existe.
          navVisible ? 'hidden md:flex' : 'flex',
          // `shadow-float` es la única sombra con brillo azul fuerte de la
          // aplicación, y este botón es lo único que flota de verdad por
          // encima de la página: la sombra es lo que lo despega del listado.
          'text-white shadow-ai transition-colors hover:bg-ai/90 active:scale-95',
          // CELULAR: un círculo de 56px, sin la palabra. El cartel con texto
          // medía 140px de ancho y se apoyaba sobre tres o cuatro renglones de
          // cualquier pantalla — campos, precios, tarjetas del listado. Un
          // círculo tapa la cuarta parte de eso, y sigue siendo un blanco
          // cómodo para el pulgar. El nombre no se pierde: está en el
          // `aria-label` y en el encabezado del panel apenas se abre.
          'h-14 w-14',
          // De tablet para arriba vuelve el cartel con el texto: ahí sobra
          // ancho y el botón no le compite a nada.
          'sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3 sm:text-sm sm:font-semibold',
          'bottom-[var(--assistant-bottom)] md:bottom-6',
          // Se va deslizando hacia abajo, no de golpe: un botón que
          // desaparece se lee como un error, uno que se corre se lee como que
          // se hizo a un lado. Con el teclado vuelve al recibir el foco, así
          // que nunca queda inalcanzable para quien no usa el dedo.
          'transition-[transform,opacity] duration-200',
          'focus-visible:translate-y-0 focus-visible:opacity-100',
          buttonVisible
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-28 opacity-0',
        ].join(' ')}
      >
        <RocketIcon className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
        <span className="hidden sm:inline">Chat con IA</span>
      </button>
    );
  }

  return (
    <aside
      aria-label="Chat con IA"
      className={[
        'fixed z-50 flex flex-col border-line bg-surface',
        // Tablet para arriba el panel es un cajón al costado: se le da la
        // sombra de lo que flota, para que se lea por encima de la pantalla y
        // no como una columna más del contenido.
        'sm:shadow-float',
        // Celular: ocupa la pantalla entera, tapando la barra inferior a
        // propósito — tiene su propio botón de cerrar.
        'inset-0',
        // Tablet para arriba: panel al costado, sin tapar el contenido.
        'sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[26rem] sm:border-l',
      ].join(' ')}
    >
      {/* LA CONVERSACIÓN Y EL ENCABEZADO COMPARTEN LA MISMA CAJA QUE SE
          DESPLAZA, y el encabezado va pegado arriba (`sticky`). Es lo que hace
          que el vidrio signifique algo: los mensajes pasan por debajo y se
          adivinan borrosos. Con el encabezado afuera de la caja no habría nada
          detrás que dejar ver, y el vidrio sería un color más. */}
      <div className="flex-1 overflow-y-auto">
        <header className="glass-ai sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3">
          {/* DICE "CHAT CON IA", EN BLANCO SOBRE EL VIOLETA. Antes decía
              "Asistente AI" con una bajada que explicaba qué sabía hacer; el
              cliente pidió sacarla. El nombre alcanza: lo que el asistente
              sabe se ve en lo que contesta, no en un renglón de letra chica.
              (El título se probó en dorado el mismo día y se volvió a blanco:
              el cliente no lo quiso.) */}
          <h2 className="font-semibold text-white">Chat con IA</h2>

          {/* Sobre el violeta, el botón de cerrar se dibuja en blanco
              translúcido: el borde gris y el texto oscuro de antes quedaban
              ilegibles. Sigue siendo el mismo botón, en el mismo lugar. */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-white/40 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            Cerrar
          </button>
        </header>

        <div className="space-y-4 px-4 py-4">
        {messages.length === 0 &&
          (saludando ? (
            /* EL SALUDO SE ESCRIBE, NO ESTÁ PUESTO (2026-09-04).

               Antes, al abrir el chat, el saludo ya estaba ahí como un cartel.
               Ahora aparecen los tres puntitos y a los cinco segundos llega el
               mensaje, como cuando alguien te contesta. Es la primera vez de
               cada visita: reabrir el panel no vuelve a hacer esperar. */
            <Escribiendo />
          ) : (
            /* El saludo es un globito más del hilo y no un texto de pantalla
               vacía: quien abre el chat tiene que ver que del otro lado hay
               alguien que ya le habló. */
            <Bubble message={{ role: 'model', text: WELCOME }} />
          ))}

        {messages.map((message, index) => (
          <Bubble key={`${index}-${message.text.slice(0, 24)}`} message={message} />
        ))}

        {/* Mientras el modelo escribe se muestra lo que va llegando. "Pensando…"
            queda solo para el rato en que todavía no llegó ni una letra —que es
            cuando está mirando el aviso o buscando publicaciones. */}
        {thinking &&
          (streamingText ? (
            <Bubble message={{ role: 'model', text: streamingText }} />
          ) : (
            <Working step={step} />
          ))}

        {problem && (
          <p className="rounded-xl border border-brand-deep/40 bg-brand-soft px-3 py-2 text-sm text-body">
            {problem}
          </p>
        )}

        <div ref={endRef} />
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
        className="flex gap-2 border-t border-line px-4 py-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escribí tu pregunta…"
          aria-label="Tu pregunta"
          className={inputClass}
        />
        {/* MIENTRAS CONTESTA, EL BOTÓN ES DE CANCELAR. No conviven los dos: es
            la misma regla que la barra de búsqueda —un solo botón de acción a
            la vista— y evita el "Enviar" apagado que no explica nada mientras
            la pantalla espera. Al cancelar, la pregunta vuelve a la caja. */}
        {thinking ? (
          <button
            type="button"
            onClick={() => corte.current?.abort()}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-body transition-colors hover:border-brand"
          >
            Cancelar
          </button>
        ) : (
          <button
            type="submit"
            disabled={!draft.trim()}
            className="rounded-xl bg-ai px-4 py-2.5 text-sm font-semibold text-white shadow-ai transition-all duration-150 hover:bg-ai/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            Enviar
          </button>
        )}
      </form>
    </aside>
  );
}

/**
 * La espera, mientras el asistente todavía no escribió una letra.
 *
 * Reemplaza al "Pensando…" quieto que había antes. Son tres cosas, y cada una
 * responde a algo que el cliente reportó al probar desde el celular:
 *
 *   - LOS PUNTOS SE MUEVEN. Un texto quieto en una pantalla quieta no
 *     distingue "está trabajando" de "se colgó". El movimiento sí.
 *   - DICE QUÉ ESTÁ HACIENDO. Buscar publicaciones es la vuelta más larga y la
 *     que no manda texto mientras corre; el servidor la avisa y acá se cuenta.
 *   - A LOS QUINCE SEGUNDOS SE HACE CARGO DE LA DEMORA. Una espera larga que
 *     nadie nombra se siente rota; nombrada, se espera. No es un error: la
 *     respuesta sigue viniendo, y cuando llega reemplaza a esto.
 */
function Working({ step }: { step: AssistantStep }) {
  const [slow, setSlow] = useState(false);

  // El reloj arranca de nuevo con cada paso: buscar y volver a pensar son dos
  // esperas distintas, y la segunda no hereda la impaciencia de la primera.
  useEffect(() => {
    setSlow(false);
    const timer = setTimeout(() => setSlow(true), 15_000);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div className="space-y-1" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-sm text-body">
        <Puntitos />
        {step === 'buscando' ? 'Buscando publicaciones…' : 'Pensando…'}
      </p>
      {slow && (
        <p className="text-sm text-muted">
          Está tardando más que de costumbre, pero sigue trabajando.
        </p>
      )}
    </div>
  );
}

/**
 * Los tres puntitos de "está escribiendo", violetas y rebotando. La animación
 * vive en `globals.css` (`.puntito`), que es donde puede apagarse sola para
 * quien pidió menos movimiento en su sistema.
 */
function Puntitos() {
  return (
    <span className="flex gap-1" aria-hidden>
      <Dot />
      <Dot delay="180ms" />
      <Dot delay="360ms" />
    </span>
  );
}

function Dot({ delay }: { delay?: string }) {
  return (
    <span
      className="puntito h-1.5 w-1.5 rounded-full bg-ai"
      style={delay ? { animationDelay: delay } : undefined}
    />
  );
}

/**
 * El asistente escribiendo el saludo, apenas se abre el chat.
 *
 * Es a propósito más callado que `Working`: no dice "Pensando…" ni se hace
 * cargo de ninguna demora, porque acá no hay nada esperando del otro lado —es
 * puesta en escena, y la respuesta ya está escrita.
 */
function Escribiendo() {
  return (
    <div className="flex items-center gap-2 px-3 py-2" role="status" aria-live="polite">
      <Puntitos />
      <span className="text-sm text-muted">Escribiendo…</span>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={isUser ? 'flex justify-end' : ''}>
      <div className={isUser ? 'max-w-[85%]' : 'w-full space-y-3'}>
        <p
          className={[
            'whitespace-pre-line rounded-xl px-3 py-2 text-sm leading-relaxed',
            // El de la persona sigue en azul suave y el del asistente pasó del
            // gris al violeta suave: es el color de la IA en toda la
            // aplicación, y de paso los dos lados de la conversación se
            // distinguen por color y no solo por de qué lado están.
            isUser ? 'bg-brand-soft text-ink' : 'bg-ai-soft text-body',
          ].join(' ')}
        >
          {message.text}
        </p>

        {/* Los avisos que encontró, enlazados: sin esto el asistente los
            nombra y la persona tiene que ir a buscarlos a mano. */}
        {message.results && message.results.length > 0 && (
          <ul className="space-y-2">
            {message.results.map((result) => (
              <li key={result.id}>
                <Link
                  href={`/vehiculo/${result.id}`}
                  className="block rounded-xl border border-line px-3 py-2 transition-colors hover:border-brand"
                >
                  <p className="text-sm font-medium text-ink">{result.titulo}</p>
                  <p className="text-sm text-brand-deep">
                    {formatPrice(result.precio, result.moneda)}
                  </p>
                  <p className="text-xs text-muted">
                    {formatKilometers(result.kilometros)} · {result.ubicacion}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

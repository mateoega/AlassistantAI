'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { useMessages } from '@/components/MessagesProvider';
import { Notice, Spinner } from '@/components/ui';
import { useAltoBarraSuperior } from '@/lib/useAltoBarraSuperior';
import { BlockedNotice, ModerationControls } from '@/components/ModerationControls';
import { formatDayLabel, formatPrice, formatTime } from '@/lib/format';
import type { ConversationMessage, ConversationThread } from '@/lib/types';

/**
 * Una conversación: el hilo con el otro y el vehículo del que hablan siempre a
 * la vista.
 *
 * EL VEHÍCULO ARRIBA NO ES DECORACIÓN. Quien vende varios autos parecidos
 * necesita saber de cuál le están hablando antes de contestar un "¿está
 * disponible?", y quien pregunta por cinco camionetas, cuál era esta.
 *
 * SE PREGUNTA CADA TANTO, NO EN VIVO. Igual que el globito de la navegación:
 * el frontend no tiene conexión abierta con la base. Adentro del hilo se
 * pregunta más seguido que afuera —cada 10 segundos— porque acá sí hay alguien
 * esperando una respuesta.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL MISMO FORMATO QUE EL CHAT DE IA, EN AZUL Y NO EN VIOLETA (2026-09-04)
 *
 * Antes esta pantalla eran piezas sueltas sobre la página: un enlace de
 * "← Volver" flotando solo, una tarjeta con borde y sombra para el vehículo,
 * otra tarjeta aparte para los mensajes. El cliente la vio así al lado del
 * chat de IA y pidió que se pareciera: una sola pantalla, no varios
 * cuadraditos.
 *
 * Ahora el vehículo vive en un encabezado de vidrio pegado arriba —el mismo
 * lugar donde el chat de IA tiene su título—, y los mensajes fluyen
 * directamente sobre el fondo blanco, sin tarjeta alrededor. Es la misma idea
 * que `AssistantChat`: el encabezado adentro de la caja que se desplaza, para
 * que el vidrio deje ver los mensajes pasando por debajo.
 *
 * Es AZUL (`.glass`) y no violeta (`.glass-ai`) a propósito: el violeta es la
 * etiqueta de lo que llama al modelo de IA, y esta conversación es entre dos
 * personas. Pintarla de violeta diría que la IA está leyendo, que es
 * justamente lo que este proyecto no hace — ver la regla de "la IA no entra en
 * los mensajes" en `app/CLAUDE.md`.
 * ───────────────────────────────────────────────────────────────────────── */

const REFRESH_MS = 10_000;

export default function ConversacionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const { refresh: refreshUnread } = useMessages();

  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const conversationId = params.id;
  const endOfThread = useRef<HTMLDivElement | null>(null);
  const altoBarraSuperior = useAltoBarraSuperior();

  /**
   * Quién está mirando, y no el objeto de sesión entero.
   *
   * La librería de Supabase reemplaza ese objeto cada vez que renueva el token
   * —sin que la persona haya hecho nada—, y atar el refresco a él hacía que
   * cada renovación volviera a pedir el hilo desde cero. Se vio en pantalla:
   * la conversación quedaba parpadeando en "Cargando…" en vez de mostrarse.
   */
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace('/login');
    }
  }, [sessionLoading, session, router]);

  /**
   * Trae el hilo y lo deja marcado como leído.
   *
   * Marcar leído es un pedido aparte y explícito: pedir la conversación no
   * cambia nada por su cuenta. Se hace acá porque tener el hilo abierto en
   * pantalla es, justamente, haberlo leído.
   */
  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }

      try {
        const data = await api<{ conversation: ConversationThread }>(
          `/api/conversations/${conversationId}`,
        );
        setThread(data.conversation);
        setProblem(null);

        if (data.conversation.unread_count > 0) {
          await api(`/api/conversations/${conversationId}/read`, { method: 'POST' });
          void refreshUnread();
        }
      } catch (error) {
        // Si el refresco de fondo falla, no se pisa lo que ya está en
        // pantalla con un cartel de error: el hilo que se está leyendo sigue
        // siendo válido.
        if (!silent) {
          setProblem(
            error instanceof ApiError ? error.message : 'No se pudo cargar la conversación.',
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [conversationId, refreshUnread],
  );

  useEffect(() => {
    if (!userId || !conversationId) {
      return;
    }

    void load();

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void load(true);
      }
    }, REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [userId, conversationId, load]);

  // Un hilo se lee por el final: al abrirlo y al llegar algo nuevo, se baja
  // hasta el último mensaje.
  useEffect(() => {
    endOfThread.current?.scrollIntoView({ block: 'end' });
  }, [thread?.messages.length]);

  async function send() {
    const body = draft.trim();

    if (!body || sending) {
      return;
    }

    setSending(true);

    try {
      const data = await api<{ message: ConversationMessage }>(
        `/api/conversations/${conversationId}/messages`,
        { method: 'POST', body: { body } },
      );

      // El mensaje que vuelve se agrega en el acto en vez de volver a pedir el
      // hilo entero: es el mismo mensaje, y pedirlo de nuevo se vería como un
      // salto.
      setThread((current) =>
        current ? { ...current, messages: [...current.messages, data.message] } : current,
      );
      setDraft('');
      setProblem(null);
    } catch (error) {
      setProblem(
        error instanceof ApiError
          ? [error.message, ...error.details].join(' ')
          : 'No se pudo enviar el mensaje.',
      );
    } finally {
      setSending(false);
    }
  }

  // Solo mientras no haya nada que mostrar. Si el hilo ya está en pantalla, un
  // refresco de fondo no lo reemplaza por un cartel de "Cargando…": lo que se
  // estaba leyendo sigue ahí.
  if (sessionLoading || !session || (loading && !thread)) {
    return <Spinner />;
  }

  if (!thread) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Notice tone="alert" title={problem ?? 'No se pudo cargar la conversación.'} />
        <Link href="/mensajes" className="text-sm font-medium text-brand-deep hover:underline">
          ← Volver a los mensajes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <ThreadHeader thread={thread} top={altoBarraSuperior} onBack={() => router.push('/mensajes')} />

      {problem && (
        <div className="pt-3">
          <Notice tone="alert" title={problem} />
        </div>
      )}

      {/* LOS MENSAJES FLUYEN DIRECTO SOBRE LA PÁGINA, sin tarjeta ni borde
          alrededor: es lo que hace que esto se lea como una conversación y no
          como un documento con una lista adentro. */}
      <div className="min-h-[50vh] space-y-1 py-4">
        {thread.messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            Todavía no hay mensajes. Escribí el primero.
          </p>
        ) : (
          thread.messages.map((message, index) => (
            <div key={message.id}>
              {/* El separador de día aparece solo cuando cambia la fecha: en
                  una charla de un rato no aparece nunca. */}
              {needsDayLabel(thread.messages, index) && (
                <p className="py-3 text-center text-xs text-muted">
                  {formatDayLabel(message.created_at)}
                </p>
              )}
              <Bubble message={message} />
            </div>
          ))
        )}
        <div ref={endOfThread} />
      </div>

      {/* Con un bloqueo de por medio no hay dónde escribir: el campo no se
          deshabilita, se reemplaza por lo que está pasando. Un campo apagado
          sin explicación se lee como una falla de la aplicación. */}
      {thread.moderation.blocked ? (
        <BlockedNotice
          moderation={thread.moderation}
          counterpartName={thread.counterpart.display_name}
        />
      ) : (
        <Composer
          value={draft}
          onChange={setDraft}
          onSend={() => void send()}
          sending={sending}
          counterpart={thread.counterpart.display_name}
        />
      )}

      <div className="py-3">
        <ModerationControls
          conversationId={conversationId}
          counterpartName={thread.counterpart.display_name}
          moderation={thread.moderation}
          onChanged={(cambio) => {
            // Lo que ya se sabe se aplica en el acto; el hilo que vuelve manda.
            setThread((current) =>
              current ? { ...current, moderation: { ...current.moderation, ...cambio } } : current,
            );
            void load(true);
          }}
        />
      </div>
    </div>
  );
}

/** Si este mensaje empieza un día distinto del anterior. */
function needsDayLabel(messages: ConversationMessage[], index: number): boolean {
  if (index === 0) {
    return true;
  }

  const previous = new Date(messages[index - 1]!.created_at).toDateString();
  return previous !== new Date(messages[index]!.created_at).toDateString();
}

function Bubble({ message }: { message: ConversationMessage }) {
  return (
    <div className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'my-1 max-w-[85%] rounded-2xl px-4 py-2 text-sm sm:max-w-[70%]',
          message.mine
            ? 'rounded-br-sm bg-brand-deep text-white'
            : 'rounded-bl-sm bg-mist text-body',
        ].join(' ')}
      >
        <p className="whitespace-pre-line break-words">{message.body}</p>
        <p className={`mt-1 text-[11px] ${message.mine ? 'text-white/70' : 'text-muted'}`}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

/**
 * El vehículo del que se está hablando, en un encabezado de vidrio pegado
 * arriba de la conversación.
 *
 * PEGADO ARRIBA Y NO SUELTO. Es el mismo recurso que el título del chat de
 * IA: mientras la charla pasa por debajo, este renglón se queda fijo, así que
 * nunca hay que scrollear hacia arriba para acordarse de qué vehículo se
 * habla. `top` es el alto medido de la barra de arriba (`useAltoBarraSuperior`),
 * no un número escrito a mano — esa barra cambia de alto con sesión y de
 * tablet para arriba.
 *
 * TODO EL BLOQUE DEL VEHÍCULO ES UN SOLO ENLACE A SU FICHA. Antes el nombre
 * del vendedor, el modelo y el precio eran tres renglones sueltos y solo el
 * modelo llevaba a la ficha; ahora ver de qué se habla y poder ir a mirarlo es
 * la misma acción. El botón de volver es un elemento aparte, al lado del
 * enlace y no adentro, para no anidar un `<button>` dentro de un `<a>`.
 *
 * `min-w-0` en cada nivel y `block truncate` en el texto son las dos piezas
 * que hacen falta para que el nombre se corte con puntos suspensivos en vez
 * de desbordar la pantalla. Faltaba el `block`: `truncate` no hace nada sobre
 * un `<a>`, que por omisión es `inline` y no tiene un ancho propio para
 * recortar contra él — así se veía el texto saliéndose del encabezado.
 *
 * Puede no haber vehículo: el vendedor lo pausó o lo borró. Son dos cosas
 * distintas y se dicen distinto — hacer desaparecer el vehículo sin
 * explicación dejaría la conversación hablando de la nada.
 */
function ThreadHeader({
  thread,
  top,
  onBack,
}: {
  thread: ConversationThread;
  top: number;
  onBack: () => void;
}) {
  const listing = thread.listing;

  return (
    <header
      className="glass -mx-4 sticky z-10 flex items-center gap-2 border-b border-line px-2 py-2 shadow-soft sm:mx-0 sm:rounded-2xl sm:border sm:px-3"
      style={{ top }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver a los mensajes"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-body transition-colors hover:bg-mist"
      >
        <BackIcon />
      </button>

      {listing ? (
        <Link
          href={`/vehiculo/${listing.id}`}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-1 transition-colors hover:bg-mist"
        >
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-line bg-mist">
            {listing.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-muted">
                sin foto
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="block truncate text-sm font-semibold text-ink">
              {thread.counterpart.display_name ?? 'Usuario sin nombre'}
            </p>
            <p className="block truncate text-xs text-brand-deep">
              {listing.brand} {listing.model} {listing.year}
              {listing.price !== null && ` · ${formatPrice(listing.price, listing.currency)}`}
              {listing.status === 'sold' && ' · ya vendido'}
              {listing.status === 'paused' && ' · pausado'}
            </p>
          </div>
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-1 py-1">
          <div className="h-11 w-11 shrink-0 rounded-xl border border-line bg-mist" />
          <div className="min-w-0 flex-1">
            <p className="block truncate text-sm font-semibold text-ink">
              {thread.counterpart.display_name ?? 'Usuario sin nombre'}
            </p>
            <p className="block truncate text-xs text-muted">
              {thread.listing_id
                ? 'El vendedor pausó este aviso, así que no se puede abrir.'
                : 'El aviso ya no existe.'}
            </p>
          </div>
        </div>
      )}
    </header>
  );
}

function BackIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

/**
 * El campo para escribir.
 *
 * Enter manda y Shift+Enter hace un renglón nuevo, como en cualquier chat. El
 * botón sigue estando: en celular no hay tecla Enter que mande.
 */
function Composer({
  value,
  onChange,
  onSend,
  sending,
  counterpart,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  counterpart: string | null;
}) {
  return (
    <form
      className="flex items-end gap-2 border-t border-line py-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        rows={2}
        maxLength={2000}
        placeholder={`Escribile a ${counterpart ?? 'la otra persona'}…`}
        className={
          'flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink ' +
          'placeholder:text-muted/70 outline-none transition-colors ' +
          'focus:border-brand focus:ring-2 focus:ring-brand/25'
        }
      />
      <button
        type="submit"
        disabled={sending || value.trim() === ''}
        className={
          'rounded-xl bg-brand-deep px-5 py-2.5 text-sm font-semibold text-white shadow-soft ' +
          'transition-all duration-150 hover:bg-brand-deep/90 active:scale-[0.98] ' +
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100'
        }
      >
        {sending ? 'Enviando…' : 'Enviar'}
      </button>
    </form>
  );
}

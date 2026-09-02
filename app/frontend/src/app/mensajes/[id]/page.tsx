'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { useMessages } from '@/components/MessagesProvider';
import { Notice, Spinner } from '@/components/ui';
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
 */

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
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link
        href="/mensajes"
        className="inline-block text-sm font-medium text-brand-deep hover:underline"
      >
        ← Volver a los mensajes
      </Link>

      <ThreadHeader thread={thread} />

      {problem && <Notice tone="alert" title={problem} />}

      <div className="space-y-1 rounded-2xl border border-line bg-surface p-4 shadow-card">
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
 * El vehículo del que se está hablando.
 *
 * Puede no estar: el vendedor lo pausó o lo borró. Son dos cosas distintas y
 * se dicen distinto — hacer desaparecer el vehículo sin explicación dejaría la
 * conversación hablando de la nada.
 */
function ThreadHeader({ thread }: { thread: ConversationThread }) {
  const listing = thread.listing;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line bg-mist">
        {listing?.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-muted">
            sin foto
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">
          {thread.counterpart.display_name ?? 'Usuario sin nombre'}
        </p>

        {listing ? (
          <>
            <Link
              href={`/vehiculo/${listing.id}`}
              className="truncate text-sm text-brand-deep hover:underline"
            >
              {listing.brand} {listing.model} {listing.year}
            </Link>
            <p className="text-xs text-muted">
              {listing.price !== null && formatPrice(listing.price, listing.currency)}
              {listing.status === 'sold' && ' · ya vendido'}
              {listing.status === 'paused' && ' · pausado'}
            </p>
          </>
        ) : (
          <>
            <p className="truncate text-sm text-body">{thread.listing_title}</p>
            <p className="text-xs text-muted">
              {thread.listing_id
                ? 'El vendedor pausó este aviso, así que no se puede abrir.'
                : 'El aviso ya no existe.'}
            </p>
          </>
        )}
      </div>
    </div>
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
      className="flex items-end gap-2"
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

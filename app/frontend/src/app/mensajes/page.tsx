'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { useMessages } from '@/components/MessagesProvider';
import { Notice, Spinner } from '@/components/ui';
import { formatRelativeTime } from '@/lib/format';
import type { Conversation } from '@/lib/types';

/**
 * La bandeja de entrada: todas las conversaciones, las últimas primero.
 *
 * Las de comprar y las de vender van juntas en una sola lista, y no en dos
 * pestañas. La misma persona hace las dos cosas —se vende un auto para
 * comprarse otro— y separarlas obligaría a adivinar en cuál de las dos está el
 * mensaje que se está buscando. La etiqueta de cada fila dice de qué lado
 * está uno.
 */
export default function MensajesPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const { refresh } = useMessages();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace('/login');
    }
  }, [sessionLoading, session, router]);

  const load = useCallback(async () => {
    setProblem(null);

    try {
      const data = await api<{ conversations: Conversation[] }>('/api/conversations');
      setConversations(data.conversations);
      // El globito de la navegación y esta lista salen del mismo dato: si se
      // leyó una conversación desde otra pestaña, que no queden diciendo cosas
      // distintas.
      void refresh();
    } catch (error) {
      setProblem(
        error instanceof ApiError ? error.message : 'No se pudieron cargar tus conversaciones.',
      );
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  // Se ata a quién está mirando y no al objeto de sesión: la librería de
  // Supabase lo reemplaza al renovar el token, y eso volvería a pedir la
  // bandeja entera sin que nadie haya hecho nada.
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (userId) {
      void load();
    }
  }, [userId, load]);

  if (sessionLoading || !session) {
    return <Spinner />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Mensajes</h1>
        <p className="mt-1 text-sm text-muted">
          Tus conversaciones por cada vehículo, con quien vende y con quien te pregunta.
        </p>
      </div>

      {problem && <Notice tone="alert" title={problem} />}

      {loading ? (
        <Spinner />
      ) : conversations.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <ConversationRow conversation={conversation} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConversationRow({ conversation }: { conversation: Conversation }) {
  const unread = conversation.unread_count > 0;
  const photo = conversation.listing?.photo_url ?? null;

  return (
    <Link
      href={`/mensajes/${conversation.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-muted">
            sin foto
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className={`truncate ${unread ? 'font-semibold text-ink' : 'font-medium text-body'}`}>
            {conversation.counterpart.display_name ?? 'Usuario sin nombre'}
          </p>
          <span className="shrink-0 text-xs text-muted">
            {formatRelativeTime(conversation.last_message_at)}
          </span>
        </div>

        {/* El vehículo va con el título copiado al empezar la charla, así que
            se sigue leyendo aunque el aviso ya no exista. */}
        <p className="truncate text-xs text-muted">
          {conversation.role === 'seller' ? 'Te preguntaron por' : 'Preguntaste por'}{' '}
          {conversation.listing_title}
        </p>

        <div className="flex items-center justify-between gap-3">
          <p className={`truncate text-sm ${unread ? 'text-ink' : 'text-muted'}`}>
            {conversation.last_message
              ? `${conversation.last_message.mine ? 'Vos: ' : ''}${conversation.last_message.body}`
              : 'Sin mensajes todavía.'}
          </p>

          {unread && (
            <span className="shrink-0 rounded-full bg-brand-deep px-2 py-0.5 text-xs font-semibold text-white">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center sm:py-16">
      <p className="font-medium text-ink">Todavía no tenés conversaciones.</p>
      <p className="mt-1 text-sm text-muted">
        Cuando preguntes por un vehículo —o alguien pregunte por el tuyo— la charla queda acá
        adentro, junto al aviso del que hablaron.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep/90"
      >
        Ver vehículos
      </Link>
    </div>
  );
}

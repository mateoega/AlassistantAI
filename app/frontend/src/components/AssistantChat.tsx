'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiStream, ApiError } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { useAssistant, type ChatMessage } from '@/components/AssistantProvider';
import { inputClass } from '@/components/ui';
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
 * EN CELULAR NO PUEDE TAPAR LA BARRA INFERIOR. Es el problema de espacio que
 * costó el Sprint 1.6: el botón flotante se levanta por encima de la barra de
 * navegación, y el panel abierto la cubre entero a propósito, con su propia
 * salida.
 */

const SUGGESTIONS = [
  '¿Qué le preguntarías al vendedor?',
  '¿El kilometraje es mucho para el año?',
  'Mostrame otras opciones parecidas',
];

export function AssistantChat() {
  const { session } = useSession();
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
  } = useAssistant();

  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

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

    try {
      // La respuesta llega de a pedazos y se va mostrando. Lo que vuelve al
      // final es la respuesta entera: el hilo se arma con eso y no juntando los
      // pedacitos a mano, para que lo que queda guardado sea exactamente lo que
      // el servidor dio por respuesta.
      const reply = await apiStream<{ text: string; results: ListingSearchResult[] }>(
        '/api/assistant/chat/stream',
        {
          messages: next.map((message) => ({ role: message.role, text: message.text })),
          ...(listingId ? { listing_id: listingId } : {}),
        },
        (delta) => setStreamingText((current) => current + delta),
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
      setProblem(
        error instanceof ApiError
          ? [error.message, ...error.details].join(' ')
          : 'No se pudo hablar con el asistente.',
      );
      // La pregunta se conserva en la caja para que no haya que reescribirla.
      setDraft(question);
      setMessages(messages);
    } finally {
      setThinking(false);
      setStreamingText('');
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir el asistente"
        className={[
          'fixed right-4 z-40 flex items-center gap-2 rounded-full bg-brand-deep px-5 py-3',
          'text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-deep/90',
          // En celular sube para no quedar debajo de la barra de navegación.
          'bottom-20 sm:bottom-6',
        ].join(' ')}
      >
        <SparkIcon />
        Asistente
      </button>
    );
  }

  return (
    <aside
      aria-label="Asistente"
      className={[
        'fixed z-50 flex flex-col border-line bg-surface',
        // Celular: ocupa la pantalla entera, tapando la barra inferior a
        // propósito — tiene su propio botón de cerrar.
        'inset-0',
        // Tablet para arriba: panel al costado, sin tapar el contenido.
        'sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[26rem] sm:border-l sm:shadow-xl',
      ].join(' ')}
    >
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="font-semibold text-ink">
            Asistente <span className="text-brand-deep">AI</span>
          </h2>
          <p className="text-xs text-muted">
            {listingId ? 'Sabe qué vehículo estás mirando' : 'Preguntale lo que quieras'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-body transition-colors hover:border-brand"
        >
          Cerrar
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-body">
              Te ayudo a mirar un vehículo con ojo crítico, a entender su precio y a encontrar
              opciones.
            </p>
            <ul className="space-y-2">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="w-full rounded-lg border border-line px-3 py-2 text-left text-sm text-body transition-colors hover:border-brand"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

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
            <p className="text-sm text-muted" role="status">
              Pensando…
            </p>
          ))}

        {problem && (
          <p className="rounded-lg border border-brand-deep/40 bg-brand-soft px-3 py-2 text-sm text-body">
            {problem}
          </p>
        )}

        <div ref={endRef} />
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
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escribí tu pregunta…"
          aria-label="Tu pregunta"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={thinking || !draft.trim()}
          className="rounded-lg bg-brand-deep px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </aside>
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
            isUser ? 'bg-brand-soft text-ink' : 'bg-canvas text-body',
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
                  className="block rounded-lg border border-line px-3 py-2 transition-colors hover:border-brand"
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

function SparkIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8.5 13.6 12 12 15.5 10.4 12z" />
    </svg>
  );
}

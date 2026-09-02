'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Notice } from '@/components/ui';
import type { ConversationModeration, ReportReason } from '@/lib/types';

/**
 * Bloquear y denunciar, dentro de una conversación.
 *
 * POR QUÉ ESTÁ ACÁ Y NO EN UN PERFIL. El problema aparece en la conversación, y
 * es la única pantalla donde las dos personas ya se cruzaron. Buscar a alguien
 * en una lista de usuarios para bloquearlo es pedirle un trámite a quien está
 * incómodo.
 *
 * POR QUÉ NO ESTÁ ARRIBA DE TODO. Estas dos acciones tienen que poder
 * encontrarse, no ofrecerse: un botón grande de "Denunciar" al lado del nombre
 * convierte cualquier negociación tensa en una amenaza a mano. Van abajo del
 * hilo, en letra chica, que es donde se las busca cuando se las necesita.
 *
 * BLOQUEAR Y DENUNCIAR SON DOS COSAS DISTINTAS. Bloquear corta la conversación
 * y lo decide la persona, sin que intervenga nadie. Denunciar deja constancia
 * para que alguien la mire. Se ofrecen juntas porque casi siempre se quieren
 * las dos, pero ninguna dispara a la otra: eso sería decidir por quien está
 * del otro lado de la pantalla.
 */
export function ModerationControls({
  conversationId,
  counterpartName,
  moderation,
  onChanged,
}: {
  conversationId: string;
  counterpartName: string | null;
  moderation: ConversationModeration;
  /**
   * Avisa que algo cambió. Recibe **lo que ya se sabe** del estado nuevo, para
   * que la pantalla no tenga que esperar a que vuelva el hilo: bloquear y ver
   * el campo de escribir tres segundos más es una invitación a escribir un
   * mensaje que va a rebotar.
   */
  onChanged: (cambio: Partial<ConversationModeration>) => void;
}) {
  const [asking, setAsking] = useState<'block' | 'report' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const nombre = counterpartName ?? 'esta persona';

  async function run(
    action: () => Promise<void>,
    message: string,
    cambio: Partial<ConversationModeration>,
  ) {
    setWorking(true);
    setProblem(null);

    try {
      await action();
      setAsking(null);
      setDone(message);
      onChanged(cambio);
    } catch (error) {
      setProblem(
        error instanceof ApiError
          ? [error.message, ...error.details].join(' ')
          : 'No se pudo completar la acción.',
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-3">
      {done && <Notice title={done} />}
      {problem && <Notice tone="alert" title={problem} />}

      {asking === 'report' ? (
        <ReportForm
          nombre={nombre}
          working={working}
          onCancel={() => setAsking(null)}
          onSend={(reason, detail) =>
            void run(
              () =>
                api(`/api/conversations/${conversationId}/report`, {
                  method: 'POST',
                  body: { reason, detail },
                }),
              'Denuncia registrada. La vamos a revisar.',
              { reported_by_me: true },
            )
          }
        />
      ) : asking === 'block' ? (
        <Confirm
          title={`¿Bloquear a ${nombre}?`}
          detail="No se van a poder mandar más mensajes en esta conversación, en ninguna de las dos direcciones. Lo que ya se dijeron se sigue leyendo, y podés deshacerlo cuando quieras."
          confirmLabel="Bloquear"
          working={working}
          onCancel={() => setAsking(null)}
          onConfirm={() =>
            void run(
              () => api(`/api/conversations/${conversationId}/block`, { method: 'POST' }),
              `Bloqueaste a ${nombre}.`,
              { blocked: true, blocked_by_me: true },
            )
          }
        />
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs">
          {moderation.blocked_by_me ? (
            <button
              type="button"
              disabled={working}
              onClick={() =>
                void run(
                  () => api(`/api/conversations/${conversationId}/block`, { method: 'DELETE' }),
                  `Desbloqueaste a ${nombre}.`,
                  // El bloqueo propio se fue; si el otro también bloqueó, el
                  // hilo que vuelve va a decir que sigue sin poder escribirse.
                  { blocked_by_me: false },
                )
              }
              className="font-medium text-brand-deep hover:underline disabled:opacity-50"
            >
              Desbloquear a {nombre}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAsking('block')}
              className="text-muted hover:text-brand-deep hover:underline"
            >
              Bloquear
            </button>
          )}

          {moderation.reported_by_me ? (
            <span className="text-muted">Ya denunciaste esta conversación.</span>
          ) : (
            <button
              type="button"
              onClick={() => setAsking('report')}
              className="text-muted hover:text-brand-deep hover:underline"
            >
              Denunciar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * El cartel que reemplaza al campo de escribir cuando hay un bloqueo.
 *
 * Dice dos cosas distintas según quién bloqueó, y la diferencia es a propósito:
 * a quien fue bloqueado no se le dice que lo bloquearon. No le sirve para nada
 * bueno saberlo, y la plataforma no está para pasar ese mensaje. Se le dice lo
 * único que necesita: acá no se puede escribir.
 */
export function BlockedNotice({
  moderation,
  counterpartName,
}: {
  moderation: ConversationModeration;
  counterpartName: string | null;
}) {
  if (moderation.blocked_by_me) {
    return (
      <Notice
        tone="alert"
        title={`Bloqueaste a ${counterpartName ?? 'esta persona'}`}
        items={['No se pueden mandar mensajes en esta conversación. Podés deshacerlo abajo.']}
      />
    );
  }

  return (
    <Notice
      tone="alert"
      title="No se puede escribir en esta conversación"
      items={['Los mensajes anteriores se siguen leyendo.']}
    />
  );
}

function Confirm({
  title,
  detail,
  confirmLabel,
  working,
  onCancel,
  onConfirm,
}: {
  title: string;
  detail: string;
  confirmLabel: string;
  working: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm text-body">{detail}</p>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-line px-4 py-2 text-sm text-body transition-colors hover:border-brand"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={working}
          onClick={onConfirm}
          className="rounded-xl bg-brand-deep px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-150 hover:bg-brand-deep/90 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
        >
          {working ? 'Un momento…' : confirmLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * El formulario de denuncia.
 *
 * Los motivos los manda el servidor: son parte de lo que la API acepta, no un
 * adorno de la pantalla. Escribirlos acá sería tener la lista en dos lugares y
 * enterarse de que no coinciden el día que alguien denuncia algo.
 */
function ReportForm({
  nombre,
  working,
  onCancel,
  onSend,
}: {
  nombre: string;
  working: boolean;
  onCancel: () => void;
  onSend: (reason: string, detail: string) => void;
}) {
  const [reasons, setReasons] = useState<ReportReason[] | null>(null);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const data = await api<{ reasons: ReportReason[] }>('/api/conversations/report-reasons');

        if (alive) {
          setReasons(data.reasons);
          setReason(data.reasons[0]?.value ?? '');
        }
      } catch {
        // Sin la lista no se puede denunciar bien; el formulario lo dice.
        if (alive) {
          setReasons([]);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (reason) {
          onSend(reason, detail);
        }
      }}
      className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-card"
    >
      <div>
        <p className="font-semibold text-ink">Denunciar esta conversación</p>
        <p className="mt-1 text-sm text-body">
          Queda registrada con lo que se dijeron, para que podamos mirarla. Denunciar no bloquea a{' '}
          {nombre}: si además querés cortar la conversación, bloqueala aparte.
        </p>
      </div>

      {reasons === null ? (
        <p className="text-sm text-muted">Cargando motivos…</p>
      ) : reasons.length === 0 ? (
        <p className="text-sm text-body">
          No se pudieron cargar los motivos. Probá de nuevo en un momento.
        </p>
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">¿Qué pasó?</legend>
          {reasons.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-body">
              <input
                type="radio"
                name="motivo"
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
                className="accent-brand-deep"
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          Contanos un poco más <span className="font-normal text-muted">(opcional)</span>
        </span>
        <textarea
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          rows={3}
          maxLength={1000}
          className={
            'w-full resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink ' +
            'placeholder:text-muted/70 outline-none transition-colors ' +
            'focus:border-brand focus:ring-2 focus:ring-brand/25'
          }
          placeholder="Qué te llamó la atención, si pasó algo por fuera de la plataforma…"
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-line px-4 py-2 text-sm text-body transition-colors hover:border-brand"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={working || !reason}
          className="rounded-xl bg-brand-deep px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-150 hover:bg-brand-deep/90 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
        >
          {working ? 'Enviando…' : 'Enviar denuncia'}
        </button>
      </div>
    </form>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Button, Card, Notice } from '@/components/ui';
import type { AnalysisRecord, Confidence, VehicleAnalysis } from '@/lib/types';

/**
 * El análisis de IA de una publicación, del lado de quien mira.
 *
 * PARA QUIÉN ES: para el comprador. Cualquiera que pueda ver el aviso puede
 * pedirlo, no solo el dueño. Es la pieza que diferencia esta plataforma de
 * cualquier otro clasificado.
 *
 * NO SE DISPARA SOLO. Cada análisis cuesta plata, así que corre cuando alguien
 * lo pide. Si ya hay uno hecho, se muestra el guardado sin volver a pagarlo.
 *
 * REGLA DE IDENTIDAD: ni rojo ni naranja, tampoco para una inconsistencia de
 * confianza alta. La jerarquía se marca con el orden, la tipografía y el
 * componente `Notice`. Ver diseño/paleta_colores.md.
 */

/** Cada cuánto se le vuelve a preguntar al servidor si el análisis terminó. */
const POLL_INTERVAL_MS = 3000;

export function AnalysisPanel({ listingId }: { listingId: string }) {
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Evita que un análisis que terminó mientras el usuario se iba de la pantalla
  // intente actualizar algo que ya no existe.
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api<{ analysis: AnalysisRecord | null }>(
        `/api/listings/${listingId}/analysis`,
      );
      if (alive.current) {
        setAnalysis(data.analysis);
      }
      return data.analysis;
    } catch {
      // Que falle la lectura del análisis no puede romper la pantalla del
      // vehículo: el panel simplemente ofrece analizarlo.
      return null;
    } finally {
      if (alive.current) {
        setLoading(false);
      }
    }
  }, [listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Mientras hay uno corriendo, se vuelve a preguntar cada tres segundos. El
  // análisis tarda entre diez y treinta segundos, así que no se espera colgado
  // del pedido original.
  useEffect(() => {
    if (analysis?.status !== 'running') {
      return;
    }

    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [analysis?.status, load]);

  async function run() {
    setStarting(true);
    setProblem(null);

    try {
      const data = await api<{ analysis: AnalysisRecord }>(
        `/api/listings/${listingId}/analysis`,
        { method: 'POST' },
      );
      setAnalysis(data.analysis);
    } catch (error) {
      setProblem(
        error instanceof ApiError
          ? [error.message, ...error.details].join(' ')
          : 'No se pudo pedir el análisis.',
      );
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return null;
  }

  const running = analysis?.status === 'running';
  const result = analysis?.status === 'done' ? analysis.result : null;

  return (
    <Card className="space-y-4 p-5">
      <header className="space-y-1">
        <h2 className="font-semibold text-ink">
          Asistente <span className="text-brand-deep">AI</span>
        </h2>
        <p className="text-sm text-muted">
          Mira las fotos junto con los datos que cargó el vendedor y te dice qué se ve, qué no
          cierra y qué convendría preguntar antes de avanzar.
        </p>
      </header>

      {problem && <Notice tone="alert" title={problem} />}

      {analysis?.status === 'failed' && analysis.error_message && (
        <Notice tone="alert" title={analysis.error_message} />
      )}

      {analysis?.is_stale && (
        <Notice
          tone="alert"
          title="Este análisis es de antes"
          items={[
            'Las fotos o los datos de la publicación cambiaron desde que se hizo, así que puede no coincidir con lo que estás viendo.',
          ]}
        />
      )}

      {running && (
        <p className="text-sm text-body" role="status">
          Mirando las fotos… suele tardar entre diez y treinta segundos. Podés seguir navegando y
          volver.
        </p>
      )}

      {result && <AnalysisResult analysis={result} />}

      {!running && (
        <Button onClick={() => void run()} disabled={starting} full={!result}>
          {starting
            ? 'Un momento…'
            : result
              ? 'Analizar de nuevo'
              : 'Analizar esta publicación'}
        </Button>
      )}

      <p className="text-xs text-muted">
        Es una lectura orientativa hecha a partir de las fotos. No reemplaza una revisión mecánica
        presencial ni verifica la documentación del vehículo. El precio se compara aparte, en
        "Precio de referencia".
      </p>
    </Card>
  );
}

function AnalysisResult({ analysis }: { analysis: VehicleAnalysis }) {
  return (
    <div className="space-y-4 border-t border-line pt-4">
      <p className="text-sm leading-relaxed text-body">{analysis.resumen}</p>

      {analysis.inconsistencias.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Cosas que no cierran</h3>
          <ul className="space-y-3">
            {analysis.inconsistencias.map((item) => (
              <li key={item.que} className="border-l-2 border-brand pl-3">
                <p className="text-sm font-medium text-ink">{item.que}</p>
                <p className="text-sm text-body">{item.por_que_importa}</p>
                <p className="pt-0.5 text-xs text-muted">{confidenceLabel(item.confianza)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {analysis.estado_observado.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Lo que se ve en las fotos</h3>
          <dl className="divide-y divide-line">
            {analysis.estado_observado.map((aspect) => (
              <div key={aspect.aspecto} className="py-2">
                <dt className="text-sm font-medium text-ink">{aspect.aspecto}</dt>
                <dd className="text-sm text-body">{aspect.observacion}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {analysis.preguntas_al_vendedor.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Qué preguntarle al vendedor</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-body">
            {analysis.preguntas_al_vendedor.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>
      )}

      {analysis.falta_ver.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Lo que estas fotos no muestran</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-body">
            {analysis.falta_ver.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * La confianza se dice con palabras y no con un color, para que se entienda
 * qué tan firme es la observación sin recurrir a una señal de alarma.
 */
function confidenceLabel(confidence: Confidence): string {
  const labels: Record<Confidence, string> = {
    alta: 'Se ve con claridad en las fotos',
    media: 'Se alcanza a ver, conviene confirmarlo',
    baja: 'Es una sospecha, no se ve del todo',
  };

  return labels[confidence];
}

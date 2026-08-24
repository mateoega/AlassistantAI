'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, Notice } from '@/components/ui';
import { formatKilometers, formatPrice } from '@/lib/format';
import type { PriceEstimate as Estimate, EstimateComparable } from '@/lib/types';

/**
 * Cuánto piden por vehículos parecidos, y dónde queda este entre ellos.
 *
 * PARA QUIÉN ES: para el comprador, igual que el análisis. Cualquiera que vea
 * el aviso la puede ver.
 *
 * QUÉ NO DICE: si conviene comprar. Dice contra qué se comparó y qué dio. La
 * diferencia no es de redacción — lo primero es un consejo financiero, lo
 * segundo es un dato con el método a la vista.
 *
 * POR QUÉ SE MUESTRAN LOS COMPARABLES: porque fue la condición para permitir
 * estimaciones con solo dos avisos. Un número solo pide que le crean; un
 * número con la lista de lo que miró se puede discutir. Ver la bitácora del
 * 2026-08-21.
 *
 * REGLA DE IDENTIDAD: ni rojo ni naranja, tampoco cuando el precio se va del
 * rango. Ver diseño/paleta_colores.md.
 */
export function PriceEstimatePanel({ listingId }: { listingId: string }) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const data = await api<{ estimacion: Estimate }>(`/api/listings/${listingId}/estimacion`);
        if (alive) {
          setEstimate(data.estimacion);
        }
      } catch {
        // Que falle la estimación no puede romper la pantalla del vehículo.
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [listingId]);

  if (loading || !estimate) {
    return null;
  }

  return <PriceEstimateView estimate={estimate} />;
}

/**
 * La parte visual, separada de la que pide los datos.
 *
 * Están separadas para poder mirar cómo se ve cada caso sin tener que iniciar
 * sesión ni fabricar publicaciones: se le pasa una estimación y dibuja. Los
 * casos que hay que revisar cuando se toque esto son cuatro — con
 * comparables, solo con referencia externa, fuera de rango, y sin estimación.
 */
export function PriceEstimateView({ estimate }: { estimate: Estimate }) {
  return (
    <Card className="space-y-4 p-5">
      <header className="space-y-1">
        <h2 className="font-semibold text-ink">Precio de referencia</h2>
        <p className="text-sm text-muted">
          Qué se está pidiendo por vehículos parecidos, corregido por año y kilómetros.
        </p>
      </header>

      {estimate.disponible ? <Disponible estimate={estimate} /> : <NoDisponible estimate={estimate} />}
    </Card>
  );
}

/**
 * Cuando no alcanza para estimar.
 *
 * Si hay una referencia externa, se muestra igual — pero SIN decir si el
 * precio pedido está bien o mal. Se midió: dejando que esa fuente juzgara el
 * precio, uno de cada dos avisos quedaba marcado fuera de mercado, con casos
 * imposibles. Mostrar el dato y no sacar conclusiones es lo honesto. Ver la
 * bitácora del 2026-08-21.
 */
function NoDisponible({ estimate }: { estimate: Extract<Estimate, { disponible: false }> }) {
  return (
    <div className="space-y-3 border-t border-line pt-4">
      <p className="text-sm text-body">{estimate.motivo}</p>

      {estimate.referencia_externa && <Referencia referencia={estimate.referencia_externa} />}

      <p className="text-xs text-muted">
        A medida que se publiquen más vehículos de este modelo, va a poder estimarse.{' '}
        <Link href="/legales" className="font-medium text-brand-deep hover:underline">
          Qué alcance tiene
        </Link>
        .
      </p>
    </div>
  );
}

function Disponible({ estimate }: { estimate: Extract<Estimate, { disponible: true }> }) {
  const { moneda, minimo, maximo, posicion, desvio_porcentual: desvio } = estimate;
  const fueraDeRango = posicion !== 'dentro';

  return (
    <div className="space-y-4 border-t border-line pt-4">
      <div className="space-y-1">
        <p className="text-2xl font-bold tracking-tight text-ink">
          {formatPrice(minimo, moneda)} – {formatPrice(maximo, moneda)}
        </p>
        <p className="text-sm text-muted">{comoSeCalculo(estimate)}</p>
      </div>

      {fueraDeRango && (
        <Notice
          tone="alert"
          title={
            posicion === 'por_encima'
              ? `Piden ${Math.abs(desvio)}% más que vehículos parecidos`
              : `Piden ${Math.abs(desvio)}% menos que vehículos parecidos`
          }
          items={[
            posicion === 'por_encima'
              ? 'Puede haber un motivo — mejor estado, algo que las fotos no muestran, un extra. Conviene preguntar cuál es antes de avanzar.'
              : 'Un precio muy por debajo del mercado no siempre es una ganga. Vale la pena entender por qué.',
          ]}
        />
      )}

      {!fueraDeRango && (
        <p className="text-sm text-body">
          El precio pedido está dentro de lo que se pide por vehículos parecidos.
        </p>
      )}

      {estimate.referencia_externa && <Referencia referencia={estimate.referencia_externa} />}

      {estimate.comparables.length > 0 && <Comparables comparables={estimate.comparables} />}

      <p className="text-xs text-muted">
        {descargo(estimate)}{' '}
        <Link href="/legales" className="font-medium text-brand-deep hover:underline">
          Qué alcance tiene
        </Link>
        .
      </p>
    </div>
  );
}

function Referencia({
  referencia,
}: {
  referencia: NonNullable<Extract<Estimate, { disponible: true }>['referencia_externa']>;
}) {
  return (
    <section className="space-y-1 rounded-lg bg-brand-soft p-3">
      <h3 className="text-sm font-semibold text-ink">Según una fuente externa</h3>
      <p className="text-sm text-body">
        {formatPrice(referencia.valor, referencia.moneda)}
        {referencia.minimo !== null &&
          referencia.maximo !== null &&
          referencia.maximo > referencia.minimo && (
            <span className="text-muted">
              {' '}
              (de {formatPrice(referencia.minimo, referencia.moneda)} a{' '}
              {formatPrice(referencia.maximo, referencia.moneda)} según la versión)
            </span>
          )}
      </p>
      <p className="text-xs text-muted">
        Valor del modelo {referencia.anio_fuente} publicado por {referencia.fuente}. No está
        ajustado por kilómetros ni por el estado del vehículo, así que no sirve para juzgar el
        precio pedido: es una referencia más.
      </p>
    </section>
  );
}

function Comparables({ comparables }: { comparables: EstimateComparable[] }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-ink">
        Con qué se comparó ({comparables.length})
      </h3>
      <ul className="divide-y divide-line">
        {comparables.map((comparable) => (
          <li key={comparable.id} className="flex items-baseline justify-between gap-3 py-2">
            <span className="text-sm text-body">
              {comparable.titulo}
              <span className="text-muted"> · {formatKilometers(comparable.kilometros)}</span>
              {comparable.vendido && <span className="text-muted"> · vendido</span>}
            </span>
            <span className="shrink-0 text-sm font-medium text-ink">
              {formatPrice(comparable.precio, comparable.moneda)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Una línea que explica de dónde salió el número, sin tecnicismos. */
function comoSeCalculo(estimate: Extract<Estimate, { disponible: true }>): string {
  const cantidad = estimate.comparables.length;

  const base =
    cantidad === 2
      ? 'Sale de comparar con solo 2 avisos parecidos'
      : `Sale de comparar con ${cantidad} avisos parecidos`;

  const confianza =
    estimate.confianza === 'alta'
      ? '.'
      : estimate.confianza === 'baja'
        ? ', que son pocos: tomalo como un orden de magnitud.'
        : '.';

  return base + confianza;
}

function descargo(estimate: Extract<Estimate, { disponible: true }>): string {
  const monedas =
    estimate.cotizacion !== null
      ? ` Los precios en pesos y en dólares se comparan usando el ${estimate.cotizacion.fuente}.`
      : '';

  return (
    'Es una referencia orientativa, no una tasación. Sale de precios que los vendedores están ' +
    'pidiendo, que no son necesariamente precios de venta.' +
    monedas
  );
}

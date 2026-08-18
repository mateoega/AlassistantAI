'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { Badge, Button, Card, Notice, Spinner, StatusBadge } from '@/components/ui';
import {
  formatDate,
  formatKilometers,
  formatLocation,
  formatPrice,
  phoneUrl,
  whatsappUrl,
} from '@/lib/format';
import type { Listing, ListingStatus } from '@/lib/types';

export default function VehiculoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);

  const listingId = params.id;

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace('/login');
    }
  }, [sessionLoading, session, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setProblem(null);

    try {
      const data = await api<{ listing: Listing }>(`/api/listings/${listingId}`);
      setListing(data.listing);
      setActivePhoto(0);
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'No se pudo cargar la publicación.');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (session && listingId) {
      void load();
    }
  }, [session, listingId, load]);

  async function changeStatus(status: ListingStatus) {
    setWorking(true);
    setProblem(null);

    try {
      const data = await api<{ listing: Listing }>(`/api/listings/${listingId}/status`, {
        method: 'POST',
        body: { status },
      });
      setListing(data.listing);
    } catch (error) {
      setProblem(
        error instanceof ApiError
          ? [error.message, ...error.details].join(' ')
          : 'No se pudo cambiar el estado de la publicación.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function remove() {
    if (!window.confirm('¿Seguro que querés borrar esta publicación? No se puede deshacer.')) {
      return;
    }

    setWorking(true);
    try {
      await api(`/api/listings/${listingId}`, { method: 'DELETE' });
      router.push('/');
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'No se pudo borrar la publicación.');
      setWorking(false);
    }
  }

  if (sessionLoading || !session || loading) {
    return <Spinner />;
  }

  if (problem && !listing) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Notice tone="alert" title={problem} />
        <Link href="/" className="text-sm font-medium text-brand-deep hover:underline">
          ← Volver a las publicaciones
        </Link>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  const isOwner = session.user?.id === listing.seller_id;
  const cover = listing.photos[activePhoto];

  return (
    <div className="space-y-5">
      <Link href="/" className="inline-block text-sm font-medium text-brand-deep hover:underline">
        ← Volver a las publicaciones
      </Link>

      {problem && <Notice tone="alert" title={problem} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* ---- Galería ----------------------------------------------------- */}
        <div className="space-y-3">
          <div className="aspect-4/3 overflow-hidden rounded-xl border border-line bg-ink">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover.url}
                alt={`${listing.brand} ${listing.model}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white/60">
                Esta publicación no tiene fotos
              </div>
            )}
          </div>

          {listing.photos.length > 1 && (
            <ul className="grid grid-cols-6 gap-2">
              {listing.photos.map((photo, index) => (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => setActivePhoto(index)}
                    className={[
                      'aspect-square w-full overflow-hidden rounded-lg border-2 transition-colors',
                      index === activePhoto ? 'border-brand' : 'border-line hover:border-brand/50',
                    ].join(' ')}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`Foto ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---- Datos ------------------------------------------------------- */}
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {listing.vehicle_type && <Badge>{listing.vehicle_type.name}</Badge>}
              <StatusBadge status={listing.status} />
            </div>

            <p className="text-3xl font-bold tracking-tight text-ink">
              {formatPrice(listing.price, listing.currency)}
            </p>

            <h1 className="text-lg text-body">
              {listing.brand} {listing.model} {listing.year}
            </h1>

            <p className="text-sm text-muted">
              {formatKilometers(listing.kilometers)} · {formatLocation(listing)}
            </p>

            {listing.status === 'draft' && (
              <p className="pt-1 text-sm text-muted">
                Es un borrador: solo lo ves vos hasta que lo publiques.
              </p>
            )}
            {listing.status === 'paused' && (
              <p className="pt-1 text-sm text-muted">
                Está pausado: no aparece en el listado hasta que lo reactives.
              </p>
            )}
            {listing.status === 'sold' && (
              <p className="pt-1 text-sm font-medium text-ink">
                Este vehículo ya se vendió{listing.sold_at ? ` el ${formatDate(listing.sold_at)}` : ''}.
              </p>
            )}
          </div>

          {isOwner && (
            <div className="flex flex-wrap gap-3">
              {(listing.status === 'draft' || listing.status === 'paused') && (
                <Button disabled={working} onClick={() => void changeStatus('published')}>
                  {working
                    ? 'Un momento…'
                    : listing.status === 'draft'
                      ? 'Publicar ahora'
                      : 'Reactivar'}
                </Button>
              )}

              {listing.status === 'published' && (
                <>
                  <Button disabled={working} onClick={() => void changeStatus('sold')}>
                    Marcar como vendido
                  </Button>
                  <Button
                    variant="quiet"
                    disabled={working}
                    onClick={() => void changeStatus('paused')}
                  >
                    Pausar
                  </Button>
                </>
              )}

              {listing.status === 'sold' && (
                <Button
                  variant="quiet"
                  disabled={working}
                  onClick={() => void changeStatus('published')}
                >
                  Volver a publicar
                </Button>
              )}

              <Link
                href={`/publicar/${listing.id}`}
                className="rounded-lg border border-line bg-surface px-5 py-2.5 text-sm text-body transition-colors hover:border-brand"
              >
                Editar
              </Link>
              <Button variant="quiet" disabled={working} onClick={() => void remove()}>
                Borrar
              </Button>
            </div>
          )}

          {listing.description && (
            <Card className="space-y-2 p-5">
              <h2 className="font-semibold text-ink">Descripción</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-body">
                {listing.description}
              </p>
            </Card>
          )}

          {/* La ficha propia del tipo de vehículo. El backend ya la devuelve
              traducida a "etiqueta: valor"; acá solo se muestra. */}
          {listing.specs_display.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 font-semibold text-ink">
                Detalles {listing.vehicle_type ? `de ${listing.vehicle_type.name.toLowerCase()}` : ''}
              </h2>
              <dl className="divide-y divide-line">
                {listing.specs_display.map((spec) => (
                  <div key={spec.key} className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="text-sm text-muted">{spec.label}</dt>
                    <dd className="text-right text-sm font-medium text-ink">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          {/* El asistente de IA. Sin fotos no tiene nada que mirar, así que no
              se ofrece — pasa solo en borradores a medio hacer. */}
          {listing.photos.length > 0 && <AnalysisPanel listingId={listing.id} />}

          <Card className="space-y-3 p-5">
            <div>
              <h2 className="font-semibold text-ink">Vendedor</h2>
              <p className="text-body">{listing.seller?.display_name ?? 'Sin nombre cargado'}</p>
              {listing.published_at && (
                <p className="pt-1 text-xs text-muted">
                  Publicado el {formatDate(listing.published_at)}
                </p>
              )}
            </div>

            {/* El contacto solo tiene sentido para quien mira el vehículo de
                otro (nadie se escribe a sí mismo) y solo si sigue disponible:
                escribirle a alguien por un vehículo ya vendido es hacerle
                perder el tiempo a los dos. */}
            {!isOwner && listing.status === 'published' && <ContactSeller listing={listing} />}

            {!isOwner && listing.status === 'sold' && (
              <p className="text-sm text-muted">
                Este vehículo ya se vendió, así que no se puede contactar al vendedor por esta
                publicación.
              </p>
            )}

            {isOwner && !listing.seller?.phone && (
              <p className="text-sm text-muted">
                No cargaste tu teléfono, así que nadie puede contactarte.{' '}
                <Link href="/perfil" className="font-medium text-brand-deep hover:underline">
                  Agregalo en tu perfil
                </Link>
                .
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Botones de contacto.
 *
 * Es la salida del embudo: sin esto, un comprador interesado se queda mirando
 * la pantalla sin poder hacer nada. El mensaje de WhatsApp viene escrito para
 * que el vendedor sepa de entrada de qué vehículo le hablan.
 *
 * Provisorio hasta que exista la mensajería interna de la plataforma.
 */
function ContactSeller({ listing }: { listing: Listing }) {
  const phone = listing.seller?.phone ?? null;

  if (!phone) {
    return (
      <p className="text-sm text-muted">Este vendedor todavía no cargó un teléfono de contacto.</p>
    );
  }

  const message =
    `Hola! Vi tu ${listing.brand} ${listing.model} ${listing.year} publicado en AIassistant ` +
    `por ${formatPrice(listing.price, listing.currency)} y me interesa.`;

  const whatsapp = whatsappUrl(phone, message);
  const call = phoneUrl(phone);

  return (
    <div className="space-y-2">
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg bg-brand-deep px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-deep/90"
        >
          Escribir por WhatsApp
        </a>
      )}

      {call && (
        <a
          href={call}
          className="block rounded-lg border border-line px-5 py-2.5 text-center text-sm text-body transition-colors hover:border-brand"
        >
          Llamar al {phone}
        </a>
      )}
    </div>
  );
}

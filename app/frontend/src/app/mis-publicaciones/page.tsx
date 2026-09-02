'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { Badge, Card, Notice, Spinner, StatusBadge } from '@/components/ui';
import { formatKilometers, formatLocation, formatPrice } from '@/lib/format';
import type { Listing, ListingStatus } from '@/lib/types';

/**
 * Las publicaciones propias, con sus acciones a mano.
 *
 * Antes esto era una pestaña dentro de la pantalla principal y no se
 * encontraba: quien publicaba algo no sabía dónde volver a verlo. Ahora es una
 * pantalla con su propia dirección, enlazada desde el encabezado.
 *
 * Se muestran en lista y no en grilla a propósito: acá uno viene a administrar
 * lo suyo, no a mirar vidrieras, así que importan más el estado y los botones
 * que la foto grande.
 */
export default function MisPublicacionesPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace('/login');
    }
  }, [sessionLoading, session, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setProblem(null);

    try {
      const data = await api<{ listings: Listing[] }>('/api/listings?scope=mine&page=0');
      setListings(data.listings);
    } catch (error) {
      setProblem(
        error instanceof ApiError ? error.message : 'No se pudieron cargar tus publicaciones.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      void load();
    }
  }, [session, load]);

  async function changeStatus(listing: Listing, status: ListingStatus) {
    if (status === 'sold') {
      const label = `${listing.brand} ${listing.model}`;
      if (!window.confirm(`¿Marcar ${label} como vendido? Deja de aparecer en el listado.`)) {
        return;
      }
    }

    setWorking(listing.id);
    setProblem(null);

    try {
      await api(`/api/listings/${listing.id}/status`, { method: 'POST', body: { status } });
      await load();
    } catch (error) {
      setProblem(
        error instanceof ApiError
          ? [error.message, ...error.details].join(' ')
          : 'No se pudo cambiar el estado de la publicación.',
      );
    } finally {
      setWorking(null);
    }
  }

  async function remove(listing: Listing) {
    const label = `${listing.brand} ${listing.model}`;
    if (!window.confirm(`¿Borrar la publicación de ${label}? No se puede deshacer.`)) {
      return;
    }

    setWorking(listing.id);
    try {
      await api(`/api/listings/${listing.id}`, { method: 'DELETE' });
      await load();
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'No se pudo borrar la publicación.');
    } finally {
      setWorking(null);
    }
  }

  if (sessionLoading || !session || loading) {
    return <Spinner />;
  }

  const drafts = listings.filter((listing) => listing.status === 'draft').length;
  const sold = listings.filter((listing) => listing.status === 'sold').length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Mis publicaciones</h1>
          <p className="mt-1 text-sm text-muted">
            {listings.length === 0
              ? 'Todavía no publicaste ningún vehículo.'
              : `${listings.length} ${listings.length === 1 ? 'publicación' : 'publicaciones'}` +
                (drafts > 0 ? ` · ${drafts} sin publicar` : '') +
                (sold > 0 ? ` · ${sold} ${sold === 1 ? 'vendida' : 'vendidas'}` : '')}
          </p>
        </div>

        <Link
          href="/publicar"
          className="rounded-xl bg-brand-deep px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-150 hover:bg-brand-deep/90 active:scale-[0.98]"
        >
          + Publicar vehículo
        </Link>
      </div>

      {problem && <Notice tone="alert" title={problem} />}

      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center sm:py-16">
          <p className="font-medium text-ink">Acá van a aparecer los vehículos que publiques.</p>
          <p className="mt-1 text-sm text-muted">
            Elegí el tipo de vehículo y el formulario se arma solo.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <Link
                  href={`/vehiculo/${listing.id}`}
                  className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-mist sm:w-32"
                >
                  {listing.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.photos[0].url}
                      alt={`${listing.brand} ${listing.model}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-muted">
                      Sin fotos
                    </span>
                  )}
                </Link>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {listing.vehicle_type && <Badge>{listing.vehicle_type.name}</Badge>}
                    <StatusBadge status={listing.status} />
                  </div>

                  <Link href={`/vehiculo/${listing.id}`} className="block">
                    <p className="font-semibold text-ink hover:text-brand-deep">
                      {listing.brand} {listing.model} {listing.year}
                    </p>
                  </Link>

                  <p className="text-sm text-body">
                    {formatPrice(listing.price, listing.currency)}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {formatKilometers(listing.kilometers)} · {formatLocation(listing)} ·{' '}
                    {listing.photos.length}{' '}
                    {listing.photos.length === 1 ? 'foto' : 'fotos'}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    href={`/publicar/${listing.id}`}
                    className="rounded-xl border border-line px-3 py-2 text-sm text-body transition-colors hover:border-brand"
                  >
                    Editar
                  </Link>

                  {/* Las acciones dependen del estado: no tiene sentido ofrecer
                      "pausar" algo que todavía es borrador. */}
                  {(listing.status === 'draft' || listing.status === 'paused') && (
                    <ActionButton
                      primary
                      disabled={working === listing.id}
                      onClick={() => void changeStatus(listing, 'published')}
                    >
                      {listing.status === 'draft' ? 'Publicar' : 'Reactivar'}
                    </ActionButton>
                  )}

                  {listing.status === 'published' && (
                    <>
                      <ActionButton
                        primary
                        disabled={working === listing.id}
                        onClick={() => void changeStatus(listing, 'sold')}
                      >
                        Marcar vendido
                      </ActionButton>
                      <ActionButton
                        disabled={working === listing.id}
                        onClick={() => void changeStatus(listing, 'paused')}
                      >
                        Pausar
                      </ActionButton>
                    </>
                  )}

                  {listing.status === 'sold' && (
                    <ActionButton
                      disabled={working === listing.id}
                      onClick={() => void changeStatus(listing, 'published')}
                    >
                      Volver a publicar
                    </ActionButton>
                  )}

                  <button
                    type="button"
                    disabled={working === listing.id}
                    onClick={() => void remove(listing)}
                    className="rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:text-ink disabled:opacity-50"
                  >
                    Borrar
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'rounded-xl px-3 py-2 text-sm transition-colors disabled:opacity-50',
        primary
          ? 'bg-brand-soft font-semibold text-brand-deep hover:bg-brand-soft/70'
          : 'border border-line text-body hover:border-brand',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { ListingCard } from '@/components/ListingCard';
import { Button, Notice, Spinner } from '@/components/ui';
import type { Listing } from '@/lib/types';

interface ListingsPage {
  listings: Listing[];
  page: number;
  has_more: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();

  const [listings, setListings] = useState<Listing[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace('/login');
    }
  }, [sessionLoading, session, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setProblem(null);

    try {
      const data = await api<ListingsPage>('/api/listings?scope=public&page=0');
      setListings(data.listings);
      setPage(0);
      setHasMore(data.has_more);
    } catch (error) {
      setProblem(
        error instanceof ApiError ? error.message : 'No se pudieron cargar las publicaciones.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Trae la página siguiente y la agrega abajo. Antes el listado cortaba en
   * 100 publicaciones sin avisarle a nadie: las que seguían simplemente no
   * existían para el que miraba.
   */
  async function loadMore() {
    setLoadingMore(true);
    setProblem(null);

    try {
      const next = page + 1;
      const data = await api<ListingsPage>(`/api/listings?scope=public&page=${next}`);
      setListings((current) => [...current, ...data.listings]);
      setPage(next);
      setHasMore(data.has_more);
    } catch (error) {
      setProblem(
        error instanceof ApiError ? error.message : 'No se pudieron cargar más publicaciones.',
      );
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (session) {
      void load();
    }
  }, [session, load]);

  if (sessionLoading || !session) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Vehículos publicados</h1>
        <p className="mt-1 text-sm text-muted">Todo el rubro automotor en un mismo lugar.</p>
      </div>

      {problem && <Notice tone="alert" title={problem} />}

      {loading ? (
        <Spinner />
      ) : listings.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {listings.map((listing) => (
              <li key={listing.id}>
                <ListingCard listing={listing} />
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="quiet" disabled={loadingMore} onClick={() => void loadMore()}>
                {loadingMore ? 'Cargando…' : 'Ver más vehículos'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-20 text-center">
      <p className="font-medium text-ink">Todavía no hay publicaciones.</p>
      <p className="mt-1 text-sm text-muted">
        Elegí el tipo de vehículo y el formulario se arma solo.
      </p>
      <Link
        href="/publicar"
        className="mt-6 inline-block rounded-lg bg-brand-deep px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep/90"
      >
        Publicar vehículo
      </Link>
    </div>
  );
}

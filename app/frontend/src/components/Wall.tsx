'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { ListingCard } from '@/components/ListingCard';
import { SearchBar, EMPTY_SEARCH, countFineFilters, type SearchValues } from '@/components/SearchBar';
import { Button, Notice, Spinner } from '@/components/ui';
import type { Listing } from '@/lib/types';

/**
 * El muro: las publicaciones de todos, con la barra de búsqueda arriba.
 *
 * Buscar no cambia de pantalla — filtra este mismo listado. La búsqueda vive
 * en la dirección de la página y no en el estado del componente, así que el
 * botón "atrás" del navegador vuelve a los resultados y no al muro entero.
 *
 * Los nombres de los filtros son los mismos en la dirección y en la API
 * (`q`, `tipo`, `marca`…): lo que se ve arriba es lo que se le pide al
 * servidor, sin traducción en el medio.
 */

interface ListingsPage {
  listings: Listing[];
  page: number;
  has_more: boolean;
  total: number;
}

export function Wall() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: sessionLoading } = useSession();

  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const values: SearchValues = useMemo(
    () => ({
      q: searchParams.get('q') ?? '',
      tipo: searchParams.get('tipo') ?? '',
      marca: searchParams.get('marca') ?? '',
      provincia: searchParams.get('provincia') ?? '',
      moneda: searchParams.get('moneda') ?? '',
      precio_min: searchParams.get('precio_min') ?? '',
      precio_max: searchParams.get('precio_max') ?? '',
      anio_min: searchParams.get('anio_min') ?? '',
      anio_max: searchParams.get('anio_max') ?? '',
      km_max: searchParams.get('km_max') ?? '',
      // Todo lo que empieza con `f_` es un filtro de la ficha específica. Se
      // levantan sin saber cuáles son: los nombres los pone el catálogo, y el
      // backend descarta los que no correspondan al tipo elegido.
      spec: Object.fromEntries(
        [...searchParams.entries()].filter(([key]) => key.startsWith('f_')),
      ),
    }),
    [searchParams],
  );

  const filtered = values.q !== '' || countFineFilters(values) > 0;
  const query = useMemo(() => toQuery(values), [values]);

  const load = useCallback(async () => {
    setLoading(true);
    setProblem(null);

    try {
      const data = await api<ListingsPage>(`/api/listings?scope=public&page=0${query}`);
      setListings(data.listings);
      setTotal(data.total);
      setPage(0);
      setHasMore(data.has_more);
    } catch (error) {
      setProblem(
        error instanceof ApiError ? error.message : 'No se pudieron cargar las publicaciones.',
      );
    } finally {
      setLoading(false);
    }
  }, [query]);

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
      const data = await api<ListingsPage>(`/api/listings?scope=public&page=${next}${query}`);
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

  /**
   * Se carga cuando se sabe SI HAY o NO HAY sesión, no cuando hay una.
   *
   * La condición era `if (session)`, de cuando el muro exigía cuenta. Al
   * abrirlo, esa línea dejó la pantalla en "Cargando…" para siempre: sin
   * sesión el efecto no llamaba a nada y nadie apagaba el cartel.
   *
   * La dependencia es el id y no el objeto de sesión, como en todo el
   * proyecto: la librería de Supabase lo reemplaza al renovar el token y con
   * el objeto el muro se recargaría solo cada tanto. Que esté en la lista
   * igual sirve para una cosa — al iniciar sesión, el muro se vuelve a pedir
   * con la identidad nueva.
   */
  useEffect(() => {
    if (!sessionLoading) {
      void load();
    }
  }, [sessionLoading, session?.user?.id, load]);

  /**
   * Buscar es navegar. Se usa `push` y no `replace` justamente para que cada
   * búsqueda quede en el historial: el "atrás" deshace el último filtro en vez
   * de sacar al usuario de la aplicación.
   */
  function search(next: SearchValues) {
    const params = toQuery(next);
    router.push(params === '' ? '/' : `/?${params.slice(1)}`);
  }

  // Solo mientras no se sabe si hay sesión. Antes decía `|| !session`, que
  // ahora sería esconderle el muro justamente a quien vino a mirarlo.
  if (sessionLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Vehículos publicados</h1>
        <p className="mt-1 text-sm text-muted">Todo el rubro automotor en un mismo lugar.</p>
      </div>

      <SearchBar values={values} onSearch={search} />

      {problem && <Notice tone="alert" title={problem} />}

      {loading ? (
        <Spinner />
      ) : listings.length === 0 ? (
        filtered ? (
          <NoResults onClear={() => search(EMPTY_SEARCH)} />
        ) : (
          <EmptyState />
        )
      ) : (
        <>
          {filtered && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-medium text-ink">
                {total === 1 ? '1 vehículo encontrado' : `${total} vehículos encontrados`}
              </span>
              <button
                type="button"
                onClick={() => search(EMPTY_SEARCH)}
                className="text-brand-deep underline underline-offset-2"
              >
                Ver todos
              </button>
            </div>
          )}

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

/** Los filtros puestos, como cola de la dirección: `&q=corolla&tipo=auto`. */
function toQuery(values: SearchValues): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (key !== 'spec' && typeof value === 'string' && value !== '') {
      params.set(key, value);
    }
  }

  // Los de la ficha van con el nombre que ya traen (`f_doors`, `f_payload_kg_min`),
  // el mismo en la dirección y en el pedido al servidor.
  for (const [key, value] of Object.entries(values.spec)) {
    if (value !== '') {
      params.set(key, value);
    }
  }

  const text = params.toString();
  return text === '' ? '' : `&${text}`;
}

/**
 * Sin resultados no es lo mismo que sin publicaciones. Acá hay vehículos: los
 * que se pidieron no están, así que lo que corresponde ofrecer es aflojar la
 * búsqueda, no publicar uno.
 */
function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-20 text-center">
      <p className="font-medium text-ink">Ningún vehículo coincide con esa búsqueda.</p>
      <p className="mt-1 text-sm text-muted">
        Probá con menos filtros, o escribiendo solo la marca.
      </p>
      <div className="mt-6">
        <Button variant="secondary" onClick={onClear}>
          Ver todos los vehículos
        </Button>
      </div>
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

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  /**
   * El servidor no encontró nada con lo que se escribió y devolvió lo más
   * parecido. Ver `fallbackPorParecido` en el backend.
   */
  approximate?: boolean;
}

export function Wall() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: sessionLoading } = useSession();

  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  /** La búsqueda no encontró nada exacto y lo que se ve es lo más parecido. */
  const [aproximado, setAproximado] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  /**
   * Dónde empiezan los resultados, para poder llevar la pantalla hasta ahí
   * después de buscar. Ver `justSearched`.
   */
  const resultsRef = useRef<HTMLDivElement>(null);

  /**
   * Si los resultados que están por llegar son de una búsqueda que alguien
   * pidió recién, y no de la carga normal de la pantalla.
   *
   * Es la diferencia entre acompañar y ser molesto: al entrar al muro, mover
   * la pantalla sola sería sacarle a la persona el lugar donde estaba parada.
   * Después de apretar "Buscar", en cambio, dejarla donde estaba la obliga a
   * ir a buscar los resultados a mano — que es lo que reportó el cliente.
   */
  const justSearched = useRef(false);

  /**
   * De qué búsqueda son los resultados que estamos esperando.
   *
   * EL PROBLEMA. Dos búsquedas seguidas son dos pedidos al servidor, y no hay
   * ninguna garantía de que contesten en el orden en que salieron: una consulta
   * amplia con muchos resultados tarda más que la que se pidió después. Sin
   * esto, la respuesta de la búsqueda VIEJA llegaba última y pisaba a la nueva.
   * Lo que quedaba en pantalla no era lo que decían los filtros de arriba — y
   * la persona no tiene forma de saber que está mirando otra cosa.
   *
   * Se reproduce en celular sin hacer nada raro: escribir, buscar, corregir y
   * volver a buscar, con una red lenta en el medio.
   *
   * LA SALIDA. Cada carga se lleva un número. Al volver, la respuesta compara
   * su número con el vigente y, si ya no es la última, se descarta entera:
   * resultados, total, error y el cartel de "Cargando…". Un contador y no una
   * cancelación con `AbortController` porque acá alcanza y es más barato: la
   * respuesta que sobra ya se pagó, lo único que hay que evitar es que se
   * escriba.
   *
   * ES UN `ref` Y NO ESTADO. Cambiarlo no tiene que redibujar nada, y hace
   * falta leer el valor de AHORA dentro de una función que arrancó hace rato —
   * un estado le daría el valor congelado del render en el que salió.
   */
  const generacion = useRef(0);

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
    const mia = ++generacion.current;

    setLoading(true);
    setProblem(null);

    try {
      const data = await api<ListingsPage>(`/api/listings?scope=public&page=0${query}`);

      // Mientras esto viajaba salió otra búsqueda: lo que llegó ya no es lo
      // que dicen los filtros de arriba.
      if (mia !== generacion.current) {
        return;
      }

      setListings(data.listings);
      setTotal(data.total);
      setAproximado(data.approximate === true);
      setPage(0);
      setHasMore(data.has_more);
    } catch (error) {
      // El error de una búsqueda vieja tampoco se muestra: sería un cartel
      // rojo sobre resultados que están bien.
      if (mia !== generacion.current) {
        return;
      }

      setProblem(
        error instanceof ApiError ? error.message : 'No se pudieron cargar las publicaciones.',
      );
    } finally {
      // El `finally` corre igual después de los `return` de arriba, así que la
      // condición va también acá: apagar el "Cargando…" desde una búsqueda
      // vieja destaparía una pantalla vacía mientras la nueva todavía viene.
      if (mia === generacion.current) {
        setLoading(false);
      }
    }
  }, [query]);

  /**
   * Trae la página siguiente y la agrega abajo. Antes el listado cortaba en
   * 100 publicaciones sin avisarle a nadie: las que seguían simplemente no
   * existían para el que miraba.
   */
  async function loadMore() {
    // La página siguiente lleva el mismo número que la búsqueda a la que
    // pertenece. Si mientras venía alguien cambió los filtros, pegarla abajo
    // mezclaría dos listados distintos en la misma pantalla — la mitad de
    // arriba de una búsqueda y la de abajo de otra.
    const mia = generacion.current;

    setLoadingMore(true);
    setProblem(null);

    try {
      const next = page + 1;
      const data = await api<ListingsPage>(`/api/listings?scope=public&page=${next}${query}`);

      if (mia !== generacion.current) {
        return;
      }

      setListings((current) => [...current, ...data.listings]);
      setPage(next);
      setHasMore(data.has_more);
    } catch (error) {
      if (mia !== generacion.current) {
        return;
      }

      setProblem(
        error instanceof ApiError ? error.message : 'No se pudieron cargar más publicaciones.',
      );
    } finally {
      if (mia === generacion.current) {
        setLoadingMore(false);
      }
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
    justSearched.current = true;

    const params = toQuery(next);
    router.push(params === '' ? '/' : `/?${params.slice(1)}`);
  }

  /**
   * Después de una búsqueda, la pantalla se para en los resultados.
   *
   * Corre cuando terminó de cargar y no antes: si se moviera al apretar el
   * botón, llevaría a un lugar que todavía dice "Cargando…" y que al llegar
   * los avisos cambia de alto, dejando la pantalla en cualquier parte.
   *
   * `block: 'start'` y no `center`: lo que tiene que quedar arriba de todo es
   * el primer resultado, no el medio de la lista.
   */
  useEffect(() => {
    if (loading || !justSearched.current) {
      return;
    }

    justSearched.current = false;
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loading]);

  // Solo mientras no se sabe si hay sesión. Antes decía `|| !session`, que
  // ahora sería esconderle el muro justamente a quien vino a mirarlo.
  if (sessionLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* EL MURO EMPIEZA CON EL BUSCADOR, sin título arriba (2026-09-04).
          Decía "Vehículos publicados" y debajo "Todo el rubro automotor en un
          mismo lugar": dos renglones para nombrar lo que se ve solo. Quien
          abrió la aplicación ya sabe qué está mirando, y en celular cada
          renglón de arriba empuja las fotos fuera de la pantalla. El nombre de
          la aplicación sigue donde corresponde, en la barra de arriba.

          El título SIGUE EXISTIENDO, pero solo para quien no ve la pantalla:
          `sr-only` lo saca del dibujo y lo deja en el documento. Una página sin
          `h1` deja a un lector de pantalla sin punto de partida —y a un
          buscador sin saber de qué habla—, y eso no es lo que se quiso sacar:
          se quiso sacar un renglón que le repetía a la vista algo obvio. */}
      <h1 className="sr-only">Vehículos publicados</h1>

      <SearchBar values={values} onSearch={search} />

      {problem && <Notice tone="alert" title={problem} />}

      {/* ACÁ EMPIEZAN LOS RESULTADOS, y por eso el `ref` está en esta caja y no
          adentro de alguna de las ramas: después de buscar hay que poder llevar
          la pantalla hasta este punto sin importar si lo que llegó son avisos,
          un cartel de "ninguno coincide" o todavía el "Cargando…". El
          `scroll-mt` deja lugar para la barra de arriba, que es fija. */}
      <div ref={resultsRef} className="scroll-mt-20 space-y-4 sm:space-y-6">
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
          {/* Cuántos dio la búsqueda, y nada más. El "Ver todos" que estaba
              acá al lado se sacó el 2026-09-04: ahora la barra de arriba tiene
              su propio "Limpiar", a dos renglones de distancia, y dos botones
              que hacen exactamente lo mismo a la vista es el problema que el
              cliente ya reportó una vez. */}
          {filtered && (
            <p className="text-sm font-medium text-ink">
              {total === 1 ? '1 vehículo encontrado' : `${total} vehículos encontrados`}
            </p>
          )}

          {/* CUANDO LO QUE SE MUESTRA NO ES LO QUE SE PIDIÓ, SE DICE.

              El servidor busca por parecido cuando la búsqueda exacta no
              encontró nada —un error de tipeo, un acento— y devuelve
              `approximate`. Sin este renglón, alguien que buscó "hilix" ve
              seis Hilux y se queda pensando que buscó bien; y peor, alguien
              que buscó una marca que de verdad no está publicada ve otros
              vehículos y cree que son esa marca.

              Va abajo del contador y no en su lugar: cuántos hay sigue siendo
              el dato principal. Y con la letra secundaria, porque es una
              aclaración y no una alarma — la regla de identidad del proyecto
              dice que un aviso no se pinta de rojo. */}
          {filtered && aproximado && (
            <p className="text-xs text-muted">
              No encontramos nada escrito así. Estos son los más parecidos.
            </p>
          )}

          {/* EN CELULAR LA GRILLA LLEGA HASTA EL BORDE DE LA PANTALLA.

              El `<main>` deja 16px de aire a cada lado, que es lo correcto para
              un texto y es plata tirada para una grilla de fotos. El `-mx-4`
              devuelve esos 16px enteros y la separación entre columnas baja a
              2px: en una pantalla de 375px cada foto pasa de 179 a 186px de
              lado, y como son cuadradas, eso son 186px más de superficie por
              foto. Es lo que hace Marketplace, y es la referencia que pidió el
              cliente el 2026-09-04.

              ANTES ERA `-mx-2` CON 8PX DE SEPARACIÓN, y el motivo de no llegar
              al filo era que el texto de abajo —el precio, el modelo— quedaba
              apoyado en el borde. Eso se resolvió donde correspondía: la foto
              llega al filo y **el texto tiene su propio aire** (`px-2` en la
              tarjeta), que es exactamente lo que hace Marketplace.

              De tablet para arriba (`sm:mx-0`) vuelve al margen normal y a la
              separación de 16px: ahí sobra ancho, y una grilla que toca los
              bordes de un monitor se ve descuidada, no amplia. */}
          <ul className="-mx-4 grid grid-cols-2 gap-x-0.5 gap-y-4 sm:mx-0 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-4 xl:grid-cols-5">
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
    <div className="rounded-2xl border border-line bg-surface px-6 py-12 text-center shadow-card sm:py-16">
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
    <div className="rounded-2xl border border-line bg-surface px-6 py-12 text-center shadow-card sm:py-16">
      <p className="font-medium text-ink">Todavía no hay publicaciones.</p>
      <p className="mt-1 text-sm text-muted">
        Elegí el tipo de vehículo y el formulario se arma solo.
      </p>
      <Link
        href="/publicar"
        className="mt-6 inline-block rounded-xl bg-brand-deep px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-150 hover:bg-brand-deep/90 active:scale-[0.98]"
      >
        Publicar vehículo
      </Link>
    </div>
  );
}

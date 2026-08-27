'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { useFavorites } from '@/components/FavoritesProvider';
import { ListingCard } from '@/components/ListingCard';
import { Notice, Spinner } from '@/components/ui';
import type { Listing } from '@/lib/types';

/**
 * Los vehículos guardados.
 *
 * Es la primera pantalla de la aplicación que es del que compra: el muro y la
 * ficha muestran lo que subió otro, esta muestra lo que uno eligió.
 *
 * Se muestran las mismas tarjetas que el muro, a propósito. Un vehículo
 * guardado que se vendió aparece con su cartel de vendido — enterarse es
 * mejor que buscarlo y no encontrarlo nunca más.
 */

interface FavoritesResponse {
  listings: Listing[];
  unavailable: number;
}

export default function GuardadosPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  // Los identificadores guardados están en el contexto: cuando el corazón de
  // una tarjeta se apaga, esta pantalla se entera y saca la tarjeta.
  const { ids } = useFavorites();

  const [listings, setListings] = useState<Listing[]>([]);
  const [unavailable, setUnavailable] = useState(0);
  const [loading, setLoading] = useState(true);
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
      const data = await api<FavoritesResponse>('/api/favorites');
      setListings(data.listings);
      setUnavailable(data.unavailable);
    } catch (error) {
      setProblem(
        error instanceof ApiError ? error.message : 'No se pudieron cargar tus guardados.',
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

  if (sessionLoading || !session) {
    return <Spinner />;
  }

  // Si acá adentro se saca un vehículo de guardados, la tarjeta se va en el
  // acto en vez de quedar con el corazón apagado hasta recargar. No se vuelve
  // a pedir la lista: el contexto ya sabe qué quedó.
  const visible = ids === null ? listings : listings.filter((listing) => ids.has(listing.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Vehículos guardados</h1>
        <p className="mt-1 text-sm text-muted">
          Los que marcaste con el corazón. Solo los ves vos.
        </p>
      </div>

      {problem && <Notice tone="alert" title={problem} />}

      {/* No se sabe nada de estos avisos —ni la marca—, porque el vendedor los
          sacó de circulación y la base dejó de mostrarlos. Decir cuántos son es
          todo lo que se puede decir, y es mejor que hacerlos desaparecer sin
          explicación. */}
      {unavailable > 0 && (
        <Notice
          title={
            unavailable === 1
              ? 'Un vehículo que guardaste ya no está disponible: el vendedor pausó el aviso.'
              : `${unavailable} vehículos que guardaste ya no están disponibles: sus vendedores pausaron los avisos.`
          }
        />
      )}

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState unavailable={unavailable} />
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((listing) => (
            <li key={listing.id}>
              <ListingCard listing={listing} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * La pantalla puede estar vacía por dos motivos bien distintos, y decir el
 * equivocado es peor que no decir nada: no es lo mismo no haber guardado nunca
 * nada que haber guardado cosas que hoy están pausadas.
 */
function EmptyState({ unavailable }: { unavailable: number }) {
  const nuncaGuardo = unavailable === 0;

  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center sm:py-16">
      <p className="font-medium text-ink">
        {nuncaGuardo
          ? 'Todavía no guardaste ningún vehículo.'
          : 'Por ahora no hay nada para mostrar acá.'}
      </p>
      <p className="mt-1 text-sm text-muted">
        {nuncaGuardo
          ? 'Tocá el corazón de un aviso y lo vas a encontrar acá, sin tener que acordarte de la marca.'
          : 'Los que guardaste están pausados. Si sus vendedores los reactivan, vuelven a aparecer solos.'}
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

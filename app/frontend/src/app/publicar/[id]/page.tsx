'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { ListingForm } from '@/components/ListingForm';
import { Notice, Spinner } from '@/components/ui';
import type { Listing } from '@/lib/types';

/**
 * Edición de una publicación existente.
 *
 * Usa el mismo formulario que la pantalla de publicar; lo único que cambia es
 * que arranca con los datos ya cargados y guarda con PUT en vez de POST.
 */
export default function EditarPublicacionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  const listingId = params.id;

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace('/login');
    }
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session || !listingId) return;

    api<{ listing: Listing }>(`/api/listings/${listingId}`)
      .then(({ listing: found }) => setListing(found))
      .catch((error: unknown) => {
        setProblem(
          error instanceof ApiError ? error.message : 'No se pudo cargar la publicación.',
        );
      })
      .finally(() => setLoading(false));
  }, [session, listingId]);

  if (sessionLoading || !session || loading) {
    return <Spinner />;
  }

  if (problem || !listing) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Notice tone="alert" title={problem ?? 'No se encontró la publicación.'} />
        <Link href="/mis-publicaciones" className="text-sm font-medium text-brand-deep hover:underline">
          ← Volver a mis publicaciones
        </Link>
      </div>
    );
  }

  // Editar es una acción del dueño. La base ya lo impide del lado del servidor;
  // esto evita mostrar un formulario que después no va a poder guardarse.
  if (listing.seller_id !== session.user?.id) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Notice tone="alert" title="Esta publicación no es tuya, así que no podés editarla." />
        <Link href={`/vehiculo/${listing.id}`} className="text-sm font-medium text-brand-deep hover:underline">
          ← Ver la publicación
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <div>
        <Link
          href={`/vehiculo/${listing.id}`}
          className="text-sm font-medium text-brand-deep hover:underline"
        >
          ← Volver a la publicación
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Editar publicación</h1>
        <p className="mt-1 text-sm text-muted">
          {listing.status === 'draft'
            ? 'Es un borrador: guardar los cambios no lo hace visible para los demás.'
            : 'Está publicada: los cambios se ven apenas guardás.'}
        </p>
      </div>

      <ListingForm
        mode="edit"
        listingId={listing.id}
        userId={session.user.id}
        initial={listing}
      />
    </div>
  );
}

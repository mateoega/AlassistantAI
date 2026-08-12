'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/SessionProvider';
import { ListingForm } from '@/components/ListingForm';
import { Spinner } from '@/components/ui';

export default function PublicarPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [listingId, setListingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session, router]);

  // El id se genera antes de guardar porque las fotos se suben a una carpeta
  // que lleva ese id. Al enviar el formulario se manda el mismo id, y así todo
  // queda enlazado.
  useEffect(() => {
    setListingId(crypto.randomUUID());
  }, []);

  if (loading || !session || !listingId || !session.user) {
    return <Spinner />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Publicar vehículo</h1>
        <p className="mt-1 text-sm text-muted">
          Empezá por las fotos. Los datos mínimos son pocos; el resto es opcional.
        </p>
      </div>

      <ListingForm mode="create" listingId={listingId} userId={session.user.id} />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { StatusBadge } from './ui';
import { formatKilometers, formatLocation, formatPrice } from '@/lib/format';
import type { Listing } from '@/lib/types';

/**
 * Tarjeta del listado. El orden es el de un clasificado: primero la foto, que
 * es lo que hace que alguien se detenga, después el precio, y recién ahí el
 * texto. El título no compite con la imagen.
 */
export function ListingCard({ listing }: { listing: Listing }) {
  const cover = listing.photos[0];

  return (
    <Link href={`/vehiculo/${listing.id}`} className="group block">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-line bg-surface">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt={`${listing.brand} ${listing.model}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            Sin fotos
          </div>
        )}

        <span className="absolute left-2 top-2">
          <StatusBadge status={listing.status} />
        </span>

        {/* Un vehículo vendido se sigue viendo, pero tiene que quedar claro de
            un vistazo que ya no está disponible. */}
        {listing.status === 'sold' && <div className="absolute inset-0 bg-white/55" />}
      </div>

      <div className="mt-2 space-y-0.5">
        <p className="font-bold text-ink">{formatPrice(listing.price, listing.currency)}</p>
        <p className="truncate text-sm text-body group-hover:text-brand-deep">
          {listing.brand} {listing.model} {listing.year}
        </p>
        <p className="truncate text-xs text-muted">
          {formatKilometers(listing.kilometers)} · {formatLocation(listing)}
        </p>
      </div>
    </Link>
  );
}

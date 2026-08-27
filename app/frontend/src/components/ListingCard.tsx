'use client';

import Link from 'next/link';
import { FavoriteButton } from './FavoriteButton';
import { StatusBadge } from './ui';
import { useSession } from './SessionProvider';
import { formatKilometers, formatLocation, formatPrice } from '@/lib/format';
import type { Listing } from '@/lib/types';

/**
 * Tarjeta del listado. El orden es el de un clasificado: primero la foto, que
 * es lo que hace que alguien se detenga, después el precio, y recién ahí el
 * texto. El título no compite con la imagen.
 *
 * LA TARJETA ENTERA SE TOCA, PERO EL ENLACE ES UNO SOLO Y CHIQUITO.
 *
 * Envolver todo en un `<Link>` era lo obvio y estaba mal: adentro vive el
 * corazón de guardar, que sin sesión es otro enlace —lleva a iniciar sesión—, y
 * un `<a>` adentro de otro `<a>` es HTML inválido. React lo cantaba como error
 * de hidratación en cada tarjeta del muro, y **solo aparecía navegando SIN
 * CUENTA**, que es exactamente como recorrió la aplicación el cliente.
 *
 * La solución es la de siempre para este caso: el enlace envuelve únicamente el
 * nombre del vehículo —que además es el mejor texto posible para un lector de
 * pantalla, mucho mejor que el contenido entero de la tarjeta— y se estira por
 * encima de ella con un pseudo-elemento. Se sigue tocando en cualquier parte. El
 * corazón queda por arriba de ese estirado (`z-20` contra `z-10`), así que
 * guardar sigue guardando y no abre el aviso.
 *
 * Si algún día se agrega otro control adentro de la tarjeta, va con `z-20` por
 * el mismo motivo.
 *
 * CADA DATO EN SU RENGLÓN, Y NINGUNO CORTADO A LA MITAD. En la prueba en
 * celular del 2026-08-27 se veían "Chevrolet Cruze Premie…" y "Cañuelas,
 * Buen…": en dos columnas de 375px cada tarjeta mide unos 165px, y ahí no
 * entran ni el modelo con el año pegado atrás ni el kilometraje y la ubicación
 * compartiendo renglón. Ahora:
 *
 *   precio                  lo que decide si se sigue mirando
 *   marca y modelo          hasta dos renglones — un modelo largo se dobla,
 *                           no se corta
 *   año · kilómetros        los dos números cortos, juntos, entran holgados
 *   ubicación               sola, con el ancho entero, y en dos renglones si
 *                           hace falta — "General José de San Martín, Chaco"
 *                           no entra en uno y cortarla es peor que doblarla
 *
 * El año salió del renglón del modelo justamente para devolverle ese lugar:
 * "Chevrolet Cruze Premier" entero vale más que "Chevrolet Cruze Premie… 2018".
 */
export function ListingCard({ listing }: { listing: Listing }) {
  const { session } = useSession();
  const cover = listing.photos[0];

  // Guardar el aviso propio no tiene sentido: el dueño ya lo tiene en "Mis
  // publicaciones".
  const isOwner = session?.user.id === listing.seller_id;

  /*
   * `h-full` en el `article` para que el estirado llegue hasta abajo del todo:
   * las tarjetas de una misma fila miden lo mismo, y la que tiene el texto más
   * corto dejaba veinte píxeles muertos al pie donde el toque no hacía nada.
   */
  return (
    <article className="group relative h-full">
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

        {/* El corazón va arriba a la derecha, sobre la foto: es donde lo busca
            la mano en cualquier app de clasificados, y no le roba lugar al
            precio. Va por encima de la cortina del vendido —para que un aviso
            que se vendió también se pueda sacar de guardados— y por encima del
            enlace estirado, para que tocarlo guarde en vez de abrir el aviso. */}
        {!isOwner && (
          <span className="absolute right-2 top-2 z-20">
            <FavoriteButton listingId={listing.id} />
          </span>
        )}

        {/* Un vehículo vendido se sigue viendo, pero tiene que quedar claro de
            un vistazo que ya no está disponible. */}
        {listing.status === 'sold' && <div className="absolute inset-0 bg-white/55" />}
      </div>

      <div className="mt-2 space-y-0.5">
        <p className="font-bold text-ink">{formatPrice(listing.price, listing.currency)}</p>
        <p className="line-clamp-2 text-sm font-medium text-ink group-hover:text-brand-deep">
          {/* El `after` vacío es lo que hace tocable la tarjeta entera: se
              estira sobre el `article`, que es el ancestro posicionado. */}
          <Link
            href={`/vehiculo/${listing.id}`}
            className="after:absolute after:inset-0 after:z-10 after:content-['']"
          >
            {listing.brand} {listing.model}
          </Link>
        </p>
        <p className="text-xs text-muted">
          {listing.year} · {formatKilometers(listing.kilometers)}
        </p>
        <p className="line-clamp-2 text-xs text-muted">{formatLocation(listing)}</p>
      </div>
    </article>
  );
}

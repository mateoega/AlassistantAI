'use client';

import Link from 'next/link';
import { FavoriteButton } from './FavoriteButton';
import { StatusBadge } from './ui';
import { useSession } from './SessionProvider';
import { formatPrice } from '@/lib/format';
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
 * DEBAJO DE LA FOTO VA UN SOLO RENGLÓN: PRECIO · MARCA Y MODELO (2026-09-04).
 *
 * Antes eran cuatro datos en cuatro a seis renglones —precio, marca y modelo
 * hasta en dos, año · kilómetros, y la ubicación hasta en dos—, unos 90px de
 * texto debajo de cada foto. En una pantalla de 812px eso dejaba ver dos filas
 * y media de vehículos; con un renglón entran tres y media, que son siete
 * vehículos en vez de cinco sin mover un dedo.
 *
 * ESTO DA VUELTA UNA REGLA QUE SALIÓ DE LA PRUEBA DEL 2026-08-27 —"cada dato
 * en su renglón y ninguno cortado a la mitad"— y la da vuelta el mismo que la
 * pidió, con Marketplace al lado como referencia y sabiendo que el modelo se
 * va a cortar. Aquella regla resolvía un problema de lectura: "Chevrolet Cruze
 * Premie…" cortado no se entendía. Lo que cambió es qué se está optimizando:
 * antes, entender cada tarjeta; ahora, cuántos vehículos se ven de un vistazo.
 * En un clasificado se recorre primero y se lee después — y lo que hace parar
 * el pulgar es la foto y el precio, que son justamente los dos que no se
 * cortan nunca.
 *
 * QUÉ SE FUE, Y DÓNDE SIGUE ESTANDO. El año, el kilometraje y la ubicación
 * salieron de la tarjeta; están enteros en la ficha del vehículo, a un toque, y
 * los tres se pueden filtrar desde la barra de búsqueda del muro.
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
      {/* LA FOTO NO TIENE ESQUINAS NI SOMBRA EN CELULAR (2026-09-04).

          Ahí la grilla llega al borde de la pantalla, así que la foto ya no es
          una tarjeta apoyada sobre la página: es la página. Una esquina
          redondeada contra el filo del vidrio deja un triangulito blanco que se
          lee como un error de dibujo, y una sombra no tiene dónde caer. Es lo
          que hace Marketplace y es la referencia que pidió el cliente.

          De tablet para arriba vuelven las dos: ahí la grilla tiene margen, las
          fotos vuelven a ser piezas separadas sobre blanco, y sin sombra
          quedarían pegadas al papel. */}
      <div className="relative aspect-square w-full overflow-hidden bg-mist sm:rounded-2xl sm:shadow-card">
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

      {/* EL TEXTO SÍ TIENE MARGEN, AUNQUE LA FOTO NO. Es la mitad que hace
          posible lo otro: la foto llega al filo de la pantalla y el precio no,
          porque un precio apoyado exactamente en el borde se lee apretado y en
          los celulares con pantalla curva el filo se dobla. Ocho píxeles en
          celular, donde la columna toca el borde; de tablet para arriba
          alcanzan dos, que ahí el margen lo pone la grilla. */}
      <div className="mt-1.5 px-2 sm:px-0.5">
        {/* PRECIO Y MODELO EN UN RENGLÓN, Y SE CORTA SI NO ENTRA (`truncate`).

            El renglón entero es el enlace, y el texto completo sigue estando en
            el documento: lo que se corta es el dibujo, no el contenido, así que
            un lector de pantalla lee "US$ 21.000 · Chevrolet Cruze Premier 1.4
            Turbo" aunque en pantalla se vea "US$ 21.000 · Chevrolet Cru…".

            El punto medio (`·`) es el separador y no un guión ni una coma: es
            lo que usa Marketplace, y es lo que hace que se lean como dos datos
            distintos y no como una frase cortada. */}
        {/* CLAVADO EN 14px, y no `text-sm`. La escala de texto creció un punto
            el 2026-09-04 porque el cliente no llegaba a leer; el muro fue la
            excepción que él mismo pidió, y con razón: acá el renglón se corta
            con puntos suspensivos, así que cada píxel de más es una letra
            menos del modelo a la vista. La densidad del listado es lo que se
            está cuidando en esta pantalla. */}
        <p className="truncate text-[14px] leading-5">
          <span className="font-bold text-ink">
            {formatPrice(listing.price, listing.currency)}
          </span>
          <span className="text-muted"> · </span>
          {/* El `after` vacío es lo que hace tocable la tarjeta entera: se
              estira sobre el `article`, que es el ancestro posicionado. */}
          <Link
            href={`/vehiculo/${listing.id}`}
            className="text-body after:absolute after:inset-0 after:z-10 after:content-[''] group-hover:text-brand-deep"
          >
            {listing.brand} {listing.model}
          </Link>
        </p>
      </div>
    </article>
  );
}

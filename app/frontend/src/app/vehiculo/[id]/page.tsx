'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { FavoriteButton } from '@/components/FavoriteButton';
import { PriceEstimatePanel } from '@/components/PriceEstimate';
import { Badge, Button, Card, Notice, Spinner, StatusBadge } from '@/components/ui';
import { formatDate, formatKilometers, formatLocation, formatPrice } from '@/lib/format';
import type { Listing, ListingStatus } from '@/lib/types';

export default function VehiculoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);

  const listingId = params.id;

  const load = useCallback(async () => {
    setLoading(true);
    setProblem(null);

    try {
      const data = await api<{ listing: Listing }>(`/api/listings/${listingId}`);
      setListing(data.listing);
      setActivePhoto(0);
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'No se pudo cargar la publicación.');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  /**
   * Quién está mirando, y no el objeto de sesión entero: la librería de
   * Supabase lo reemplaza cada vez que renueva el token o cuando se vuelve a
   * la pestaña, y atado a él, la ficha se volvía a pedir sola y quedaba
   * parpadeando en "Cargando…". Se encontró en el Sprint 5, verificando la
   * mensajería.
   */
  const userId = session?.user?.id ?? null;

  /**
   * Igual que en el muro: se carga cuando se sabe si hay o no hay sesión.
   * `userId` sigue en las dependencias para que, al iniciar sesión, la ficha
   * se vuelva a pedir con la identidad nueva —de eso dependen el botón de
   * dueño y el de consultar al vendedor—.
   */
  useEffect(() => {
    if (!sessionLoading && listingId) {
      void load();
    }
  }, [sessionLoading, userId, listingId, load]);

  async function changeStatus(status: ListingStatus) {
    setWorking(true);
    setProblem(null);

    try {
      const data = await api<{ listing: Listing }>(`/api/listings/${listingId}/status`, {
        method: 'POST',
        body: { status },
      });
      setListing(data.listing);
    } catch (error) {
      setProblem(
        error instanceof ApiError
          ? [error.message, ...error.details].join(' ')
          : 'No se pudo cambiar el estado de la publicación.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function remove() {
    if (!window.confirm('¿Seguro que querés borrar esta publicación? No se puede deshacer.')) {
      return;
    }

    setWorking(true);
    try {
      await api(`/api/listings/${listingId}`, { method: 'DELETE' });
      router.push('/');
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'No se pudo borrar la publicación.');
      setWorking(false);
    }
  }

  if (sessionLoading || loading) {
    return <Spinner />;
  }

  if (problem && !listing) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Notice tone="alert" title={problem} />
        <Link href="/" className="text-sm font-medium text-brand-deep hover:underline">
          ← Volver a las publicaciones
        </Link>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  // `userId` es null sin sesión, y un aviso nunca tiene `seller_id` null: una
  // visita anónima nunca es dueña de nada, que es lo correcto.
  const isOwner = userId === listing.seller_id;
  const cover = listing.photos[activePhoto];

  return (
    <div className="space-y-5">
      <Link href="/" className="inline-block text-sm font-medium text-brand-deep hover:underline">
        ← Volver a las publicaciones
      </Link>

      {problem && <Notice tone="alert" title={problem} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* ---- Galería ----------------------------------------------------- */}
        <div className="space-y-3">
          {/* LA FOTO PRINCIPAL SE SALE DEL MARGEN EN CELULAR, igual que la
              grilla del muro: es lo primero que mira quien entra y no tiene
              por qué pagar 32px de aire. De tablet para arriba vuelve al
              margen y se le redondean las esquinas.

              EL FONDO DEJÓ DE SER NEGRO. Era `bg-ink` para que una foto
              vertical se recortara contra algo oscuro; sobre una página blanca
              esa caja negra es lo único oscuro de la pantalla y se lleva toda
              la atención — justo lo contrario de lo que buscamos. Ahora es el
              blanco azulado, y lo que separa la foto de la página es la
              sombra. La foto sigue entrando entera (`object-contain`): un auto
              recortado para llenar la caja es peor que un poco de aire al
              costado. */}
          <div className="relative -mx-4 aspect-4/3 overflow-hidden bg-mist shadow-card sm:mx-0 sm:rounded-2xl">
            {cover ? (
              <>
                {/* EL RELLENO DE LOS COSTADOS ES LA MISMA FOTO, DESENFOCADA.

                    La caja mide 4:3 y las fotos vienen con cualquier forma: una
                    apaisada deja dos franjas vacías arriba y abajo que en
                    celular son unos 180px de nada — casi un cuarto de la
                    pantalla, justo en lo primero que se mira.

                    Recortar la foto para llenar la caja no es opción: el que
                    compra necesita ver el vehículo entero, y un `object-cover`
                    le corta el techo o las ruedas.

                    Entonces las franjas se llenan con la misma foto ampliada y
                    desenfocada. Es el mismo recurso de las aplicaciones de
                    música con la tapa del disco: el color de la foto sigue,
                    la pantalla se ve llena, y nada de lo que importa se pierde.

                    NO ES UNA SEGUNDA DESCARGA: es la misma dirección, así que
                    el navegador la sirve de su propia memoria.

                    Va con `alt` vacío y `aria-hidden` porque es decoración pura
                    — un lector de pantalla que la nombre estaría diciendo dos
                    veces la misma foto. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover.url}
                  alt=""
                  aria-hidden
                  /* `scale-125` para que el desenfoque no deje ver el borde de
                     la propia imagen contra el borde de la caja. */
                  className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover.url}
                  alt={`${listing.brand} ${listing.model}`}
                  className="relative h-full w-full object-contain"
                />
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Esta publicación no tiene fotos
              </div>
            )}
          </div>

          {listing.photos.length > 1 && (
            <ul className="grid grid-cols-6 gap-2">
              {listing.photos.map((photo, index) => (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => setActivePhoto(index)}
                    className={[
                      'aspect-square w-full overflow-hidden rounded-xl border-2 transition-colors',
                      index === activePhoto ? 'border-brand' : 'border-line hover:border-brand/50',
                    ].join(' ')}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`Foto ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---- Datos ------------------------------------------------------- */}
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {listing.vehicle_type && <Badge>{listing.vehicle_type.name}</Badge>}
              <StatusBadge status={listing.status} />
            </div>

            <p className="text-3xl font-bold tracking-tight text-ink">
              {formatPrice(listing.price, listing.currency)}
            </p>

            <h1 className="text-lg text-body">
              {listing.brand} {listing.model} {listing.year}
            </h1>

            <p className="text-sm text-muted">
              {formatKilometers(listing.kilometers)} · {formatLocation(listing)}
            </p>

            {listing.status === 'draft' && (
              <p className="pt-1 text-sm text-muted">
                Es un borrador: solo lo ves vos hasta que lo publiques.
              </p>
            )}
            {listing.status === 'paused' && (
              <p className="pt-1 text-sm text-muted">
                Está pausado: no aparece en el listado hasta que lo reactives.
              </p>
            )}
            {listing.status === 'sold' && (
              <p className="pt-1 text-sm font-medium text-ink">
                Este vehículo ya se vendió{listing.sold_at ? ` el ${formatDate(listing.sold_at)}` : ''}.
              </p>
            )}
          </div>

          {isOwner && (
            <div className="flex flex-wrap gap-3">
              {(listing.status === 'draft' || listing.status === 'paused') && (
                <Button disabled={working} onClick={() => void changeStatus('published')}>
                  {working
                    ? 'Un momento…'
                    : listing.status === 'draft'
                      ? 'Publicar ahora'
                      : 'Reactivar'}
                </Button>
              )}

              {listing.status === 'published' && (
                <>
                  <Button disabled={working} onClick={() => void changeStatus('sold')}>
                    Marcar como vendido
                  </Button>
                  <Button
                    variant="quiet"
                    disabled={working}
                    onClick={() => void changeStatus('paused')}
                  >
                    Pausar
                  </Button>
                </>
              )}

              {listing.status === 'sold' && (
                <Button
                  variant="quiet"
                  disabled={working}
                  onClick={() => void changeStatus('published')}
                >
                  Volver a publicar
                </Button>
              )}

              <Link
                href={`/publicar/${listing.id}`}
                className="rounded-xl border border-line bg-surface px-5 py-2.5 text-sm text-body shadow-soft transition-all duration-150 hover:border-brand active:scale-[0.98]"
              >
                Editar
              </Link>
              <Button variant="quiet" disabled={working} onClick={() => void remove()}>
                Borrar
              </Button>
            </div>
          )}

          {/* LAS DOS ACCIONES DEL QUE MIRA, ARRIBA Y JUNTAS.

              El contacto vivía al final de la pantalla, adentro de la tarjeta
              del vendedor: en celular, unos 2.900px de scroll después del
              precio. Es la salida del embudo —lo único que el comprador vino a
              hacer— y estaba atrás de todo lo demás.

              Guardar la acompaña porque es la otra mitad de la misma decisión:
              escribir ahora, o dejarlo anotado para después.

              Al dueño no se le ofrece ninguna de las dos: nadie se escribe a sí
              mismo, y su aviso ya está en "Mis publicaciones". */}
          {!isOwner && (
            <div className="space-y-3">
              {/* Escribirle a alguien por un vehículo ya vendido es hacerle
                  perder el tiempo a los dos. La explicación va donde estaría el
                  botón, no perdida al final de la pantalla. */}
              {listing.status === 'published' && <ContactSeller listing={listing} />}

              {listing.status === 'sold' && (
                <p className="text-sm text-muted">
                  Este vehículo ya se vendió, así que no se puede contactar al vendedor por esta
                  publicación.
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <FavoriteButton listingId={listing.id} variant="labeled" />
              </div>
            </div>
          )}

          {/* EL ANÁLISIS DE FOTOS VA PRIMERO, Y ESTO DA VUELTA UNA DECISIÓN
              ANTERIOR.

              Hasta hoy el precio de referencia iba adelante, con este
              argumento: es lo primero que se quiere saber y aparece sin que
              nadie apriete nada. La segunda mitad de esa frase es justamente lo
              que lo manda atrás. El precio se dibuja solo, así que se ve igual
              un lugar más abajo; el análisis NO EXISTE hasta que alguien toca
              el botón, y un botón que está a dos pantallas de distancia no se
              toca. Estar abajo no cuesta lo mismo en los dos casos.

              Y es la pieza que diferencia esta plataforma de cualquier otro
              clasificado: en la prueba del cliente fue lo que más les
              interesó. Enterrarla es esconder el producto.

              Sin fotos no tiene nada que mirar, así que ahí no se ofrece —
              pasa solo en borradores a medio hacer. */}
          {listing.photos.length > 0 && <AnalysisPanel listingId={listing.id} />}

          <PriceEstimatePanel listingId={listing.id} />

          {listing.description && (
            <Card className="space-y-2 p-4 sm:p-5">
              <h2 className="font-semibold text-ink">Descripción</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-body">
                {listing.description}
              </p>
            </Card>
          )}

          {/* La ficha propia del tipo de vehículo. El backend ya la devuelve
              traducida a "etiqueta: valor"; acá solo se muestra. */}
          {listing.specs_display.length > 0 && (
            <Card className="p-4 sm:p-5">
              <h2 className="mb-3 font-semibold text-ink">
                Detalles {listing.vehicle_type ? `de ${listing.vehicle_type.name.toLowerCase()}` : ''}
              </h2>
              <dl className="divide-y divide-line">
                {listing.specs_display.map((spec) => (
                  <div key={spec.key} className="flex items-baseline justify-between gap-4 py-2">
                    <dt className="text-sm text-muted">{spec.label}</dt>
                    <dd className="text-right text-sm font-medium text-ink">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          {/* Quién vende, al final: es dato de respaldo, no una acción. El
              botón para escribirle está arriba, junto al precio. */}
          <Card className="space-y-3 p-4 sm:p-5">
            <div>
              <h2 className="font-semibold text-ink">Vendedor</h2>
              <p className="text-body">{listing.seller?.display_name ?? 'Sin nombre cargado'}</p>
              {listing.published_at && (
                <p className="pt-1 text-xs text-muted">
                  Publicado el {formatDate(listing.published_at)}
                </p>
              )}
            </div>

            {isOwner && (
              <p className="text-sm text-muted">
                Las consultas por este vehículo te llegan a{' '}
                <Link href="/mensajes" className="font-medium text-brand-deep hover:underline">
                  Mensajes
                </Link>
                .
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * El botón que abre la conversación con el vendedor.
 *
 * Es la salida del embudo: sin esto, un comprador interesado se queda mirando
 * la pantalla sin poder hacer nada. Hasta el Sprint 5 era un enlace a WhatsApp
 * con el mensaje ya escrito, y estaba marcado como provisorio desde el día que
 * se puso: sacaba de la plataforma a la persona justo en el momento en que
 * decidía.
 *
 * Apretarlo no manda ningún mensaje: abre la conversación —o vuelve a la que
 * ya existía— y ahí se escribe. Consultar dos veces el mismo aviso sigue la
 * charla anterior en vez de empezar otra.
 */
function ContactSeller({ listing }: { listing: Listing }) {
  const router = useRouter();
  const { session } = useSession();
  const [opening, setOpening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  /**
   * Sin cuenta, el botón lleva a iniciar sesión en vez de desaparecer.
   *
   * Es la única acción de esta pantalla que la persona vino a hacer, y es
   * también el mejor argumento que tiene la plataforma para pedirle una
   * cuenta: escribirle al vendedor necesita saber quién escribe, porque del
   * otro lado hay alguien que va a contestar. Esconder el botón sería dejar al
   * comprador interesado mirando la pantalla sin salida, que es exactamente lo
   * que el Sprint 5 arregló.
   */
  if (!session) {
    return (
      <div className="space-y-2">
        <Link
          href="/login"
          className="block w-full rounded-xl bg-brand-deep px-5 py-3 text-center font-semibold text-white shadow-soft transition-all duration-150 hover:bg-brand-deep/90 active:scale-[0.98]"
        >
          Iniciá sesión para consultar
        </Link>
        <p className="text-center text-xs text-muted">
          La conversación queda dentro de AIassistant, junto a este aviso.
        </p>
      </div>
    );
  }

  async function open() {
    setOpening(true);
    setProblem(null);

    try {
      const data = await api<{ id: string }>('/api/conversations', {
        method: 'POST',
        body: { listing_id: listing.id },
      });
      router.push(`/mensajes/${data.id}`);
    } catch (error) {
      setProblem(
        error instanceof ApiError ? error.message : 'No se pudo abrir la conversación.',
      );
      setOpening(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button full disabled={opening} onClick={() => void open()}>
        {opening ? 'Abriendo…' : 'Consultar al vendedor'}
      </Button>
      <p className="text-center text-xs text-muted">
        La conversación queda dentro de AIassistant, junto a este aviso.
      </p>
      {problem && <Notice tone="alert" title={problem} />}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { FavoriteButton } from '@/components/FavoriteButton';
import { PriceEstimatePanel } from '@/components/PriceEstimate';
import { Badge, Button, Card, Notice, RocketIcon, Spinner, StatusBadge } from '@/components/ui';
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

  const listingId = params.id;

  const load = useCallback(async () => {
    setLoading(true);
    setProblem(null);

    try {
      const data = await api<{ listing: Listing }>(`/api/listings/${listingId}`);
      setListing(data.listing);
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

  return (
    <div className="space-y-5">
      <Link href="/" className="inline-block text-sm font-medium text-brand-deep hover:underline">
        ← Volver a las publicaciones
      </Link>

      {problem && <Notice tone="alert" title={problem} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* ---- Galería ----------------------------------------------------- */}
        <div>
          <PhotoCarousel
            photos={listing.photos}
            alt={`${listing.brand} ${listing.model}`}
          />
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
              {listing.status === 'published' ? (
                /* EL CORAZÓN COMPARTE RENGLÓN CON "CONSULTAR AL VENDEDOR"
                   (2026-09-04). Antes el botón de consultar ocupaba el ancho
                   entero y guardar quedaba en el renglón de abajo, gastando 40
                   píxeles de alto para repetir lo que un corazón dice solo. Van
                   los dos juntos: consultar se queda con casi todo el ancho,
                   porque es la salida del embudo, y el corazón con lo justo. */
                <ContactSeller
                  listing={listing}
                  aside={<FavoriteButton listingId={listing.id} variant="boxed" />}
                />
              ) : (
                <>
                  {listing.status === 'sold' && (
                    <p className="text-sm text-muted">
                      Este vehículo ya se vendió, así que no se puede contactar al vendedor por
                      esta publicación.
                    </p>
                  )}

                  {/* Sin botón de consultar al lado, el corazón vuelve a
                      llevar su palabra: solo en un renglón vacío no se
                      entiende qué está esperando. */}
                  <div className="flex flex-wrap gap-3">
                    <FavoriteButton listingId={listing.id} variant="labeled" />
                  </div>
                </>
              )}
            </div>
          )}

          {/* TODO LO QUE HACE LA IA VIVE ADENTRO DE UN BOTÓN (2026-09-04).

              El análisis de fotos y el precio de referencia son dos tarjetas
              largas —el análisis solo puede pasar los 1.500px— y estaban las
              dos abiertas apenas se bajaba un poco. La ficha se leía como un
              choclo de texto antes de llegar a la descripción y a los datos.

              Ahora no se dibuja nada hasta que alguien toca "Analizar con IA".
              Vale para los dos casos, y eso es a propósito: aunque el análisis
              YA esté hecho, sigue guardado adentro del botón. Que aparezca solo
              porque otro lo pidió antes es la misma pared de texto, y quien
              entra a mirar un vehículo no pidió leerla.

              VA PEGADO A LAS DOS ACCIONES DEL COMPRADOR y antes que la
              descripción: es lo que diferencia a esta plataforma de cualquier
              otro clasificado, y en violeta, que es el color de la IA en toda
              la aplicación.

              El orden de adentro —análisis primero, precio después— es el que
              salió de la prueba del 2026-08-27 y no cambió. */}
          <AiSection>
            {/* Sin fotos no hay nada que mirar, así que ahí no se ofrece —
                pasa solo en borradores a medio hacer. */}
            {listing.photos.length > 0 && <AnalysisPanel listingId={listing.id} />}
            <PriceEstimatePanel listingId={listing.id} />
          </AiSection>

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
function ContactSeller({ listing, aside }: { listing: Listing; aside: ReactNode }) {
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
        <div className="flex items-stretch gap-3">
          <Link
            href="/login"
            className="flex flex-1 items-center justify-center rounded-xl bg-brand-deep px-5 py-3 text-center font-semibold text-white shadow-soft transition-all duration-150 hover:bg-brand-deep/90 active:scale-[0.98]"
          >
            Iniciá sesión para consultar
          </Link>
          {aside}
        </div>
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
      {/* `items-stretch` es lo que hace que el corazón mida exactamente lo
          mismo de alto que el botón de al lado sin escribir la altura en
          ningún lado: crece con él si algún día cambia. */}
      <div className="flex items-stretch gap-3">
        <span className="flex-1">
          <Button full disabled={opening} onClick={() => void open()}>
            {opening ? 'Abriendo…' : 'Consultar al vendedor'}
          </Button>
        </span>
        {aside}
      </div>
      {problem && <Notice tone="alert" title={problem} />}
    </div>
  );
}

/**
 * La caja donde vive todo lo que hace la IA: el análisis de las fotos y el
 * precio de referencia.
 *
 * CERRADA POR OMISIÓN, SIEMPRE. También cuando el análisis ya está hecho y
 * guardado. Es la parte que importa del pedido: las dos tarjetas juntas pasan
 * los 1.500px en un celular, y una ficha que arranca con esa pared de texto no
 * deja llegar a la descripción ni a los datos. Que aparezca sola porque otro
 * la pidió antes es exactamente el mismo problema.
 *
 * QUÉ HACE EL BOTÓN Y QUÉ NO. Abre la caja: no gasta un análisis. Adentro, si
 * no hay ninguno hecho, está el botón que sí lo pide —también violeta—; si ya
 * hay uno, se lee el guardado. Un solo toque que empiece a gastar plata sin
 * avisar es lo que este proyecto viene evitando desde la prueba en celular:
 * nada se manda sin que la persona lo pida.
 *
 * EL CONTENIDO NO SE MONTA HASTA QUE SE ABRE, así que cerrada no le pide nada
 * al servidor. Al cerrarla se desmonta, y al volver a abrirla cada panel se
 * pone al día solo: el estado del análisis vive en la base, no acá.
 */
function AiSection({ children }: { children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setAbierta((actual) => !actual)}
        aria-expanded={abierta}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-ai px-5 py-3 text-sm font-semibold text-white shadow-ai transition-all duration-150 hover:bg-ai/90 active:scale-[0.98]"
      >
        <RocketIcon />
        {abierta ? 'Ocultar el análisis' : 'Analizar con IA'}
        <ChevronIcon abierta={abierta} />
      </button>

      {abierta && <div className="space-y-4">{children}</div>}
    </div>
  );
}

/** La flecha del botón de arriba: apunta abajo cerrada y arriba abierta. */
function ChevronIcon({ abierta }: { abierta: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-200 ${abierta ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Las fotos del vehículo: una sola caja y se pasa deslizando al costado.
 *
 * SE FUE LA TIRA DE MINIATURAS (2026-09-04). Debajo de la foto principal había
 * seis cuadraditos para elegir cuál mirar: 60px de alto más su separación, en
 * el lugar más caro de la pantalla —entre la foto y el precio—, para hacer lo
 * mismo que hace el dedo. Ahora se desliza, como en cualquier aplicación de
 * fotos, y el precio quedó pegado abajo de la imagen.
 *
 * CÓMO FUNCIONA, SIN LIBRERÍA NI JAVASCRIPT DE ARRASTRE: es una fila que
 * desborda a lo ancho y se corta en seco en cada foto (`snap-x snap-mandatory`
 * con `snap-center`). El desplazamiento lo hace el navegador, así que tiene la
 * inercia y el rebote de siempre, y anda igual con el dedo, con el trackpad y
 * con la rueda del mouse en diagonal. El único JavaScript es el que mira dónde
 * quedó la fila para prender el puntito que corresponde.
 *
 * LOS PUNTITOS VAN ENCIMA DE LA FOTO, no debajo: abajo volverían a costar el
 * alto que se acaba de ganar. Y son puntos y no números porque lo único que
 * hay que contestar es "¿hay más?" y "¿por dónde voy?".
 *
 * LAS FLECHAS APARECEN DE TABLET PARA ARRIBA. En un celular sobran —el dedo ya
 * sabe— y taparían la foto; con mouse, en cambio, no hay forma evidente de
 * pasar de foto, porque la barra de desplazamiento está escondida a propósito.
 */
function PhotoCarousel({ photos, alt }: { photos: Listing['photos']; alt: string }) {
  const [actual, setActual] = useState(0);
  const fila = useRef<HTMLDivElement>(null);

  if (photos.length === 0) {
    return (
      <div className="-mx-4 flex aspect-4/3 items-center justify-center bg-mist text-sm text-muted shadow-card sm:mx-0 sm:rounded-2xl">
        Esta publicación no tiene fotos
      </div>
    );
  }

  /** A qué foto quedó más cerca la fila después de soltarla. */
  function alDesplazar() {
    const caja = fila.current;
    if (!caja) {
      return;
    }

    const indice = Math.round(caja.scrollLeft / caja.clientWidth);
    setActual(Math.min(Math.max(indice, 0), photos.length - 1));
  }

  function ir(indice: number) {
    const caja = fila.current;
    if (!caja) {
      return;
    }

    caja.scrollTo({ left: indice * caja.clientWidth, behavior: 'smooth' });
  }

  return (
    <div className="relative -mx-4 sm:mx-0">
      {/*
       * `tabIndex` para que se pueda recorrer con las flechas del teclado: una
       * caja que se desplaza sola no recibe foco, y sin eso las fotos quedan
       * inalcanzables para quien no usa el dedo ni el mouse.
       */}
      <div
        ref={fila}
        onScroll={alDesplazar}
        tabIndex={0}
        role="group"
        aria-label={`Fotos del vehículo (${photos.length})`}
        className="sin-barra flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain sm:rounded-2xl sm:shadow-card"
      >
        {photos.map((photo, indice) => (
          <div
            key={photo.id}
            className="relative aspect-4/3 w-full shrink-0 snap-center overflow-hidden bg-mist"
          >
            {/* EL RELLENO DE LOS COSTADOS ES LA MISMA FOTO, DESENFOCADA.

                La caja mide 4:3 y las fotos vienen con cualquier forma: una
                apaisada deja dos franjas vacías arriba y abajo que en celular
                son unos 180px de nada — casi un cuarto de la pantalla, justo
                en lo primero que se mira.

                Recortar la foto para llenar la caja no es opción: el que
                compra necesita ver el vehículo entero, y un `object-cover` le
                corta el techo o las ruedas.

                Entonces las franjas se llenan con la misma foto ampliada y
                desenfocada. Es el mismo recurso de las aplicaciones de música
                con la tapa del disco: el color de la foto sigue, la pantalla
                se ve llena, y nada de lo que importa se pierde.

                NO ES UNA SEGUNDA DESCARGA: es la misma dirección, así que el
                navegador la sirve de su propia memoria.

                Va con `alt` vacío y `aria-hidden` porque es decoración pura —
                un lector de pantalla que la nombre estaría diciendo dos veces
                la misma foto. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt=""
              aria-hidden
              /* `scale-125` para que el desenfoque no deje ver el borde de la
                 propia imagen contra el borde de la caja. */
              className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photos.length > 1 ? `${alt} — foto ${indice + 1} de ${photos.length}` : alt}
              className="relative h-full w-full object-contain"
            />
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {photos.map((photo, indice) => (
              <span
                key={photo.id}
                aria-hidden
                className={[
                  'h-1.5 rounded-full transition-all duration-200',
                  // El puntito de la foto que se está mirando es una barrita:
                  // se distingue del resto aunque la foto de atrás sea clara.
                  indice === actual ? 'w-4 bg-white' : 'w-1.5 bg-white/60',
                  'shadow-[0_1px_3px_rgb(5_7_13_/_0.45)]',
                ].join(' ')}
              />
            ))}
          </div>

          <Flecha
            hacia="anterior"
            visible={actual > 0}
            onClick={() => ir(actual - 1)}
          />
          <Flecha
            hacia="siguiente"
            visible={actual < photos.length - 1}
            onClick={() => ir(actual + 1)}
          />
        </>
      )}
    </div>
  );
}

/** Las flechas del carrusel, de vidrio esmerilado y solo de tablet para arriba. */
function Flecha({
  hacia,
  visible,
  onClick,
}: {
  hacia: 'anterior' | 'siguiente';
  visible: boolean;
  onClick: () => void;
}) {
  const anterior = hacia === 'anterior';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={anterior ? 'Foto anterior' : 'Foto siguiente'}
      // En la primera foto no hay anterior y en la última no hay siguiente: la
      // flecha se apaga en vez de desaparecer, para que la otra no se corra de
      // lugar.
      disabled={!visible}
      className={[
        'glass absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center',
        'rounded-full text-ink shadow-soft transition-opacity sm:flex',
        anterior ? 'left-3' : 'right-3',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={anterior ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
      </svg>
    </button>
  );
}

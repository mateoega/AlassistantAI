'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ListingPhoto } from '@/lib/types';

/**
 * EL VISOR DE FOTOS: PANTALLA COMPLETA, CON ZOOM DE VERDAD (2026-09-04)
 *
 * El cliente pidió poder agrandar una foto y, con la foto agrandada, moverla
 * con el dedo — y que eso NO agrande la página entera, que es lo que hacía el
 * navegador hasta hoy: se pellizcaba sobre una foto y crecía toda la pantalla,
 * barras incluidas, y después había que achicarla a mano.
 *
 * POR QUÉ UNA PANTALLA APARTE Y NO EL ZOOM ADENTRO DEL CARRUSEL. El carrusel se
 * pasa deslizando al costado, y ese deslizamiento lo hace el navegador. Un
 * pellizco adentro de esa misma caja pelea con él: el primer dedo empieza a
 * pasar de foto mientras el segundo intenta agrandar. Acá el visor toma los
 * dedos para sí (`touch-action: none`), así que no hay nada con qué pelear —y
 * de paso la foto se mira sobre negro y a pantalla completa, que es donde se
 * miran las fotos de un vehículo que uno está por ir a ver.
 *
 * CÓMO SE ABRE: tocando la foto, o pellizcándola. Lo segundo importa tanto como
 * lo primero: pellizcar es el gesto con el que la gente pide zoom sin pensarlo,
 * y si ahí no pasa nada —o peor, se agranda toda la página— el visor no existe
 * para quien no descubrió el toque.
 *
 * LOS GESTOS, TODOS CON `pointer events` Y SIN LIBRERÍA:
 *   · pellizcar con dos dedos → agranda y achica, anclado al punto del medio de
 *     los dos dedos, que es lo que hace que crezca lo que se está mirando y no
 *     el centro de la pantalla;
 *   · un dedo con la foto agrandada → la mueve, con tope en los bordes;
 *   · un dedo con la foto entera → pasa a la anterior o a la siguiente, y hacia
 *     abajo cierra;
 *   · dos toques seguidos → agranda a 2,5x en ese punto, o vuelve a la foto
 *     entera si ya estaba agrandada;
 *   · rueda del mouse con Ctrl (o pellizco de trackpad) → agranda la foto y no
 *     la página;
 *   · teclado: Escape cierra, flechas pasan de foto.
 *
 * QUÉ HACE QUE EL NAVEGADOR NO SE META:
 *   · `touch-action: none` en la caja: sin eso, el navegador se queda con el
 *     desplazamiento y con el pellizco antes de que lleguen acá;
 *   · `gesturestart`/`gesturechange` cancelados a mano, porque Safari de iPhone
 *     tiene sus propios eventos de pellizco además de los `pointer`, y con
 *     `touch-action` solo sigue agrandando la página;
 *   · el `body` queda quieto mientras el visor está abierto, para no volver de
 *     cerrarlo a otra altura de la ficha.
 *
 * ES `position: fixed` Y NO UN `<dialog>`: el proyecto no tiene ningún diálogo
 * nativo y este tiene que convivir con el panel del chat (`z-50`) y quedar por
 * debajo del cartel de términos (`z-[60]`), que es lo único que puede taparlo
 * todo.
 */

/** Cuánto se puede agrandar. Más de 4x en una foto de celular es puré. */
const MAXIMO = 4;
/** A cuánto lleva el doble toque. */
const DOBLE_TOQUE = 2.5;
/** Cuántos píxeles hay que arrastrar para pasar de foto. */
const ARRASTRE_MINIMO = 60;

type Punto = { x: number; y: number };

export function PhotoViewer({
  photos,
  alt,
  indiceInicial,
  onClose,
}: {
  photos: ListingPhoto[];
  alt: string;
  indiceInicial: number;
  /** Recibe en qué foto quedó parado el visor: el carrusel se para en la misma. */
  onClose: (indiceFinal: number) => void;
}) {
  const [indice, setIndice] = useState(indiceInicial);
  const [escala, setEscala] = useState(1);
  const [desplazamiento, setDesplazamiento] = useState<Punto>({ x: 0, y: 0 });

  const caja = useRef<HTMLDivElement>(null);
  const imagen = useRef<HTMLImageElement>(null);

  /** Los dedos (o el mouse) apoyados ahora mismo, por identificador. */
  const dedos = useRef(new Map<number, Punto>());
  /** Dónde estaba todo cuando empezó el gesto que está en curso. */
  const inicio = useRef<{
    distancia: number;
    escala: number;
    desplazamiento: Punto;
    punto: Punto;
    movido: boolean;
  } | null>(null);
  /** Cuándo fue el último toque, para reconocer el doble toque. */
  const ultimoToque = useRef(0);

  /**
   * EL ZOOM Y EL MOVIMIENTO, TAMBIÉN EN UNA REFERENCIA.
   *
   * Los dos ya viven en el estado, que es lo que dibuja; esta copia es para
   * LEERLOS EN EL MEDIO DE UN GESTO. Un pellizco manda decenas de eventos por
   * segundo y React no vuelve a dibujar entre uno y otro: leyendo el estado, el
   * segundo evento del gesto calcularía sobre el valor que había antes del
   * primero. Y calcular adentro de un actualizador de estado —que fue lo que se
   * probó primero— es peor: React puede llamarlo dos veces (lo hace en
   * desarrollo, a propósito) y el zoom se aplicaba dos veces, así que un doble
   * toque terminaba pegado contra el borde en vez de centrado donde se tocó.
   */
  const vista = useRef({ escala: 1, x: 0, y: 0 });

  const agrandada = escala > 1;

  /**
   * EL TAMAÑO REAL DE LA FOTO DIBUJADA, que no es el de la caja.
   *
   * La foto se muestra con `object-contain`: adentro de una caja de 375x812 una
   * foto apaisada ocupa 375x281 y el resto es negro. Si el tope del movimiento
   * se calculara con la caja, la foto se podría arrastrar hasta dejar a la vista
   * una franja negra que no tiene nada — se siente como que la aplicación se
   * rompió.
   */
  const medir = useCallback(() => {
    const img = imagen.current;
    const cont = caja.current;
    if (!img || !cont || !img.naturalWidth || !img.naturalHeight) {
      return null;
    }

    const anchoCaja = cont.clientWidth;
    const altoCaja = cont.clientHeight;
    const proporcion = Math.min(anchoCaja / img.naturalWidth, altoCaja / img.naturalHeight);

    return {
      ancho: img.naturalWidth * proporcion,
      alto: img.naturalHeight * proporcion,
      anchoCaja,
      altoCaja,
    };
  }, []);

  /** El movimiento nunca puede dejar un borde de la foto adentro de la pantalla. */
  const limitar = useCallback(
    (punto: Punto, conEscala: number): Punto => {
      const medida = medir();
      if (!medida) {
        return punto;
      }

      const topeX = Math.max(0, (medida.ancho * conEscala - medida.anchoCaja) / 2);
      const topeY = Math.max(0, (medida.alto * conEscala - medida.altoCaja) / 2);

      return {
        x: Math.min(topeX, Math.max(-topeX, punto.x)),
        y: Math.min(topeY, Math.max(-topeY, punto.y)),
      };
    },
    [medir],
  );

  /** El único lugar que escribe el zoom y el movimiento: estado y referencia juntos. */
  const aplicar = useCallback(
    (escalaPedida: number, punto: Punto) => {
      const limitada = Math.min(MAXIMO, Math.max(1, escalaPedida));
      // Con la foto entera no hay nada que mover: vuelve al centro sola.
      const ubicado = limitada === 1 ? { x: 0, y: 0 } : limitar(punto, limitada);

      vista.current = { escala: limitada, x: ubicado.x, y: ubicado.y };
      setEscala(limitada);
      setDesplazamiento(ubicado);
    },
    [limitar],
  );

  const verEntera = useCallback(() => {
    aplicar(1, { x: 0, y: 0 });
  }, [aplicar]);

  const irA = useCallback(
    (siguiente: number) => {
      if (siguiente < 0 || siguiente >= photos.length) {
        return;
      }
      setIndice(siguiente);
      verEntera();
    },
    [photos.length, verEntera],
  );

  /**
   * Agranda o achica ANCLADO A UN PUNTO de la pantalla: lo que está debajo del
   * dedo se queda debajo del dedo. Sin esto, agrandar corre la foto hacia el
   * centro y hay que volver a buscar lo que se estaba mirando.
   */
  const escalarDesde = useCallback(
    (nuevaEscala: number, centro: Punto) => {
      const cont = caja.current;
      if (!cont) {
        return;
      }

      const rect = cont.getBoundingClientRect();
      const limitada = Math.min(MAXIMO, Math.max(1, nuevaEscala));
      const factor = limitada / vista.current.escala;

      // El punto anclado, medido desde el centro de la caja, se aleja del
      // centro tantas veces como creció la foto.
      const haciaX = centro.x - (rect.left + rect.width / 2);
      const haciaY = centro.y - (rect.top + rect.height / 2);

      aplicar(limitada, {
        x: haciaX - (haciaX - vista.current.x) * factor,
        y: haciaY - (haciaY - vista.current.y) * factor,
      });
    },
    [aplicar],
  );

  /* ---------------------------------------------------------------------- */
  /* Los dedos                                                              */
  /* ---------------------------------------------------------------------- */

  function distanciaEntre(a: Punto, b: Punto) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function centroEntre(a: Punto, b: Punto): Punto {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function alApoyar(evento: React.PointerEvent<HTMLDivElement>) {
    // El dedo se sigue aunque salga de la caja: sin esto, arrastrar hasta el
    // borde de la pantalla suelta la foto a mitad de camino. Va en un `try`
    // porque el navegador rechaza capturar un puntero que ya se levantó, y esa
    // excepción cortaría el gesto entero.
    try {
      evento.currentTarget.setPointerCapture(evento.pointerId);
    } catch {
      // Sin captura el gesto funciona igual mientras el dedo no salga.
    }
    dedos.current.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });

    const [uno, dos] = [...dedos.current.values()];
    inicio.current = {
      distancia: uno && dos ? distanciaEntre(uno, dos) : 0,
      escala,
      desplazamiento,
      punto: { x: evento.clientX, y: evento.clientY },
      movido: false,
    };
  }

  function alMover(evento: React.PointerEvent<HTMLDivElement>) {
    if (!dedos.current.has(evento.pointerId) || !inicio.current) {
      return;
    }

    dedos.current.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
    const [uno, dos] = [...dedos.current.values()];

    // DOS DEDOS: pellizco.
    if (uno && dos && inicio.current.distancia > 0) {
      inicio.current.movido = true;
      const ahora = distanciaEntre(uno, dos);
      escalarDesde(
        inicio.current.escala * (ahora / inicio.current.distancia),
        centroEntre(uno, dos),
      );
      return;
    }

    // UN DEDO CON LA FOTO AGRANDADA: la mueve.
    if (dedos.current.size === 1 && inicio.current.escala > 1) {
      const dx = evento.clientX - inicio.current.punto.x;
      const dy = evento.clientY - inicio.current.punto.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        inicio.current.movido = true;
      }
      aplicar(inicio.current.escala, {
        x: inicio.current.desplazamiento.x + dx,
        y: inicio.current.desplazamiento.y + dy,
      });
    }
  }

  function alLevantar(evento: React.PointerEvent<HTMLDivElement>) {
    const empezo = inicio.current;
    dedos.current.delete(evento.pointerId);

    if (!empezo) {
      return;
    }

    const dx = evento.clientX - empezo.punto.x;
    const dy = evento.clientY - empezo.punto.y;
    const quieto = Math.abs(dx) < 8 && Math.abs(dy) < 8;

    // UN DEDO CON LA FOTO ENTERA Y UN ARRASTRE AL COSTADO: pasa de foto. Hacia
    // abajo cierra, que es el gesto con el que se sale de cualquier visor.
    if (dedos.current.size === 0 && empezo.escala === 1 && !quieto) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > ARRASTRE_MINIMO) {
        irA(indice + (dx < 0 ? 1 : -1));
      } else if (dy > ARRASTRE_MINIMO * 1.6) {
        onClose(indice);
      }
      inicio.current = null;
      return;
    }

    // DOS TOQUES SEGUIDOS EN EL MISMO LUGAR: agranda ahí, o vuelve a la entera.
    if (dedos.current.size === 0 && quieto && !empezo.movido) {
      const ahora = Date.now();
      if (ahora - ultimoToque.current < 300) {
        ultimoToque.current = 0;
        if (vista.current.escala > 1) {
          verEntera();
        } else {
          escalarDesde(DOBLE_TOQUE, { x: evento.clientX, y: evento.clientY });
        }
      } else {
        ultimoToque.current = ahora;
      }
    }

    if (dedos.current.size === 0) {
      inicio.current = null;
    }
  }

  function alCancelar(evento: React.PointerEvent<HTMLDivElement>) {
    dedos.current.delete(evento.pointerId);
    if (dedos.current.size === 0) {
      inicio.current = null;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Lo que hay que atajarle al navegador                                   */
  /* ---------------------------------------------------------------------- */

  /**
   * Van con `addEventListener` y no como propiedades de React porque los cuatro
   * necesitan `passive: false` para poder cancelarse — React los registra
   * pasivos y `preventDefault()` no haría nada. Los `gesture*` son de Safari:
   * ahí `touch-action: none` no alcanza para que un pellizco no agrande la
   * página.
   */
  useEffect(() => {
    const cont = caja.current;
    if (!cont) {
      return;
    }

    const frenar = (evento: Event) => evento.preventDefault();

    const rueda = (evento: WheelEvent) => {
      // Ctrl + rueda es como llegan el pellizco del trackpad y el zoom del
      // navegador. Adentro del visor lo que crece es la foto.
      if (!evento.ctrlKey) {
        return;
      }
      evento.preventDefault();
      escalarDesde(vista.current.escala * (evento.deltaY < 0 ? 1.12 : 1 / 1.12), {
        x: evento.clientX,
        y: evento.clientY,
      });
    };

    cont.addEventListener('gesturestart', frenar, { passive: false });
    cont.addEventListener('gesturechange', frenar, { passive: false });
    cont.addEventListener('gestureend', frenar, { passive: false });
    cont.addEventListener('wheel', rueda, { passive: false });

    return () => {
      cont.removeEventListener('gesturestart', frenar);
      cont.removeEventListener('gesturechange', frenar);
      cont.removeEventListener('gestureend', frenar);
      cont.removeEventListener('wheel', rueda);
    };
  }, [escalarDesde]);

  /** La ficha se queda donde estaba mientras el visor está abierto. */
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  useEffect(() => {
    function alTeclado(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        onClose(indice);
      } else if (evento.key === 'ArrowRight') {
        irA(indice + 1);
      } else if (evento.key === 'ArrowLeft') {
        irA(indice - 1);
      }
    }

    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [indice, irA, onClose]);

  const foto = photos[indice];
  if (!foto) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${indice + 1} de ${photos.length}: ${alt}`}
      className="fixed inset-0 z-[55] bg-ink"
    >
      {/* LA CAJA DE LOS GESTOS ES TODA LA PANTALLA, no la foto: con la foto
          agrandada el dedo cae muchas veces sobre el negro de al lado, y ahí
          el movimiento tiene que seguir funcionando igual. */}
      <div
        ref={caja}
        onPointerDown={alApoyar}
        onPointerMove={alMover}
        onPointerUp={alLevantar}
        onPointerCancel={alCancelar}
        className="h-full w-full touch-none select-none overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imagen}
          src={foto.url}
          alt={photos.length > 1 ? `${alt} — foto ${indice + 1} de ${photos.length}` : alt}
          draggable={false}
          // El tope del movimiento depende del tamaño real de la foto, que no
          // se conoce hasta que cargó: recién acá se puede recalcular.
          onLoad={() => aplicar(vista.current.escala, { x: vista.current.x, y: vista.current.y })}
          style={{
            transform: `translate3d(${desplazamiento.x}px, ${desplazamiento.y}px, 0) scale(${escala})`,
            // La animación va solo cuando NO hay dedos apoyados: con el dedo
            // puesto, una transición hace que la foto llegue tarde al dedo.
            transition: dedos.current.size ? 'none' : 'transform 180ms ease-out',
          }}
          className="h-full w-full object-contain"
        />
      </div>

      {/* Los controles van por encima de la caja de gestos y no la dejan pasar:
          tocar la cruz cierra, y no cuenta como un toque sobre la foto. */}
      <button
        type="button"
        onClick={() => onClose(indice)}
        aria-label="Cerrar la foto"
        className="glass absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-ink shadow-soft active:scale-[0.98]"
      >
        <svg
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {photos.length > 1 && (
        <p className="glass pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium text-ink">
          {indice + 1} / {photos.length}
        </p>
      )}

      {/* La ayuda aparece solo con la foto entera: una vez que se agrandó, ya
          se entendió, y taparía justo lo que se está mirando. */}
      {!agrandada && (
        <p className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-xs text-white/70">
          Pellizcá para agrandar · dos toques también
        </p>
      )}
    </div>
  );
}

'use client';

import type { MouseEvent } from 'react';
import Link from 'next/link';
import { useFavorites } from './FavoritesProvider';
import { useSession } from './SessionProvider';

/**
 * El botón de guardar un vehículo.
 *
 * Dos formas de la misma cosa: `icon` es el corazón que va sobre la foto en el
 * muro, y `labeled` el botón con texto de la ficha del vehículo. Ahí adentro
 * hay lugar para decir qué hace, y conviene decirlo.
 *
 * El corazón se pinta con el azul de la marca y no de rojo, como manda la
 * paleta (diseño/paleta_colores.md).
 */
export function FavoriteButton({
  listingId,
  variant = 'icon',
}: {
  listingId: string;
  variant?: 'icon' | 'labeled' | 'boxed';
}) {
  const { ids, isFavorite, toggle } = useFavorites();
  const { session } = useSession();

  /**
   * Sin cuenta el corazón se dibuja igual, y lleva a iniciar sesión.
   *
   * Podría no dibujarse, pero entonces quien mira sin cuenta no se entera de
   * que los vehículos se pueden guardar — y guardar es exactamente el motivo
   * por el que a alguien le conviene tener una. Un botón que explica para qué
   * sirve la cuenta vale más que uno escondido.
   */
  if (!session) {
    return (
      <Link
        href="/login"
        title="Iniciá sesión para guardar este vehículo"
        aria-label="Iniciá sesión para guardar este vehículo"
        onClick={(event) => event.stopPropagation()}
        className={
          variant === 'icon'
            ? 'glass flex h-9 w-9 items-center justify-center rounded-full text-muted shadow-soft transition-transform hover:text-brand-deep active:scale-90'
            : [
                'flex items-center justify-center gap-2 rounded-xl border border-line bg-surface',
                'text-sm text-body shadow-soft transition-colors hover:border-brand',
                variant === 'boxed' ? 'px-4' : 'px-5 py-2.5',
              ].join(' ')
        }
      >
        <HeartIcon filled={false} />
        {variant === 'labeled' && 'Guardar'}
      </Link>
    );
  }

  // Todavía no se sabe qué está guardado. Se deja el lugar ocupado en vez de
  // dibujar un corazón vacío que un segundo después salte a lleno.
  if (ids === null) {
    if (variant === 'icon') {
      return <span className="block h-9 w-9" />;
    }
    // En la ficha el corazón comparte renglón con "Consultar al vendedor": si
    // no ocupara el lugar, el botón de al lado se estiraría solo y se
    // encogería un segundo después, cuando llega la respuesta.
    return variant === 'boxed' ? <span className="block w-[52px]" /> : null;
  }

  const saved = isFavorite(listingId);
  const label = saved ? 'Sacar de guardados' : 'Guardar vehículo';

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    // En el muro este botón vive adentro del enlace a la publicación: sin esto,
    // guardar abriría el aviso.
    event.preventDefault();
    event.stopPropagation();
    void toggle(listingId);
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        aria-pressed={saved}
        title={label}
        className={[
          /*
           * El corazón se apoya sobre la foto, así que es de vidrio: deja ver
           * borroso el pedazo de vehículo que tiene detrás en vez de taparlo
           * con un círculo blanco. El borde salió — sobre una foto, un borde
           * gris es una línea sucia; lo que lo despega es la sombra.
           *
           * `active:scale-90` es el acuse de recibo del toque, más marcado que
           * en un botón normal: guardar no cambia de pantalla ni muestra
           * ningún cartel, así que el único aviso de que pasó algo es que el
           * corazón se llene — y eso, en una mano que tapa el botón, se pierde.
           */
          'glass flex h-9 w-9 items-center justify-center rounded-full shadow-soft',
          'transition-transform active:scale-90',
          saved ? 'text-brand-deep' : 'text-muted',
        ].join(' ')}
      >
        <HeartIcon filled={saved} />
      </button>
    );
  }

  /*
   * `boxed` es el corazón SIN LA PALABRA, para cuando comparte renglón con
   * otro botón —hoy, "Consultar al vendedor" en la ficha del vehículo—. El
   * corazón ya dice qué hace; la palabra ahí solo le come el ancho al botón
   * que importa.
   *
   * NO LLEVA ALTURA PROPIA, y eso es lo que hace que mida exactamente lo mismo
   * que el botón de al lado: el renglón estira a los dos con `items-stretch`.
   * Un `h-full` acá lo rompe —`height: 100%` contra un padre de alto
   * automático se resuelve como el alto del contenido—, y el corazón queda de
   * 20px al lado de un botón de 48.
   */
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={variant === 'boxed' ? label : undefined}
      title={variant === 'boxed' ? label : undefined}
      className={[
        'flex items-center justify-center gap-2 rounded-xl border text-sm shadow-soft',
        'transition-all duration-150 active:scale-[0.98]',
        variant === 'boxed' ? 'px-4' : 'px-5 py-2.5',
        saved
          ? 'border-brand bg-brand-soft font-semibold text-brand-deep'
          : 'border-line bg-surface text-body hover:border-brand',
      ].join(' ')}
    >
      <HeartIcon filled={saved} />
      {variant === 'labeled' && (saved ? 'Guardado' : 'Guardar')}
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20s-7-4.6-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 3.5C19 15.4 12 20 12 20z" />
    </svg>
  );
}

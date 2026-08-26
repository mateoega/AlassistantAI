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
  variant?: 'icon' | 'labeled';
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
            ? 'flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/90 text-muted backdrop-blur-sm transition-colors hover:border-brand'
            : 'flex items-center gap-2 rounded-lg border border-line bg-surface px-5 py-2.5 text-sm text-body transition-colors hover:border-brand'
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
    return variant === 'icon' ? <span className="block h-9 w-9" /> : null;
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
          'flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
          'border-line bg-surface/90 backdrop-blur-sm hover:border-brand',
          saved ? 'text-brand-deep' : 'text-muted',
        ].join(' ')}
      >
        <HeartIcon filled={saved} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      className={[
        'flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm transition-colors',
        saved
          ? 'border-brand bg-brand-soft font-semibold text-brand-deep'
          : 'border-line bg-surface text-body hover:border-brand',
      ].join(' ')}
    >
      <HeartIcon filled={saved} />
      {saved ? 'Guardado' : 'Guardar'}
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

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * El pie de la aplicación.
 *
 * Existe por una sola razón: que el descargo de responsabilidad se pueda
 * encontrar desde cualquier pantalla, y no solo desde el aviso donde aparece
 * una estimación de precio. Un texto legal al que solo se llega por un enlace
 * escondido cumple la formalidad y no su intención.
 *
 * Es discreto a propósito. No es navegación —la navegación son las cinco
 * pantallas de la barra— y no compite con nada: quien no lo busca, no lo ve.
 *
 * EL `pb-24` NO ES UN CAPRICHO. En celular hay una barra de navegación fija
 * abajo; sin ese lugar reservado, el pie queda debajo de ella y no se puede
 * leer ni tocar.
 */
export function SiteFooter() {
  const pathname = usePathname();

  if (pathname === '/login') {
    return null;
  }

  return (
    <footer className="mx-auto max-w-7xl px-4 pb-24 pt-2 md:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-muted">
        <p>
          Las estimaciones de precio y el análisis de fotos son orientativos: no son una tasación ni
          una revisión mecánica.
        </p>
        <Link href="/legales" className="font-medium text-brand-deep hover:underline">
          Términos y responsabilidad
        </Link>
      </div>
    </footer>
  );
}

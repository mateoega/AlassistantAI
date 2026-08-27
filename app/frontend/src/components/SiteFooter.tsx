'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * El pie de la aplicación.
 *
 * Existe por una sola razón: que los términos se puedan encontrar desde
 * cualquier pantalla. Es el único lugar de la aplicación donde queda un enlace
 * a `/legales` mientras se navega.
 *
 * ACÁ HABÍA UN PÁRRAFO Y SE SACÓ. Decía que las estimaciones y el análisis son
 * orientativos, y aparecía en todas las pantallas. Desde que los términos se
 * ACEPTAN una vez —al entrar y al crear la cuenta—, repetir el descargo en cada
 * pantalla dejó de informar y pasó a ser ruido. Quien quiera leerlo entra por
 * este enlace. Ver `TermsGate`.
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
      <div className="flex items-center justify-center border-t border-line pt-4 text-xs text-muted">
        <Link href="/legales" className="font-medium text-brand-deep hover:underline">
          Términos y responsabilidad
        </Link>
      </div>
    </footer>
  );
}

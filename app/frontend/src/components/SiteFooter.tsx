'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMobileNavVisible } from './MobileNav';

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
 * EL LUGAR RESERVADO ABAJO NO ES UN CAPRICHO. En celular flotan dos cosas
 * sobre la página: la barra de navegación —cuando hay sesión— y el botón del
 * asistente, siempre. Sin ese lugar reservado, el último renglón de cada
 * pantalla queda debajo de una de las dos y no se puede leer ni tocar. Los dos
 * números salen de medir lo que flota:
 *
 *   con barra:  barra (~3.5rem) + botón apoyado encima (hasta 7.75rem) → pb-32
 *   sin barra:  solo el botón (hasta 4.5rem)                           → pb-24
 *
 * Si el botón del asistente cambia de tamaño o de altura, este número lo
 * acompaña — ver el comentario de `AssistantChat`.
 */
export function SiteFooter() {
  const pathname = usePathname();
  const navVisible = useMobileNavVisible();

  if (pathname === '/login') {
    return null;
  }

  return (
    <footer
      className={[
        'mx-auto max-w-7xl px-4 pt-2 md:pb-8',
        navVisible ? 'pb-32' : 'pb-24',
      ].join(' ')}
    >
      <div className="flex items-center justify-center border-t border-line pt-4 text-xs text-muted">
        <Link href="/legales" className="font-medium text-brand-deep hover:underline">
          Términos y responsabilidad
        </Link>
      </div>
    </footer>
  );
}

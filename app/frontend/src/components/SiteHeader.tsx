'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from './SessionProvider';

/**
 * Barra superior.
 *
 * En pantallas chicas muestra solo el logo: los cuatro botones de navegación
 * juntos necesitaban 544px y un celular común tiene 375, así que se salían de
 * la pantalla. En celular la navegación vive en la barra inferior
 * (`MobileNav`), como en las apps de clasificados.
 */
export function SiteHeader() {
  const { session } = useSession();
  const pathname = usePathname();

  if (pathname === '/login') {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-ink">
          {/* "AI" separado del resto: en muchas tipografías la I mayúscula se
              confunde con una l minúscula y el nombre se lee "Alassistant". */}
          <span className="text-brand-deep">AI</span>
          <span>assistant</span>
        </Link>

        {session && (
          <nav className="hidden items-center gap-2 text-sm sm:flex">
            <Link
              href="/publicar"
              className="rounded-lg bg-brand-deep px-4 py-2 font-semibold text-white transition-colors hover:bg-brand-deep/90"
            >
              + Publicar
            </Link>
            <TopLink href="/mis-publicaciones" active={pathname === '/mis-publicaciones'}>
              Mis publicaciones
            </TopLink>
            <TopLink href="/perfil" active={pathname === '/perfil'}>
              Mi perfil
            </TopLink>
          </nav>
        )}
      </div>
    </header>
  );
}

function TopLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        'rounded-lg border px-4 py-2 transition-colors',
        active
          ? 'border-brand bg-brand-soft font-semibold text-brand-deep'
          : 'border-line text-body hover:border-brand',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}

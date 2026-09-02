'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from './SessionProvider';
import { useMessages } from './MessagesProvider';

/**
 * Barra superior.
 *
 * En pantallas chicas muestra el logo y el acceso al perfil: los botones de
 * navegación juntos no entran en un celular de 375px, así que ahí la
 * navegación vive en la barra inferior (`MobileNav`), como en las apps de
 * clasificados.
 *
 * El corte está en 768px y no en 640: con "Guardados" sumado en el Sprint 4,
 * los cuatro botones ya no entraban en esa franja. `MobileNav` usa el mismo
 * número, así que nunca se ven las dos ni ninguna.
 *
 * POR QUÉ EL PERFIL APARECE ACÁ EN CELULAR. Al sumar "Mensajes" en el Sprint 5
 * la barra de abajo llegaba a seis botones, y a 375px eso es un botón de 62px
 * con el texto cortado. Salió el perfil, que es lo que menos se toca: los
 * otros cinco son de mirar y publicar vehículos, y el perfil se abre una vez
 * cada tanto.
 */
export function SiteHeader() {
  const { session } = useSession();
  const { unread } = useMessages();
  const pathname = usePathname();

  if (pathname === '/login') {
    return null;
  }

  return (
    /*
     * LA BARRA ES DE VIDRIO ESMERILADO.
     *
     * Queda fija arriba mientras el listado pasa por debajo. Con fondo blanco
     * opaco, ese "por debajo" no se ve: el contenido desaparece detrás de una
     * franja blanca y la barra parece un pedazo de página cortado. Con el
     * vidrio, las fotos que pasan se adivinan borrosas y se entiende que hay
     * una sola pantalla que se mueve. Ver `.glass` en `globals.css`.
     *
     * La sombra es la más suave de las tres: la barra se apoya sobre la
     * página, no flota encima de ella, y la línea de abajo sigue estando para
     * los navegadores donde el desenfoque no corre.
     */
    <header className="glass sticky top-0 z-20 border-b border-line shadow-soft">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-ink">
          {/* "AI" separado del resto: en muchas tipografías la I mayúscula se
              confunde con una l minúscula y el nombre se lee "Alassistant". */}
          <span className="text-brand-deep">AI</span>
          <span>assistant</span>
        </Link>

        {!session && (
          <Link
            href="/login"
            className="rounded-xl bg-brand-deep px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-150 hover:bg-brand-deep/90 active:scale-[0.98]"
          >
            Iniciar sesión
          </Link>
        )}

        {session && (
          <>
            <nav className="hidden items-center gap-2 text-sm md:flex">
              <Link
                href="/publicar"
                className="rounded-xl bg-brand-deep px-4 py-2 font-semibold text-white shadow-soft transition-all duration-150 hover:bg-brand-deep/90 active:scale-[0.98]"
              >
                + Publicar
              </Link>
              <TopLink href="/mensajes" active={pathname.startsWith('/mensajes')}>
                Mensajes
                <UnreadBadge count={unread} />
              </TopLink>
              <TopLink href="/guardados" active={pathname === '/guardados'}>
                Guardados
              </TopLink>
              <TopLink href="/mis-publicaciones" active={pathname === '/mis-publicaciones'}>
                Mis publicaciones
              </TopLink>
              <TopLink href="/perfil" active={pathname === '/perfil'}>
                Mi perfil
              </TopLink>
            </nav>

            {/* Solo en celular: abajo ya no había lugar para el perfil. */}
            <Link
              href="/perfil"
              aria-label="Mi perfil"
              aria-current={pathname === '/perfil' ? 'page' : undefined}
              className={[
                'rounded-xl border p-2 transition-colors md:hidden',
                pathname === '/perfil'
                  ? 'border-brand bg-brand-soft text-brand-deep'
                  : 'border-line text-body',
              ].join(' ')}
            >
              <svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
              </svg>
            </Link>
          </>
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
        'rounded-xl border px-4 py-2 transition-colors',
        active
          ? 'border-brand bg-brand-soft font-semibold text-brand-deep'
          : 'border-line text-body hover:border-brand',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}

/**
 * El globito de mensajes sin leer.
 *
 * Mientras no se sabe cuántos hay (`null`), no se dibuja nada: un globito que
 * aparece en cero y un segundo después salta a tres es peor que esperar. Es la
 * misma regla que la de los corazones de favoritos.
 *
 * Arriba de 9 dice "9+". El número exacto no le sirve a nadie para decidir si
 * entrar; que haya varios, sí.
 */
export function UnreadBadge({ count }: { count: number | null }) {
  if (!count) {
    return null;
  }

  return (
    <span className="ml-1.5 rounded-full bg-brand-deep px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

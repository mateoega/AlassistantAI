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

            {/* GUARDADOS Y PERFIL, JUNTOS Y SOLO EN CELULAR (2026-09-04).

                Los dos son lo propio de cada uno —lo que guardé, quién soy— y
                por eso viven en la misma esquina. El corazón bajó de la barra
                de abajo para dejarle el lugar del medio al botón de IA; el
                perfil ya estaba acá desde el Sprint 5, por la misma razón de
                falta de lugar. De tablet para arriba los dos son enlaces con
                texto en la navegación de al lado.

                Van adentro de una caja propia y no sueltos: el encabezado
                reparte con `justify-between`, así que dos hijos sueltos se
                irían uno a cada punta con el logo en el medio. */}
            <div className="flex items-center gap-2 md:hidden">
              <IconLink
                href="/guardados"
                label="Guardados"
                active={pathname === '/guardados'}
              >
                <path d="M12 20s-7-4.6-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 3.5C19 15.4 12 20 12 20z" />
              </IconLink>

              <IconLink href="/perfil" label="Mi perfil" active={pathname === '/perfil'}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
              </IconLink>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

/**
 * Un botón cuadrado con un ícono adentro, para la esquina de la derecha en
 * celular. Los dos que hay —guardados y perfil— se dibujaban con el mismo
 * bloque de veinte líneas copiado dos veces.
 */
function IconLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  /** Lo que dice un lector de pantalla: el ícono solo no dice nada. */
  label: string;
  active: boolean;
  /** El dibujo del ícono, adentro de un lienzo de 24×24. */
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={[
        'rounded-xl border p-2 transition-colors',
        active ? 'border-brand bg-brand-soft text-brand-deep' : 'border-line text-body',
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
        {children}
      </svg>
    </Link>
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

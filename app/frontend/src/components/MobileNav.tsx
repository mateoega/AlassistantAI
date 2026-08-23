'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from './SessionProvider';

/**
 * Navegación inferior, solo en celular.
 *
 * Los botones de la barra superior no entran en un celular de 375px. En vez
 * de apretarlos o esconderlos detrás de un menú, se pasan abajo, que es donde
 * llega el pulgar y donde los pone cualquier app de clasificados.
 *
 * Desaparece de tablet para arriba (768px), no de 640: al sumar "Guardados"
 * en el Sprint 4, la barra de arriba pasó a necesitar más ancho del que hay
 * en esa franja intermedia. El corte de las dos barras es el mismo número, así
 * que siempre hay exactamente una navegación visible.
 */
export function MobileNav() {
  const { session } = useSession();
  const pathname = usePathname();

  if (!session || pathname === '/login') {
    return null;
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface md:hidden"
      // Respeta la franja de gestos de los celulares sin botón físico.
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg">
        <Item href="/" label="Inicio" active={pathname === '/'} icon={<HomeIcon />} />
        <Item
          href="/publicar"
          label="Publicar"
          active={pathname === '/publicar'}
          icon={<PlusIcon />}
        />
        <Item
          href="/guardados"
          label="Guardados"
          active={pathname === '/guardados'}
          icon={<HeartIcon />}
        />
        <Item
          href="/mis-publicaciones"
          label="Mis avisos"
          active={pathname.startsWith('/mis-publicaciones')}
          icon={<ListIcon />}
        />
        <Item href="/perfil" label="Perfil" active={pathname === '/perfil'} icon={<UserIcon />} />
      </ul>
    </nav>
  );
}

function Item({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <li className="flex-1">
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={[
          'flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors',
          active ? 'font-semibold text-brand-deep' : 'text-muted',
        ].join(' ')}
      >
        {icon}
        {label}
      </Link>
    </li>
  );
}

/* Íconos dibujados a mano para no sumar una librería entera por cinco figuras. */

const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 20s-7-4.6-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 3.5C19 15.4 12 20 12 20z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg {...iconProps}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

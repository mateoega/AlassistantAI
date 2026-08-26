'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from './SessionProvider';
import { useMessages } from './MessagesProvider';

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
 *
 * SON CINCO Y SIGUEN SIENDO CINCO. "Mensajes" entró en el Sprint 5 en el lugar
 * de "Perfil", que se fue a la barra de arriba. Seis botones en 375px son 62px
 * cada uno: entran a la fuerza y con el texto cortado. El perfil es lo que
 * menos se toca de los seis, así que es el que se va.
 *
 * SIN CUENTA NO SE DIBUJA. Cuatro de los cinco botones llevan a pantallas que
 * necesitan sesión, y el quinto es la pantalla donde ya está parada la
 * persona. Una barra donde todo manda a iniciar sesión no es navegación, es un
 * cartel repetido cinco veces: quien no tiene cuenta la ve en el encabezado,
 * una sola vez y donde la espera.
 */
export function MobileNav() {
  const { session } = useSession();
  const { unread } = useMessages();
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
          href="/mensajes"
          label="Mensajes"
          active={pathname.startsWith('/mensajes')}
          icon={<ChatIcon />}
          badge={unread}
        />
        <Item
          href="/mis-publicaciones"
          label="Mis avisos"
          active={pathname.startsWith('/mis-publicaciones')}
          icon={<ListIcon />}
        />
      </ul>
    </nav>
  );
}

function Item({
  href,
  label,
  active,
  icon,
  badge,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
  /** Mensajes sin leer. `null` mientras no se sabe: ahí no se dibuja nada. */
  badge?: number | null;
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
        <span className="relative">
          {icon}
          {/* El globito se apoya sobre el ícono en vez de ocupar lugar al lado:
              la barra ya está justa de ancho. */}
          {Boolean(badge) && (
            <span
              aria-label={badge === 1 ? '1 mensaje sin leer' : `${badge} mensajes sin leer`}
              className="absolute -right-2 -top-1 rounded-full bg-brand-deep px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white"
            >
              {badge! > 9 ? '9+' : badge}
            </span>
          )}
        </span>
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

function ChatIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 15a3 3 0 0 1-3 3H8l-4 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" />
    </svg>
  );
}

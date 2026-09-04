'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from './SessionProvider';
import { useAssistant } from './AssistantProvider';
import { RocketIcon } from './ui';

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
 * SON CUATRO: Inicio, Guardados, Chat IA y Mis avisos (2026-09-04). Eran
 * cinco pantallas y hoy son tres más el asistente:
 *
 *   - "Publicar" salió: estaba dos veces, porque `/mis-publicaciones` ya es la
 *     pantalla de lo que uno publica y ya tiene arriba su "+ Publicar
 *     vehículo".
 *   - "Mensajes" subió al encabezado, convertido en "Notificaciones": ahí van
 *     a llegar también los avisos que no son conversaciones. Ver `SiteHeader`.
 *   - "Guardados" es lo que más se toca mientras se recorre el listado, así
 *     que se queda abajo, que es donde llega el pulgar.
 *   - El chat de IA ocupa el medio, en violeta. Era el botón flotante que
 *     andaba esquivando el contenido; acá tiene un lugar fijo y no le tapa
 *     nada a nadie.
 *
 * SIN CUENTA NO SE DIBUJA, y eso no cambió. Tres de los cuatro botones llevan
 * a pantallas que necesitan sesión y el cuarto es donde ya está parada la
 * persona: una barra donde casi todo manda a iniciar sesión no es navegación,
 * es un cartel repetido cuatro veces.
 */
export function MobileNav() {
  const pathname = usePathname();
  const visible = useMobileNavVisible();

  if (!visible) {
    return null;
  }

  return (
    <nav
      aria-label="Navegación principal"
      /* Vidrio esmerilado, igual que la barra de arriba: el listado se ve
         pasar por debajo en vez de cortarse contra una franja blanca. La
         sombra apunta HACIA ARRIBA (el `-` del desplazamiento vertical), que
         es de donde viene el contenido. Ver `.glass` en `globals.css`. */
      className="glass fixed inset-x-0 bottom-0 z-30 border-t border-line shadow-[0_-2px_16px_-6px_rgb(21_101_192_/_0.18)] md:hidden"
      // Respeta la franja de gestos de los celulares sin botón físico.
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* `items-stretch` y no `items-center`: el lugar del chat de IA se pinta
          entero de violeta, de piso a techo de la barra, y para eso su celda
          tiene que medir lo que mide la barra. */}
      <ul className="mx-auto flex max-w-lg items-stretch">
        <Item href="/" label="Inicio" active={pathname === '/'} icon={<HomeIcon />} />
        <Item
          href="/guardados"
          label="Guardados"
          active={pathname === '/guardados'}
          icon={<HeartIcon />}
        />
        <AssistantItem />
        {/* EL DOBLE DE ANCHO, PARA QUE EL CHAT QUEDE EN EL MEDIO DE VERDAD.
            A la izquierda del violeta hay dos destinos y a la derecha uno
            solo; con todos los espacios iguales, su centro caía 46px corrido
            hacia la derecha. Dándole a este el ancho de dos, los dos lados
            pesan lo mismo y el violeta queda en el eje de la pantalla, que es
            donde lo pidió el cliente y donde lo busca el pulgar. */}
        <Item
          href="/mis-publicaciones"
          label="Mis avisos"
          active={pathname.startsWith('/mis-publicaciones')}
          icon={<ListIcon />}
          doble
        />
      </ul>
    </nav>
  );
}

/**
 * Si la barra de abajo está montada en esta pantalla.
 *
 * La preguntan el botón flotante del asistente —que aparece justamente cuando
 * esta barra NO está, porque con barra el asistente vive adentro de ella— y el
 * pie, que le reserva el lugar. Vive acá para que la condición se escriba una
 * sola vez: estaba copiada como un `bottom-20` fijo en el botón, así que mirar
 * el muro sin cuenta lo dejaba flotando a 80px del borde esquivando una barra
 * que no existía, justo encima del contenido.
 *
 * DICE SI ESTÁ MONTADA, NO SI SE VE. La barra además se esconde de 768px para
 * arriba con `md:hidden`, y eso lo sabe solo el CSS. Quien use este dato tiene
 * que poner su propio corte en `md`, con el mismo número.
 */
export function useMobileNavVisible(): boolean {
  const { session } = useSession();
  const pathname = usePathname();

  return Boolean(session) && pathname !== '/login';
}

/**
 * El chat de IA, en el medio de la barra: un lugar más, pero todo violeta.
 *
 * TIENE LA MISMA FORMA QUE LOS DEMÁS —ícono arriba, palabra abajo— y ocupa su
 * lugar entero, de piso a techo. Lo que lo distingue no es la forma sino el
 * COLOR: es lo único pintado de la pantalla, así que se ve de entrada sin
 * romper la fila. Las esquinas van redondeadas —los mismos 12px de todo lo
 * chico de la aplicación— porque un rectángulo de esquinas vivas adentro de
 * una barra de vidrio se ve puntiagudo, que fue lo que el cliente marcó.
 *
 * NO ES UN ENLACE: el asistente no es una pantalla, es un panel que se abre
 * encima de la que se está mirando —así puede hablar del aviso que hay abajo—.
 * Por eso es el único de la barra que no lleva `href` ni marca "página actual".
 *
 * NO LLEVA SOMBRA Y NO SE HUNDE AL TOCARLO. No flota sobre la barra: es un
 * pedazo de la barra, y encogerlo dejaría ver la barra por los costados. El
 * acuse de recibo lo da el violeta, que se oscurece mientras el dedo está
 * apoyado.
 */
function AssistantItem() {
  const { open, setOpen } = useAssistant();

  return (
    <li className="flex flex-1 p-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir el chat del asistente de IA"
        aria-expanded={open}
        className="flex w-full flex-col items-center justify-center gap-0.5 rounded-xl bg-ai py-1.5 text-[12px] font-semibold text-ai-gold transition-colors hover:bg-ai/90 active:bg-ai/80"
      >
        <RocketIcon className="h-[22px] w-[22px]" />
        Chat IA
      </button>
    </li>
  );
}

function Item({
  href,
  label,
  active,
  icon,
  badge,
  doble,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
  /** Mensajes sin leer. `null` mientras no se sabe: ahí no se dibuja nada. */
  badge?: number | null;
  /** Que ocupe el ancho de dos. Ver el comentario en la lista de arriba. */
  doble?: boolean;
}) {
  return (
    <li className={doble ? 'flex-2' : 'flex-1'}>
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={[
          'flex flex-col items-center gap-0.5 py-2 text-[12px] transition-colors',
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

function HeartIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 20s-7-4.6-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 3.5C19 15.4 12 20 12 20z" />
    </svg>
  );
}

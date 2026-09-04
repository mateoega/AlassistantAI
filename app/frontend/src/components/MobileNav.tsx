'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from './SessionProvider';
import { useMessages } from './MessagesProvider';
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
 * SON CUATRO, Y EL DEL MEDIO NO ES UNA PANTALLA (2026-09-04). Inicio,
 * Mensajes, IA y Mis avisos. Antes eran cinco pantallas; salieron dos y entró
 * el asistente:
 *
 *   - "Publicar" se fue porque estaba dos veces. "Mis avisos" ya es la
 *     pantalla de lo que uno publica y ya tiene arriba su botón "+ Publicar
 *     vehículo": el de la barra llevaba al mismo lugar desde un renglón más
 *     abajo.
 *   - "Guardados" se fue arriba, al lado del perfil, en la barra superior. Es
 *     lo propio de cada uno, igual que el perfil, y ahí lo busca la mano.
 *   - "IA" ocupó el lugar del medio, que era el del corazón. Era el botón
 *     flotante que andaba esquivando el contenido; acá tiene un lugar fijo y
 *     no le tapa nada a nadie.
 *
 * SIN CUENTA NO SE DIBUJA, y eso no cambió. Dos de los cuatro botones llevan a
 * pantallas que necesitan sesión. El asistente no —se puede usar sin cuenta—,
 * pero mientras no hay barra sigue estando el botón flotante, que aparece
 * justamente cuando esta barra no está. Ver `AssistantChat`.
 */
export function MobileNav() {
  const { unread } = useMessages();
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
      {/* `items-stretch` y no `items-center`: el lugar de la IA se pinta
          entero de violeta, de piso a techo de la barra, y para eso su celda
          tiene que medir lo que mide la barra. */}
      <ul className="mx-auto flex max-w-lg items-stretch">
        <Item href="/" label="Inicio" active={pathname === '/'} icon={<HomeIcon />} />
        <Item
          href="/mensajes"
          label="Mensajes"
          active={pathname.startsWith('/mensajes')}
          icon={<ChatIcon />}
          badge={unread}
        />
        <AssistantItem />
        {/* EL DOBLE DE ANCHO, PARA QUE LA IA QUEDE EN EL MEDIO DE VERDAD.
            A la izquierda del botón violeta hay dos destinos y a la derecha
            uno solo; con todos los espacios iguales, el centro del botón caía
            46px corrido hacia la derecha. Dándole a este el ancho de dos, los
            dos lados pesan lo mismo y el violeta queda en el eje de la
            pantalla, que es donde lo pidió el cliente y donde lo busca el
            pulgar. */}
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
 * El asistente, en el medio de la barra: un lugar más, pero todo violeta.
 *
 * TIENE LA MISMA FORMA QUE LOS DEMÁS —ícono arriba, palabra abajo— y ocupa su
 * lugar entero, de piso a techo de la barra. Antes era una píldora chica
 * flotando adentro de su espacio, con el resto en transparente; se veía como un
 * botón metido adentro de la barra en vez de ser parte de ella. Ahora lo que
 * cambia no es la forma sino el COLOR: el violeta ocupa el lugar completo y es
 * lo único de la pantalla que está pintado, así que se ve de entrada sin
 * romper la fila.
 *
 * Por eso tampoco lleva sombra ni esquinas redondeadas: no flota sobre la
 * barra, es un pedazo de la barra.
 *
 * NO ES UN ENLACE: el asistente no es una pantalla, es un panel que se abre
 * encima de la que se está mirando —así puede hablar del aviso que hay abajo—.
 * Por eso es el único de la barra que no lleva `href` ni marca "página actual".
 *
 * DICE "CHAT" Y EL NOMBRE COMPLETO LO DICE `aria-label`. Lo pidió así el
 * cliente. Vale saber que al lado está "Mensajes", que también son
 * conversaciones —esas con el vendedor—: lo que separa a uno del otro en la
 * pantalla es el violeta y el cohete, no la palabra.
 */
function AssistantItem() {
  const { open, setOpen } = useAssistant();

  return (
    <li className="flex flex-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir el chat del asistente de IA"
        aria-expanded={open}
        // Sin el hundido del 2% de los demás botones: esto no es un botón
        // apoyado sobre algo, es un pedazo de la barra, y encogerlo dejaría
        // ver la barra por los costados. El acuse de recibo al toque lo da el
        // violeta, que se oscurece mientras el dedo está apoyado.
        className="flex w-full flex-col items-center justify-center gap-0.5 bg-ai py-2 text-[11px] font-semibold text-white transition-colors hover:bg-ai/90 active:bg-ai/80"
      >
        <RocketIcon className="h-[22px] w-[22px]" />
        Chat
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

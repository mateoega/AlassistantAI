'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';
import { useSession } from './SessionProvider';

/**
 * Cuántos mensajes sin leer tiene el usuario, disponible en toda la aplicación.
 *
 * POR QUÉ VIVE ACÁ ARRIBA. El globito aparece en las dos navegaciones —la de
 * arriba y la del pie en celular—, y las dos están montadas al mismo tiempo.
 * Si cada una preguntara por su cuenta, todas las pantallas harían el pedido
 * dos veces para mostrar el mismo número. Es el mismo motivo por el que los
 * favoritos se piden una sola vez desde el Sprint 4.
 *
 * SE PREGUNTA CADA TANTO, NO EN VIVO. La plataforma no tiene conexión abierta
 * con la base —el frontend habla solo con el backend—, así que los mensajes
 * nuevos aparecen cuando se vuelve a preguntar. Cada 45 segundos es suficiente
 * para una negociación por un vehículo, que no es un chat de mensajería
 * instantánea, y no deja al servidor contestando lo mismo todo el día.
 *
 * Y SOLO CON LA PESTAÑA A LA VISTA. Una pestaña olvidada en el fondo no
 * necesita enterarse de nada; al volver a ella se pregunta enseguida, así que
 * el número nunca se ve viejo.
 */

const REFRESH_MS = 45_000;

interface MessagesState {
  /** `null` mientras no se sabe: sirve para no dibujar un globito en cero que después salta. */
  unread: number | null;
  /** Volver a preguntar ya mismo. La usan las pantallas que acaban de cambiar el estado. */
  refresh: () => Promise<void>;
}

const MessagesContext = createContext<MessagesState | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [unread, setUnread] = useState<number | null>(null);

  // Se guarda en una referencia para que el intervalo no se rearme en cada
  // dibujado: si se rearmara, nunca llegaría a cumplirse.
  const loggedIn = useRef(false);
  loggedIn.current = Boolean(session);

  const refresh = useCallback(async () => {
    if (!loggedIn.current) {
      return;
    }

    try {
      const data = await api<{ count: number }>('/api/conversations/unread');
      setUnread(data.count);
    } catch {
      // Sin el número, la navegación se dibuja sin globito y todo lo demás
      // funciona igual. No es motivo para alarmar a nadie.
    }
  }, []);

  useEffect(() => {
    if (!session) {
      setUnread(null);
      return;
    }

    void refresh();

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    }, REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [session, refresh]);

  return (
    <MessagesContext.Provider value={{ unread, refresh }}>{children}</MessagesContext.Provider>
  );
}

export function useMessages(): MessagesState {
  const context = useContext(MessagesContext);

  if (!context) {
    throw new Error('useMessages necesita estar dentro de MessagesProvider.');
  }

  return context;
}

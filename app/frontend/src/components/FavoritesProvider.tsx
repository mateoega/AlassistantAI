'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useSession } from './SessionProvider';

/**
 * Qué vehículos tiene guardados el usuario, disponible en toda la aplicación.
 *
 * POR QUÉ VIVE ACÁ ARRIBA
 *
 *   El corazón aparece en cada tarjeta del muro y también en la ficha del
 *   vehículo. Si cada uno preguntara por su cuenta si está guardado, entrar al
 *   muro dispararía veinticuatro pedidos para responder una sola pregunta.
 *
 *   Se pide una vez la lista de identificadores guardados y todos la miran.
 *
 * EL BOTÓN NO ESPERA AL SERVIDOR. Al apretar, el corazón cambia en el acto y
 * el pedido viaja después; si falla, vuelve a como estaba. Guardar un vehículo
 * tiene que sentirse instantáneo — es un gesto, no un formulario.
 */

interface FavoritesState {
  /** `null` mientras no se sabe: sirve para no dibujar un corazón vacío que después salta a lleno. */
  ids: Set<string> | null;
  isFavorite: (listingId: string) => boolean;
  toggle: (listingId: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesState | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [ids, setIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!session) {
      setIds(null);
      return;
    }

    api<{ ids: string[] }>('/api/favorites/ids')
      .then((data) => setIds(new Set(data.ids)))
      // Sin la lista, los corazones quedan sin dibujar y el resto de la
      // pantalla funciona igual. No es motivo para alarmar a nadie.
      .catch(() => setIds(null));
  }, [session]);

  const isFavorite = useCallback(
    (listingId: string) => ids?.has(listingId) ?? false,
    [ids],
  );

  const toggle = useCallback(
    async (listingId: string) => {
      const wasFavorite = ids?.has(listingId) ?? false;

      setIds((current) => {
        const next = new Set(current ?? []);
        if (wasFavorite) {
          next.delete(listingId);
        } else {
          next.add(listingId);
        }
        return next;
      });

      try {
        await api(`/api/favorites/${listingId}`, { method: wasFavorite ? 'DELETE' : 'PUT' });
      } catch {
        // Falló: se deshace, para que el corazón no diga algo que la base no
        // sabe. Mentirle al usuario sobre lo que quedó guardado es peor que
        // no guardarlo.
        setIds((current) => {
          const next = new Set(current ?? []);
          if (wasFavorite) {
            next.add(listingId);
          } else {
            next.delete(listingId);
          }
          return next;
        });
      }
    },
    [ids],
  );

  return (
    <FavoritesContext.Provider value={{ ids, isFavorite, toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesState {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error('useFavorites necesita estar dentro de FavoritesProvider.');
  }

  return context;
}

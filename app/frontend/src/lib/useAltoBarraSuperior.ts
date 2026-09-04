'use client';

import { useEffect, useState } from 'react';

/**
 * Cuánto mide la barra de arriba, en píxeles.
 *
 * La usa cualquier pantalla que necesite pegar algo propio justo debajo de esa
 * barra —hoy, la búsqueda del muro cuando se despega, y el encabezado de una
 * conversación—. Se mide y no se escribe el número: la barra de arriba mide
 * 61px sin sesión y cambia de alto con sesión y de tablet para arriba, donde
 * le entran los botones de navegación. Un `top-[61px]` escrito a mano dejaría
 * lo que se pega montado sobre la barra, o con un hueco por donde se ven pasar
 * las fotos, según quién esté mirando.
 *
 * El 61 del arranque es solo para el primer dibujo, antes de poder medir.
 */
export function useAltoBarraSuperior(): number {
  const [alto, setAlto] = useState(61);

  useEffect(() => {
    const medir = () => {
      const barra = document.querySelector('header');
      if (barra) {
        setAlto(Math.round(barra.getBoundingClientRect().height));
      }
    };

    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  return alto;
}

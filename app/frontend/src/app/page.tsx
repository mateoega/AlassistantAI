import { Suspense } from 'react';
import { Wall } from '@/components/Wall';
import { Spinner } from '@/components/ui';

/**
 * La pantalla principal es el muro, y desde el Sprint 4 el muro lee la
 * búsqueda de la dirección de la página.
 *
 * El `Suspense` no es decorativo: Next exige envolver así a cualquier
 * componente que lea la dirección, porque al armar la página todavía no sabe
 * qué va a decir. Sin esto la aplicación no compila.
 */
export default function HomePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Wall />
    </Suspense>
  );
}

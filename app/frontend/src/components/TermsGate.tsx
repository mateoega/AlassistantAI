'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { Button, Card } from '@/components/ui';

/**
 * Los términos se aceptan UNA vez, al entrar por primera vez.
 *
 * POR QUÉ EXISTE. Hasta ahora el descargo estaba a la vista en todas las
 * pantallas —en el pie, debajo del análisis, debajo de la estimación— y nadie
 * lo aceptaba. Antes de salir al mercado eso se dio vuelta: el texto se acepta
 * una vez y después no vuelve a aparecer. Los párrafos que se repetían en cada
 * pantalla se sacaron; el único enlace que queda mientras se navega es el del
 * pie.
 *
 * DÓNDE QUEDA GUARDADO, Y POR QUÉ EN DOS LADOS
 *
 * 1. En el navegador (`localStorage`). Es el único lugar posible para quien
 *    mira sin cuenta, que en esta plataforma es la mayoría: el muro, la ficha,
 *    el precio y el asistente se abren sin sesión. No hay a quién atar la
 *    aceptación, así que se ata al aparato. Si esa persona borra los datos del
 *    navegador o entra desde otro teléfono, el cartel vuelve.
 *
 * 2. En su perfil, si tiene cuenta (`profiles.terms_accepted_at`). Esa sí es
 *    una constancia de verdad: sobrevive al navegador y tiene fecha puesta por
 *    el servidor. Al que se registra hoy se la pone la base al crear la cuenta,
 *    desde la casilla obligatoria del formulario; esta llamada es para las
 *    cuentas que ya existían antes de que la aceptación existiera.
 *
 * La llamada al backend NO BLOQUEA el cierre del cartel. Si falla —sin señal,
 * el backend dormido—, la persona ya aceptó y no tiene por qué enterarse: la
 * marca del navegador alcanza para no volver a mostrárselo, y la próxima vez
 * que entre desde un navegador limpio se vuelve a intentar. Un error de red no
 * puede dejar a alguien encerrado contra un cartel legal.
 *
 * DÓNDE NO SE MUESTRA
 *
 * - En `/legales`, que es justamente lo que el cartel manda a leer. Taparlo con
 *   el cartel sería pedir que acepten algo que no los deja leer.
 * - En `/login`, donde la aceptación ya viaja en la casilla obligatoria del
 *   formulario de registro. Dos veces lo mismo en la misma pantalla.
 */

const CLAVE = 'aiassistant.terminos.v1';

export function TermsGate() {
  const pathname = usePathname();
  const { session } = useSession();

  // Arranca en `false` y lo decide un efecto: `localStorage` no existe cuando
  // esto se dibuja en el servidor, y arrancar en `true` haría parpadear el
  // cartel en la cara de alguien que ya aceptó.
  const [pendiente, setPendiente] = useState(false);

  useEffect(() => {
    try {
      setPendiente(window.localStorage.getItem(CLAVE) === null);
    } catch {
      // Navegador con el almacenamiento bloqueado. No se puede recordar la
      // aceptación, y tampoco tiene sentido mostrar un cartel que va a volver
      // en cada pantalla: se deja pasar.
      setPendiente(false);
    }
  }, []);

  function aceptar() {
    try {
      window.localStorage.setItem(CLAVE, new Date().toISOString());
    } catch {
      // Ver arriba: si no se puede guardar, igual se cierra.
    }

    setPendiente(false);

    if (session) {
      void api('/api/profile/terms', { method: 'POST' }).catch(() => {
        // A propósito en silencio: la persona ya aceptó y el cartel ya se
        // cerró. Lo que se pierde es la constancia en el perfil, no la
        // aceptación.
      });
    }
  }

  if (!pendiente || pathname === '/legales' || pathname === '/login') {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminos-titulo"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-4 sm:items-center"
    >
      <Card className="w-full max-w-md p-6">
        <h2 id="terminos-titulo" className="text-lg font-bold tracking-tight text-ink">
          Antes de empezar
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-body">
          AIassistant es un lugar donde particulares publican vehículos. El análisis de fotos y el
          precio de referencia los hace un programa: son orientativos, no son una tasación ni una
          revisión mecánica, y la decisión de comprar es tuya.
        </p>

        <p className="mt-3 text-sm leading-relaxed text-body">
          Al continuar aceptás los{' '}
          <Link href="/legales" className="font-medium text-brand-deep hover:underline">
            términos y el descargo de responsabilidad
          </Link>
          . Esto se pregunta una sola vez.
        </p>

        <div className="mt-5">
          <Button onClick={aceptar} full>
            Entendido, acepto
          </Button>
        </div>
      </Card>
    </div>
  );
}

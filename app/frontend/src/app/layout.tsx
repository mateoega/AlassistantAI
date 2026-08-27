import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { SessionProvider } from '@/components/SessionProvider';
import { SiteHeader } from '@/components/SiteHeader';
import { MobileNav } from '@/components/MobileNav';
import { SiteFooter } from '@/components/SiteFooter';
import { AssistantProvider } from '@/components/AssistantProvider';
import { FavoritesProvider } from '@/components/FavoritesProvider';
import { MessagesProvider } from '@/components/MessagesProvider';
import { AssistantChat } from '@/components/AssistantChat';
import { TermsGate } from '@/components/TermsGate';
import './globals.css';

/**
 * LA TIPOGRAFÍA DE LA APLICACIÓN.
 *
 * Hasta ahora era `system-ui`: la letra que traiga el sistema operativo. Eso
 * significa que la misma pantalla se ve con una letra en un iPhone, otra en
 * Android y otra en Windows, y ninguna es una decisión de nadie. Es una de las
 * cosas que hacen que una aplicación "se sienta prototipo" — el punto 12 de la
 * devolución del cliente.
 *
 * Inter está dibujada para pantallas y para textos chicos, que es justo lo que
 * más se lee acá: precios, kilometrajes, fichas técnicas. Sus números tienen
 * todos el mismo ancho, así que una columna de precios queda alineada sola.
 *
 * NO ES UNA DEPENDENCIA NUEVA NI UN PEDIDO A GOOGLE. `next/font` viene dentro
 * de Next: baja los archivos EN EL BUILD y los sirve desde el mismo dominio.
 * El navegador de la persona no le pide nada a Google, que además de ser más
 * rápido evita mandarle a un tercero la dirección IP de cada visita.
 *
 * `display: 'swap'` para que el texto se lea con la letra del sistema mientras
 * la otra llega, en vez de dejar la pantalla en blanco.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AIassistant — Vehículos del rubro automotor',
  description:
    'Publicá y encontrá vehículos de todo el rubro automotor: autos, camionetas, motos, cuatriciclos, camiones y buses.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-canvas text-body">
        <SessionProvider>
          {/* Los guardados se piden una sola vez y los miran todos los
              corazones de la aplicación, en el muro y en cada ficha. */}
          <FavoritesProvider>
            {/* Los mensajes sin leer se piden una sola vez para las dos
                navegaciones —la de arriba y la del pie—, que están montadas al
                mismo tiempo. */}
            <MessagesProvider>
              {/* El asistente envuelve toda la aplicación para que la conversación
                  sobreviva a la navegación entre pantallas: si viviera dentro del
                  panel, entrar a un aviso borraría el hilo. */}
              <AssistantProvider>
                <SiteHeader />
                {/* En celular el aire de arriba y abajo bajó de 24 a 16px. Son 16px por
                    pantalla, que no suenan a nada hasta que se suman a los del
                    encabezado, los de cada tarjeta y los del pie: el cliente lo
                    reportó como "demasiado espacio en blanco" y "scroll de
                    más". De tablet para arriba queda como estaba. */}
                <main className="mx-auto max-w-7xl px-4 py-4 sm:py-6">{children}</main>
                {/* El pie reserva el lugar de la barra de navegación fija del
                    celular (pb-24), que antes reservaba el <main>. */}
                <SiteFooter />
                <MobileNav />
                <AssistantChat />
                {/* Va al final y por encima de todo (z-60): mientras no se
                    aceptan los términos, no se toca nada de lo de atrás. Se
                    muestra una sola vez por navegador y sabe en qué pantalla
                    NO aparecer — ver el comentario del componente. */}
                <TermsGate />
              </AssistantProvider>
            </MessagesProvider>
          </FavoritesProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SessionProvider } from '@/components/SessionProvider';
import { SiteHeader } from '@/components/SiteHeader';
import { MobileNav } from '@/components/MobileNav';
import { AssistantProvider } from '@/components/AssistantProvider';
import { FavoritesProvider } from '@/components/FavoritesProvider';
import { MessagesProvider } from '@/components/MessagesProvider';
import { AssistantChat } from '@/components/AssistantChat';
import './globals.css';

export const metadata: Metadata = {
  title: 'AIassistant — Vehículos del rubro automotor',
  description:
    'Publicá y encontrá vehículos de todo el rubro automotor: autos, camionetas, motos, cuatriciclos, camiones y buses.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
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
                {/* El pb-24 de abajo deja lugar para la barra de navegación fija
                    del celular, para que no tape el último elemento de la
                    pantalla. */}
                <main className="mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-6">{children}</main>
                <MobileNav />
                <AssistantChat />
              </AssistantProvider>
            </MessagesProvider>
          </FavoritesProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

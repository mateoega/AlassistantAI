import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SessionProvider } from '@/components/SessionProvider';
import { SiteHeader } from '@/components/SiteHeader';
import { MobileNav } from '@/components/MobileNav';
import { AssistantProvider } from '@/components/AssistantProvider';
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
          {/* El asistente envuelve toda la aplicación para que la conversación
              sobreviva a la navegación entre pantallas: si viviera dentro del
              panel, entrar a un aviso borraría el hilo. */}
          <AssistantProvider>
            <SiteHeader />
            {/* El pb-24 de abajo deja lugar para la barra de navegación fija del
                celular, para que no tape el último elemento de la pantalla. */}
            <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:pb-6">{children}</main>
            <MobileNav />
            <AssistantChat />
          </AssistantProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

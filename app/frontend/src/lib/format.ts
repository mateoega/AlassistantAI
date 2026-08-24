import type { Listing } from './types';

const numberFormat = new Intl.NumberFormat('es-AR');

export function formatPrice(amount: number, currency: 'ARS' | 'USD'): string {
  const symbol = currency === 'USD' ? 'US$' : '$';
  return `${symbol} ${numberFormat.format(amount)}`;
}

/** Todos los vehículos se miden en kilómetros (decisión del 2026-08-07). */
export function formatKilometers(kilometers: number): string {
  return `${numberFormat.format(kilometers)} km`;
}

export function formatLocation(listing: Pick<Listing, 'city' | 'province'>): string {
  return listing.province ? `${listing.city}, ${listing.province.name}` : listing.city;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Deja solo los dígitos de lo que el usuario escribió. Es el valor "real" que
 * se guarda y se manda al servidor.
 */
export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Agrega los puntos de miles para mostrar mientras se escribe:
 * "8500000" se ve como "8.500.000".
 */
export function groupThousands(digits: string): string {
  if (!digits) return '';
  return numberFormat.format(Number(digits));
}

/**
 * La hora de un mensaje: "14:35".
 */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Cuándo fue algo, contado como lo cuenta una persona: "hace 5 min", "hace
 * 2 h", "ayer", y de ahí en adelante la fecha.
 *
 * En una bandeja de entrada lo que importa es qué tan reciente es cada
 * conversación comparada con las otras, no el minuto exacto. La fecha completa
 * aparece igual dentro del hilo, en cada mensaje.
 */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso);
  const minutes = Math.floor((Date.now() - then.getTime()) / 60_000);

  if (minutes < 1) return 'recién';
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;

  return then.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

/**
 * El día de un mensaje, para el separador del hilo: "hoy", "ayer" o la fecha.
 */
export function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const days = Math.round(
    (startOfDay(today).getTime() - startOfDay(date).getTime()) / 86_400_000,
  );

  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';

  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

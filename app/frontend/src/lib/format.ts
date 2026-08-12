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
 * Arma el enlace de WhatsApp a partir del teléfono cargado en el perfil.
 *
 * WhatsApp necesita el número en formato internacional y sin símbolos. Acá se
 * asume Argentina (+54) cuando el vendedor no puso código de país, y se agrega
 * el 9 que los celulares argentinos requieren.
 *
 * Es una conversión de mejor esfuerzo, no infalible: si alguien escribe el
 * teléfono con el 0 de larga distancia o el 15, el enlace puede salir mal. Por
 * eso la pantalla de perfil pide explícitamente el formato correcto.
 *
 * Devuelve null si el número es demasiado corto para ser real.
 */
export function whatsappUrl(phone: string | null, message: string): string | null {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, '');

  if (digits.length < 8) return null;

  digits = digits.replace(/^00/, '');

  if (!digits.startsWith('54')) {
    digits = `54${digits.replace(/^0/, '')}`;
  }

  // Los celulares argentinos van como 54 9 + característica + número.
  if (!digits.startsWith('549')) {
    digits = `549${digits.slice(2)}`;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Enlace para llamar. Usa el número tal como lo cargó el vendedor. */
export function phoneUrl(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.length >= 6 ? `tel:${cleaned}` : null;
}

'use client';

import type { ReactNode, Ref } from 'react';
import { digitsOnly, groupThousands } from '@/lib/format';
import { STATUS_LABEL, type ListingStatus } from '@/lib/types';

/**
 * Piezas de interfaz compartidas.
 *
 * REGLA DE IDENTIDAD (diseño/paleta_colores.md): no se usa rojo ni naranja en
 * ningún estado, ni siquiera en errores. Los avisos se distinguen por el azul
 * secundario, el borde y la jerarquía del texto, no por un color de alarma.
 */

export function Notice({
  title,
  items,
  tone = 'info',
}: {
  title: string;
  items?: string[];
  tone?: 'info' | 'alert';
}) {
  const isAlert = tone === 'alert';

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      className={[
        'rounded-2xl border px-4 py-3 text-sm shadow-soft',
        isAlert
          ? 'border-brand-deep/40 bg-brand-soft text-body'
          : 'border-line bg-surface text-muted',
      ].join(' ')}
    >
      <p className={isAlert ? 'font-semibold text-ink' : ''}>{title}</p>
      {items && items.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-body">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled,
  onClick,
  full,
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'quiet' | 'ia';
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  full?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: 'bg-brand-deep text-white font-semibold shadow-soft hover:bg-brand-deep/90',
    secondary: 'bg-brand-soft text-brand-deep font-semibold hover:bg-brand-soft/70',
    quiet: 'border border-line bg-surface text-body shadow-soft hover:border-brand',
    // Violeta: lo usa SOLO lo que llama al modelo de IA. Ver el porqué del
    // color en `globals.css`. Un botón de IA pintado del azul de la marca se
    // lee como una acción más entre guardar, publicar y enviar. Las letras
    // van en blanco: se probó dorado el 2026-09-04 y se volvió a blanco el
    // mismo día, a pedido del cliente.
    ia: 'bg-ai text-white font-semibold shadow-ai hover:bg-ai/90',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[
        'rounded-xl px-5 py-2.5 text-sm transition-all duration-150',
        /*
         * EL BOTÓN SE HUNDE AL TOCARLO.
         *
         * En celular no hay `hover`: el dedo tapa el botón justo en el momento
         * en que habría que confirmarle a la persona que la pulsación llegó.
         * Achicarlo un dos por ciento mientras está apretado es el acuse de
         * recibo — es lo que hace que la pantalla se sienta una aplicación y no
         * una página. `disabled:active` a cero para que un botón apagado no
         * conteste nada.
         */
        'active:scale-[0.98] disabled:active:scale-100',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
        full ? 'w-full' : '',
        styles[variant],
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  required,
  wide,
  children,
}: {
  label: string;
  hint?: string | null;
  required?: boolean;
  /**
   * Que ocupe las dos columnas en celular.
   *
   * Lo usan los campos que llevan dos cajas adentro —un desde y un hasta—:
   * partidos por la mitad de una pantalla de 375px quedan dos cajas de setenta
   * píxeles donde no entra un precio. De tablet para arriba vuelven a ocupar
   * una sola columna, que ahí sobra ancho.
   */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={wide ? 'col-span-2 block lg:col-span-1' : 'block'}>
      <span className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-1 text-brand-deep">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink ' +
  'placeholder:text-muted/70 outline-none transition-colors ' +
  'focus:border-brand focus:ring-2 focus:ring-brand/25';

/**
 * Campo numérico que muestra los puntos de miles mientras se escribe
 * (8.500.000 en vez de 8500000). Por dentro sigue guardando solo los dígitos,
 * que es lo que se le manda al servidor.
 */
export function NumberInput({
  value,
  onChange,
  placeholder,
  required,
  prefix,
  suffix,
}: {
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  required?: boolean;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        required={required}
        placeholder={placeholder}
        value={groupThousands(value)}
        onChange={(event) => onChange(digitsOnly(event.target.value))}
        className={[inputClass, prefix ? 'pl-9' : '', suffix ? 'pr-12' : ''].join(' ')}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-deep">
      {children}
    </span>
  );
}

/**
 * Etiqueta de estado.
 *
 * Sin rojo ni naranja, según la regla de identidad: "vendido" y "pausado" se
 * distinguen por el contraste y el borde, no por un color de alarma.
 */
export function StatusBadge({ status }: { status: ListingStatus }) {
  if (status === 'published') {
    return null; // Lo normal no necesita etiqueta.
  }

  const styles: Record<Exclude<ListingStatus, 'published'>, string> = {
    draft: 'border-line bg-mist text-muted',
    paused: 'border-line bg-mist text-muted',
    sold: 'border-ink bg-ink text-white',
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status as Exclude<ListingStatus, 'published'>]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <p className="py-10 text-center text-sm text-muted sm:py-16" role="status">
      {label}
    </p>
  );
}

/**
 * `ref` opcional: hay pantallas que necesitan traer una tarjeta a la vista
 * cuando termina algo que tarda —el análisis de fotos, por ejemplo—.
 */
export function Card({
  children,
  className = '',
  ref,
}: {
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLElement>;
}) {
  return (
    <section
      ref={ref}
      className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * EL COHETE ES EL SÍMBOLO DE LA IA, y es uno solo en toda la aplicación.
 *
 * Lo llevan las dos puertas al asistente —el botón violeta del medio de la
 * barra de abajo y el botón flotante de escritorio—, que nunca se ven las dos
 * a la vez: son la misma función en dos lugares, y con dos dibujos distintos
 * se leerían como dos cosas. Vive acá y no adentro de una de las dos por eso.
 *
 * Va con el trazo más grueso que el resto de los íconos (2 contra 1,8) porque
 * siempre va en blanco sobre violeta, donde un trazo fino se deshace.
 */
export function RocketIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 2.5c2.4 2.3 3.8 5.3 3.8 8.6v3.4H8.2v-3.4C8.2 7.8 9.6 4.8 12 2.5z" />
      <path d="M8.2 11.5 5.2 14.5v3.6l3-2.1" />
      <path d="M15.8 11.5 18.8 14.5v3.6l-3-2.1" />
      <path d="M10.6 18.4c.3 1.4.8 2.4 1.4 3.1.6-.7 1.1-1.7 1.4-3.1" />
      <circle cx="12" cy="9.5" r="1.7" />
    </svg>
  );
}

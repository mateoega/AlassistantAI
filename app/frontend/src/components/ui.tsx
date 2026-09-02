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
  variant?: 'primary' | 'secondary' | 'quiet';
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  full?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: 'bg-brand-deep text-white font-semibold shadow-soft hover:bg-brand-deep/90',
    secondary: 'bg-brand-soft text-brand-deep font-semibold hover:bg-brand-soft/70',
    quiet: 'border border-line bg-surface text-body shadow-soft hover:border-brand',
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

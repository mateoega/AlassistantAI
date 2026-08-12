'use client';

import type { ReactNode } from 'react';
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
        'rounded-lg border px-4 py-3 text-sm',
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
    primary: 'bg-brand-deep text-white font-semibold hover:bg-brand-deep/90',
    secondary: 'bg-brand-soft text-brand-deep font-semibold hover:bg-brand-soft/70',
    quiet: 'border border-line bg-surface text-body hover:border-brand',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[
        'rounded-lg px-5 py-2.5 text-sm transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
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
  children,
}: {
  label: string;
  hint?: string | null;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
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
  'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink ' +
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
    draft: 'border-line bg-canvas text-muted',
    paused: 'border-line bg-canvas text-muted',
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
    <p className="py-16 text-center text-sm text-muted" role="status">
      {label}
    </p>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface ${className}`}>{children}</section>
  );
}

'use client';

import { Field, inputClass } from './ui';
import type { VehicleTypeField } from '@/lib/types';

/**
 * Dibuja UN campo específico de un tipo de vehículo, a partir de su definición
 * en el catálogo.
 *
 * Acá está la razón por la que agregar un tipo de vehículo nuevo no requiere
 * programar: este componente no sabe qué es una cilindrada ni una capacidad de
 * carga. Solo sabe que recibió un campo que es "un número con unidad cc" o
 * "una lista con estas opciones", y lo dibuja.
 *
 * Si mañana alguien carga un motorhome en el catálogo con un campo
 * "cantidad de plazas para dormir", este componente lo va a dibujar sin que
 * nadie toque este archivo.
 */
export function DynamicField({
  field,
  value,
  onChange,
}: {
  field: VehicleTypeField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  const hint = buildHint(field);

  if (field.data_type === 'boolean') {
    return (
      <label className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-[#1565C0]"
        />
        <span className="text-sm text-ink">
          {field.label}
          {field.is_required && <span className="ml-1 text-brand-deep">*</span>}
        </span>
      </label>
    );
  }

  if (field.data_type === 'select') {
    return (
      <Field label={field.label} hint={hint} required={field.is_required}>
        <select
          className={inputClass}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Elegir…</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  const isNumeric = field.data_type === 'number' || field.data_type === 'integer';

  return (
    <Field label={labelWithUnit(field)} hint={hint} required={field.is_required}>
      <input
        type={isNumeric ? 'number' : 'text'}
        inputMode={isNumeric ? 'decimal' : undefined}
        step={field.data_type === 'integer' ? 1 : 'any'}
        min={field.min_value ?? undefined}
        max={field.max_value ?? undefined}
        className={inputClass}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function labelWithUnit(field: VehicleTypeField): string {
  return field.unit ? `${field.label} (${field.unit})` : field.label;
}

/**
 * El texto de ayuda debajo del campo. Si el catálogo trae uno escrito, se usa
 * ese; si no, se arma con el rango permitido, que es la duda más frecuente.
 */
function buildHint(field: VehicleTypeField): string | null {
  if (field.help_text) {
    return field.help_text;
  }

  if (field.min_value !== null && field.max_value !== null) {
    return `Entre ${field.min_value} y ${field.max_value}${field.unit ? ` ${field.unit}` : ''}`;
  }

  return null;
}

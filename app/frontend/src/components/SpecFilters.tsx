'use client';

import { Field, inputClass } from './ui';
import type { VehicleType, VehicleTypeField } from '@/lib/types';

/**
 * Los filtros de la ficha específica: cilindrada, cantidad de puertas, aire
 * acondicionado.
 *
 * Este componente no sabe qué es una cilindrada, igual que `DynamicField` en
 * el formulario de carga. Recibe los campos que el catálogo declara para el
 * tipo elegido y los dibuja según su tipo de dato. Un tipo de vehículo nuevo
 * cargado en la base trae sus filtros solo.
 *
 * SOLO APARECE CON UN TIPO DE VEHÍCULO ELEGIDO, y no por comodidad: sin tipo
 * no se sabe qué campos hay ni qué significan. "Puertas" no quiere decir lo
 * mismo en un auto que en un camión, y en una moto no quiere decir nada.
 *
 * Tres formas, que salen del catálogo y no de una lista escrita acá:
 *   - número  → desde y hasta
 *   - opción  → una lista con "Cualquiera" adelante
 *   - sí/no   → una lista de tres, porque un casillero no sabe decir "me da igual"
 */

/** Cómo se llama cada filtro en la dirección de la página. */
function specParam(field: VehicleTypeField, edge?: 'min' | 'max'): string {
  return edge ? `f_${field.key}_${edge}` : `f_${field.key}`;
}

function isNumericField(field: VehicleTypeField): boolean {
  return field.data_type === 'number' || field.data_type === 'integer';
}

export function SpecFilters({
  type,
  values,
  onChange,
}: {
  type: VehicleType;
  values: Record<string, string>;
  onChange: (param: string, value: string) => void;
}) {
  if (type.fields.length === 0) {
    return null;
  }

  return (
    <>
      {/* En plural y sin artículo: "Datos de motos", "Datos de camionetas".
          El catálogo no guarda el género del nombre, y adivinarlo por la
          terminación fallaba justo con el tipo más común — "moto" termina en
          o. Con el plural el problema no existe para ningún tipo, ni para los
          que se carguen mañana. */}
      <p className="col-span-2 text-sm font-semibold text-ink lg:col-span-3">
        Datos de {type.name_plural.toLowerCase()}
      </p>

      {type.fields.map((field) => (
        <SpecField
          key={field.key}
          field={field}
          values={values}
          onChange={onChange}
        />
      ))}
    </>
  );
}

function SpecField({
  field,
  values,
  onChange,
}: {
  field: VehicleTypeField;
  values: Record<string, string>;
  onChange: (param: string, value: string) => void;
}) {
  if (isNumericField(field)) {
    return (
      <Field label={field.unit ? `${field.label} (${field.unit})` : field.label} wide>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step={field.data_type === 'integer' ? 1 : 'any'}
            min={field.min_value ?? undefined}
            max={field.max_value ?? undefined}
            placeholder="Desde"
            aria-label={`${field.label} desde`}
            className={inputClass}
            value={values[specParam(field, 'min')] ?? ''}
            onChange={(event) => onChange(specParam(field, 'min'), event.target.value)}
          />
          <input
            type="number"
            inputMode="decimal"
            step={field.data_type === 'integer' ? 1 : 'any'}
            min={field.min_value ?? undefined}
            max={field.max_value ?? undefined}
            placeholder="Hasta"
            aria-label={`${field.label} hasta`}
            className={inputClass}
            value={values[specParam(field, 'max')] ?? ''}
            onChange={(event) => onChange(specParam(field, 'max'), event.target.value)}
          />
        </div>
      </Field>
    );
  }

  if (field.data_type === 'boolean') {
    return (
      <Field label={field.label}>
        <select
          className={inputClass}
          value={values[specParam(field)] ?? ''}
          onChange={(event) => onChange(specParam(field), event.target.value)}
        >
          <option value="">Cualquiera</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      </Field>
    );
  }

  return (
    <Field label={field.label}>
      <select
        className={inputClass}
        value={values[specParam(field)] ?? ''}
        onChange={(event) => onChange(specParam(field), event.target.value)}
      >
        <option value="">Cualquiera</option>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

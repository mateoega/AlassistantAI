import type { SpecValue, VehicleTypeField } from '../types.js';

/**
 * Cómo se lee la ficha específica de un vehículo en palabras.
 *
 * Convierte lo que está guardado (`{"fuel_type": "nafta"}`) en lo que una
 * persona entiende (`Combustible: Nafta`), usando las etiquetas, unidades y
 * opciones que declara el catálogo.
 *
 * Está separado a propósito: lo usan la pantalla de detalle (a través de
 * `listings.ts`) y el módulo de IA, que le describe el vehículo a Gemini con
 * exactamente las mismas palabras que ve el usuario. Si estuviera duplicado,
 * con el tiempo la IA hablaría de un vehículo distinto del que se muestra.
 *
 * Como todo lo que toca el catálogo, este archivo no sabe qué es una cilindrada
 * ni un eje: trabaja con las definiciones que le llegan.
 */

export interface SpecDisplay {
  key: string;
  label: string;
  value: string;
}

/** Los campos que el vendedor SÍ completó, en el orden del catálogo. */
export function describeSpecs(
  specs: Record<string, SpecValue>,
  fields: VehicleTypeField[],
): SpecDisplay[] {
  return fields
    .filter((field) => specs[field.key] !== undefined && specs[field.key] !== null)
    .map((field) => ({
      key: field.key,
      label: field.label,
      value: formatSpecValue(field, specs[field.key] as SpecValue),
    }));
}

/**
 * Las etiquetas de los campos que el tipo pide y el vendedor dejó vacíos.
 *
 * La pantalla de detalle no los muestra (nadie quiere ver una lista de huecos),
 * pero para el análisis de IA son información: que no se haya declarado el tipo
 * de freno de una moto es algo que el comprador puede querer preguntar.
 */
export function missingSpecLabels(
  specs: Record<string, SpecValue>,
  fields: VehicleTypeField[],
): string[] {
  return fields
    .filter((field) => specs[field.key] === undefined || specs[field.key] === null)
    .map((field) => field.label);
}

export function formatSpecValue(field: VehicleTypeField, value: SpecValue): string {
  if (field.data_type === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  if (field.data_type === 'select') {
    const option = (field.options ?? []).find((candidate) => candidate.value === value);
    return option?.label ?? String(value);
  }

  const text =
    typeof value === 'number' ? new Intl.NumberFormat('es-AR').format(value) : String(value);

  return field.unit ? `${text} ${field.unit}` : text;
}

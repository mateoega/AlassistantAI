import type { SpecValue, VehicleTypeField } from '../types.js';

/**
 * Validación de la ficha flexible (`specs`) contra el catálogo.
 *
 * Esta es la pieza que hace que el modelo flexible no se convierta en un
 * depósito de datos sucios. La columna `specs` de la base acepta cualquier
 * cosa; acá se decide qué entra realmente, leyendo qué campos declara el tipo
 * de vehículo elegido.
 *
 * IMPORTANTE: este archivo no sabe nada de autos, motos ni camiones. Trabaja
 * con las definiciones que le llegan del catálogo. Agregar un tipo nuevo no
 * requiere tocar una línea de acá.
 */

export interface SpecsValidationResult {
  ok: boolean;
  /** Ficha ya limpia y con los tipos convertidos, lista para guardar. */
  value: Record<string, SpecValue>;
  /** Mensajes en español, listos para mostrarle al usuario. */
  errors: string[];
}

const MAX_TEXT_LENGTH = 200;

export function validateSpecs(
  fields: VehicleTypeField[],
  rawSpecs: unknown,
): SpecsValidationResult {
  const errors: string[] = [];
  const value: Record<string, SpecValue> = {};

  if (rawSpecs !== undefined && rawSpecs !== null && !isPlainObject(rawSpecs)) {
    return {
      ok: false,
      value: {},
      errors: ['Los datos específicos del vehículo llegaron en un formato inesperado.'],
    };
  }

  const input: Record<string, unknown> = isPlainObject(rawSpecs) ? rawSpecs : {};
  const knownKeys = new Set(fields.map((field) => field.key));

  // Un campo que el tipo de vehículo no declaró no entra. Sin esto, cualquiera
  // podría inflar la ficha con datos arbitrarios.
  for (const key of Object.keys(input)) {
    if (!knownKeys.has(key)) {
      errors.push(`El dato "${key}" no corresponde al tipo de vehículo elegido.`);
    }
  }

  for (const field of fields) {
    const raw = input[field.key];

    if (isEmpty(raw)) {
      if (field.is_required) {
        errors.push(`Falta completar "${field.label}".`);
      }
      continue;
    }

    const parsed = parseField(field, raw);

    if (parsed.error) {
      errors.push(parsed.error);
    } else if (parsed.value !== undefined) {
      value[field.key] = parsed.value;
    }
  }

  return { ok: errors.length === 0, value, errors };
}

interface ParseResult {
  value?: SpecValue;
  error?: string;
}

function parseField(field: VehicleTypeField, raw: unknown): ParseResult {
  switch (field.data_type) {
    case 'text':
      return parseText(field, raw);
    case 'number':
    case 'integer':
      return parseNumber(field, raw);
    case 'boolean':
      return parseBoolean(field, raw);
    case 'select':
      return parseSelect(field, raw);
    default:
      // Solo puede pasar si alguien carga un tipo de dato desconocido en el
      // catálogo. Mejor avisar que guardar algo que después nadie sabe leer.
      return {
        error: `El campo "${field.label}" está mal configurado en el catálogo (tipo de dato desconocido).`,
      };
  }
}

function parseText(field: VehicleTypeField, raw: unknown): ParseResult {
  if (typeof raw !== 'string') {
    return { error: `"${field.label}" tiene que ser un texto.` };
  }

  const text = raw.trim();

  if (text.length > MAX_TEXT_LENGTH) {
    return { error: `"${field.label}" no puede superar los ${MAX_TEXT_LENGTH} caracteres.` };
  }

  return { value: text };
}

function parseNumber(field: VehicleTypeField, raw: unknown): ParseResult {
  // Los formularios del navegador mandan todo como texto, así que se acepta
  // "250" además de 250.
  const parsed = typeof raw === 'number' ? raw : Number(String(raw).trim().replace(',', '.'));

  if (!Number.isFinite(parsed)) {
    return { error: `"${field.label}" tiene que ser un número.` };
  }

  if (field.data_type === 'integer' && !Number.isInteger(parsed)) {
    return { error: `"${field.label}" tiene que ser un número entero, sin decimales.` };
  }

  const unit = field.unit ? ` ${field.unit}` : '';

  if (field.min_value !== null && parsed < field.min_value) {
    return { error: `"${field.label}" no puede ser menor a ${field.min_value}${unit}.` };
  }

  if (field.max_value !== null && parsed > field.max_value) {
    return { error: `"${field.label}" no puede ser mayor a ${field.max_value}${unit}.` };
  }

  return { value: parsed };
}

function parseBoolean(field: VehicleTypeField, raw: unknown): ParseResult {
  if (typeof raw === 'boolean') {
    return { value: raw };
  }

  const text = String(raw).trim().toLowerCase();

  if (text === 'true' || text === 'si' || text === 'sí') {
    return { value: true };
  }
  if (text === 'false' || text === 'no') {
    return { value: false };
  }

  return { error: `"${field.label}" tiene que ser sí o no.` };
}

function parseSelect(field: VehicleTypeField, raw: unknown): ParseResult {
  const options = field.options ?? [];
  const chosen = String(raw).trim();
  const match = options.find((option) => option.value === chosen);

  if (!match) {
    const available = options.map((option) => option.label).join(', ');
    return { error: `"${field.label}" tiene que ser una de estas opciones: ${available}.` };
  }

  return { value: match.value };
}

function isEmpty(raw: unknown): boolean {
  return raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');
}

function isPlainObject(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

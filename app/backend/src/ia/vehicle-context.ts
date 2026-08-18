import { describeSpecs, missingSpecLabels } from '../services/spec-display.js';
import type { SpecValue, VehicleType } from '../types.js';

/**
 * Describe un vehículo en palabras, para que la IA sepa qué está mirando.
 *
 * ESTE ARCHIVO ES LA REGLA DE ORO DEL PROYECTO PUESTA EN PRÁCTICA.
 *
 *   No hay una lista de tipos de vehículo acá adentro. No dice "si es una moto,
 *   mirá la cadena; si es un camión, mirá los ejes". Lo que hace es contarle al
 *   modelo QUÉ TIPO es (con el nombre que declara el catálogo) y QUÉ DATOS pide
 *   ese tipo (con las etiquetas y unidades que declara el catálogo), y dejar
 *   que el modelo razone en consecuencia.
 *
 *   Consecuencia práctica: si mañana alguien carga "motorhome" en la tabla
 *   `vehicle_types` desde el panel de Supabase, con sus campos en
 *   `vehicle_type_fields`, el análisis de un motorhome habla de motorhomes sin
 *   que nadie toque una línea de código ni vuelva a desplegar.
 *
 *   Si alguna vez aparece acá un `if (slug === '...')`, el diseño se rompió.
 */

export interface VehicleForPrompt {
  brand: string;
  model: string;
  year: number;
  price: number;
  currency: 'ARS' | 'USD';
  kilometers: number;
  city: string;
  province: { name: string } | null;
  description: string | null;
  specs: Record<string, SpecValue>;
  photoCount: number;
}

export function describeVehicle(vehicle: VehicleForPrompt, vehicleType: VehicleType): string {
  const filled = describeSpecs(vehicle.specs, vehicleType.fields);
  const missing = missingSpecLabels(vehicle.specs, vehicleType.fields);

  const lines = [
    `Tipo de vehículo: ${vehicleType.name}`,
    `Marca: ${vehicle.brand}`,
    `Modelo: ${vehicle.model}`,
    `Año: ${vehicle.year}`,
    `Kilometraje declarado: ${formatNumber(vehicle.kilometers)} km`,
    `Precio pedido: ${formatMoney(vehicle.price, vehicle.currency)}`,
    `Ubicación: ${vehicle.city}${vehicle.province ? `, ${vehicle.province.name}` : ''}`,
    `Cantidad de fotos publicadas: ${vehicle.photoCount}`,
  ];

  if (filled.length > 0) {
    lines.push(
      '',
      `Ficha específica que el catálogo pide para el tipo "${vehicleType.name}", según la completó el vendedor:`,
      ...filled.map((spec) => `  - ${spec.label}: ${spec.value}`),
    );
  }

  // Los huecos se listan a propósito: que el vendedor no haya declarado un dato
  // que su tipo de vehículo pide es información útil para quien está por
  // comprar, y sale del catálogo igual que los datos completados.
  if (missing.length > 0) {
    lines.push(
      '',
      `Datos que el catálogo pide para el tipo "${vehicleType.name}" y el vendedor NO completó:`,
      ...missing.map((label) => `  - ${label}`),
    );
  }

  lines.push(
    '',
    'Descripción escrita por el vendedor:',
    vehicle.description?.trim()
      ? vehicle.description.trim()
      : '(el vendedor no escribió ninguna descripción)',
  );

  return lines.join('\n');
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-AR').format(value);
}

function formatMoney(value: number, currency: 'ARS' | 'USD'): string {
  const symbol = currency === 'USD' ? 'US$' : '$';
  return `${symbol} ${formatNumber(value)}`;
}

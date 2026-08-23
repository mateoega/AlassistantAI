'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button, Field, NumberInput, inputClass } from '@/components/ui';
import { digitsOnly } from '@/lib/format';
import { SpecFilters } from './SpecFilters';
import type { Province, VehicleType } from '@/lib/types';

/**
 * La barra de búsqueda del muro.
 *
 * No abre otra pantalla: recorta el mismo muro. Se decidió así porque el que
 * entra ya está mirando vehículos, y mandarlo a un buscador aparte lo obliga a
 * empezar de nuevo en una pantalla vacía.
 *
 * Lo que se busca vive en la dirección de la página (`/?q=corolla&tipo=auto`),
 * no acá adentro. Eso hace que entrar a un aviso y volver con el botón "atrás"
 * conserve la búsqueda, y que una búsqueda se pueda pasar por mensaje.
 *
 * Los tipos de vehículo y las provincias se leen del catálogo, como en todo el
 * resto de la aplicación: si mañana se carga un tipo nuevo, aparece acá solo.
 */

export interface SearchValues {
  q: string;
  tipo: string;
  marca: string;
  provincia: string;
  moneda: string;
  precio_min: string;
  precio_max: string;
  anio_min: string;
  anio_max: string;
  km_max: string;
  /**
   * Los filtros de la ficha específica del tipo elegido, tal como viajan en la
   * dirección: `{ f_engine_displacement_cc_min: '250', f_moto_style: 'enduro' }`.
   *
   * Van en una bolsa aparte y no como campos fijos porque no se sabe cuáles
   * son hasta que el catálogo dice qué campos tiene el tipo elegido.
   */
  spec: Record<string, string>;
}

export const EMPTY_SEARCH: SearchValues = {
  q: '',
  tipo: '',
  marca: '',
  provincia: '',
  moneda: '',
  precio_min: '',
  precio_max: '',
  anio_min: '',
  anio_max: '',
  km_max: '',
  spec: {},
};

/** Cuántos filtros finos hay puestos, sin contar el texto de la barra. */
export function countFineFilters(values: SearchValues): number {
  const fijos = Object.entries(values).filter(
    ([key, value]) => key !== 'q' && key !== 'spec' && value !== '',
  ).length;

  const ficha = Object.values(values.spec).filter((value) => value !== '').length;

  return fijos + ficha;
}

export function SearchBar({
  values,
  onSearch,
}: {
  values: SearchValues;
  onSearch: (values: SearchValues) => void;
}) {
  // Lo que está escrito en los campos, que puede diferir de lo que se está
  // mostrando: se busca al enviar, no a cada tecla.
  const [draft, setDraft] = useState<SearchValues>(values);
  const [open, setOpen] = useState(countFineFilters(values) > 0);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);

  // Si la búsqueda cambia desde afuera —el botón "atrás" del navegador, o el
  // botón de limpiar— los campos tienen que reflejarlo.
  useEffect(() => {
    setDraft(values);
  }, [values]);

  useEffect(() => {
    Promise.all([
      api<{ vehicle_types: VehicleType[] }>('/api/catalog/vehicle-types'),
      api<{ provinces: Province[] }>('/api/catalog/provinces'),
    ])
      .then(([types, provincesData]) => {
        setVehicleTypes(types.vehicle_types);
        setProvinces(provincesData.provinces);
      })
      // El catálogo sirve para acotar la búsqueda, no para hacerla: si no
      // carga, la barra de texto tiene que seguir funcionando y sin alarmar.
      .catch(() => undefined);
  }, []);

  function set<K extends keyof SearchValues>(key: K, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  /**
   * Cambiar de tipo de vehículo borra los filtros de la ficha. Son de otro
   * tipo: "cinco puertas" no significa nada si se pasó de autos a motos, y
   * arrastrarlo daría una búsqueda vacía sin motivo visible.
   */
  function setTipo(slug: string) {
    setDraft((current) => ({ ...current, tipo: slug, spec: {} }));
  }

  function setSpec(param: string, value: string) {
    setDraft((current) => ({ ...current, spec: { ...current.spec, [param]: value } }));
  }

  const tipoElegido = vehicleTypes.find((type) => type.slug === draft.tipo);

  const fineCount = countFineFilters(draft);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(draft);
      }}
      className="space-y-4 rounded-xl border border-line bg-surface p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={draft.q}
          onChange={(event) => set('q', event.target.value)}
          placeholder="Buscar por marca o modelo"
          aria-label="Buscar por marca o modelo"
          className={inputClass}
        />
        <div className="flex gap-2">
          <Button type="submit">Buscar</Button>
          <Button variant="quiet" onClick={() => setOpen((current) => !current)}>
            {/* El número deja ver que hay filtros puestos aunque el panel esté
                cerrado: si no, se busca algo que no aparece y no se entiende
                por qué. */}
            Filtros{fineCount > 0 ? ` (${fineCount})` : ''}
          </Button>
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Tipo de vehículo">
            <select
              value={draft.tipo}
              onChange={(event) => setTipo(event.target.value)}
              className={inputClass}
            >
              <option value="">Todos</option>
              {vehicleTypes.map((type) => (
                <option key={type.id} value={type.slug}>
                  {type.name_plural}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Marca">
            <input
              type="text"
              value={draft.marca}
              onChange={(event) => set('marca', event.target.value)}
              placeholder="Cualquiera"
              className={inputClass}
            />
          </Field>

          <Field label="Provincia">
            <select
              value={draft.provincia}
              onChange={(event) => set('provincia', event.target.value)}
              className={inputClass}
            >
              <option value="">Todas</option>
              {provinces.map((province) => (
                <option key={province.id} value={province.slug}>
                  {province.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Moneda"
            hint="El precio se filtra dentro de la moneda elegida: pesos y dólares no se mezclan."
          >
            <select
              value={draft.moneda}
              onChange={(event) => set('moneda', event.target.value)}
              className={inputClass}
            >
              <option value="">Las dos</option>
              <option value="ARS">Pesos</option>
              <option value="USD">Dólares</option>
            </select>
          </Field>

          <Field label="Precio desde">
            <NumberInput
              value={draft.precio_min}
              onChange={(digits) => set('precio_min', digits)}
            />
          </Field>

          <Field label="Precio hasta">
            <NumberInput
              value={draft.precio_max}
              onChange={(digits) => set('precio_max', digits)}
            />
          </Field>

          <Field label="Año desde">
            <input
              type="text"
              inputMode="numeric"
              value={draft.anio_min}
              onChange={(event) => set('anio_min', digitsOnly(event.target.value).slice(0, 4))}
              placeholder="Cualquiera"
              className={inputClass}
            />
          </Field>

          <Field label="Año hasta">
            <input
              type="text"
              inputMode="numeric"
              value={draft.anio_max}
              onChange={(event) => set('anio_max', digitsOnly(event.target.value).slice(0, 4))}
              placeholder="Cualquiera"
              className={inputClass}
            />
          </Field>

          <Field label="Kilómetros hasta">
            <NumberInput
              value={draft.km_max}
              onChange={(digits) => set('km_max', digits)}
              suffix="km"
            />
          </Field>

          {/* Los filtros propios del tipo, dibujados desde el catálogo. Sin
              tipo elegido no aparecen: no se sabría de qué campos hablar. */}
          {tipoElegido && (
            <SpecFilters type={tipoElegido} values={draft.spec} onChange={setSpec} />
          )}

          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit">Aplicar filtros</Button>
            {(fineCount > 0 || draft.q !== '') && (
              <Button variant="quiet" onClick={() => onSearch(EMPTY_SEARCH)}>
                Limpiar
              </Button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}

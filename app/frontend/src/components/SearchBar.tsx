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
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TRES REGLAS QUE SALIERON DE LA PRUEBA EN CELULAR DEL 2026-08-27
 *
 * 1. HAY UN SOLO BOTÓN DE ENVIAR A LA VISTA, SIEMPRE. Antes convivían
 *    "Buscar" arriba y "Aplicar filtros" abajo, los dos hacían exactamente lo
 *    mismo, y con el panel abierto no se entendía cuál correspondía. Ahora
 *    "Buscar" existe solo con el panel cerrado, y con el panel abierto el
 *    único envío es "Aplicar filtros".
 *
 * 2. EL BOTÓN QUE ABRE EL PANEL DICE QUÉ VA A HACER. "Filtros" no decía si
 *    abría, cerraba o buscaba. Dice "Filtros" cuando va a abrir y "Ocultar
 *    filtros" cuando va a cerrar, y el número de filtros puestos sigue a la
 *    vista para no buscar a ciegas.
 *
 * 3. "APLICAR FILTROS" NO SE PERSIGUE SCROLLEANDO. En celular había que
 *    recorrer casi dos pantallas para llegar. El panel tiene su propia altura
 *    máxima y hace scroll adentro: el botón queda siempre abajo, en pantalla.
 *    De tablet para arriba el límite se suelta, que ahí entra todo junto.
 *
 * Y al enviar, el panel se cierra: lo que se pidió ya está en la dirección y
 * lo que sigue son los resultados, no el formulario que los pidió.
 * ─────────────────────────────────────────────────────────────────────────── */

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
        // El panel se cierra al buscar: ya cumplió, y dejarlo abierto empuja
        // los resultados fuera de la pantalla.
        setOpen(false);
        onSearch(draft);
      }}
      className="space-y-3 rounded-2xl border border-line bg-surface p-3 shadow-card sm:space-y-4 sm:p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <input
          type="search"
          value={draft.q}
          onChange={(event) => set('q', event.target.value)}
          placeholder="Buscar por marca o modelo"
          aria-label="Buscar por marca o modelo"
          className={inputClass}
        />
        <div className="flex gap-2">
          {/* Con el panel abierto no aparece: abajo está "Aplicar filtros",
              que hace exactamente lo mismo. Dos botones iguales a la vista era
              la confusión que reportó el cliente. */}
          {!open && (
            <span className="flex-1">
              <Button type="submit" full>
                Buscar
              </Button>
            </span>
          )}
          <Button variant="quiet" onClick={() => setOpen((current) => !current)}>
            {/* El número deja ver que hay filtros puestos aunque el panel esté
                cerrado: si no, se busca algo que no aparece y no se entiende
                por qué. */}
            {open ? 'Ocultar filtros' : 'Filtros'}
            {fineCount > 0 ? ` (${fineCount})` : ''}
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-line pt-3 sm:pt-4">
        <div className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:max-h-none sm:gap-4 sm:overflow-visible sm:pr-0 lg:grid-cols-3">
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

          <Field label="Marca">
            <input
              type="text"
              value={draft.marca}
              onChange={(event) => set('marca', event.target.value)}
              placeholder="Cualquiera"
              className={inputClass}
            />
          </Field>

          <Field label="Moneda" hint="Pesos y dólares no se mezclan.">
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

          {/* DESDE Y HASTA VAN EN UN SOLO CAMPO, uno al lado del otro. Como dos
              campos separados eran cuatro renglones —precio y año— en una
              pantalla donde cada renglón se paga en scroll, y además se leían
              como cuatro filtros sueltos en vez de dos rangos. Es la misma
              forma que ya usan los filtros de la ficha en `SpecFilters`. */}
          <Field label="Precio" wide>
            <div className="flex items-center gap-2">
              <NumberInput
                value={draft.precio_min}
                onChange={(digits) => set('precio_min', digits)}
                placeholder="Desde"
              />
              <NumberInput
                value={draft.precio_max}
                onChange={(digits) => set('precio_max', digits)}
                placeholder="Hasta"
              />
            </div>
          </Field>

          <Field label="Año" wide>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={draft.anio_min}
                onChange={(event) => set('anio_min', digitsOnly(event.target.value).slice(0, 4))}
                placeholder="Desde"
                aria-label="Año desde"
                className={inputClass}
              />
              <input
                type="text"
                inputMode="numeric"
                value={draft.anio_max}
                onChange={(event) => set('anio_max', digitsOnly(event.target.value).slice(0, 4))}
                placeholder="Hasta"
                aria-label="Año hasta"
                className={inputClass}
              />
            </div>
          </Field>

          <Field label="Kilómetros hasta">
            <NumberInput
              value={draft.km_max}
              onChange={(digits) => set('km_max', digits)}
              suffix="km"
              placeholder="Cualquiera"
            />
          </Field>

          {/* Los filtros propios del tipo, dibujados desde el catálogo. Sin
              tipo elegido no aparecen: no se sabría de qué campos hablar. */}
          {tipoElegido && (
            <SpecFilters type={tipoElegido} values={draft.spec} onChange={setSpec} />
          )}
        </div>

          {/* El envío, siempre abajo y siempre en pantalla: lo de arriba hace
              scroll adentro de su propia caja y esto no se mueve. */}
          <div className="flex items-center gap-2 border-t border-line pt-3">
            <span className="flex-1 sm:flex-none">
              <Button type="submit" full>
                Aplicar filtros
              </Button>
            </span>
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

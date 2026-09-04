'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { api } from '@/lib/api';
import { Button, Field, NumberInput, inputClass } from '@/components/ui';
import { digitsOnly, groupThousands } from '@/lib/format';
import { useAltoBarraSuperior } from '@/lib/useAltoBarraSuperior';
import { SpecFilters } from './SpecFilters';
import type { Province, VehicleType, VehicleTypeField } from '@/lib/types';

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
 * LA BARRA YA NO ESTÁ ADENTRO DE UNA TARJETA (2026-09-04)
 *
 * Antes todo esto —campo, botón y panel— vivía en un rectángulo blanco con
 * borde y sombra, apoyado sobre una página que también es blanca. Esa caja no
 * separaba nada: dibujaba un marco alrededor de algo que no lo necesita y
 * empujaba las fotos hacia abajo. Ahora son tres piezas sueltas sobre la
 * página, en este orden:
 *
 *   1. EL CAMPO Y LA LUPA. Una píldora y, al lado, un botón azul redondo. La
 *      lupa reemplaza al "Buscar" grande, que gastaba un renglón entero de
 *      celular para decir lo que un ícono dice en 48 píxeles.
 *   2. LOS FILTROS PUESTOS, en fichas. Cada una nombra un filtro activo y se
 *      saca tocándola. Antes eso solo se sabía abriendo el panel, o dándole
 *      sentido al número que iba al lado de la palabra "Filtros".
 *   3. EL PANEL, cerrado por omisión, y con forma de tarjeta cuando se abre:
 *      es lo único de acá que sí es una pieza aparte, porque se despliega por
 *      encima del listado y necesita decir dónde termina.
 *
 * LA BARRA SE DESPEGA AL BAJAR (2026-09-04). Cuando el listado empieza a
 * taparla, la píldora se suelta y queda flotando debajo de la barra de arriba,
 * de vidrio esmerilado, con las fotos pasando por detrás. Lo que se despega es
 * SOLO la píldora: ni el fondo de la página, ni las fichas, ni el botón azul de
 * afuera —la lupa se le mete adentro—, así que sobre el listado queda una sola
 * forma y no un bloque. Ver `useFlotando` para el cómo y el porqué.
 *
 * LA PÍLDORA ES LA ÚNICA DE LA APLICACIÓN, y es a propósito: los campos de los
 * formularios siguen siendo rectángulos de 12px. Este no es un campo de
 * formulario sino un buscador, la misma forma que ya tienen las fichas de
 * abajo, el corazón de guardar y el botón del asistente.
 *
 * LA LUPA NO SE ESCONDE CON EL PANEL ABIERTO, y eso corrige la regla anterior
 * ("un solo botón de enviar a la vista"). Esa regla salió de dos botones
 * grandes con texto —"Buscar" y "Aplicar filtros"— que se leían como dos
 * acciones distintas. Un ícono pegado al campo no compite con eso: se lee como
 * parte del campo, y hacerlo aparecer y desaparecer movería la barra justo
 * cuando la persona está tocando otra cosa.
 *
 * Lo que sigue en pie de la prueba en celular del 2026-08-27:
 *
 *   - El panel tiene su propia altura máxima y hace scroll adentro, así que
 *     "Aplicar filtros" queda siempre abajo y en pantalla. En celular había
 *     que recorrer casi dos pantallas para llegar.
 *   - Al enviar, el panel se cierra: lo que se pidió ya está en la dirección y
 *     lo que sigue son los resultados, no el formulario que los pidió.
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

  /**
   * El panel arranca cerrado SIEMPRE, incluso llegando a una dirección con
   * filtros puestos. Antes se abría solo en ese caso, para que se viera qué
   * había filtrado; eso ahora lo dicen las fichas, que ocupan un renglón en
   * vez de media pantalla.
   */
  const [open, setOpen] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);

  // Si la búsqueda cambia desde afuera —el botón "atrás" del navegador, una
  // ficha que se saca, el botón de limpiar— los campos tienen que reflejarlo.
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

  /**
   * Las fichas describen LO QUE SE ESTÁ MOSTRANDO (`values`), no lo que hay
   * tipeado en el panel (`draft`). Una ficha es una afirmación sobre los
   * resultados que están en pantalla; si saliera del borrador anunciaría un
   * filtro que todavía no se aplicó.
   */
  const applied = useMemo(
    () => describeFilters(values, vehicleTypes, provinces),
    [values, vehicleTypes, provinces],
  );

  const marcaRef = useRef<HTMLDivElement>(null);
  const altoBarraSuperior = useAltoBarraSuperior();
  const paradaEn = altoBarraSuperior + AIRE_AL_DESPEGARSE;
  const flotando = useFlotando(marcaRef, paradaEn);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        // El panel se cierra al buscar: ya cumplió, y dejarlo abierto empuja
        // los resultados fuera de la pantalla.
        setOpen(false);
        onSearch(draft);
      }}
      className="space-y-3"
    >
      {/* LA CAJA QUE GUARDA EL LUGAR.

          Mide exactamente lo que mide la barra (48px, `h-12`) y no se mueve
          nunca. Cuando la barra se despega y pasa a `fixed`, sale del flujo:
          sin esta caja, todo lo de abajo saltaría 48px hacia arriba justo en el
          momento del cambio. También es la que mira el observador para saber
          cuándo despegarla. */}
      <div ref={marcaRef} className="h-12">
        <div
          className={flotando ? 'fixed inset-x-0 z-30' : ''}
          style={flotando ? { top: paradaEn } : undefined}
        >
          {/* Repite la caja del `<main>` —`mx-auto max-w-7xl px-4`— para que la
              barra flotante quede exactamente donde estaba y no se corra un
              píxel al despegarse. */}
          <div className={flotando ? 'mx-auto max-w-7xl px-4' : ''}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="search"
                  value={draft.q}
                  onChange={(event) => set('q', event.target.value)}
                  placeholder="Buscar por marca o modelo"
                  aria-label="Buscar por marca o modelo"
                  className={[
                    'h-12 w-full min-w-0 rounded-full border border-line px-5 text-sm text-ink',
                    'outline-none transition-all duration-200 placeholder:text-muted/70',
                    'focus:border-brand focus:ring-2 focus:ring-brand/25',
                    // Despegada es vidrio esmerilado y flota; apoyada es una
                    // pieza más de la página.
                    flotando ? 'glass pr-14 shadow-float' : 'bg-surface shadow-soft',
                  ].join(' ')}
                />

                {/* Despegada, la lupa se mete ADENTRO de la píldora y pierde el
                    círculo azul. El botón de afuera es una segunda pieza
                    flotando sobre las fotos; adentro, lo que queda sobre el
                    listado es una sola forma —la píldora— que es justo lo que
                    se pidió. Sin ícono no se puede: en un teclado de celular la
                    tecla de buscar no siempre está a la vista. */}
                {flotando && (
                  <button
                    type="submit"
                    aria-label="Buscar"
                    className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-brand-deep transition-transform duration-150 active:scale-90"
                  >
                    <SearchIcon />
                  </button>
                )}
              </div>

              {/* Apoyada, el botón de buscar va afuera y es el círculo azul.
                  Lleva `shadow-float` —la sombra azul fuerte, la misma del
                  botón del asistente— porque es lo que lo despega: un círculo
                  azul sobre una página blanca, sin sombra, queda pegado al
                  papel. */}
              {!flotando && (
                <button
                  type="submit"
                  aria-label="Buscar"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-deep text-white shadow-float transition-all duration-150 hover:bg-brand-deep/90 active:scale-95"
                >
                  <SearchIcon />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LA LÍNEA DE FICHAS. Nunca queda vacía: aunque no haya ningún filtro
          puesto, está la que abre el panel, y así el espacio debajo de la barra
          significa siempre lo mismo y el listado no salta de lugar. */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className={chipClass(false)}
        >
          <SlidersIcon />
          {/* SIN EL NÚMERO DE FILTROS PUESTOS que llevaba antes. Existía para
              que no se buscara a ciegas con el panel cerrado; ahora cada filtro
              tiene su ficha al lado, que dice bastante más que un número. Y
              nunca coincidían: un precio "desde y hasta" son dos filtros y una
              sola ficha, así que decía (6) al lado de cinco fichas. */}
          {open ? 'Ocultar filtros' : 'Filtros'}
        </button>

        {applied.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => onSearch(filter.next)}
            // Qué hace no lo dice la cruz sola: es chica, y quien navega con
            // lector de pantalla no la ve.
            aria-label={`Quitar el filtro ${filter.label}`}
            className={chipClass(true)}
          >
            {filter.label}
            <CloseIcon />
          </button>
        ))}

        {(applied.length > 0 || values.q !== '') && (
          <button
            type="button"
            onClick={() => onSearch(EMPTY_SEARCH)}
            className="px-1 text-xs font-medium text-brand-deep underline underline-offset-2"
          >
            Limpiar
          </button>
        )}
      </div>

      {open && (
        /* El panel SÍ es una tarjeta: se despliega por encima del listado y
           necesita un borde que diga dónde termina el formulario y dónde
           vuelven a empezar los vehículos. */
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-3 shadow-card sm:p-4">
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

            {/* DESDE Y HASTA VAN EN UN SOLO CAMPO, uno al lado del otro. Como
                dos campos separados eran cuatro renglones —precio y año— en una
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

/**
 * Los ocho píxeles que quedan entre la barra de arriba y la barra de búsqueda
 * despegada.
 *
 * No es margen decorativo: pegadas una a la otra son dos franjas de vidrio
 * apiladas y se leen como una sola barra doble. Con el aire en el medio se ven
 * pasar las fotos por atrás, y ahí se entiende que la píldora está flotando
 * sobre el listado. Es el mismo número que dice DÓNDE se despega, para que
 * aparezca exactamente donde estaba y el cambio no se vea.
 */
const AIRE_AL_DESPEGARSE = 8;

/**
 * Si la barra de búsqueda ya se fue de su lugar y tiene que quedar flotando.
 *
 * NO ES UN `scroll` A MANO ni un `position: sticky`.
 *
 * Un manejador de `scroll` corre decenas de veces por segundo y compara
 * posiciones; acá lo hace el navegador y avisa solo cuando cambia el estado.
 *
 * Y `sticky` no servía: una pieza pegajosa se despega apenas termina la caja de
 * su padre, y el padre de la barra es el formulario, que mide lo que miden la
 * barra y las fichas. La barra se habría vuelto a ir de la pantalla a los 100px
 * de scroll. Con `fixed` no hay padre que la limite, y esta caja —la que le
 * guarda el lugar— es la que dice cuándo empezar.
 *
 * `rootMargin` corre el borde de arriba de la pantalla hasta abajo de la barra
 * superior: lo que importa no es si la caja se ve, sino si se ve POR DEBAJO de
 * esa barra, que es fija y tapa lo que pasa atrás.
 *
 * Se mira `intersectionRatio < 1` y no `isIntersecting`: la barra se despega
 * cuando se empieza a esconder, no cuando terminó de esconderse. Así aparece
 * flotando exactamente donde estaba y el cambio no se ve.
 */
function useFlotando(marca: RefObject<HTMLDivElement | null>, paradaEn: number): boolean {
  const [flotando, setFlotando] = useState(false);

  useEffect(() => {
    const caja = marca.current;
    if (!caja || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observador = new IntersectionObserver(
      ([entrada]) => setFlotando(entrada !== undefined && entrada.intersectionRatio < 1),
      { rootMargin: `-${paradaEn}px 0px 0px 0px`, threshold: [0, 1] },
    );

    observador.observe(caja);
    return () => observador.disconnect();
  }, [marca, paradaEn]);

  return flotando;
}

/**
 * La forma de las fichas, escrita una sola vez.
 *
 * `activa` es la que representa un filtro puesto: se pinta con el azul suave
 * de la marca, para que se lea como algo aplicado y no como algo por elegir.
 * La apagada —borde y sombra— es la que abre el panel. Es la misma píldora que
 * usan las sugerencias del asistente.
 */
function chipClass(activa: boolean): string {
  return [
    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium',
    'transition-all duration-150 active:scale-[0.97]',
    activa
      ? 'border border-transparent bg-brand-soft text-brand-deep hover:bg-brand-soft/70'
      : 'border border-line bg-surface text-body shadow-soft hover:border-brand',
  ].join(' ');
}

/** Un filtro puesto, listo para mostrarse como ficha. */
interface AppliedFilter {
  id: string;
  /** Cómo se nombra: "Motos", "Córdoba", "Precio 2.000.000–5.000.000". */
  label: string;
  /** La búsqueda que queda al sacarlo. */
  next: SearchValues;
}

/**
 * Traduce la búsqueda a fichas legibles.
 *
 * Lee el catálogo para poder decir "Motos" y no `moto`, "Córdoba" y no
 * `cordoba`, "Enduro" y no `enduro`. Si el catálogo todavía no llegó, cae en el
 * valor crudo: una ficha con un slug adentro es fea, pero es mucho mejor que un
 * listado filtrado sin nada que lo diga.
 */
function describeFilters(
  values: SearchValues,
  vehicleTypes: VehicleType[],
  provinces: Province[],
): AppliedFilter[] {
  const chips: AppliedFilter[] = [];
  const sin = (patch: Partial<SearchValues>): SearchValues => ({ ...values, ...patch });

  if (values.tipo !== '') {
    const type = vehicleTypes.find((item) => item.slug === values.tipo);
    chips.push({
      id: 'tipo',
      label: type?.name_plural ?? values.tipo,
      // Sacar el tipo se lleva los filtros de su ficha, por lo mismo que
      // cambiarlo: no significan nada fuera de ese tipo.
      next: { ...values, tipo: '', spec: {} },
    });
  }

  if (values.marca !== '') {
    chips.push({ id: 'marca', label: values.marca, next: sin({ marca: '' }) });
  }

  if (values.provincia !== '') {
    const province = provinces.find((item) => item.slug === values.provincia);
    chips.push({
      id: 'provincia',
      label: province?.name ?? values.provincia,
      next: sin({ provincia: '' }),
    });
  }

  if (values.moneda !== '') {
    chips.push({
      id: 'moneda',
      label: values.moneda === 'USD' ? 'Dólares' : 'Pesos',
      next: sin({ moneda: '' }),
    });
  }

  const precio = rangeLabel(
    'Precio',
    groupThousands(values.precio_min),
    groupThousands(values.precio_max),
  );
  if (precio) {
    chips.push({ id: 'precio', label: precio, next: sin({ precio_min: '', precio_max: '' }) });
  }

  const anio = rangeLabel('Año', values.anio_min, values.anio_max);
  if (anio) {
    chips.push({ id: 'anio', label: anio, next: sin({ anio_min: '', anio_max: '' }) });
  }

  if (values.km_max !== '') {
    chips.push({
      id: 'km',
      label: `Hasta ${groupThousands(values.km_max)} km`,
      next: sin({ km_max: '' }),
    });
  }

  chips.push(...describeSpec(values, vehicleTypes));

  return chips;
}

/**
 * Las fichas de los filtros propios del tipo de vehículo.
 *
 * El desde y el hasta de un mismo campo son UNA ficha —"Cilindrada 250–600
 * cc"—, igual que el precio y el año: son un rango, y partirlo en dos fichas
 * que se sacan por separado deja media búsqueda puesta sin que se note.
 *
 * Como en todo el resto de la aplicación, acá no hay ninguna lista de campos
 * escrita a mano: los nombres, las unidades y las opciones salen del catálogo.
 */
function describeSpec(values: SearchValues, vehicleTypes: VehicleType[]): AppliedFilter[] {
  const fields = vehicleTypes.find((item) => item.slug === values.tipo)?.fields ?? [];
  const chips: AppliedFilter[] = [];
  const ya = new Set<string>();

  const sinSpec = (...params: string[]): SearchValues => ({
    ...values,
    spec: Object.fromEntries(Object.entries(values.spec).filter(([key]) => !params.includes(key))),
  });

  for (const [param, value] of Object.entries(values.spec)) {
    if (value === '' || ya.has(param)) {
      continue;
    }

    const field = fields.find(
      (item) =>
        param === `f_${item.key}` ||
        param === `f_${item.key}_min` ||
        param === `f_${item.key}_max`,
    );

    // Sin catálogo no hay etiqueta posible: se muestra el valor tal cual.
    if (!field) {
      ya.add(param);
      chips.push({ id: param, label: value, next: sinSpec(param) });
      continue;
    }

    const min = values.spec[`f_${field.key}_min`] ?? '';
    const max = values.spec[`f_${field.key}_max`] ?? '';

    if (min !== '' || max !== '') {
      ya.add(`f_${field.key}_min`);
      ya.add(`f_${field.key}_max`);

      const unidad = field.unit ? ` ${field.unit}` : '';
      const label = rangeLabel(
        field.label,
        min === '' ? '' : `${min}${unidad}`,
        max === '' ? '' : `${max}${unidad}`,
      );

      if (label) {
        chips.push({
          id: field.key,
          label,
          next: sinSpec(`f_${field.key}_min`, `f_${field.key}_max`),
        });
      }
      continue;
    }

    ya.add(param);
    chips.push({
      id: field.key,
      label: `${field.label}: ${specValueLabel(field, value)}`,
      next: sinSpec(param),
    });
  }

  return chips;
}

/** "Sí"/"No" para los de casillero, y la etiqueta del catálogo para las listas. */
function specValueLabel(field: VehicleTypeField, value: string): string {
  if (field.data_type === 'boolean') {
    return value === 'true' ? 'Sí' : 'No';
  }

  return field.options?.find((option) => option.value === value)?.label ?? value;
}

/** "Precio 2.000.000–5.000.000", "Año desde 2015", "Año hasta 2020". */
function rangeLabel(name: string, min: string, max: string): string | null {
  if (min !== '' && max !== '') {
    return `${name} ${min}–${max}`;
  }
  if (min !== '') {
    return `${name} desde ${min}`;
  }
  if (max !== '') {
    return `${name} hasta ${max}`;
  }
  return null;
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function SearchIcon() {
  return (
    <svg {...iconProps} width={20} height={20} strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg {...iconProps} width={14} height={14}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

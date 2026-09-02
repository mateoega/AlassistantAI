'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { SuggestInput } from './SuggestInput';
import { DynamicField } from './DynamicField';
import { PhotoUploader, type UploadedPhoto } from './PhotoUploader';
import { Button, Card, Field, NumberInput, Notice, Spinner, inputClass } from './ui';
import type { Brand, City, Listing, ListingStatus, Province, VehicleType } from '@/lib/types';

/**
 * El formulario de una publicación, compartido por las pantallas de crear y de
 * editar. Es el mismo formulario: cambia a dónde se envía y con qué arranca.
 *
 * Nada acá sabe qué es un auto, una moto o un camión. El selector de tipo se
 * llena con el catálogo y los campos propios de cada tipo se dibujan solos.
 */
export function ListingForm({
  mode,
  listingId,
  userId,
  initial,
}: {
  mode: 'create' | 'edit';
  listingId: string;
  userId: string;
  /** En modo edición, la publicación que se está modificando. */
  initial?: Listing;
}) {
  const router = useRouter();

  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [photos, setPhotos] = useState<UploadedPhoto[]>(
    initial ? initial.photos.map((photo) => ({ path: photo.storage_path, url: photo.url })) : [],
  );

  const [vehicleTypeId, setVehicleTypeId] = useState(initial?.vehicle_type?.id ?? '');
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [year, setYear] = useState(initial ? String(initial.year) : '');
  const [price, setPrice] = useState(initial ? String(Math.round(initial.price)) : '');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>(initial?.currency ?? 'ARS');
  const [kilometers, setKilometers] = useState(
    initial ? String(Math.round(initial.kilometers)) : '',
  );
  const [provinceId, setProvinceId] = useState(initial?.province?.id ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [specs, setSpecs] = useState<Record<string, string | boolean>>(() =>
    initial ? toFormSpecs(initial.specs) : {},
  );
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);

  const currentYear = new Date().getFullYear();
  const selectedType = useMemo(
    () => vehicleTypes.find((type) => type.id === vehicleTypeId) ?? null,
    [vehicleTypes, vehicleTypeId],
  );

  // Las marcas que corresponden al tipo elegido. Al publicar una moto no tiene
  // sentido ofrecer Scania, ni Zanella al publicar un camión.
  const brandNames = useMemo(
    () =>
      vehicleTypeId
        ? brands
            .filter((brand) => brand.vehicle_type_ids.includes(vehicleTypeId))
            .map((brand) => brand.name)
        : [],
    [brands, vehicleTypeId],
  );

  const cityNames = useMemo(
    () =>
      provinceId
        ? cities.filter((city) => city.province_id === provinceId).map((city) => city.name)
        : [],
    [cities, provinceId],
  );

  useEffect(() => {
    Promise.all([
      api<{ vehicle_types: VehicleType[] }>('/api/catalog/vehicle-types'),
      api<{ provinces: Province[] }>('/api/catalog/provinces'),
      api<{ cities: City[] }>('/api/catalog/cities'),
      api<{ brands: Brand[] }>('/api/catalog/brands'),
    ])
      .then(([types, provincesData, citiesData, brandsData]) => {
        setVehicleTypes(types.vehicle_types);
        setProvinces(provincesData.provinces);
        setCities(citiesData.cities);
        setBrands(brandsData.brands);
      })
      .catch((error: unknown) => {
        setProblem({
          title:
            error instanceof ApiError
              ? error.message
              : 'No se pudo cargar el catálogo de tipos de vehículo.',
          items: [],
        });
      })
      .finally(() => setCatalogLoading(false));
  }, []);

  function changeVehicleType(nextId: string) {
    setVehicleTypeId(nextId);
    setSpecs({}); // Los campos del tipo anterior ya no aplican.
    setDetailsOpen(false);
  }

  async function save(status: ListingStatus) {
    // Se avisa acá además de en el servidor para no hacerle perder el viaje a
    // quien ya completó todo el formulario.
    if (status === 'published' && photos.length === 0) {
      setProblem({
        title: 'Falta al menos una foto.',
        items: [
          'Un comprador no puede evaluar un vehículo que no ve. Agregá una foto, o guardalo como borrador y seguí después.',
        ],
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setProblem(null);

    const body = {
      id: listingId,
      vehicle_type_id: vehicleTypeId,
      brand,
      model,
      year,
      price,
      currency,
      kilometers,
      province_id: provinceId,
      city,
      description,
      specs,
      photos: photos.map((photo) => photo.path),
      status,
    };

    try {
      const { listing } = await api<{ listing: Listing }>(
        mode === 'create' ? '/api/listings' : `/api/listings/${listingId}`,
        { method: mode === 'create' ? 'POST' : 'PUT', body },
      );

      router.push(`/vehiculo/${listing.id}`);
    } catch (error) {
      setProblem({
        title: error instanceof ApiError ? error.message : 'No se pudo guardar la publicación.',
        items: error instanceof ApiError ? error.details : [],
      });
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  if (catalogLoading) {
    return <Spinner />;
  }

  // Al editar, guardar NO cambia el estado de la publicación: un borrador
  // sigue siendo borrador y una publicada sigue publicada. Publicar es una
  // acción aparte y explícita, para que nadie muestre algo sin querer.
  const isDraft = mode === 'edit' && initial?.status === 'draft';
  const statusOnSubmit: ListingStatus =
    mode === 'create' ? 'published' : (initial?.status ?? 'draft');

  return (
    <>
      {problem && <Notice tone="alert" title={problem.title} items={problem.items} />}

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void save(statusOnSubmit);
        }}
      >
        {/* ---- 1. Fotos: lo primero, porque es lo que más vende ------------ */}
        <Card className="space-y-3 p-4 sm:p-5">
          <div>
            <h2 className="font-semibold text-ink">
              Fotos <span className="text-brand-deep">*</span>
            </h2>
            <p className="text-xs text-muted">
              Es lo primero que mira un comprador. Hace falta al menos una para publicar.
            </p>
          </div>

          <PhotoUploader
            userId={userId}
            listingId={listingId}
            photos={photos}
            onChange={setPhotos}
          />
        </Card>

        {/* ---- 2. Lo mínimo indispensable ---------------------------------- */}
        <Card className="space-y-4 p-4 sm:p-5">
          <h2 className="font-semibold text-ink">Datos del vehículo</h2>

          <Field label="Tipo de vehículo" required>
            <select
              className={inputClass}
              value={vehicleTypeId}
              onChange={(event) => changeVehicleType(event.target.value)}
              required
            >
              <option value="">Elegir…</option>
              {vehicleTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <SuggestInput
              label="Marca"
              required
              value={brand}
              onChange={setBrand}
              suggestions={brandNames}
              disabled={!vehicleTypeId}
              placeholder="Ej: Honda"
              hint={
                vehicleTypeId
                  ? 'Elegí de la lista, o escribila si no aparece.'
                  : 'Elegí primero el tipo de vehículo.'
              }
            />

            <Field label="Modelo" required>
              <input
                className={inputClass}
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="Ej: Tornado"
                required
              />
            </Field>

            <Field label="Año" required>
              <select
                className={inputClass}
                value={year}
                onChange={(event) => setYear(event.target.value)}
                required
              >
                <option value="">Elegir…</option>
                {Array.from(
                  { length: currentYear + 1 - 1970 + 1 },
                  (_, index) => currentYear + 1 - index,
                ).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Kilometraje" required>
              <NumberInput
                value={kilometers}
                onChange={setKilometers}
                placeholder="0"
                suffix="km"
                required
              />
            </Field>

            <Field label="Precio" required>
              <NumberInput
                value={price}
                onChange={setPrice}
                placeholder="0"
                prefix={currency === 'USD' ? 'US$' : '$'}
                required
              />
            </Field>

            <Field label="Moneda" required>
              <select
                className={inputClass}
                value={currency}
                onChange={(event) => setCurrency(event.target.value as 'ARS' | 'USD')}
              >
                <option value="ARS">Pesos (ARS)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </Field>

            <Field label="Provincia" required>
              <select
                className={inputClass}
                value={provinceId}
                onChange={(event) => {
                  setProvinceId(event.target.value);
                  setCity('');
                }}
                required
              >
                <option value="">Elegir…</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
            </Field>

            <SuggestInput
              label="Ciudad"
              required
              value={city}
              onChange={setCity}
              suggestions={cityNames}
              disabled={!provinceId}
              hint={
                provinceId
                  ? 'Escribí y elegí de la lista, o poné tu localidad si no aparece.'
                  : 'Elegí primero la provincia.'
              }
            />
          </div>

          <Field label="Descripción" hint="Opcional. Contá el estado, el mantenimiento, extras.">
            <textarea
              className={`${inputClass} min-h-28 resize-y`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
            />
          </Field>
        </Card>

        {/* ---- 3. Los campos propios del tipo, plegados y opcionales ------- */}
        {selectedType && selectedType.fields.length > 0 && (
          <Card className="overflow-hidden">
            <button
              type="button"
              onClick={() => setDetailsOpen((open) => !open)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-mist"
            >
              <span>
                <span className="font-semibold text-ink">Más detalles</span>
                <span className="ml-2 text-sm text-muted">(opcional)</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {selectedType.fields.length} datos propios de {selectedType.name.toLowerCase()}.
                  Sumarlos genera más confianza.
                </span>
              </span>
              <span className="ml-4 shrink-0 text-sm text-brand-deep">
                {detailsOpen ? 'Ocultar' : 'Mostrar'}
              </span>
            </button>

            {detailsOpen && (
              <div className="grid gap-4 border-t border-line p-5 sm:grid-cols-2">
                {selectedType.fields.map((field) => (
                  <DynamicField
                    key={field.id}
                    field={field}
                    value={specs[field.key]}
                    onChange={(value) => setSpecs((current) => ({ ...current, [field.key]: value }))}
                  />
                ))}
              </div>
            )}
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Publicar'}
          </Button>

          {mode === 'create' && (
            <Button variant="quiet" disabled={saving} onClick={() => void save('draft')}>
              Guardar como borrador
            </Button>
          )}

          {isDraft && (
            <Button variant="secondary" disabled={saving} onClick={() => void save('published')}>
              Guardar y publicar
            </Button>
          )}

          {mode === 'edit' && (
            <Button variant="quiet" disabled={saving} onClick={() => router.back()}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </>
  );
}

/**
 * La ficha guardada trae números y booleanos; el formulario trabaja con texto
 * (es lo que devuelven los campos del navegador) salvo los sí/no.
 */
function toFormSpecs(
  specs: Record<string, string | number | boolean>,
): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};

  for (const [key, value] of Object.entries(specs)) {
    result[key] = typeof value === 'boolean' ? value : String(value);
  }

  return result;
}

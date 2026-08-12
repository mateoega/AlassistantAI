-- ============================================================================
-- 003 — Publicaciones de vehículos y sus fotos
--
-- Acá está el corazón del diseño flexible:
--
--   * Los datos que TODO vehículo tiene (marca, modelo, año, precio, uso,
--     ubicación) son columnas normales. Rápidas de buscar, ordenar y filtrar,
--     y con validación de la base garantizada.
--
--   * Los datos que dependen del tipo (cilindrada en una moto, ejes en un
--     camión, asientos en un bus) van en la columna `specs`, una ficha
--     flexible. Cada publicación guarda solo lo que le corresponde.
--
--   * Qué campos van en esa ficha lo define el catálogo `vehicle_type_fields`,
--     y el backend valida contra él antes de guardar.
-- ============================================================================

create table public.listings (
  id              uuid primary key default gen_random_uuid(),

  -- Quién publica. Apunta a `profiles` (que a su vez apunta al usuario de
  -- Supabase Auth). Se enlaza así, y no directo al usuario, para que al pedir
  -- una publicación se puedan traer de una sola vez los datos del vendedor.
  seller_id       uuid not null references public.profiles(id) on delete cascade,

  -- Qué tipo de vehículo es. `on delete restrict` protege las publicaciones
  -- existentes: un tipo con publicaciones no se puede borrar, se desactiva.
  vehicle_type_id uuid not null references public.vehicle_types(id) on delete restrict,

  -- --- Campos comunes a cualquier vehículo motorizado -----------------------
  brand           text    not null check (length(trim(brand)) > 0),
  model           text    not null check (length(trim(model)) > 0),
  year            integer not null check (year between 1900 and 2100),

  price           numeric(14, 2) not null check (price >= 0),
  currency        text           not null check (currency in ('ARS', 'USD')),

  -- Kilometraje u horas de uso, según el tipo de vehículo.
  usage_amount    numeric(12, 2) not null check (usage_amount >= 0),
  usage_unit      text           not null check (usage_unit in ('km', 'hours')),

  province_id     uuid not null references public.provinces(id) on delete restrict,
  city            text not null check (length(trim(city)) > 0),

  description     text,

  -- --- La ficha flexible ----------------------------------------------------
  -- Ejemplo en una moto:   {"engine_displacement_cc": 250, "moto_style": "enduro"}
  -- Ejemplo en un camión:  {"payload_kg": 8000, "axles": 3, "body_type": "furgon"}
  specs           jsonb not null default '{}'::jsonb
                  check (jsonb_typeof(specs) = 'object'),

  -- --- Estado ---------------------------------------------------------------
  status          text not null default 'draft' check (status in ('draft', 'published')),
  published_at    timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Una publicación publicada siempre tiene fecha de publicación.
  constraint listings_published_has_date
    check (status <> 'published' or published_at is not null)
);

comment on column public.listings.specs is
  'Ficha flexible con los campos específicos del tipo de vehículo. Su estructura la define vehicle_type_fields y el backend la valida antes de guardar.';

create index listings_seller_idx       on public.listings (seller_id, created_at desc);
create index listings_public_idx       on public.listings (published_at desc) where status = 'published';
create index listings_vehicle_type_idx on public.listings (vehicle_type_id);
-- Índice GIN: permite buscar dentro de la ficha flexible sin recorrer todo
-- (lo va a necesitar el filtrado por campos específicos del Sprint 4).
create index listings_specs_idx        on public.listings using gin (specs);

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- listing_photos — las fotos de cada publicación
--
-- El archivo en sí vive en Supabase Storage. Acá se guarda su ruta y el orden.
-- La foto con sort_order = 0 es la principal (la que se ve en el listado).
-- ----------------------------------------------------------------------------
create table public.listing_photos (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  storage_path text not null unique,
  sort_order   integer not null default 0 check (sort_order >= 0),
  created_at   timestamptz not null default now()
);

create index listing_photos_listing_idx on public.listing_photos (listing_id, sort_order);


-- ============================================================================
-- Reglas de acceso (RLS)
--
-- Publicada  → la ve cualquier usuario logueado.
-- Borrador   → la ve solo su dueño.
-- Crear, editar y borrar → solo el dueño, y no puede publicar a nombre de otro.
-- ============================================================================

alter table public.listings       enable row level security;
alter table public.listing_photos enable row level security;

create policy "Las publicaciones publicadas se ven; los borradores, solo su dueño"
  on public.listings for select
  to authenticated
  using (status = 'published' or seller_id = auth.uid());

create policy "Cada usuario publica a su propio nombre"
  on public.listings for insert
  to authenticated
  with check (seller_id = auth.uid());

create policy "Cada usuario edita sus propias publicaciones"
  on public.listings for update
  to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

create policy "Cada usuario borra sus propias publicaciones"
  on public.listings for delete
  to authenticated
  using (seller_id = auth.uid());


-- Las fotos heredan el permiso de su publicación.
create policy "Las fotos siguen la visibilidad de su publicación"
  on public.listing_photos for select
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'published' or l.seller_id = auth.uid())
    )
  );

create policy "Solo el dueño agrega fotos a su publicación"
  on public.listing_photos for insert
  to authenticated
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

create policy "Solo el dueño reordena las fotos de su publicación"
  on public.listing_photos for update
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

create policy "Solo el dueño borra las fotos de su publicación"
  on public.listing_photos for delete
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

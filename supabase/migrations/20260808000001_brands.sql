-- ============================================================================
-- 006 — Catálogo de marcas por tipo de vehículo
--
-- El problema que resuelve: hoy la marca se escribe libre, así que la misma
-- marca termina cargada como "Volkswagen", "VW" y "volkswagen". Para la base
-- son tres marcas distintas, y los filtros del Sprint 4 encontrarían un tercio
-- de los vehículos que existen.
--
-- IMPORTANTE: igual que con las ciudades, la marca se sigue guardando como
-- TEXTO LIBRE en `listings.brand`, no como referencia a esta tabla. El
-- catálogo sugiere mientras se escribe; no obliga. Si alguien publica una
-- marca que no está en la lista, tiene que poder hacerlo.
-- ============================================================================

create table public.brands (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  created_at timestamptz not null default now(),

  constraint brands_slug_format check (slug ~ '^[a-z][a-z0-9_]*$')
);

comment on table public.brands is
  'Marcas sugeridas al cargar una publicación. Lista parcial y ampliable; la marca se guarda como texto libre.';


-- ----------------------------------------------------------------------------
-- Qué marcas corresponden a qué tipo de vehículo
--
-- Es una relación de muchos a muchos porque una misma marca fabrica varios
-- tipos: Honda hace autos y motos, Mercedes-Benz hace autos, camiones y buses.
-- Sin esta tabla, al publicar una moto aparecerían marcas de camiones.
-- ----------------------------------------------------------------------------
create table public.brand_vehicle_types (
  brand_id        uuid not null references public.brands(id) on delete cascade,
  vehicle_type_id uuid not null references public.vehicle_types(id) on delete cascade,

  primary key (brand_id, vehicle_type_id)
);

create index brand_vehicle_types_type_idx on public.brand_vehicle_types (vehicle_type_id);


-- ============================================================================
-- Reglas de acceso (RLS)
--
-- Como el resto de los catálogos: cualquiera los puede leer, nadie los edita
-- desde la app. Se amplían desde el panel de Supabase.
-- ============================================================================

alter table public.brands              enable row level security;
alter table public.brand_vehicle_types enable row level security;

create policy "Las marcas son públicas para lectura"
  on public.brands for select
  using (true);

create policy "La relación marca-tipo es pública para lectura"
  on public.brand_vehicle_types for select
  using (true);

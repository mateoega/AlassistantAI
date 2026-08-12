-- ============================================================================
-- 005 — Tres ajustes pedidos después de probar la aplicación (2026-08-07)
--
--   1. El uso se mide SIEMPRE en kilómetros. Se elimina el concepto de
--      "horas de uso" de toda la aplicación.
--   2. Ningún campo específico de un tipo de vehículo es obligatorio.
--   3. Se agrega un catálogo de ciudades para sugerir mientras se escribe.
--
-- Motivo y alternativas evaluadas: ver bitacora/bitacora.md, 2026-08-07.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Solo kilómetros
--
-- Antes, cada tipo declaraba si se medía en kilómetros o en horas de trabajo.
-- Se decidió unificar: todos los vehículos se miden en kilómetros. Las columnas
-- que sostenían esa distinción se eliminan en vez de quedar siempre con el
-- mismo valor, que confundiría a cualquiera que mire la base.
-- ---------------------------------------------------------------------------

alter table public.listings rename column usage_amount to kilometers;
alter table public.listings drop column usage_unit;

alter table public.vehicle_types drop column usage_unit;
alter table public.vehicle_types drop column usage_label;

comment on column public.listings.kilometers is
  'Kilometraje del vehículo. Aplica a todos los tipos por igual.';


-- ---------------------------------------------------------------------------
-- 2. Los campos específicos dejan de ser obligatorios
--
-- El formulario mostraba la cilindrada de una moto o los ejes de un camión
-- como obligatorios, y trababa a quien no tenía el dato a mano. Ahora se piden
-- pero no se exigen. La columna se mantiene por si más adelante se quiere
-- volver a exigir alguno puntual desde el panel de Supabase.
-- ---------------------------------------------------------------------------

alter table public.vehicle_type_fields alter column is_required set default false;
update public.vehicle_type_fields set is_required = false where is_required;


-- ---------------------------------------------------------------------------
-- 3. Catálogo de ciudades
--
-- Sirve para sugerir mientras el usuario escribe y evitar que la misma ciudad
-- quede cargada de cinco formas distintas.
--
-- IMPORTANTE: la ciudad de la publicación se sigue guardando como texto libre
-- en `listings.city`, no como referencia a esta tabla. Es a propósito: si
-- alguien vive en una localidad que no está en la lista, tiene que poder
-- publicar igual. El catálogo ayuda, no obliga.
--
-- La lista que se carga en seed.sql tiene las localidades principales de cada
-- provincia, no todas. Se amplía igual que los tipos de vehículo: agregando
-- filas desde el panel de Supabase, sin tocar código.
-- ---------------------------------------------------------------------------

create table public.cities (
  id          uuid primary key default gen_random_uuid(),
  province_id uuid not null references public.provinces(id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  created_at  timestamptz not null default now(),

  unique (province_id, name)
);

comment on table public.cities is
  'Localidades sugeridas al cargar una publicación. Lista parcial y ampliable; la ciudad se guarda como texto libre.';

create index cities_province_idx on public.cities (province_id, name);

alter table public.cities enable row level security;

create policy "Las ciudades son públicas para lectura"
  on public.cities for select
  using (true);

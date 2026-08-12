-- ============================================================================
-- 001 — Catálogos: tipos de vehículo, campos por tipo y provincias
--
-- Estas tres tablas son la "receta" del sistema. Definen QUÉ tipos de vehículo
-- existen y QUÉ datos pide cada uno. Se cargan desde el panel de Supabase.
--
-- Agregar un tipo de vehículo nuevo = insertar filas acá. No se toca código.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- vehicle_types — el catálogo de tipos de vehículo
-- ----------------------------------------------------------------------------
create table public.vehicle_types (
  id          uuid primary key default gen_random_uuid(),

  -- Identificador interno, en minúscula y sin espacios: 'auto', 'moto', 'camion'.
  slug        text not null unique,

  -- Cómo se muestra en pantalla, en español.
  name        text not null,
  name_plural text not null,

  -- Cómo se mide el uso de este tipo de vehículo.
  -- Un auto se mide en kilómetros; un camión o un cuatriciclo, en horas de trabajo.
  usage_unit  text not null default 'km' check (usage_unit in ('km', 'hours')),

  -- La etiqueta que ve el usuario para ese campo: "Kilometraje", "Horas de uso".
  usage_label text not null default 'Kilometraje',

  -- Orden en el que aparece en el selector.
  sort_order  integer not null default 0,

  -- Permite ocultar un tipo sin borrarlo (borrarlo rompería publicaciones existentes).
  is_active   boolean not null default true,

  created_at  timestamptz not null default now(),

  constraint vehicle_types_slug_format check (slug ~ '^[a-z][a-z0-9_]*$')
);

comment on table public.vehicle_types is
  'Catálogo de tipos de vehículo. Ampliable desde el panel de Supabase sin tocar código.';


-- ----------------------------------------------------------------------------
-- vehicle_type_fields — qué campos específicos pide cada tipo de vehículo
--
-- Ejemplo: para el tipo 'moto', una fila con key='engine_displacement_cc',
-- label='Cilindrada', data_type='number', unit='cc', is_required=true.
-- El formulario de carga lee estas filas y se dibuja solo.
-- ----------------------------------------------------------------------------
create table public.vehicle_type_fields (
  id              uuid primary key default gen_random_uuid(),
  vehicle_type_id uuid not null references public.vehicle_types(id) on delete cascade,

  -- Con qué nombre se guarda el dato dentro de la ficha `specs` de la publicación.
  key             text not null,

  -- Cómo se muestra el campo en pantalla, en español.
  label           text not null,

  -- Qué tipo de dato acepta. Define también qué control dibuja el formulario.
  data_type       text not null
                  check (data_type in ('text', 'number', 'integer', 'boolean', 'select')),

  -- Solo para data_type='select': las opciones disponibles.
  -- Formato: [{"value": "enduro", "label": "Enduro"}, ...]
  options         jsonb,

  -- Unidad que se muestra junto al campo: 'cc', 'kg', 'L', 'm³'.
  unit            text,

  is_required     boolean not null default false,

  -- Rango válido opcional para campos numéricos.
  min_value       numeric,
  max_value       numeric,

  -- Texto de ayuda debajo del campo, si hace falta aclarar algo.
  help_text       text,

  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),

  unique (vehicle_type_id, key),

  constraint vehicle_type_fields_key_format
    check (key ~ '^[a-z][a-z0-9_]*$'),

  -- Un campo de tipo lista sin opciones sería un campo inutilizable.
  constraint vehicle_type_fields_select_needs_options
    check (
      data_type <> 'select'
      or (options is not null
          and jsonb_typeof(options) = 'array'
          and jsonb_array_length(options) > 0)
    )
);

comment on table public.vehicle_type_fields is
  'Definición de los campos específicos de cada tipo de vehículo. El formulario de carga se arma leyendo esta tabla.';

create index vehicle_type_fields_type_idx
  on public.vehicle_type_fields (vehicle_type_id, sort_order);


-- ----------------------------------------------------------------------------
-- provinces — lista de provincias para el selector de ubicación
-- ----------------------------------------------------------------------------
create table public.provinces (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  sort_order integer not null default 0
);


-- ============================================================================
-- Reglas de acceso (RLS)
--
-- Los catálogos los puede LEER cualquiera (la app necesita mostrarlos).
-- Nadie los puede modificar desde la app: no se define ninguna política de
-- escritura, así que Postgres las rechaza todas. Se editan desde el panel de
-- Supabase, que usa la clave de servicio y no pasa por estas reglas.
-- ============================================================================

alter table public.vehicle_types       enable row level security;
alter table public.vehicle_type_fields enable row level security;
alter table public.provinces           enable row level security;

create policy "Los tipos de vehículo son públicos para lectura"
  on public.vehicle_types for select
  using (true);

create policy "Los campos por tipo son públicos para lectura"
  on public.vehicle_type_fields for select
  using (true);

create policy "Las provincias son públicas para lectura"
  on public.provinces for select
  using (true);

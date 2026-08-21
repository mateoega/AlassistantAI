-- ============================================================================
-- 010 — Referencias de precio de mercado
--
-- Sprint 3, capa 2. Lo que valen los vehículos según una fuente de afuera,
-- para no depender solo de los avisos publicados en la propia plataforma.
--
-- POR QUÉ UNA TABLA Y NO UNA LLAMADA EN VIVO
--
--   La fuente gratuita que se usa hoy (Arg Autos) limita los pedidos anónimos
--   a unos pocos por minuto. Consultarla cada vez que alguien mira un aviso es
--   imposible, y además ataría el tiempo de respuesta de la aplicación a que
--   un servicio de terceros esté rápido.
--
--   Con una tabla, la carga se hace a mano con un script, cuando conviene, y
--   la aplicación lee de su propia base. Si la fuente desaparece, lo cargado
--   sigue sirviendo.
--
-- POR QUÉ ESTO ES LA PIEZA INTERCAMBIABLE
--
--   Esta tabla es el contrato. Hoy la llena Arg Autos; mañana puede llenarla
--   InfoAuto, la tabla de la DNRPA, o las tres a la vez — la columna `source`
--   dice de dónde salió cada fila. Cambiar de proveedor es cambiar el script
--   que la carga, no la estimación que la lee. Ver `docs/para_mas_adelante.md`.
--
-- QUIÉN PUEDE ESCRIBIR ACÁ: nadie desde la aplicación.
--
--   Igual que con los análisis de IA: hay políticas de lectura y ninguna de
--   escritura. Un precio de referencia es una afirmación de la plataforma, no
--   un dato que carga un usuario. Si un vendedor pudiera escribir acá, podría
--   inventar la referencia contra la que se compara su propio aviso.
-- ============================================================================

create table public.market_references (
  id           uuid primary key default gen_random_uuid(),

  -- De dónde salió: 'argautos', 'dnrpa', 'infoauto'. Se guarda por fila para
  -- poder decir en pantalla contra qué se está comparando, y para poder borrar
  -- una fuente entera sin tocar las demás.
  source       text not null check (length(trim(source)) > 0),

  -- Marca y familia del modelo, normalizadas en minúscula y sin acentos, tal
  -- como las calcula `familiaDeModelo()` en el backend. "Corolla XEI 1.8" y
  -- "Corolla SEG 2.0 CVT" son las dos 'corolla': la referencia es del modelo,
  -- no de la versión.
  brand        text not null check (length(trim(brand)) > 0),
  model_family text not null check (length(trim(model_family)) > 0),

  year         integer not null check (year between 1900 and 2100),

  -- Siempre en dólares. Es la moneda en la que se referencia el mercado de
  -- usados en la Argentina, y evita que una fila cargada hace tres meses quede
  -- sin sentido por la inflación.
  price_usd    numeric(14, 2) not null check (price_usd > 0),

  -- El rango entre las versiones de ese modelo y año, cuando la fuente
  -- distingue versiones. Un Corolla 2019 no vale lo mismo en XEI que en SEG, y
  -- mostrar de dónde a dónde va es más honesto que un solo número.
  price_min_usd numeric(14, 2) check (price_min_usd > 0),
  price_max_usd numeric(14, 2) check (price_max_usd > 0),

  -- Cuántas versiones se promediaron para llegar a `price_usd`.
  versions      integer not null default 1 check (versions >= 1),

  -- Cómo nombra la fuente a este modelo, tal cual vino. Sirve para revisar a
  -- mano si un cruce salió mal.
  label         text,

  captured_at   timestamptz not null default now(),

  -- Una fila por fuente, modelo y año: volver a correr la carga actualiza en
  -- vez de duplicar.
  unique (source, brand, model_family, year)
);

comment on table public.market_references is
  'Precios de referencia de fuentes externas, por marca, familia de modelo y año. La llena un script a mano; la aplicación solo lee.';

create index market_references_lookup
  on public.market_references (brand, model_family, year);


-- ============================================================================
-- Reglas de acceso (RLS)
--
-- Lectura: cualquiera con sesión iniciada. No hay nada privado acá — son
-- precios de referencia del mercado, no datos de nadie.
--
-- Escritura: ninguna política, a propósito. Ver el comentario del encabezado.
-- ============================================================================

alter table public.market_references enable row level security;

create policy "Las referencias de mercado las puede leer cualquiera con sesión"
  on public.market_references for select
  to authenticated
  using (true);

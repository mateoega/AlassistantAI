-- ============================================================================
-- 008 — El análisis de IA de cada publicación
--
-- Sprint 2. El comprador aprieta "Analizar" en un aviso y la plataforma mira
-- las fotos junto con los datos declarados, y devuelve qué se ve, qué no cierra
-- y qué convendría preguntarle al vendedor.
--
-- UNA FILA POR PUBLICACIÓN. Al rehacer el análisis se pisa la anterior: no
-- interesa el historial de análisis, interesa el análisis vigente.
--
-- QUIÉN PUEDE ESCRIBIR ACÁ: nadie desde la aplicación.
--
--   Más abajo se definen políticas de LECTURA pero ninguna de escritura, así
--   que Postgres rechaza todo intento de insertar o modificar con la clave
--   pública. El backend escribe con la clave de servicio.
--
--   Es a propósito, y es la decisión de seguridad de este sprint: el análisis
--   es una afirmación de la plataforma sobre un vehículo, no un dato que carga
--   un usuario. Si cualquiera pudiera escribir en esta tabla desde el navegador,
--   un vendedor podría inventarse el análisis de su propio aviso — que es
--   exactamente la confianza que la plataforma vende.
-- ============================================================================

create table public.listing_analyses (
  id                uuid primary key default gen_random_uuid(),

  -- Único: una publicación tiene un análisis vigente, no una colección.
  listing_id        uuid not null unique
                    references public.listings(id) on delete cascade,

  -- running → se está analizando en este momento
  -- done    → hay resultado en `result`
  -- failed  → falló, el motivo está en `error_message`
  status            text not null check (status in ('running', 'done', 'failed')),

  -- Huella de TODO lo que se analizó: las fotos en orden y también los datos
  -- declarados. No alcanza con las fotos: si el vendedor corrige el
  -- kilometraje, un análisis que decía "el desgaste no cierra con los km
  -- declarados" quedó viejo igual que si hubiera cambiado una imagen.
  input_fingerprint text not null,

  -- El análisis ya parseado. Su forma la define app/backend/src/ia/types.ts.
  result            jsonb,

  -- Por qué falló, en español y listo para mostrar.
  error_message     text,

  -- Con qué modelo se generó. Sirve para entender resultados viejos cuando el
  -- modelo cambie.
  model             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Un análisis terminado siempre tiene resultado.
  constraint listing_analyses_done_has_result
    check (status <> 'done' or result is not null)
);

comment on table public.listing_analyses is
  'Análisis de IA de cada publicación. Una fila por publicación; se pisa al rehacerlo. Solo el backend escribe acá, con la clave de servicio.';

comment on column public.listing_analyses.input_fingerprint is
  'Huella de las fotos y los datos declarados que se analizaron. Si no coincide con la actual, el análisis está viejo.';

create trigger listing_analyses_set_updated_at
  before update on public.listing_analyses
  for each row execute function public.set_updated_at();


-- ============================================================================
-- Reglas de acceso (RLS)
--
-- Lectura: el análisis sigue la visibilidad de su publicación, igual que las
-- fotos. Si el aviso es un borrador ajeno, su análisis tampoco se ve.
--
-- Escritura: ninguna política, a propósito. Ver el comentario del encabezado.
-- ============================================================================

alter table public.listing_analyses enable row level security;

create policy "El análisis sigue la visibilidad de su publicación"
  on public.listing_analyses for select
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status in ('published', 'sold') or l.seller_id = auth.uid())
    )
  );

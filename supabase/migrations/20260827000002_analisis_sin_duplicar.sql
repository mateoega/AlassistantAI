-- ============================================================================
-- Un solo análisis por publicación, aunque lo pidan dos a la vez
--
-- EL PROBLEMA, reproducido el 2026-08-27
--
-- `startAnalysis` preguntaba si ya había uno corriendo y, si no lo había,
-- escribía la fila en "running" con un `upsert`. Son DOS viajes a la base con
-- un hueco en el medio, y en ese hueco entra el segundo pedido: los dos leen
-- "no hay nada corriendo", los dos escriben, y los dos arrancan una llamada a
-- Gemini por el mismo vehículo. La fila única evita que queden dos registros;
-- no evita que se paguen dos análisis.
--
-- No hace falta mala intención: alcanza con tocar "Analizar" dos veces porque
-- la primera pareció no hacer nada, o con dos personas mirando el mismo aviso.
-- Y con la cuota del tramo gratuito —ver la bitácora del 2026-08-27— cada
-- llamada de más se nota.
--
-- LA SALIDA. Tomar el trabajo y anunciarlo pasan a ser LA MISMA operación, y
-- la resuelve Postgres. `claim_listing_analysis` intenta escribir la fila en
-- "running" solo si nadie la tiene tomada; el que gana se lleva un
-- identificador de intento y el que pierde se lleva un `null` y acompaña el
-- análisis que ya está en curso. No hay hueco entre preguntar y escribir
-- porque no se pregunta.
--
-- POR QUÉ NO ALCANZABA UN CANDADO EN MEMORIA DEL BACKEND. Hoy hay una sola
-- instancia en Render, pero un candado ahí adentro deja de servir el día que
-- haya dos, y de eso nadie se entera: se entera la factura. La base es el
-- único lugar que ven todas las instancias.
-- ============================================================================

-- El intento que está corriendo ahora mismo. Se compara al guardar el
-- resultado: ver `listing_analyses_finish`.
alter table public.listing_analyses
  add column if not exists attempt_id uuid;

comment on column public.listing_analyses.attempt_id is
  'Identificador del intento de análisis en curso. Un trabajo que quedó '
  'colgado y termina tarde solo puede escribir si sigue siendo el intento '
  'vigente; si no, ya hay otro más nuevo y el suyo se descarta.';


-- ----------------------------------------------------------------------------
-- Tomar el trabajo.
--
-- Devuelve el identificador del intento si lo tomó, y `null` si ya lo tiene
-- otro. La condición del `where` es la regla entera: se puede tomar si nadie
-- está corriendo, o si el que corría se venció (el backend se reinició a mitad
-- de camino y esa fila quedaría trabada para siempre).
--
-- `insert … on conflict do update` es lo que lo hace indivisible: Postgres
-- bloquea la fila en conflicto y el segundo pedido vuelve a evaluar el `where`
-- contra la versión YA actualizada por el primero. Ve "running" recién puesto,
-- no pasa, y se va con las manos vacías — que es exactamente lo que se busca.
--
-- `security definer` porque la tabla no tiene ninguna política de escritura, a
-- propósito (migración 008): el análisis es una afirmación de la plataforma
-- sobre un vehículo, no un dato que carga un usuario. Por eso también el
-- `execute` se le da solo a `service_role`, que es la identidad con la que el
-- backend escribe. Quién puede PEDIR un análisis se sigue decidiendo antes,
-- en el backend, leyendo el aviso con la sesión de quien pregunta.
-- ----------------------------------------------------------------------------
create or replace function public.claim_listing_analysis(
  p_listing_id      uuid,
  p_fingerprint     text,
  p_timeout_seconds integer default 180
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt uuid := gen_random_uuid();
begin
  insert into public.listing_analyses as a (
    listing_id, status, input_fingerprint, result, error_message, model, attempt_id
  )
  values (
    p_listing_id, 'running', p_fingerprint, null, null, null, v_attempt
  )
  on conflict (listing_id) do update
    set status            = 'running',
        input_fingerprint = excluded.input_fingerprint,
        result            = null,
        error_message     = null,
        model             = null,
        attempt_id        = excluded.attempt_id,
        updated_at        = now()
    where a.status <> 'running'
       or a.updated_at < now() - make_interval(secs => p_timeout_seconds)
  returning a.attempt_id into v_attempt;

  -- Sin fila devuelta, el `where` de arriba no pasó: lo tiene otro.
  return v_attempt;
end;
$$;

comment on function public.claim_listing_analysis(uuid, text, integer) is
  'Toma el análisis de una publicación de forma indivisible. Devuelve el id '
  'del intento si lo tomó, o null si ya hay uno corriendo sin vencer.';

revoke execute on function public.claim_listing_analysis(uuid, text, integer) from public;
revoke execute on function public.claim_listing_analysis(uuid, text, integer) from anon, authenticated;
grant  execute on function public.claim_listing_analysis(uuid, text, integer) to service_role;


-- ----------------------------------------------------------------------------
-- Guardar el resultado, solo si sigue siendo el intento vigente.
--
-- El caso que cubre: un análisis se vence a los tres minutos y alguien pide
-- otro; el primero, que estaba lento pero vivo, vuelve después y escribiría
-- encima del que está corriendo — dejando en "done" un análisis que la
-- pantalla está esperando, con el resultado del intento viejo. Comparando el
-- intento, el que llega tarde se descarta solo.
--
-- Devuelve si escribió o no, para que el backend lo pueda anotar.
-- ----------------------------------------------------------------------------
create or replace function public.finish_listing_analysis(
  p_listing_id    uuid,
  p_attempt_id    uuid,
  p_status        text,
  p_fingerprint   text,
  p_result        jsonb,
  p_error_message text,
  p_model         text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.listing_analyses
     set status            = p_status,
         input_fingerprint = p_fingerprint,
         result            = p_result,
         error_message     = p_error_message,
         model             = p_model,
         updated_at        = now()
   where listing_id = p_listing_id
     and attempt_id = p_attempt_id;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

comment on function public.finish_listing_analysis(uuid, uuid, text, text, jsonb, text, text) is
  'Guarda el resultado de un análisis solo si el intento sigue siendo el '
  'vigente. Devuelve false cuando llegó tarde y ya lo pisó otro más nuevo.';

revoke execute on function public.finish_listing_analysis(uuid, uuid, text, text, jsonb, text, text) from public;
revoke execute on function public.finish_listing_analysis(uuid, uuid, text, text, jsonb, text, text) from anon, authenticated;
grant  execute on function public.finish_listing_analysis(uuid, uuid, text, text, jsonb, text, text) to service_role;

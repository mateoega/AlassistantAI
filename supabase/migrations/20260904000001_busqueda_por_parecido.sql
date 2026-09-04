-- ============================================================================
-- Buscar por parecido: los errores de tipeo y los acentos dejan de importar.
--
-- La búsqueda del muro compara letra por letra (`ilike '%texto%'`). Eso alcanza
-- para lo que falta o sobra en los bordes —"volks" encuentra "Volkswagen",
-- "ilux" encuentra "Hilux"— y no alcanza para nada más: una letra equivocada
-- ("hilix") o un acento de diferencia ("citroen" contra "Citroën") devuelven
-- cero, y el que busca se queda pensando que no hay ninguno publicado.
--
-- Acá se agrega la red: una función que mide CUÁNTO SE PARECE lo que escribió
-- la persona a la marca y el modelo de cada aviso.
--
-- LA RED SE USA SOLO CUANDO LA BÚSQUEDA EXACTA DEVOLVIÓ CERO, y eso se decide
-- en el backend, no acá. Es la diferencia entre una ayuda y un estorbo: quien
-- escribe "Cruze" y tiene Cruze publicados no quiere ver Corollas en el medio.
-- El parecido aparece cuando la alternativa es una pantalla vacía.
--
-- LAS DOS EXTENSIONES, Y POR QUÉ CADA UNA
--
--   `unaccent`  saca los acentos y la diéresis. Es lo que hace que "citroen" y
--               "Citroën" sean el mismo texto. No es un capricho del idioma:
--               nadie escribe la diéresis en el buscador de un clasificado.
--
--   `pg_trgm`   parte cada texto en pedacitos de tres letras y mide cuántos
--               comparten dos textos. "hilux" y "hilix" comparten la mayoría,
--               "hilux" y "corolla" ninguno. Es lo que convierte "parecido" en
--               un número entre 0 y 1.
--
-- Las dos van al esquema `extensions`, que es donde Supabase deja las
-- extensiones y donde el resto del proyecto espera encontrarlas. Por eso cada
-- función de acá declara `search_path = public, extensions`: sin eso, la
-- función no encuentra a `unaccent` ni al operador de parecido cuando la llama
-- alguien cuyo `search_path` no los incluye.
-- ============================================================================

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;


-- ----------------------------------------------------------------------------
-- 1. Sacar los acentos, de una forma que sirva para un índice
--
-- `unaccent()` es STABLE y no IMMUTABLE, y Postgres no deja construir un índice
-- sobre una función que no sea IMMUTABLE: si el resultado pudiera cambiar, el
-- índice quedaría mintiendo. Es STABLE porque la versión de un argumento sola
-- deja que Postgres elija el diccionario según la configuración de la sesión.
--
-- La forma de dos argumentos NO tiene ese problema: se le dice exactamente qué
-- diccionario usar, así que para el mismo texto devuelve siempre lo mismo. Este
-- envoltorio es esa forma, declarada IMMUTABLE, y es el truco de siempre para
-- poder indexar texto sin acentos.
-- ----------------------------------------------------------------------------

create or replace function public.sin_acentos(texto text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, texto)
$$;

comment on function public.sin_acentos(text) is
  'Saca acentos y diéresis. Es IMMUTABLE (usa la forma de dos argumentos de '
  'unaccent) para poder usarse adentro de un índice.';


-- ----------------------------------------------------------------------------
-- 2. Con qué texto se compara un aviso
--
-- Marca y modelo pegados, en minúscula y sin acentos. Vive en una función y no
-- escrito a mano en cada consulta por un motivo práctico: el índice de más
-- abajo se construye sobre esta expresión, y Postgres solo lo usa si la
-- consulta pide EXACTAMENTE la misma. Dos versiones parecidas escritas en dos
-- lugares distintos es un índice que existe y nunca se usa.
--
-- `brand` y `model` son `not null` en `listings`, así que no hace falta cuidar
-- el caso nulo: un `||` con un nulo devolvería nulo y dejaría el aviso afuera.
-- ----------------------------------------------------------------------------

create or replace function public.texto_buscable(marca text, modelo text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select public.sin_acentos(lower(marca || ' ' || modelo))
$$;

comment on function public.texto_buscable(text, text) is
  'Marca y modelo pegados, en minúscula y sin acentos: el texto contra el que '
  'se mide el parecido. El índice de búsqueda se construye sobre esta misma '
  'expresión.';


-- ----------------------------------------------------------------------------
-- 3. El índice
--
-- GIN con `gin_trgm_ops` es el índice que sabe buscar por pedacitos de tres
-- letras. Sin él, medir el parecido obliga a leer y descomponer los avisos uno
-- por uno; con él, la base descarta de entrada los que no comparten ningún
-- pedacito.
--
-- Hoy hay decenas de avisos y la diferencia no se nota. Se crea igual, porque
-- el día que se note va a ser con gente adentro y el índice se crea bloqueando
-- la tabla.
-- ----------------------------------------------------------------------------

create index if not exists listings_texto_buscable_trgm
  on public.listings
  using gin (public.texto_buscable(brand, model) extensions.gin_trgm_ops);


-- ----------------------------------------------------------------------------
-- 4. La búsqueda por parecido
--
-- Devuelve ids y cuánto se parece cada uno, del más parecido al menos. Quien
-- llama decide qué hacer con esos ids: el backend los usa para volver a correr
-- la MISMA consulta del muro —con sus filtros, su orden y su paginación— en vez
-- de armar una consulta aparte. Es lo que evita que la búsqueda por parecido se
-- convierta en una segunda definición de qué es un aviso visible.
--
-- POR QUÉ `word_similarity` Y NO `similarity`. `similarity` compara los dos
-- textos ENTEROS, así que buscar "hilux" contra "toyota hilux srv 2.8 tdi 4x4"
-- da un parecido bajísimo: el aviso tiene muchas más letras que la búsqueda, y
-- todas esas letras de más cuentan como diferencia. `word_similarity` busca el
-- PEDAZO del aviso que mejor se parece a lo buscado, que es exactamente lo que
-- hace una persona leyendo un título.
--
-- EL UMBRAL ES 0,3 Y ESTÁ ELEGIDO CON UN CASO EN LA MANO. Con una palabra corta
-- y una letra cambiada —"hilix" contra "hilux"— el parecido da alrededor de
-- 0,33: un umbral más exigente dejaría afuera justamente el caso que se quiere
-- rescatar. Es permisivo a propósito, y se lo puede permitir porque esta
-- función corre SOLO cuando la búsqueda exacta no encontró nada: la
-- alternativa a un resultado dudoso no es un resultado bueno, es la pantalla
-- vacía.
--
-- SEGURIDAD: la función es `security invoker` —lo que no se dice es lo que
-- corresponde acá— así que lee `listings` con la identidad de quien pregunta y
-- las políticas de la tabla se aplican igual que siempre. Una visita sin cuenta
-- solo va a encontrar avisos publicados o vendidos. Ponerle `security definer`
-- a esto la convertiría en una puerta para leer borradores ajenos.
-- ----------------------------------------------------------------------------

create or replace function public.buscar_listings_parecidos(
  p_texto  text,
  p_limite integer default 40
)
returns table (id uuid, parecido real)
language sql
stable
set search_path = public, extensions
set pg_trgm.word_similarity_threshold = 0.3
as $$
  select l.id,
         extensions.word_similarity(
           public.sin_acentos(lower(p_texto)),
           public.texto_buscable(l.brand, l.model)
         ) as parecido
    from public.listings l
   where public.sin_acentos(lower(p_texto)) <% public.texto_buscable(l.brand, l.model)
   order by parecido desc, l.published_at desc nulls last
   limit greatest(1, least(coalesce(p_limite, 40), 100))
$$;

comment on function public.buscar_listings_parecidos(text, integer) is
  'Ids de avisos cuya marca y modelo se parecen a un texto, del más parecido '
  'al menos. Corre con la identidad de quien pregunta, así que respeta las '
  'políticas de listings. El backend la usa solo cuando la búsqueda exacta '
  'devolvió cero resultados.';

-- El muro se puede mirar sin cuenta, así que la red también tiene que estar
-- disponible sin cuenta: si no, la persona sin sesión es la única que ve la
-- pantalla vacía.
grant execute on function public.buscar_listings_parecidos(text, integer) to anon, authenticated;

-- ============================================================================
-- Aceptación de los términos y el descargo de responsabilidad
--
-- POR QUÉ APARECE ESTA COLUMNA
--
-- Hasta ahora el descargo se leía: estaba en `/legales` y enlazado desde el
-- pie de todas las pantallas, desde la estimación de precio, desde el análisis
-- y desde el login. Nadie lo aceptaba — se ofrecía a la vista y ya.
--
-- Antes de salir al mercado eso cambia: se acepta UNA vez, y queda constancia.
-- El texto sigue siendo el mismo y sigue viviendo en `/legales`; lo que se
-- suma es el registro de que alguien dijo que sí y cuándo.
--
-- QUÉ NO ES ESTA COLUMNA. No es la única constancia posible ni sirve para el
-- que mira sin cuenta: a ese solo se le puede guardar la aceptación en su
-- propio navegador, porque no hay a quién atarla. Esta columna es la
-- constancia de los que sí tienen cuenta, que son los únicos que pueden
-- publicar, escribir y guardar.
-- ============================================================================

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz;

comment on column public.profiles.terms_accepted_at is
  'Cuándo esta persona aceptó los términos y el descargo de /legales. Nulo si '
  'la cuenta se creó antes de que existiera la aceptación: a esas se les pide '
  'la primera vez que vuelven a entrar.';


-- ----------------------------------------------------------------------------
-- Al crear la cuenta, la fecha la pone el servidor.
--
-- El formulario de registro manda `terms_accepted: true` en los datos del
-- usuario, que es lo que hace la casilla obligatoria del login. La FECHA no
-- viaja desde el navegador: la pone `now()` acá adentro. Un dato que el cliente
-- puede escribir no sirve como constancia de nada.
--
-- Si la marca no viene, la columna queda nula y el cartel de aceptación se le
-- va a mostrar igual la próxima vez que entre. Es a propósito: así una cuenta
-- creada por fuera del formulario —desde el panel de Supabase, o por un script—
-- no arranca dando por aceptado algo que nadie leyó.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, terms_accepted_at)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    case
      -- Se compara como texto y no con un cast a boolean: los datos del
      -- usuario los escribe el navegador, y un cast sobre un valor que no sea
      -- 'true' o 'false' aborta el disparador y deja la cuenta sin perfil.
      when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now()
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

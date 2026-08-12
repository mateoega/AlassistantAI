-- ============================================================================
-- 002 — Perfiles de usuario
--
-- Supabase Auth ya guarda el email y la contraseña en su propia tabla
-- (auth.users), que no se toca. Esta tabla guarda los datos adicionales del
-- vendedor que la app necesita mostrar: nombre y teléfono de contacto.
-- ============================================================================

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Datos del vendedor, enlazados 1 a 1 con el usuario de Supabase Auth.';


-- ----------------------------------------------------------------------------
-- Mantener updated_at al día automáticamente.
-- Se reutiliza en las demás tablas.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- Cuando alguien se registra, se le crea el perfil solo.
-- Así la app nunca se encuentra con un usuario sin perfil.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- El disparador de arriba solo actúa de acá en adelante. Si ya había cuentas
-- creadas antes de correr esta migración (por ejemplo, probando el login),
-- se les crea el perfil ahora. Sin perfil no se puede publicar.
insert into public.profiles (id, display_name)
select id, nullif(raw_user_meta_data ->> 'display_name', '')
from auth.users
on conflict (id) do nothing;


-- ============================================================================
-- Reglas de acceso (RLS)
--
-- Cualquier usuario logueado puede leer los perfiles: hace falta para mostrar
-- quién publicó cada vehículo y cómo contactarlo. Sin login no se ve nada.
-- Cada uno solo puede modificar el suyo.
-- ============================================================================

alter table public.profiles enable row level security;

create policy "Los perfiles son visibles para usuarios logueados"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Cada usuario crea su propio perfil"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Cada usuario edita su propio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

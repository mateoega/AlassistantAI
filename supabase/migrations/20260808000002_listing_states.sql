-- ============================================================================
-- 007 — Estados "vendido" y "pausado"
--
-- Hasta ahora una publicación era borrador o publicada, nada más. Quien vendía
-- el vehículo tenía que BORRAR el aviso, y con él se iba todo su historial.
-- Mientras tanto, los avisos de vehículos ya vendidos seguían figurando como
-- disponibles — que es la queja número uno en cualquier clasificado y lo que
-- más desconfianza genera.
--
-- Los cuatro estados:
--   draft      borrador, solo lo ve su dueño
--   published  publicado y disponible, aparece en el muro
--   paused     publicado pero fuera del muro, sin borrar nada
--   sold       vendido; queda como registro y no vuelve al muro
-- ============================================================================

alter table public.listings
  drop constraint if exists listings_status_check;

alter table public.listings
  add constraint listings_status_check
  check (status in ('draft', 'published', 'paused', 'sold'));

-- Cuándo se marcó como vendido. Sirve para el historial del vendedor y, más
-- adelante, como referencia real de precios de venta para el Sprint 3.
alter table public.listings
  add column if not exists sold_at timestamptz;

alter table public.listings
  drop constraint if exists listings_sold_has_date;

alter table public.listings
  add constraint listings_sold_has_date
  check (status <> 'sold' or sold_at is not null);

comment on column public.listings.status is
  'draft = borrador · published = disponible · paused = fuera del muro · sold = vendido';


-- ----------------------------------------------------------------------------
-- El muro solo muestra lo que está efectivamente disponible
--
-- El índice anterior incluía todo lo publicado. Ahora que hay estados que no
-- van al muro, se ajusta para que la consulta del listado siga siendo rápida.
-- ----------------------------------------------------------------------------
drop index if exists public.listings_public_idx;

create index listings_public_idx
  on public.listings (published_at desc)
  where status = 'published';


-- ----------------------------------------------------------------------------
-- Reglas de acceso
--
-- Un aviso pausado deja de ser visible para los demás, como un borrador.
-- Uno vendido SÍ se sigue viendo: quien lo tenía guardado o llega por un
-- enlace tiene que poder entender que ya se vendió, en vez de encontrarse con
-- una página que no existe.
-- ----------------------------------------------------------------------------
drop policy if exists "Las publicaciones publicadas se ven; los borradores, solo su dueño"
  on public.listings;

create policy "Se ven las disponibles y las vendidas; las demás, solo su dueño"
  on public.listings for select
  to authenticated
  using (status in ('published', 'sold') or seller_id = auth.uid());

-- ============================================================================
-- 011 — Los favoritos del comprador
--
-- Sprint 4. Guardar un vehículo que interesó y volver a encontrarlo, sin
-- depender de acordarse de la marca ni de dejar quince pestañas abiertas.
--
-- ES LA PRIMERA TABLA QUE EXISTE PARA EL QUE COMPRA. Todo lo anterior gira
-- alrededor del aviso —lo escribe el que vende, lo lee cualquiera—. Esta
-- guarda algo que es del que mira, y que no le interesa a nadie más.
--
-- QUIÉN VE ESTO: solo su dueño, y no hay forma de contar cuántos guardaron un
-- aviso.
--
--   Las políticas de más abajo dejan a cada usuario leer, agregar y sacar
--   únicamente sus propias filas. No hay ninguna política que permita leer las
--   de otro, ni siquiera contarlas.
--
--   Es a propósito y es una decisión de producto, no una omisión: un contador
--   público de "23 personas guardaron este vehículo" sirve para apurar al que
--   duda, que es exactamente la presión que esta plataforma no quiere ejercer.
--   Y a quien guarda un aviso no se le pidió permiso para contárselo al
--   vendedor.
-- ============================================================================

create table public.favorites (
  -- Contra auth.users y no contra profiles: guardar un vehículo no necesita
  -- que el usuario haya completado su perfil.
  user_id    uuid not null references auth.users(id) on delete cascade,

  -- Si la publicación se borra, el favorito se va con ella. No queda ningún
  -- resto apuntando a un aviso que ya no existe.
  listing_id uuid not null references public.listings(id) on delete cascade,

  created_at timestamptz not null default now(),

  -- La clave es el par: un mismo usuario no puede guardar dos veces el mismo
  -- vehículo, y no hace falta escribir esa regla en el código de la aplicación.
  primary key (user_id, listing_id)
);

comment on table public.favorites is
  'Los vehículos que cada usuario guardó. Privados: solo los ve su dueño, y no se pueden contar desde afuera.';

-- La clave primaria ya ordena por usuario, que es como se lee la pantalla de
-- favoritos. Este índice es para el otro lado: borrar una publicación tiene que
-- encontrar rápido los favoritos que la apuntan.
create index favorites_listing on public.favorites (listing_id);


-- ============================================================================
-- Reglas de acceso (RLS)
--
-- No hay política de UPDATE, y no es un olvido: un favorito no tiene nada que
-- modificar. Está o no está.
-- ============================================================================

alter table public.favorites enable row level security;

create policy "Cada usuario ve solo sus propios favoritos"
  on public.favorites for select
  to authenticated
  using (user_id = auth.uid());

create policy "Cada usuario guarda a su propio nombre"
  on public.favorites for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Cada usuario saca solo sus propios favoritos"
  on public.favorites for delete
  to authenticated
  using (user_id = auth.uid());

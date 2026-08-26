-- ============================================================================
-- El muro deja de exigir cuenta.
--
-- Hasta acá había que crear un usuario para ver un solo aviso. En un
-- clasificado eso es la barrera más cara que existe: quien busca un auto no
-- se registra para mirar, mira y después decide. La cuenta pasa a pedirse
-- cuando hay algo que hacer —guardar, escribirle al vendedor, publicar— y no
-- para entrar.
--
-- Lo que se abre: las publicaciones disponibles y vendidas, sus fotos, el
-- nombre de quien vende, el análisis ya hecho y la estimación de precio.
-- Lo que sigue cerrado: los borradores, los favoritos, los mensajes, el
-- teléfono, y pedir un análisis nuevo.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Las publicaciones
--
-- Mismo criterio que la política de `authenticated`, sin la parte del dueño:
-- una visita anónima no es dueña de nada, así que sus borradores no existen.
-- ----------------------------------------------------------------------------

create policy "Las disponibles y las vendidas se ven sin tener cuenta"
  on public.listings for select
  to anon
  using (status in ('published', 'sold'));


-- ----------------------------------------------------------------------------
-- 2. Las fotos, y un error que ya estaba
--
-- La política de fotos se escribió en la migración 003 con `status =
-- 'published'`. La 007 amplió la de `listings` a `('published', 'sold')` para
-- que un aviso vendido se siguiera viendo por enlace —esa era la decisión del
-- Sprint 1.6— pero no tocó esta. El resultado es que hoy un aviso vendido se
-- abre con todos sus datos y sin una sola foto.
--
-- Nadie lo reportó porque para verlo hay que abrir por enlace directo un aviso
-- vendido que no es tuyo, que es exactamente el caso que nadie prueba a mano.
-- Se arregla acá porque no tendría sentido abrirle a las visitas anónimas una
-- puerta que a los usuarios con cuenta les está mal puesta.
-- ----------------------------------------------------------------------------

drop policy if exists "Las fotos siguen la visibilidad de su publicación"
  on public.listing_photos;

create policy "Las fotos siguen la visibilidad de su publicación"
  on public.listing_photos for select
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status in ('published', 'sold') or l.seller_id = auth.uid())
    )
  );

create policy "Las fotos de un aviso visible se ven sin tener cuenta"
  on public.listing_photos for select
  to anon
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.status in ('published', 'sold')
    )
  );


-- ----------------------------------------------------------------------------
-- 3. El nombre de quien vende, y NADA más
--
-- Acá está el detalle que ordena esta migración.
--
-- El muro muestra el nombre del vendedor, que sale de `profiles` por un join.
-- Para que una visita anónima lo vea hace falta abrirle esa tabla. Pero **las
-- reglas de acceso de Postgres son por FILA, no por columna**: una política
-- `using (true)` no deja pasar el nombre, deja pasar la fila entera — y en esa
-- fila está el teléfono, que el Sprint 5 hizo privado justamente para que
-- dejara de repartirse solo.
--
-- La herramienta correcta para recortar columnas no es la política, son los
-- permisos de tabla. La política dice QUÉ FILAS, el `grant` dice QUÉ COLUMNAS,
-- y hacen falta las dos: PostgREST rechaza el pedido si se le nombra una
-- columna sobre la que el rol no tiene permiso, aunque la política lo deje
-- pasar.
--
-- Es la contracara de lo que apareció en el Sprint 6 con `blocked_with`: allá
-- el modo por omisión de Postgres era demasiado restrictivo y había que
-- rodearlo; acá es demasiado ancho y hay que recortarlo. En las dos, el modo
-- por omisión era el equivocado.
-- ----------------------------------------------------------------------------

revoke select on public.profiles from anon;
grant  select (id, display_name) on public.profiles to anon;

create policy "El nombre de quien vende se ve sin tener cuenta"
  on public.profiles for select
  to anon
  using (true);


-- ----------------------------------------------------------------------------
-- 4. El análisis de fotos ya hecho
--
-- Se muestra el que ya existe; PEDIR uno nuevo sigue necesitando cuenta,
-- porque cada análisis es una llamada paga al modelo. Esa puerta no la abre
-- una política de lectura: `listing_analyses` no se escribe nunca desde el
-- navegador —lo hace el backend con la clave de servicio, por la migración
-- 008— así que abrir la lectura no habilita a nadie a generar nada.
-- ----------------------------------------------------------------------------

create policy "El análisis de un aviso visible se ve sin tener cuenta"
  on public.listing_analyses for select
  to anon
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.status in ('published', 'sold')
    )
  );

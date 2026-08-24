-- ============================================================================
-- 012 — Mensajería interna entre comprador y vendedor
--
-- Sprint 5. Hasta acá, el que se interesaba por un vehículo se iba de la
-- plataforma: el único contacto era un enlace a WhatsApp, puesto como
-- provisorio en el Sprint 1.6. Esta migración trae la conversación adentro.
--
-- TRES TABLAS Y UNA VISTA, y cada una existe por un motivo distinto:
--
--   conversations       de qué vehículo hablan, y quiénes
--   messages            lo que se dijeron
--   conversation_reads  hasta dónde leyó cada uno
--   conversation_overview   la lista de conversaciones ya resumida
--
-- POR QUÉ EL LEÍDO VA EN SU PROPIA TABLA. Lo natural sería una columna
-- `buyer_last_read_at` y otra `seller_last_read_at` adentro de la conversación.
-- El problema es que las reglas de acceso de Postgres se escriben por fila,
-- no por columna: una política que deje al comprador actualizar su columna lo
-- dejaría también pisar la del vendedor. Separarlo en una tabla propia,
-- con el usuario en la clave, hace que la regla vuelva a ser de fila —
-- "cada uno toca la suya"— y que la base sola impida lo demás.
-- ============================================================================


-- ============================================================================
-- Las conversaciones
-- ============================================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),

  -- Si el aviso se borra, la conversación NO se borra con él: queda con el
  -- vehículo en null. Es la diferencia con los favoritos, donde borrar el
  -- aviso borra el favorito. Un favorito es un puntero a un aviso; una
  -- conversación es algo que dos personas dijeron, y no le pertenece al aviso.
  listing_id uuid references public.listings(id) on delete set null,

  -- Quién escribió primero (siempre el que compra) y quién publicó el aviso.
  -- Los dos contra auth.users: para escribirle a alguien no hace falta que
  -- ninguno haya completado su perfil.
  buyer_id  uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,

  -- De qué vehículo se habló, copiado tal como estaba el día que empezó la
  -- charla ("Volkswagen Amarok 2019").
  --
  -- Es una copia a propósito, y no un dato que se lee del aviso cada vez. Un
  -- aviso pausado deja de ser visible para el comprador —así lo decidió el
  -- Sprint 1.6— y uno borrado no existe más. Sin esta copia, la conversación
  -- aparecería en la lista sin poder decir de qué era. La charla sobrevive al
  -- aviso.
  listing_title text not null,

  created_at      timestamptz not null default now(),

  -- Cuándo fue el último mensaje. Lo mantiene al día el disparador de más
  -- abajo, y es lo que ordena la lista de conversaciones.
  last_message_at timestamptz not null default now(),

  -- Nadie se escribe a sí mismo. La aplicación no ofrece el botón en el aviso
  -- propio, pero eso es la pantalla; esto es la base.
  constraint conversations_distinct_parties check (buyer_id <> seller_id),

  -- Una sola conversación por vehículo y comprador. Consultar dos veces el
  -- mismo aviso continúa la charla anterior en vez de abrir una nueva, que es
  -- lo que espera cualquiera de los dos lados.
  --
  -- Postgres considera distintos los nulos entre sí, así que esto no impide
  -- que un mismo comprador tenga varias conversaciones viejas de avisos ya
  -- borrados. Está bien: eran de vehículos distintos.
  constraint conversations_one_per_listing_and_buyer unique (listing_id, buyer_id)
);

comment on table public.conversations is
  'Una conversación por vehículo y comprador. Guarda el título del vehículo copiado, para sobrevivir al aviso.';

-- Las dos puntas de la lista de conversaciones: "las mías como comprador" y
-- "las mías como vendedor", siempre ordenadas por el último mensaje.
create index conversations_buyer  on public.conversations (buyer_id,  last_message_at desc);
create index conversations_seller on public.conversations (seller_id, last_message_at desc);


-- ============================================================================
-- Los mensajes
--
-- No se editan ni se borran. No hay política de UPDATE ni de DELETE, y no es
-- un olvido: lo que se dijo en una negociación es prueba para el otro. Si un
-- vendedor pudiera reescribir "te lo dejo en 8.000" después de mandarlo, el
-- historial no serviría para nada. Arrepentirse se resuelve escribiendo otro
-- mensaje, como en cualquier conversación.
-- ============================================================================

create table public.messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,

  -- El largo se valida acá además de en el backend. El límite alto es para
  -- que no entre un libro por accidente, no para cortarle la explicación a
  -- nadie.
  body text not null constraint messages_body_length
    check (length(btrim(body)) between 1 and 2000),

  created_at timestamptz not null default now()
);

comment on table public.messages is
  'Los mensajes de cada conversación. No se editan ni se borran: lo dicho en una negociación es prueba para el otro.';

-- Un hilo se lee entero y en orden, del más viejo al más nuevo.
create index messages_conversation on public.messages (conversation_id, created_at);


-- ----------------------------------------------------------------------------
-- Cuándo fue el último mensaje, sin que lo tenga que recordar la aplicación
--
-- El disparador corre con los permisos del dueño de la función
-- (`security definer`) por una razón concreta: los participantes NO tienen
-- permiso para actualizar la conversación —no hay política de UPDATE—, así
-- que si esta actualización corriera con la identidad de quien escribe, la
-- base la descartaría en silencio y la lista quedaría ordenada al revés.
--
-- Es seguro porque no decide nada: solo copia la fecha del mensaje que se
-- acaba de insertar en la conversación a la que ese mensaje pertenece. Quién
-- podía insertarlo ya lo resolvieron las políticas de `messages`.
-- ----------------------------------------------------------------------------
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();


-- ============================================================================
-- Hasta dónde leyó cada uno
--
-- Se guarda una fecha y no una lista de mensajes leídos: alcanza para saber
-- cuántos quedaron sin leer, y no crece con la cantidad de mensajes.
-- ============================================================================

create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  last_read_at    timestamptz not null default now(),

  primary key (conversation_id, user_id)
);

comment on table public.conversation_reads is
  'Hasta cuándo leyó cada participante su conversación. Cada uno solo puede tocar su propia fila.';


-- ============================================================================
-- La lista de conversaciones, ya resumida
--
-- Sin esto, dibujar la lista obligaría a traerse todos los mensajes de todas
-- las conversaciones para saber cuál fue el último de cada una y cuántos
-- quedaron sin leer.
--
-- `security_invoker` NO ES OPCIONAL. Una vista de Postgres corre, por omisión,
-- con los permisos de quien la creó, y eso saltearía las reglas de acceso de
-- las tablas de abajo: cualquiera podría leer el último mensaje de cualquier
-- conversación. Con `security_invoker`, la vista se lee con la identidad de
-- quien pregunta y las políticas se aplican igual que si consultara las tablas
-- directamente.
--
-- OJO CON `unread_count`: está calculado para QUIEN CONSULTA. No es un dato de
-- la conversación, es la respuesta a "cuántos me faltan leer a mí". Leer esta
-- vista desde el backend con la clave de servicio no tendría sentido —no hay
-- un "yo"—, y por eso no se hace: acá se entra siempre con el cliente del
-- usuario.
-- ============================================================================

create view public.conversation_overview
with (security_invoker = true)
as
select
  c.id,
  c.listing_id,
  c.buyer_id,
  c.seller_id,
  c.listing_title,
  c.created_at,
  c.last_message_at,

  -- El último mensaje, para mostrarlo debajo del título como hace cualquier
  -- bandeja de entrada.
  last_message.body      as last_message_body,
  last_message.sender_id as last_message_sender_id,

  -- Cuántos mensajes del otro llegaron después de la última vez que quien
  -- consulta abrió la conversación. Los propios nunca cuentan.
  (
    select count(*)
      from public.messages m
     where m.conversation_id = c.id
       and m.sender_id <> auth.uid()
       and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
  ) as unread_count

from public.conversations c

left join lateral (
  select m.body, m.sender_id
    from public.messages m
   where m.conversation_id = c.id
   order by m.created_at desc
   limit 1
) as last_message on true

left join public.conversation_reads r
  on r.conversation_id = c.id
 and r.user_id = auth.uid();

comment on view public.conversation_overview is
  'La lista de conversaciones con su último mensaje y cuántos le faltan leer a quien consulta.';


-- ============================================================================
-- Reglas de acceso (RLS)
--
-- La regla de fondo es una sola: una conversación la ven sus dos
-- participantes y nadie más. Ni el que mira un aviso puede saber cuántos
-- consultaron por él, ni la plataforma expone una forma de contarlo — es la
-- misma decisión que la de los favoritos del Sprint 4.
-- ============================================================================

alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;
alter table public.conversation_reads enable row level security;


-- ---- Conversaciones --------------------------------------------------------

create policy "Cada conversación la ven sus dos participantes"
  on public.conversations for select
  to authenticated
  using (auth.uid() in (buyer_id, seller_id));

-- La conversación la abre SIEMPRE el que compra, sobre un aviso que está
-- publicado y que es de la persona que se declara como vendedor.
--
-- El `exists` no es paranoia de más: sin él, alguien podría abrir una
-- conversación poniendo de vendedor a cualquier usuario, y aparecerle en la
-- bandeja de entrada a alguien que nunca publicó nada.
create policy "El comprador abre la conversación sobre un aviso publicado"
  on public.conversations for insert
  to authenticated
  with check (
    auth.uid() = buyer_id
    and exists (
      select 1
        from public.listings l
       where l.id = listing_id
         and l.seller_id = conversations.seller_id
         and l.status = 'published'
    )
  );

-- No hay UPDATE ni DELETE. Una conversación no se edita, y borrarla del lado
-- de uno la borraría también del lado del otro.


-- ---- Mensajes --------------------------------------------------------------

create policy "Los mensajes los ven los dos participantes"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1
        from public.conversations c
       where c.id = messages.conversation_id
         and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );

-- Se escribe a nombre propio y solo en una conversación de la que se es parte.
-- Lo segundo tapa el agujero más obvio: mandar un mensaje a una conversación
-- ajena adivinando su identificador.
create policy "Cada uno escribe a su nombre en sus conversaciones"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
        from public.conversations c
       where c.id = messages.conversation_id
         and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );


-- ---- Leído -----------------------------------------------------------------

create policy "Cada uno ve su propia marca de leído"
  on public.conversation_reads for select
  to authenticated
  using (user_id = auth.uid());

create policy "Cada uno marca como leídas sus propias conversaciones"
  on public.conversation_reads for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
        from public.conversations c
       where c.id = conversation_reads.conversation_id
         and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );

create policy "Cada uno adelanta su propia marca de leído"
  on public.conversation_reads for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

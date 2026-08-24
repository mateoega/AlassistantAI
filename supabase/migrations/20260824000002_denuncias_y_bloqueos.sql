-- ============================================================================
-- 013 — Bloquear y denunciar
--
-- El Sprint 5 abrió un canal de mensajes entre desconocidos y no dejó forma de
-- cortarlo. Mientras la plataforma se probó entre gente conocida eso no molestó
-- a nadie; el día que entre gente que no conocemos, una plataforma que junta
-- dos extraños y no da forma de cortar la conversación está mal terminada.
--
-- DOS TABLAS, Y HACEN COSAS DISTINTAS:
--
--   user_blocks           cortar. Es una decisión de quien bloquea y tiene
--                         efecto inmediato, sin que intervenga nadie.
--   conversation_reports  avisar. No corta nada por sí sola: queda registrada
--                         para que alguien la mire.
--
-- Son dos cosas separadas a propósito. Denunciar y que no pase nada visible
-- deja a la persona esperando; bloquear y que además haya que denunciar para
-- estar tranquila, también. Quien bloquea deja de recibir mensajes en el acto;
-- quien denuncia deja constancia. La pantalla ofrece las dos juntas porque casi
-- siempre se quieren las dos, pero cada una funciona sola.
--
-- QUIÉN LEE LAS DENUNCIAS. Hoy, nadie desde la aplicación: se leen desde el
-- panel de Supabase. No hay pantalla de moderación y no la va a haber hasta que
-- haya algo que moderar — construir una bandeja de denuncias para una
-- comunidad que todavía no existe es moderar el vacío. Lo que sí tenía que
-- existir desde el primer día es la forma de dejar la denuncia.
-- ============================================================================


-- ============================================================================
-- Bloqueos
--
-- Es una relación dirigida: A bloquea a B. Que B haya bloqueado a A es otra
-- fila. Se guarda así, y no como un par sin dirección, porque desbloquear tiene
-- que ser posible sin tocar la decisión del otro.
-- ============================================================================

create table public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (blocker_id, blocked_id),

  constraint user_blocks_distinct_parties check (blocker_id <> blocked_id)
);

comment on table public.user_blocks is
  'Quién bloqueó a quién. Corta los mensajes en las dos direcciones, pero solo quien bloqueó puede deshacerlo.';

-- "A quién bloqueé", que es la única pregunta que hace la aplicación. La
-- pregunta inversa —"quién me bloqueó"— no la puede hacer nadie: no hay índice
-- porque no hay consulta, y no hay consulta porque no hay política que la deje
-- leer.
create index user_blocks_blocker on public.user_blocks (blocker_id);


-- ----------------------------------------------------------------------------
-- Si hay un bloqueo entre quien pregunta y otra persona
--
-- POR QUÉ ESTO NO PUEDE SER UN `exists` SUELTO DENTRO DE UNA POLÍTICA
--
--   Las reglas de acceso también se aplican a las consultas que hace una
--   política. Un `exists (select 1 from user_blocks ...)` escrito adentro de la
--   política de mensajes correría con la identidad de quien escribe, y quien
--   escribe NO PUEDE VER la fila de quien lo bloqueó — esa fila es de otro—,
--   así que la consulta volvería vacía y el bloqueo no frenaría nada. La regla
--   existiría, se leería bien, y no serviría para nada.
--
--   Por eso esta función corre con los permisos de su dueño: es la única forma
--   de que la base pueda mirar una fila que quien pregunta no puede ver.
--
-- QUÉ PUEDE AVERIGUAR ALGUIEN CON ESTO. Solo si hay un bloqueo entre esa
-- persona y él mismo: `auth.uid()` está fijo adentro de la consulta, así que
-- preguntar por dos terceros devuelve `false` siempre. Que alguien pueda
-- deducir que lo bloquearon es inevitable —va a intentar escribir y no va a
-- poder—, y la aplicación no se lo dice con todas las letras: dice que en esa
-- conversación no se puede escribir, sin decir quién lo decidió.
-- ----------------------------------------------------------------------------
create or replace function public.blocked_with(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.user_blocks b
     where (b.blocker_id = auth.uid() and b.blocked_id = other)
        or (b.blocker_id = other       and b.blocked_id = auth.uid())
  );
$$;

comment on function public.blocked_with(uuid) is
  'Si hay un bloqueo entre quien consulta y la otra persona, en cualquiera de las dos direcciones.';

revoke all on function public.blocked_with(uuid) from public;
grant execute on function public.blocked_with(uuid) to authenticated;


-- ============================================================================
-- Denuncias
--
-- Una por conversación y por persona. Denunciar dos veces la misma conversación
-- no agrega información: si hay algo más que contar, va en el detalle de la
-- primera.
-- ============================================================================

create table public.conversation_reports (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reporter_id     uuid not null references auth.users(id) on delete cascade,

  -- Los mismos motivos que ofrece la pantalla. La lista con sus textos vive en
  -- el backend (`services/moderation.ts`); esto es la red de abajo, para que no
  -- entre un motivo inventado ni aunque el backend se equivoque. Es el mismo
  -- criterio que el largo máximo de un mensaje, que también está en los dos
  -- lados.
  reason text not null constraint conversation_reports_reason
    check (reason in ('estafa', 'acoso', 'spam', 'otro')),

  detail text constraint conversation_reports_detail_length
    check (detail is null or length(btrim(detail)) between 1 and 1000),

  created_at timestamptz not null default now(),

  constraint conversation_reports_one_per_person unique (conversation_id, reporter_id)
);

comment on table public.conversation_reports is
  'Denuncias sobre una conversación. Se leen desde el panel de Supabase: no hay pantalla de moderación todavía.';

create index conversation_reports_recent on public.conversation_reports (created_at desc);


-- ============================================================================
-- Reglas de acceso
-- ============================================================================

alter table public.user_blocks           enable row level security;
alter table public.conversation_reports  enable row level security;


-- ---- Bloqueos --------------------------------------------------------------

-- Cada uno ve a quién bloqueó, y NADIE ve quién lo bloqueó a él. La asimetría
-- es deliberada: una lista de "estas personas te bloquearon" es una invitación
-- a averiguar por qué.
create policy "Cada uno ve solo los bloqueos que hizo"
  on public.user_blocks for select
  to authenticated
  using (blocker_id = auth.uid());

create policy "Cada uno bloquea a su nombre"
  on public.user_blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

-- Desbloquear es borrar, y solo lo puede hacer quien bloqueó. No hay UPDATE:
-- un bloqueo no se edita, se pone o se saca.
create policy "Cada uno deshace sus propios bloqueos"
  on public.user_blocks for delete
  to authenticated
  using (blocker_id = auth.uid());


-- ---- Denuncias -------------------------------------------------------------

-- Se denuncia una conversación de la que se es parte. Sin esto, alguien podría
-- denunciar conversaciones ajenas adivinando identificadores.
create policy "Cada uno denuncia sus propias conversaciones"
  on public.conversation_reports for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and exists (
      select 1
        from public.conversations c
       where c.id = conversation_reports.conversation_id
         and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );

-- Quien denunció puede ver su denuncia —para que la pantalla pueda decirle que
-- ya la hizo— y nadie más, tampoco el denunciado.
create policy "Cada uno ve las denuncias que hizo"
  on public.conversation_reports for select
  to authenticated
  using (reporter_id = auth.uid());

-- No hay UPDATE ni DELETE, por la misma razón que los mensajes no se editan:
-- una denuncia es lo que alguien dijo en un momento, no un borrador.


-- ============================================================================
-- El bloqueo tiene efecto: dos políticas del Sprint 5 se reescriben
--
-- Bloquear no puede ser solo un cartel en la pantalla. Estas dos políticas son
-- las que hacen que la base rechace el mensaje aunque el pedido llegue por
-- fuera de la aplicación.
--
-- CORTA EN LAS DOS DIRECCIONES. Quien bloquea deja de recibir, pero tampoco
-- puede seguir escribiéndole al otro: un bloqueo que dejara al que bloqueó
-- mandar mensajes sin poder recibir respuesta no sería cortar una conversación,
-- sería quedarse con la última palabra.
-- ============================================================================

drop policy "Cada uno escribe a su nombre en sus conversaciones" on public.messages;

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
         and not public.blocked_with(
           case when c.buyer_id = auth.uid() then c.seller_id else c.buyer_id end
         )
    )
  );

-- Y no se abre una conversación nueva con alguien con quien hay un bloqueo: si
-- no, bloquear duraría hasta el próximo aviso publicado.
drop policy "El comprador abre la conversación sobre un aviso publicado" on public.conversations;

create policy "El comprador abre la conversación sobre un aviso publicado"
  on public.conversations for insert
  to authenticated
  with check (
    auth.uid() = buyer_id
    and not public.blocked_with(seller_id)
    and exists (
      select 1
        from public.listings l
       where l.id = listing_id
         and l.seller_id = conversations.seller_id
         and l.status = 'published'
    )
  );

-- Los mensajes viejos se siguen leyendo. Bloquear corta lo que viene, no borra
-- lo que pasó: lo que se dijo en una negociación es prueba para los dos, y para
-- una denuncia es justamente lo que hay que poder mostrar.

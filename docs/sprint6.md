# Sprint 6 — lo que faltaba para poder abrirla

Los cinco sprints anteriores dejaron la aplicación entera: publicar, buscar, guardar, analizar, estimar y conversar. Este sprint no agrega ninguna función nueva a esa lista. Cierra lo que quedó abierto, que es otra cosa.

Salió de un repaso hecho al terminar el Sprint 5: se leyeron los seis documentos de sprint, el roadmap y la bitácora buscando **qué quedó abierto y no estaba en ninguna lista que alguien mire**. Aparecieron cuatro pendientes que vivían solo adentro del documento del sprint que los dejó, y dos que sí estaban anotados pero con fecha: *antes de que entre gente que no conocemos.*

Este sprint hace los cinco que se pueden hacer hoy. El sexto —los coeficientes de depreciación— no se puede, y el motivo está al final.

---

## 1. El descargo de responsabilidad

Es el pendiente más viejo del proyecto: quedó anotado en el [Sprint 0](sprint0.md) como "alcance legal", volvió a aparecer en el [Sprint 3](sprint3.md) cuando la plataforma empezó a mostrar precios, y no podía seguir abierto el día que alguien tome una decisión de plata mirando un número que le mostramos nosotros.

Es la pantalla [`/legales`](../app/frontend/src/app/legales/page.tsx), enlazada desde el pie de todas las pantallas, desde el panel de precio de referencia, desde el análisis de fotos y desde el login —**antes** de crear la cuenta, no después—.

### No está escrito en abogado, y es a propósito

La plataforma le habla a la gente en castellano en todas las demás pantallas. Un texto legal que nadie lee cumple con la formalidad y no con lo que la formalidad busca, que es que la persona sepa a qué atenerse. Cada punto dice qué hace la plataforma, qué no hace y qué queda en manos de quien la usa:

- **No vendemos vehículos.** No somos parte de la operación, no intervenimos en el pago ni en la entrega, no verificamos identidad, titularidad ni deuda.
- **El precio de referencia sale de precios pedidos, no de ventas.** No es una tasación. No dice si conviene comprar.
- **El análisis de fotos lo hace un programa y se puede equivocar** — en las dos direcciones: puede pasar por alto algo grave y puede marcar como raro algo que tiene explicación.
- **Las publicaciones las escriben las personas que venden**, y no se verifican.
- **Los mensajes son privados, no se editan ni se borran**, y se pueden bloquear y denunciar.
- **Qué datos se guardan**: el teléfono es privado, los guardados son privados, las fotos de un aviso publicado son públicas.
- **Antes de cerrar una operación**: ver el vehículo, informe de dominio, no pagar por adelantado, desconfiar del apuro.

> **Lo escribió esta herramienta, no un abogado.** Está pensado para ser honesto y completo sobre lo que la plataforma hace y no hace, que es lo que faltaba. Antes de una salida a producción de verdad conviene que lo lea alguien del oficio: la responsabilidad civil de un intermediario en una compraventa entre particulares no la define un texto bien redactado.

---

## 2. Bloquear y denunciar

El Sprint 5 abrió un canal de mensajes entre desconocidos y no dejó forma de cortarlo. Ahora, al pie de cada conversación, hay dos acciones.

### Son dos cosas distintas, y ninguna dispara a la otra

**Bloquear corta.** Es una decisión de quien bloquea, tiene efecto inmediato y no interviene nadie. **Denunciar avisa**: no corta nada por sí sola, queda registrada para que alguien la mire.

Se ofrecen juntas porque casi siempre se quieren las dos, pero denunciar no bloquea automáticamente. Hay quien quiere avisar de una estafa y seguir la conversación para no perder el rastro, y hay quien quiere cortar sin denunciar a nadie. Encadenarlas sería decidir por la persona.

### El bloqueo lo aplica la base, no la pantalla

Un bloqueo que solo esconda el campo de escribir no es un bloqueo: es un cartel. Las dos políticas de acceso del Sprint 5 —la que deja escribir un mensaje y la que deja abrir una conversación— se reescribieron para preguntar por el bloqueo. Un pedido armado a mano contra la API rebota igual.

**Y ahí apareció el detalle que ordenó el diseño:** las reglas de acceso de Postgres también se aplican a las consultas que hace una regla de acceso. Un `exists (select 1 from user_blocks ...)` escrito adentro de la política de mensajes correría con la identidad de quien escribe — y quien escribe **no puede ver** la fila de quien lo bloqueó, porque esa fila es de otro. La consulta volvería vacía y el bloqueo no frenaría nada: una regla que se lee bien, compila bien y no sirve para nada.

Por eso la pregunta la hace una función (`blocked_with`) que corre con los permisos de su dueño. Es la única forma de que la base pueda mirar una fila que quien pregunta no puede ver. La función solo responde por pares donde está quien pregunta: preguntar por dos terceros devuelve siempre `false`.

### Corta en las dos direcciones

Quien bloquea deja de recibir, pero tampoco puede seguir escribiendo. Un bloqueo que dejara al que bloqueó mandar mensajes sin poder recibir respuesta no sería cortar una conversación: sería quedarse con la última palabra.

### No se dice quién bloqueó a quién

Quien bloqueó ve que puede deshacerlo. A quien fue bloqueado la pantalla le dice **"No se puede escribir en esta conversación"**, sin decir quién lo decidió. Enterarse no le sirve para nada bueno, y es la clase de dato que empieza discusiones. La tabla de bloqueos acompaña esa decisión: cada uno ve solo los bloqueos que hizo, y nadie puede leer quién lo bloqueó a él.

### Lo que ya se dijeron se sigue leyendo

Bloquear corta lo que viene, no borra lo que pasó. Es la misma razón por la que los mensajes no se editan ni se borran desde el Sprint 5: lo dicho en una negociación es prueba para el otro, y para una denuncia es justamente lo que hay que poder mostrar.

### Las denuncias se leen desde el panel de Supabase

No hay pantalla de moderación, y no la va a haber hasta que haya algo que moderar. Construir una bandeja de denuncias para una comunidad que todavía no existe es moderar el vacío. Lo que sí tenía que existir desde el primer día es la forma de dejar la denuncia.

Los motivos —parece una estafa, me trata mal, publicidad, otra cosa— los manda el servidor, no los escribe la pantalla: son parte de lo que la API acepta. Son pocos y anchos a propósito: una lista larga obliga a quien está incómodo a clasificar lo que le pasó antes de poder pedir ayuda.

---

## 3. El asistente ya puede filtrar por la ficha

Era la última diferencia de capacidad entre las dos puertas de búsqueda: la pantalla del Sprint 4 filtraba por cilindrada, asientos o capacidad de carga, y el chat no entendía *"motos de más de 250cc"*.

La herramienta de búsqueda del asistente tiene ahora un parámetro `ficha`: una lista de `clave`, `operador` (igual, mínimo, máximo) y `valor`. Y el prompt le cuenta **qué campos tiene cada tipo**, leídos del catálogo — un tipo cargado mañana desde el panel de Supabase queda filtrable por sus campos sin tocar código, igual que aparece solo en el formulario.

### Lo que el modelo pide no se valida en el módulo de IA

`chat.ts` copia los filtros de ficha **sin mirarlos** y los manda al backend, que es el que tiene el catálogo. Ahí se traducen al mismo nombre de parámetro que usaría la dirección del navegador (`f_engine_displacement_cc_min=250`) y los valida **la misma función que usa el muro**, `buildSpecFilters`.

No es un rodeo: es lo que evita que las dos puertas empiecen a diferir de a poco. Una validación paralela escrita para el asistente sería la forma más fácil de que dentro de tres meses la barra de búsqueda acepte algo que el chat rechaza. Una clave que el catálogo no declara no llega a la consulta, venga de la dirección o de un modelo.

**Sin tipo de vehículo no hay ficha.** "Motos de más de 250cc" tiene sentido; "vehículos de más de 250cc" no, porque la cilindrada es un campo de las motos y de nadie más. Si el modelo pide filtros de ficha sin decir de qué tipo, se descartan y la búsqueda se hace igual con el resto.

---

## 4. El chat contesta mientras escribe

Quedó afuera del Sprint 2: se mostraba "Pensando…" y la respuesta llegaba entera de golpe.

Ahora el backend manda la respuesta de a pedazos (SSE) y la pantalla la va mostrando. "Pensando…" quedó para el rato en que todavía no llegó ni una letra, que es cuando el asistente está mirando el aviso o buscando publicaciones — y ahí el cartel dice la verdad.

### Una sola implementación, dos presentaciones

`/chat` devuelve la respuesta terminada y `/chat/stream` la va mandando. Por dentro las dos llaman a la misma función: la única diferencia es si alguien mira los pedacitos pasar. Se podría haber escrito el camino rápido aparte, pero dos caminos hacia el mismo lugar terminan con el menos usado roto sin que nadie se entere.

### Dos detalles que no son obvios

**Los encabezados no salen hasta que hay algo que mandar.** Mientras no se escribió un byte, un error todavía puede viajar como una respuesta HTTP normal, con su código y su mensaje, contestada por el manejador de errores de siempre. Si el stream se abriera de entrada, hasta un "falta la clave de Gemini" llegaría como un evento adentro de una respuesta 200 — que es exactamente el tipo de error disfrazado que costó encontrar en el Sprint 2.

**Las partes del turno del modelo se juntan igual.** Desde Gemini 3, cada pedido de herramienta viaja con una firma interna que hay que devolver intacta en la vuelta siguiente. Leyendo la respuesta de a pedazos, esa firma llega repartida: si no se juntan todas las partes, el pedido siguiente vuelve con un 400. Es el error del 2026-08-17, que ahora tenía una forma nueva de volver.

---

## 5. El recorrido del que publica, verificado con cuentas reales

El [Sprint 1](sprint1.md) se cerró con una línea abierta: *"falta verificar el recorrido completo con una cuenta real — publicar, editar, marcar como vendido"*. Requería iniciar sesión, así que quedó para el equipo, y ahí quedó cinco sprints. Mientras tanto se verificaron así la estimación (Sprint 3), los favoritos (Sprint 4) y la mensajería (Sprint 5): el recorrido del que **publica** era la única parte de la aplicación que nadie había mirado andando con un usuario de verdad.

Ahora es un script que se corre a mano —`npm run verificar:recorrido`— y que entra con tres cuentas reales sin usar ninguna contraseña: con la clave de servicio se pide un enlace de acceso de un solo uso y se lo canjea por una sesión. De ahí en adelante llama a la API igual que el navegador, así que las reglas de acceso de la base se aplican tal cual.

Recorre: crear el borrador, no poder publicarlo sin fotos, subir una foto (y no poder subirla a la carpeta de otro), publicar, aparecer en el muro, encontrarse buscando, editar sin que cambie el estado, no poder editar ni borrar lo ajeno, consultar como comprador, bloquear, denunciar, pausar, vender y borrar. Todo lo que crea lleva una marca y se borra al final, incluidas las fotos, la conversación y el bloqueo.

**Lo que encontró la primera corrida** fue un problema de red con Supabase que se presentó como un 500 genérico — el mismo patrón que la bitácora ya tenía anotado dos veces: un fallo de un servicio externo disfrazado de error propio.

---

## 6. Lo que este sprint NO hizo, y por qué

- **Los coeficientes de depreciación siguen sin calcularse con datos propios.** No es falta de tiempo: con setenta publicaciones no hay con qué. Un coeficiente medido sobre esa cantidad de avisos sería tan inventado como el de hoy, pero con cara de haber sido medido, que es peor. Está en [`para_mas_adelante.md`](para_mas_adelante.md), punto 3, con la señal que lo destraba.
- **No hay aviso por mail de un mensaje nuevo.** Necesita un servicio de envío contratado y configurado. Punto 7 del mismo archivo.
- **No se contrató la fuente de precios profesional** ni se resolvió el modelo de negocio: los dos necesitan decisiones y plata, no código.

---

## Cómo se verificó

**La migración 013 quedó aplicada en la base real** y verificada desde afuera, no por lo que dijo el editor.

**El script de recorrido: 47 comprobaciones, todas en verde**, entrando como tres usuarios distintos contra el backend y la base reales. Entre ellas, las que tienen que fallar: publicar sin fotos, subir una foto a la carpeta de otro, editar o borrar un aviso ajeno, ver la conversación de dos desconocidos, escribir con un bloqueo de por medio, denunciar dos veces, consultar por un aviso pausado o vendido, y **leer quién lo bloqueó a uno**.

**El asistente, contra la base real.** Pedirle "motos de más de 180cc" devuelve exactamente las cuatro que superan esa cilindrada —tres Honda CB 190R de 184cc y una Bajaj Rouser NS 200 de 200cc— y deja afuera las de 150, 125 y 110. Pedirle "más de 250cc" no devuelve ninguna, que es lo correcto: no hay.

**El streaming, medido en el navegador.** Los pedazos de una misma respuesta llegan a los 7,0s, 7,1s y 28s: el ritmo lo pone el modelo, que escribe un poco, piensa y termina. Mientras no llegó ni una letra la pantalla dice "Pensando…", y ahí el cartel es cierto.

**Bloquear y denunciar, a mano en la aplicación.** Al bloquear, el campo de escribir se reemplaza por el cartel en un segundo —lo que tarda el pedido— y el enlace pasa a decir "Desbloquear". La primera versión tardaba tres segundos en enterarse porque esperaba a que volviera el hilo entero: ahora lo que ya se sabe se aplica en el acto y el hilo que vuelve manda. Tres segundos con un campo de escribir a la vista es una invitación a escribir un mensaje que va a rebotar.

**La pantalla de términos y el pie**, en escritorio y en celular. Sin rojo ni naranja en ningún estado nuevo, incluido el de conversación bloqueada.

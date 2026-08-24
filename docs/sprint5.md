# Sprint 5 — Mensajería interna

Qué se construyó, qué se decidió y por qué. Las decisiones día por día están en [`../bitacora/bitacora.md`](../bitacora/bitacora.md).

> **Terminado.** Conversaciones entre comprador y vendedor dentro de la plataforma, en reemplazo del contacto por WhatsApp.

## Qué hace

En la ficha de un vehículo que no es propio hay un botón **"Consultar al vendedor"**. Abre una conversación —o vuelve a la que ya existía— y ahí se escribe. La charla vive en `/mensajes`, con una fila por conversación, el último mensaje, cuántos quedaron sin leer y el vehículo del que se habló siempre a la vista.

Las dos navegaciones muestran un globito con los mensajes sin leer.

## La decisión que ordenó el sprint: WhatsApp se va del todo

El Sprint 1.6 había puesto un enlace a WhatsApp con el mensaje ya escrito, y lo había marcado como **provisorio hasta que existiera la mensajería interna**. La opción cómoda era dejarlo abajo como segunda alternativa. Se sacó entero, y por un motivo concreto: mientras el botón de WhatsApp esté, la conversación se va a dar afuera, y todo lo que la plataforma sabe del vehículo —el análisis de las fotos, la estimación de precio— se queda de este lado, sin nadie mirándolo, justo en el momento en que se decide.

Consecuencias que se asumen a propósito:

- **Al vendedor le llegan las consultas solo si entra a la aplicación.** Hoy no hay aviso por mail ni notificación al celular. Es la deuda más clara que deja este sprint y está anotada como lo primero a mirar si la mensajería se usa.
- **El teléfono deja de ser necesario para vender.** Sigue existiendo en el perfil, ahora opcional y privado: no viaja en ningún aviso y no lo ve nadie hasta que su dueño lo escriba en una conversación.

## El teléfono dejó de viajar en cada publicación

Cada aviso del muro traía el teléfono del vendedor, porque la ficha lo necesitaba para armar el enlace de WhatsApp. Sin ese enlace, **seguir mandándolo sería repartir un dato personal que ninguna pantalla muestra**: veinticuatro teléfonos por cada página del muro, a cualquiera que tenga una cuenta.

Salió de la consulta que arma las publicaciones. No hizo falta tocar la base ni el perfil: el dato sigue guardado, simplemente dejó de salir.

## Cómo está guardado

Tres tablas, y cada una existe por un motivo distinto ([migración 012](../supabase/migrations/20260824000001_mensajeria.sql)):

| Tabla | Qué guarda |
|---|---|
| `conversations` | de qué vehículo hablan y quiénes |
| `messages` | lo que se dijeron |
| `conversation_reads` | hasta dónde leyó cada uno |

### Una conversación por vehículo y comprador

No una por persona. Quien vende tres camionetas parecidas necesita saber de cuál le están hablando antes de contestar "¿sigue disponible?", y quien pregunta por cinco necesita saber cuál era esta. Consultar dos veces el mismo aviso **continúa la charla anterior** en vez de abrir una nueva: lo garantiza una clave única en la base, no una comprobación del código.

### La conversación sobrevive al aviso

Es la diferencia con los favoritos del Sprint 4, donde borrar el aviso borra el favorito. Un favorito es un puntero a un aviso; **una conversación es algo que dos personas dijeron, y no le pertenece al aviso**.

Por eso la conversación guarda el título del vehículo **copiado el día que empezó** ("Volkswagen Amarok 2019"), y si el aviso se borra queda con el vehículo en nulo pero se sigue leyendo. La pantalla distingue los dos casos, porque no son el mismo: *el vendedor pausó este aviso* (existe, no se puede abrir) y *el aviso ya no existe*.

### El leído va en su propia tabla, y no es un detalle de diseño

Lo natural sería una columna `buyer_last_read_at` y otra `seller_last_read_at` adentro de la conversación. **No se puede hacer seguro**: las reglas de acceso de Postgres se escriben por fila, no por columna, así que una política que deje al comprador actualizar su columna lo deja también pisar la del vendedor — y con eso, apagarle el globito de mensajes nuevos.

Separado en una tabla con el usuario en la clave, la regla vuelve a ser de fila: *cada uno toca la suya*. La base sola impide lo demás, sin depender de que el backend esté bien escrito.

### Los mensajes no se editan ni se borran

No hay política de UPDATE ni de DELETE sobre `messages`. Lo que se dijo en una negociación es prueba para el otro: si un vendedor pudiera reescribir "te lo dejo en 8.000" después de mandarlo, el historial no serviría para nada. Arrepentirse se resuelve escribiendo otro mensaje, como en cualquier conversación.

### Nadie puede contar cuántos preguntaron por un aviso

Misma decisión que la de los favoritos, por el mismo motivo. No hay ruta que lo devuelva ni política que lo permita: un "12 personas preguntaron por este vehículo" sirve para apurar al que duda, y a quien escribió no se le pidió permiso para contárselo a nadie.

### La lista se arma con una vista, no trayendo todos los mensajes

Dibujar la bandeja de entrada necesita, por conversación, el último mensaje y cuántos quedaron sin leer. Hacerlo desde el código obligaría a traerse **todos los mensajes de todas las conversaciones** para mirar el último de cada una.

Lo resuelve la vista `conversation_overview`, declarada con `security_invoker`. Esa palabra no es opcional: una vista de Postgres corre por omisión con los permisos de quien la creó, y así cualquiera podría leer el último mensaje de cualquier conversación. Con `security_invoker` se lee con la identidad de quien pregunta y las reglas se aplican igual que sobre las tablas.

## Se pregunta cada tanto, no en vivo

El frontend no tiene conexión abierta con la base —habla solo con el backend, como todo el proyecto desde el Sprint 0—, así que los mensajes nuevos aparecen cuando se vuelve a preguntar:

| Dónde | Cada cuánto | Por qué |
|---|---|---|
| El globito de la navegación | 45 s | Es un número en un rincón; nadie está esperándolo. |
| Adentro de una conversación | 10 s | Acá sí hay alguien esperando una respuesta. |

Y **solo con la pestaña a la vista**. Una pestaña olvidada en el fondo no necesita enterarse de nada; al volver a ella se pregunta enseguida, así que el número nunca se ve viejo. Una negociación por un vehículo no es un chat de mensajería instantánea: diez segundos es más rápido de lo que cualquiera escribe una respuesta.

## Detalles que quedaron decididos

- **Comprar y vender van en la misma lista.** No hay dos pestañas: la misma persona hace las dos cosas —se vende un auto para comprarse otro— y separarlas obliga a adivinar en cuál de las dos está el mensaje que se busca. Cada fila dice de qué lado está uno: *te preguntaron por* o *preguntaste por*.
- **Abrir la conversación no manda ningún mensaje.** El botón lleva a la charla; el primer mensaje lo escribe la persona. Un "Hola, me interesa" automático es un mensaje que el vendedor no puede distinguir de un click sin intención.
- **Contestar cuenta como haber leído.** Nadie responde sin haber mirado lo que le escribieron, y dejar la conversación marcada como no leída después de contestar sería un globito que no se apaga nunca.
- **Marcar leído es un pedido aparte.** Pedir la conversación no cambia nada por su cuenta: un pedido que además modifica el estado sorprende, y haría imposible releer un hilo sin apagar el globito.
- **No se consultan avisos pausados ni vendidos.** Misma regla que la de los botones de contacto del Sprint 1.6. Las conversaciones que ya existían siguen abiertas: el aviso salió de circulación, la charla no.
- **Nadie se escribe a sí mismo.** La pantalla no ofrece el botón en el aviso propio, y la base lo prohíbe con una restricción, que es donde tiene que estar.
- **El globito no se dibuja mientras no se sabe cuánto vale.** Un cero que un segundo después salta a tres es peor que esperar — la misma regla de los corazones del Sprint 4.
- **Enter manda y Shift+Enter hace un renglón nuevo**, como en cualquier chat. El botón sigue estando porque en un celular no hay Enter que mande.

## Un efecto colateral: la navegación se quedó sin lugar otra vez

Es la tercera vez ([Sprint 1.6](roadmap.md), [Sprint 4](sprint4.md), y ahora). Con "Mensajes" adentro eran **seis botones en la barra de celular**, y seis en 375px son 62px cada uno: entran a la fuerza y con el texto cortado.

Salió **"Mi perfil"**, que pasó a un botón chico arriba a la derecha, donde en celular solo estaba el logo. Es lo que menos se toca de los seis: los otros cinco son de mirar, publicar y contestar; el perfil se abre una vez cada tanto. La barra sigue teniendo cinco.

## El error que solo se veía abriendo la pantalla

El hilo quedaba **parpadeando en "Cargando…"** y no se llegaba a leer nunca. Las pruebas contra la API pasaban, el proyecto compilaba y la consola no decía nada.

La causa estaba en cómo se pedía el hilo: atado al **objeto de sesión** de la librería de Supabase, que esa librería reemplaza sola cada vez que renueva el token o cuando se vuelve a la pestaña. Cada reemplazo volvía a pedirlo todo desde cero.

El arreglo tiene dos partes y las dos importan:

- El refresco se ata a **quién** está mirando (`session.user.id`), no al objeto de sesión.
- El cartel de "Cargando…" aparece **solo mientras no hay nada que mostrar**. Si el hilo ya está en pantalla, un refresco de fondo no lo reemplaza por un cartel.

**El mismo error estaba en la ficha del vehículo desde el Sprint 1**, donde el refresco silencioso no molestaba lo suficiente como para que alguien lo notara. Se arregló igual: es donde vive el botón nuevo.

Apareció instrumentando la pantalla con registros de cada dibujado, después de que mirar la consola y la red no alcanzara — la red mostraba pedidos cada dos segundos que nadie había pedido.

## Cómo se verificó

Con un script contra la base y el backend reales, entrando como **tres usuarios distintos** —vendedor, comprador y un tercero— y sin usar contraseñas: se pide un enlace de acceso con la clave de servicio y se llama a la API como lo haría el navegador. Treinta comprobaciones, todas en verde. Las que más importan:

| Qué se probó | Resultado |
|---|---|
| Consultar dos veces el mismo aviso | Sigue la misma conversación |
| Un tercero abriendo la conversación | 404, y la base tampoco se la muestra |
| Un tercero escribiendo en ella | 404 |
| Contar cuántos preguntaron por un aviso | 0 — no hay forma |
| El comprador pisando la marca de leído del vendedor | 0 filas; insertarla da `42501` |
| Editar o borrar un mensaje propio | 0 filas |
| Consultar un aviso pausado | Rechazado |
| La conversación de un aviso pausado | Se sigue leyendo, y dice de qué vehículo era |

Y con la aplicación andando: abrir la conversación desde la ficha lleva al hilo vacío **sin mandar ningún mensaje automático**, se escribió con el botón y con Enter, y el globito pasó de vacío a 1 y se apagó al abrir el hilo. Medido a 375, 767 y 768px: exactamente una barra de navegación visible y ningún desborde horizontal.

## Lo que este sprint deja abierto

- **No hay aviso fuera de la aplicación.** Ni mail ni notificación: si el vendedor no entra, no se entera. Es lo primero a resolver si la mensajería se usa, y es también la única ventaja real que tenía WhatsApp.
- **No se puede mandar una foto en un mensaje.** "Mandame una foto del motor" es una de las preguntas más comunes, y hoy se contesta con palabras. La subida a Storage ya existe desde el Sprint 1; falta decidir quién puede ver esas fotos y por cuánto tiempo.
- **No hay forma de denunciar ni de bloquear a alguien.** Mientras la plataforma esté en pruebas no bloquea nada, pero **el día que salga a producción esto no puede faltar**: una plataforma que abre un canal de mensajes entre desconocidos y no da forma de cortarlo está mal terminada. Va junto con el alcance legal en [`para_mas_adelante.md`](para_mas_adelante.md).
- **El asistente no sabe nada de los mensajes**, y es a propósito: leer conversaciones privadas para "ayudar" es exactamente lo que esta plataforma no hace.

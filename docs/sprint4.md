# Sprint 4 — Búsqueda y vista de comprador

Qué se construyó, qué se decidió y por qué. Las decisiones día por día están en [`../bitacora/bitacora.md`](../bitacora/bitacora.md).

> **Terminado.** Búsqueda, filtros por los datos propios de cada tipo, y favoritos.

## Qué hace

El muro —la pantalla principal, la que ya mostraba las publicaciones de todos— **tiene arriba una barra de búsqueda**. Se escribe una marca o un modelo y el mismo listado se recorta. Atrás de un botón "Filtros" están los filtros finos: tipo de vehículo, marca, provincia, moneda, precio desde y hasta, año desde y hasta y kilómetros máximos.

Arriba de los resultados dice cuántos vehículos coinciden, con un "Ver todos" al lado para volver al muro entero.

## La decisión que ordenó el sprint: no hay pantalla de búsqueda

El roadmap decía "pantalla de búsqueda" y se construyó **una barra en el muro**. La diferencia no es de implementación, es de para quién es la pantalla: el que entra ya está mirando vehículos, y mandarlo a un buscador aparte lo obliga a empezar de nuevo en una pantalla vacía. Buscar acá no es ir a otro lado, es ver menos.

Por eso **no existe la ruta `/buscar`**. Una búsqueda es el muro con parámetros: `/?q=corolla&tipo=auto`.

## Lo que se busca vive en la dirección de la página

Los filtros no se guardan adentro del componente: se escriben en la dirección. Eso resuelve tres cosas de una:

- **El botón "atrás" vuelve a los resultados**, no al muro entero. Es el movimiento más común del que compra: mirar un aviso, volver, mirar el siguiente.
- **Una búsqueda se puede pasar por mensaje.** El enlace lleva los filtros puestos.
- **Cada búsqueda queda en el historial**, así que "atrás" deshace el último filtro en vez de sacar al usuario de la aplicación.

El costo es que la pantalla principal necesita envolver al muro en un `Suspense` — Next lo exige para cualquier componente que lea la dirección. Está anotado en el código para que no se borre por parecer de más.

## Un solo lugar decide qué significa cada filtro

Ya existía un motor de búsqueda: lo construyó el Sprint 2 para que el asistente pudiera contestar "mostrame motos hasta dos millones". La tentación era reusarlo tal cual, pero devuelve otra cosa —texto corto, ocho resultados como máximo, sin fotos— porque va adentro de una conversación. El muro necesita la tarjeta completa y paginada.

Lo que se compartió, entonces, **no es la búsqueda entera sino qué significa cada filtro**: [`listing-filters.ts`](../app/backend/src/services/listing-filters.ts) traduce filtros a consulta, y lo usan las dos puertas de entrada. Buscar "volks" encuentra "Volkswagen" escribiéndolo en la barra y pidiéndoselo al asistente, y va a seguir haciéndolo cuando alguien toque una de las dos.

Se verificó midiendo: **el mismo pedido por las dos puertas —camionetas en dólares hasta 25.000— devuelve los mismos cuatro vehículos, en el mismo orden.**

## Detalles que quedaron decididos

- **El total sale de la misma consulta.** Postgres devuelve la cuenta exacta junto con la página, así que "8 vehículos encontrados" no cuesta una segunda consulta.
- **Pesos y dólares no se mezclan.** Filtrar por precio sin elegir moneda compararía 20.000 dólares con 20.000 pesos. El filtro de precio se aplica dentro de la moneda elegida, y está escrito en la pantalla.
- **Un filtro que no existe no muestra el muro entero.** Si la dirección trae un tipo de vehículo o una provincia que no están en el catálogo, la respuesta es vacía. Ignorar el filtro y mostrar todo sería mentir sobre lo que se está viendo.
- **Sin resultados no es lo mismo que sin publicaciones.** Son dos pantallas vacías distintas: una ofrece aflojar la búsqueda, la otra ofrece publicar. Poner "publicá el primero" cuando hay sesenta avisos que no coinciden es no haber entendido nada de lo que pasó.
- **Los tipos de vehículo y las provincias salen del catálogo**, como en el resto de la aplicación. Un tipo nuevo cargado en la base aparece solo en el filtro.
- **El catálogo no bloquea la búsqueda.** Si no carga, la barra de texto sigue funcionando y no se muestra ninguna alarma: sirve para acotar, no para buscar.

---

## Favoritos

Un corazón sobre la foto de cada aviso, un botón "Guardar" en la ficha del vehículo, y la pantalla `/guardados` con lo que uno eligió. **Es la primera parte de la aplicación que existe para el que compra**: todo lo demás gira alrededor del aviso, que lo escribe el que vende.

### La decisión de fondo: los favoritos son privados y no se pueden contar

La tabla `favorites` deja a cada usuario leer, agregar y sacar únicamente sus propias filas. **No hay ninguna regla que permita leer las de otro, ni siquiera contarlas.**

Eso descarta de entrada el clásico "23 personas guardaron este vehículo". No se omitió por falta de tiempo: un contador así sirve para apurar al que duda, que es exactamente la presión que esta plataforma no quiere ejercer, y a quien guarda un aviso nadie le pidió permiso para contárselo al vendedor.

Se verificó midiendo, no leyendo el SQL: con una fila guardada en la base, un cliente sin sesión pide la tabla y recibe **0 filas**, y pedir la cuenta devuelve **0**.

### Qué pasa cuando el vendedor pausa un aviso guardado

La base deja de mostrarlo — eso ya era así desde el Sprint 1.6 y no se tocó. El favorito queda apuntando a algo invisible, y **de ese vehículo no se sabe nada, ni la marca**.

Se podría hacer desaparecer la tarjeta y listo. En su lugar, la pantalla dice cuántos son: *"Un vehículo que guardaste ya no está disponible: el vendedor pausó el aviso."* Es todo lo que se puede decir sin inventar, y es mejor que un guardado que se esfuma sin explicación.

**Un vehículo guardado que se vendió, en cambio, sí se sigue viendo**, con su cartel de vendido. Enterarse de que se vendió es mejor que buscarlo y no encontrarlo nunca más.

### Detalles de los favoritos que quedaron decididos

- **El botón no espera al servidor.** Al apretar, el corazón cambia en el acto y el pedido viaja después; si falla, vuelve solo a como estaba. Guardar es un gesto, no un formulario.
- **Guardar y sacar son idempotentes.** Apretar dos veces rápido no rompe nada: la clave de la tabla es el par usuario-publicación, así que la base misma impide el duplicado. Verificado contra la base: el segundo intento vuelve rechazado.
- **Los guardados se piden una sola vez** para toda la aplicación, no una por tarjeta. Si no, entrar al muro dispararía veinticuatro pedidos para responder una sola pregunta.
- **Mientras no se sabe qué está guardado, no se dibuja ningún corazón.** Un corazón vacío que un segundo después salta a lleno es peor que esperar.
- **No se ofrece guardar el aviso propio.** El dueño ya lo tiene en "Mis publicaciones".
- **Dos pantallas vacías distintas.** No haber guardado nunca nada y tener guardados que hoy están pausados no son lo mismo, y decir el motivo equivocado es peor que no decir nada. El primer intento mostraba las dos cosas a la vez, contradiciéndose; se encontró abriendo la pantalla.

### Un efecto colateral: la navegación se quedó sin lugar

Con "Guardados" adentro quedaron cinco botones en la barra de celular y cuatro en la de escritorio, y los de arriba ya no entraban entre 640 y 768px. **El corte entre las dos barras pasó de 640 a 768**, con el mismo número en las dos para que nunca se vean las dos ni ninguna.

Es el mismo problema que resolvió el Sprint 1.6 y se midió igual: a 375, 700, 767, 768 y 1078px, exactamente una barra visible y ningún desborde horizontal.

---

## Filtrar por los datos propios de cada tipo

Elegido un tipo de vehículo, la barra suma sus campos: cilindrada y estilo en motos, cantidad de asientos y aire acondicionado en buses, capacidad de carga y tipo de caja en camiones. **Los dibuja el catálogo, no una lista escrita en el código** — un tipo nuevo cargado en la base trae sus filtros solo, igual que el formulario de carga se arma solo desde el Sprint 1.

### Solo aparecen con un tipo elegido

Sin tipo no se sabe qué campos hay ni qué significan. "Puertas" no quiere decir lo mismo en un auto que en un camión, y en una moto no quiere decir nada. Un filtro de ficha que llegue en la dirección sin tipo elegido se descarta.

### Tres formas, y ninguna es de texto libre

El catálogo dice qué es cada campo, así que la pantalla tiene tres formas: **número** (desde y hasta), **opción** (lista con "Cualquiera" adelante) y **sí/no** (lista de tres, porque un casillero no sabe decir "me da igual").

No hay campo de texto libre, y no por decisión de diseño: **se miró el catálogo y no existe ni un campo de texto** entre los siete tipos. Diseñar la forma que nadie usa habría sido trabajo inventado.

### Los números se comparan como números, y la diferencia se midió

Postgres puede sacar un dato de la ficha de dos maneras: como texto o respetando el tipo que tiene adentro del JSON. Para los números la diferencia no es cosmética — **como texto, "1000" es menor que "800"**.

Medido contra la base con un filtro de carga mínima de 800 kg:

| Cómo se compara | Resultados |
|---|---|
| Como número | **23 camionetas y camiones** |
| Como texto | 8, y se pierden todas las de 1000 a 1500 kg |

Los filtros numéricos comparan como número. Está anotado en el código con el número al lado, porque es un error que se ve bien y anda mal.

### Las claves salen del catálogo, nunca de la dirección

Lo que viene en la dirección (`f_engine_displacement_cc_min=250`) no se usa para armar la consulta. Se recorren **los campos que el catálogo declara para ese tipo** y, para cada uno, se busca su parámetro. Una clave inventada no llega nunca a la base: no existe entre los campos declarados, así que no se filtra por ella ni se avisa.

Es la misma regla que ya protegía la carga de publicaciones desde el Sprint 1 —un dato que el tipo no declaró no entra—, aplicada ahora a la lectura.

### Un detalle que encontró abrir la pantalla

El título de la sección decía **"Datos del moto"**. Estaba deducido del género por la terminación del nombre, y falla justo con el tipo más común. Ahora usa el plural —"Datos de motos", "Datos de camionetas"—, que no necesita artículo y no puede fallar con ningún tipo, ni con los que se carguen mañana.

---

## Lo que este sprint deja abierto

- **El asistente todavía no puede filtrar por la ficha.** Sabe buscar por tipo, marca, precio, año, kilómetros y provincia, pero no entiende "motos de más de 250cc". Para que pueda, hay que pasarle los campos del catálogo dentro de su herramienta de búsqueda, y eso cambia el prompt. Es la única diferencia de capacidad entre las dos puertas de entrada — lo que ya comparten es **qué significa** cada filtro. **Cerrado en el [Sprint 6](sprint6.md)**, y sin escribir una validación aparte: lo que el asistente pide se traduce al mismo parámetro que usaría la dirección y lo valida la misma función que el muro.

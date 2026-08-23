# Sprint 4 — Búsqueda y vista de comprador

Qué se construyó, qué se decidió y por qué. Las decisiones día por día están en [`../bitacora/bitacora.md`](../bitacora/bitacora.md).

> **En curso.** La búsqueda está terminada y verificada. Los favoritos, que son la otra mitad del sprint, todavía no se empezaron.

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

## Lo que falta del sprint

- **Favoritos** — guardar los vehículos que interesaron y volver a verlos. Necesita una tabla nueva con sus reglas de acceso; es la primera funcionalidad pensada para el comprador y no para el vendedor.
- **Filtrar por campos específicos de cada tipo** (por ejemplo, cilindrada en motos). Los campos viven dentro de la ficha `specs` de cada publicación, así que filtrar por ellos es una consulta distinta de las demás y merece su propia decisión.

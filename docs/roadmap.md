# Roadmap — AIassistant

Los sprints están ordenados por dependencia, no por fecha. Cada uno se apoya en el anterior. No hay fechas fijas todavía — se van a definir cuando el equipo tenga una primera estimación de esfuerzo real.

> **Reescrito el 2026-08-07.** El alcance del proyecto se amplió de "vehículos usados" a **todo el rubro automotor** (cualquier vehículo motorizado terrestre). El cambio llegó antes de escribir el modelo de datos, así que se reordenó el roadmap en consecuencia en vez de arrastrar un diseño pensado solo para autos. Ver [`../bitacora/bitacora.md`](../bitacora/bitacora.md).

---

## Sprint 0 — Base del proyecto ✅

Arquitectura decidida, estructura de carpetas creada, tecnologías elegidas, documentación inicial. Sin código todavía. Detalle en [`sprint0.md`](sprint0.md).

## Sprint 1 — Base multivehículo y flujo completo de publicación ✅

El sprint que convierte el proyecto en una aplicación que funciona de punta a punta, sobre un modelo de datos que soporta cualquier tipo de vehículo.

- ✅ **Modelo de datos extensible.** Catálogo de tipos de vehículo ampliable sin tocar código, campos comunes a todo vehículo y campos específicos por tipo guardados de forma flexible. Detalle en [`modelo_datos.md`](modelo_datos.md).
- ✅ **Login de usuarios** con email y contraseña (Supabase Auth).
- ✅ **Pantalla principal**: el muro con las publicaciones de todos. *Desviación respecto de lo planeado:* las publicaciones propias iban a ser una sección dentro de esta pantalla, pero como pestaña no se encontraban. Se separaron en `/mis-publicaciones`, con su enlace en el encabezado.
- ✅ **Carga de publicación** con selector de tipo de vehículo: los campos específicos aparecen solos según el tipo elegido.
- ✅ **Carga de fotos** a Supabase Storage.
- ✅ **Visualización de la publicación**: vista de detalle con galería, datos comunes y ficha específica del tipo.

Todavía sin análisis de IA — esto es la base de datos y el flujo de carga y visualización funcionando.

## Sprint 1.5 — Cierre del flujo de publicación ✅

No es un sprint nuevo: es terminar lo que el Sprint 1 dejó a medias. Salió de probar la aplicación con datos reales el 2026-08-07.

- ✅ **Editar una publicación.** Pantalla en `/publicar/[id]`, con el mismo formulario que la de crear. Guardar no cambia el estado: un borrador sigue siendo borrador y una publicada sigue publicada — publicar es una acción aparte y explícita.
- ✅ **Reordenar las fotos.** Flechas para mover cada foto y un botón "Hacer principal". Se resolvió con botones y no arrastrando, porque arrastrar falla en celulares y con teclado.
- ✅ **"Mis publicaciones" con pantalla propia.** Pasó de ser una pestaña escondida a la ruta `/mis-publicaciones`, enlazada desde el encabezado, en formato lista y con editar, publicar y borrar a mano. La pantalla principal quedó solo como muro público.
- ✅ **Catálogo de marcas** por tipo de vehículo, con sugerencias al escribir. Se decidió **no** hacer el catálogo de modelos: son cientos por marca, cambian todos los años y no había forma de cargarlos con datos verificables. El modelo sigue siendo texto libre, que es donde menos duele — "Volkswagen / VW" pasa siempre, "Gol / gol" casi nunca.

## Sprint 1.6 — Que el flujo cierre de verdad ✅

Salió de revisar el objetivo del Sprint 1 antes de pasar al 2. El flujo estaba completo para el que **publica**, pero para el que **mira** terminaba sin salida.

- ✅ **Navegación en celular.** Los cuatro botones del encabezado necesitaban 544px y un celular tiene 375: se salían de la pantalla. Ahora hay barra inferior fija en celular, y el encabezado completo de tablet para arriba.
- ✅ **Al menos una foto para publicar.** Un vehículo sin fotos no lo puede evaluar ni un comprador ni la IA del Sprint 2. Los borradores sí pueden quedar sin fotos.
- ✅ **Contacto con el vendedor** por WhatsApp (con el mensaje ya escrito) y por llamada. **Provisorio hasta la mensajería interna.**
- ✅ **Estados vendido y pausado.** Antes había que borrar el aviso al vender, y con él se iba el historial. Un aviso vendido se sigue viendo por enlace pero sale del muro y no deja contactar.
- ✅ **Paginación del muro.** Cortaba en 100 publicaciones sin avisarle a nadie.
- ✅ **Limpieza de fotos huérfanas.** Las fotos de formularios abandonados ya no se acumulan en Storage.

## Sprint 2 — El asistente de IA para el comprador ✅

> **Desviación respecto de lo planeado.** Este sprint iba a ser "análisis de fotos": una función del sistema que le pega una etiqueta a la publicación. Al arrancarlo se replanteó para quién es la IA y pasó a ser **un asistente del comprador**. El motivo está en la [bitácora](../bitacora/bitacora.md) (2026-08-12): el que compra es el que está solo, y una herramienta que le señala defectos a quien publica es una herramienta que quien publica no va a usar.

- ✅ **Botón "Analizar" en cada publicación.** Cualquiera que pueda ver el aviso puede pedirlo, no solo el dueño. Devuelve qué se ve en las fotos, qué no cierra con lo declarado, qué no se puede evaluar y qué preguntarle al vendedor.
- ✅ **El análisis razona según el tipo de vehículo**, leyendo el catálogo. Un tipo cargado desde el panel de Supabase se analiza correctamente sin tocar código — es la misma regla por la que el formulario se dibuja solo.
- ✅ **El resultado se guarda** y se reusa. Si cambian las fotos o los datos declarados, queda marcado como viejo y se ofrece rehacerlo.
- ✅ **Chat del asistente en toda la aplicación.** Sabe qué aviso hay en pantalla, puede citar su análisis y puede buscar entre las publicaciones reales. La conversación sobrevive a la navegación entre pantallas pero no se guarda: vive mientras dura la visita.
- ✅ **Búsqueda de publicaciones con filtros** (tipo, marca, precio, año, kilómetros, provincia), construida como herramienta del asistente. **Adelanta el motor del Sprint 4** — falta la pantalla, no la consulta.

**Lo que a propósito NO hace:** no dice si conviene comprar ni si el precio está bien. Todavía no tiene referencias de mercado contra qué compararlo, y un veredicto sin datos sería una opinión con cara de dato. Se retoma en el Sprint 3.

## Sprint 3 — Estimación de precio ✅

En la pantalla de cada vehículo aparece un **precio de referencia**: qué se está pidiendo por vehículos parecidos, dónde queda este entre ellos y con qué se comparó, aviso por aviso. Detalle en [`sprint3.md`](sprint3.md).

- ✅ **Estimación a partir de las publicaciones propias**, corregidas por año y por kilómetros. Funciona para los siete tipos de vehículo.
- ✅ **Referencia de una fuente externa gratuita**, cargada a una tabla propia por un script. Es la pieza intercambiable: contratar una guía profesional más adelante es cambiar el script que la llena, no la estimación que la lee. **Se muestra pero no juzga el precio pedido**: al medirlo, dejarla decidir marcaba fuera de mercado a uno de cada dos avisos.
- ✅ **Se levantó la restricción del Sprint 2**: el análisis de fotos y el chat ya pueden hablar de precios — pero solo cuando existe una estimación para ese vehículo. El permiso viene del dato, no de una instrucción del prompt.
- ⛔ **La tabla de valuación de la DNRPA se evaluó y se descartó**, por calidad del dato y no por esfuerzo: no se puede saber a qué año corresponde cada precio. El motivo está en [`sprint3.md`](sprint3.md).

**Lo que sigue sin hacer:** camiones, buses y cuatriciclos dependen solo de los avisos propios, porque no hay fuente externa gratuita y legible que los cubra. Y el **descargo de responsabilidad legal** sobre las estimaciones sigue sin definirse — ver [`para_mas_adelante.md`](para_mas_adelante.md).

## Sprint 4 — Búsqueda, filtros y vista de comprador ✅

La visualización pública de publicaciones se adelantó al Sprint 1. Lo que queda acá es todo lo que necesita quien **busca** un vehículo, no quien lo publica. Detalle en [`sprint4.md`](sprint4.md).

- ✅ **Búsqueda por texto y filtros** (tipo de vehículo, marca, provincia, moneda, precio, año y kilómetros), con la cantidad de resultados a la vista.

  *Desviación respecto de lo planeado:* iba a ser una pantalla de búsqueda y terminó siendo **una barra arriba del muro**. El que entra ya está mirando vehículos: mandarlo a un buscador aparte lo obliga a empezar de nuevo en una pantalla vacía. No existe la ruta `/buscar` — una búsqueda es el muro con parámetros (`/?q=corolla&tipo=auto`), lo que además hace que el botón "atrás" vuelva a los resultados.

  El motor lo había construido el Sprint 2 para el asistente. No se reusó entero —devuelve texto corto para leer en una conversación, no tarjetas paginadas—: lo que se compartió es **qué significa cada filtro** (`app/backend/src/services/listing-filters.ts`), y se verificó que las dos puertas devuelven lo mismo ante el mismo pedido.
- ✅ **Filtrado por los campos propios de cada tipo** (cilindrada en motos, asientos y aire acondicionado en buses, capacidad de carga en camiones). Aparecen al elegir un tipo y **los dibuja el catálogo**, no una lista escrita en el código.

  Dos decisiones que quedaron adentro: las claves salen del catálogo y nunca de la dirección —una clave inventada no llega a la base—, y los números se comparan **como números**: como texto, "1000" es menor que "800", y un filtro de carga mínima de 800 kg devolvía 8 resultados en vez de 23.
- ✅ **Favoritos** — un corazón en cada aviso y la pantalla `/guardados`. Es la primera funcionalidad pensada para el comprador y no para el vendedor.

  **Son privados y no se pueden contar**: no hay forma de saber cuántas personas guardaron un aviso, ni siquiera desde la plataforma. Se descartó el contador público de "23 personas guardaron esto" porque sirve para apurar al que duda. Si el vendedor pausa un aviso guardado, la pantalla dice cuántos guardados quedaron sin mostrar en vez de hacerlos desaparecer.

## Sprint 5 — Mensajería interna ✅

Chat entre comprador y vendedor dentro de la plataforma. Detalle en [`sprint5.md`](sprint5.md).

- ✅ **Una conversación por vehículo y comprador**, con la lista en `/mensajes`, el hilo con el vehículo siempre a la vista, leído/no leído y globito de mensajes nuevos en las dos navegaciones.

  Dos decisiones quedaron adentro de la base y no del código: **el leído vive en su propia tabla** —las reglas de acceso de Postgres son por fila y no por columna, así que dos columnas en la misma conversación dejarían a cada uno pisar la marca del otro—, y **los mensajes no se editan ni se borran**, porque lo dicho en una negociación es prueba para el otro.

  La conversación **sobrevive al aviso**: guarda el título del vehículo copiado del día que empezó, así que si el vendedor lo pausa o lo borra la charla se sigue leyendo. Es la diferencia con los favoritos, donde borrar el aviso borra el favorito.
- ✅ **El contacto por WhatsApp se sacó del todo**, como estaba previsto desde que se puso en el Sprint 1.6. Mientras el botón esté, la conversación se da afuera y todo lo que la plataforma sabe del vehículo —el análisis, la estimación— se queda de este lado sin que nadie lo mire.

  *Consecuencia asumida:* al vendedor le llegan las consultas **solo si entra a la aplicación**. No hay aviso por mail ni notificación al celular, y es la deuda más clara que deja el sprint.
- ✅ **El teléfono del vendedor dejó de viajar en cada publicación.** Iba en cada aviso del muro para armar el enlace de WhatsApp; sin ese enlace, seguir mandándolo sería repartir un dato personal que ninguna pantalla muestra. Sigue en el perfil, ahora opcional y privado.

**Lo que no hace:** no avisa fuera de la aplicación, no deja mandar fotos en un mensaje y no tiene forma de denunciar ni bloquear a alguien. Lo último **no puede faltar el día que la use gente que no conocemos** — ver [`para_mas_adelante.md`](para_mas_adelante.md).

---

## Lo que sigue — ponerla online

Con el Sprint 5 terminan los sprints planificados: el flujo cierra de punta a punta para el que publica y para el que compra, con la IA y la estimación de precio en el medio.

Lo que viene no es un sprint más de funcionalidades, sino la decisión tomada el 2026-08-21: **poner la aplicación online y mirar si se usa.** Dos cosas hay que resolver antes de que entre gente que no conocemos, y las dos están en [`para_mas_adelante.md`](para_mas_adelante.md): el **descargo de responsabilidad** sobre las estimaciones y la forma de **denunciar o bloquear** a alguien en los mensajes.

---

## Más adelante — una vez validada la app

Todo lo que se decidió **no hacer hasta ver si la aplicación se usa** vive en [`para_mas_adelante.md`](para_mas_adelante.md), con el motivo de cada postergación y la señal concreta que la destraba: la fuente de precios paga, la cobertura de precios de motos y camiones, el modelo de negocio, el alcance legal y las mejoras de producto que hoy no bloquean nada.

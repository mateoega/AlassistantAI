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

## Sprint 2 — El asistente de IA para el comprador ✅ (actual)

> **Desviación respecto de lo planeado.** Este sprint iba a ser "análisis de fotos": una función del sistema que le pega una etiqueta a la publicación. Al arrancarlo se replanteó para quién es la IA y pasó a ser **un asistente del comprador**. El motivo está en la [bitácora](../bitacora/bitacora.md) (2026-08-12): el que compra es el que está solo, y una herramienta que le señala defectos a quien publica es una herramienta que quien publica no va a usar.

- ✅ **Botón "Analizar" en cada publicación.** Cualquiera que pueda ver el aviso puede pedirlo, no solo el dueño. Devuelve qué se ve en las fotos, qué no cierra con lo declarado, qué no se puede evaluar y qué preguntarle al vendedor.
- ✅ **El análisis razona según el tipo de vehículo**, leyendo el catálogo. Un tipo cargado desde el panel de Supabase se analiza correctamente sin tocar código — es la misma regla por la que el formulario se dibuja solo.
- ✅ **El resultado se guarda** y se reusa. Si cambian las fotos o los datos declarados, queda marcado como viejo y se ofrece rehacerlo.
- ✅ **Chat del asistente en toda la aplicación.** Sabe qué aviso hay en pantalla, puede citar su análisis y puede buscar entre las publicaciones reales. La conversación sobrevive a la navegación entre pantallas pero no se guarda: vive mientras dura la visita.
- ✅ **Búsqueda de publicaciones con filtros** (tipo, marca, precio, año, kilómetros, provincia), construida como herramienta del asistente. **Adelanta el motor del Sprint 4** — falta la pantalla, no la consulta.

**Lo que a propósito NO hace:** no dice si conviene comprar ni si el precio está bien. Todavía no tiene referencias de mercado contra qué compararlo, y un veredicto sin datos sería una opinión con cara de dato. Se retoma en el Sprint 3.

## Sprint 3 — Estimación de precio

Se suma la estimación de precio de mercado, combinando los datos declarados, el análisis de fotos del Sprint 2 y referencias de mercado.

**Es lo que destraba lo que el Sprint 2 dejó explícitamente afuera:** hoy tanto el análisis como el chat tienen prohibido opinar sobre si un precio es razonable, porque no tienen con qué compararlo. Con las referencias de mercado cargadas, esa restricción se levanta.

**De dónde salen las referencias** — decidido el 2026-08-21 tras evaluar las fuentes del mercado argentino, con el criterio de no invertir plata antes de saber si la aplicación se usa:

1. **Las publicaciones de la propia plataforma.** Es la única referencia que cubre los siete tipos de vehículo desde el primer día, son precios que alguien está pidiendo hoy en la Argentina, y mejora sola a medida que entran avisos.
2. **[Arg Autos](https://argautos.com/docs/api)**, API pública y gratuita, como ancla externa para autos, camionetas y utilitarios.
3. **[La tabla de valuación de la DNRPA](https://www.dnrpa.gov.ar/valuacion/valuaciones.php)** solo donde no hay nada mejor — camiones y buses — y presentada como lo que es: un valor oficial de referencia, no un precio de mercado.

Igual que el análisis, la estimación depende del tipo: las referencias de motos y de camiones son distintas y vienen de fuentes distintas.

**La fuente de precios se construye como una pieza intercambiable**, para que contratar una guía profesional más adelante no obligue a reescribir el sprint. Esa contratación y el resto de lo postergado están en [`para_mas_adelante.md`](para_mas_adelante.md).

## Sprint 4 — Búsqueda, filtros y vista de comprador

La visualización pública de publicaciones se adelantó al Sprint 1. Lo que queda acá es todo lo que necesita quien **busca** un vehículo, no quien lo publica:

- Búsqueda por texto y filtros: **tipo de vehículo** primero, más marca, año, rango de precio y ubicación. También filtrado por campos específicos de cada tipo (por ejemplo, cilindrada en motos).

  **Parte de esto ya está hecho.** El Sprint 2 construyó el motor de búsqueda (`app/backend/src/services/listing-search.ts`) para que el asistente pudiera buscar avisos, con todos esos filtros menos el de campos específicos. Lo que falta acá es la pantalla, no la consulta.
- **Favoritos** — guardar los vehículos que a uno le interesaron y volver a verlos en una pantalla propia. Requiere una tabla nueva; es la primera funcionalidad pensada para el comprador y no para el vendedor.

## Sprint 5 — Mensajería interna

Chat entre comprador y vendedor dentro de la plataforma, en reemplazo del contacto por WhatsApp que se sumó en el Sprint 1.6.

Es un sprint propio y no un agregado: necesita tabla de conversaciones y mensajes con sus reglas de acceso, pantalla de conversaciones, estado de leído/no leído y avisos de mensajes nuevos. Se decidió postergarlo para no retrasar la IA, que es lo que diferencia a la plataforma; el enlace a WhatsApp cubre la necesidad mientras tanto.

---

## Más adelante — una vez validada la app

Todo lo que se decidió **no hacer hasta ver si la aplicación se usa** vive en [`para_mas_adelante.md`](para_mas_adelante.md), con el motivo de cada postergación y la señal concreta que la destraba: la fuente de precios paga, la cobertura de precios de motos y camiones, el modelo de negocio, el alcance legal y las mejoras de producto que hoy no bloquean nada.

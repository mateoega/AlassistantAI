# Bitácora — AIassistant

Registro de decisiones importantes, en orden cronológico. Cada entrada lleva fecha y el motivo detrás de la decisión — no solo qué se decidió, sino por qué, para que dentro de unos meses se pueda entender el razonamiento sin tener que preguntarle a nadie.

## Formato de cada entrada

```
## AAAA-MM-DD — Título corto

Qué se decidió, en una o dos frases.

**Por qué:** el motivo o el contexto que llevó a esa decisión.

**Alternativas consideradas:** (si aplica) qué otras opciones se evaluaron y por qué no se eligieron.
```

---

## 2026-08-06 — Arranque del proyecto: Sprint 0

Se definió la arquitectura (Frontend Next.js → Backend Express → Supabase, con un módulo de IA dentro del backend), el stack (todo TypeScript), y el proveedor de IA (Gemini). Se creó la estructura de carpetas y la documentación base. Se cargó la paleta de colores real, extraída del logo del cliente.

**Por qué:** antes de escribir código, el equipo quería tener claro cómo se organiza el proyecto y con qué herramientas, dado que es un equipo chico sin mucha experiencia técnica — priorizando simplicidad sobre escalabilidad en esta etapa.

**Alternativas consideradas:** Next.js como monolito (frontend + backend en un solo proyecto, sin Express separado) — descartado porque diluye la separación entre pantallas y lógica de negocio que el equipo quería mantener clara desde el principio.

Detalle completo de las decisiones de este sprint en [`../docs/sprint0.md`](../docs/sprint0.md).

## 2026-08-07 — Ampliación del alcance: de autos usados a todo el rubro automotor

El cliente amplió el alcance del proyecto. AIassistant deja de ser una plataforma de autos usados y pasa a cubrir **todo el rubro automotor**: autos, camionetas, utilitarios, motos, cuatriciclos, camiones, buses y cualquier vehículo motorizado terrestre que se sume en el futuro. Se actualizaron `vision_general.md`, `roadmap.md`, el `README.md` y `app/CLAUDE.md`.

**Por qué ahora, y no después:** el cambio llegó justo antes de escribir el modelo de datos, que es el momento de costo mínimo. Hoy el proyecto no tiene una sola línea de código ni una tabla creada, así que absorber la ampliación cuesta reescribir tres documentos. Si el mismo cambio hubiera llegado después de tener la base armada alrededor de "auto", habría obligado a rehacer las tablas, migrar los datos ya cargados y tocar todas las pantallas de carga y visualización. Se decidió frenar el arranque del Sprint 1 un día para replantear el diseño antes de construirlo.

**Qué implica en concreto:** el tipo de vehículo pasa a ser una pieza central del modelo de datos, no un campo más. El uso deja de medirse solo en kilómetros — un camión o un cuatriciclo se miden en horas de trabajo — y cada tipo tiene datos propios que un auto no tiene.

## 2026-08-07 — Modelo de datos: catálogo de tipos + ficha flexible por tipo

Los campos comunes a cualquier vehículo (marca, modelo, año, precio, uso, ubicación, vendedor, fotos) van como columnas normales en la tabla de publicaciones. Los tipos de vehículo y los campos específicos que pide cada uno viven en dos tablas de catálogo (`vehicle_types` y `vehicle_type_fields`), y las respuestas a esos campos se guardan en una ficha flexible (una columna JSON llamada `specs`) dentro de cada publicación. El formulario de carga se arma solo leyendo el catálogo.

**Por qué:** el requisito del cliente fue explícito — agregar un tipo de vehículo el día de mañana no puede implicar rediseñar la base. Con este esquema, sumar "motorhome" es cargar una fila de catálogo y sus campos desde el panel de Supabase: el tipo aparece en el selector y su formulario se dibuja solo, sin tocar código ni redesplegar. Al mismo tiempo, dejar los campos comunes como columnas reales mantiene la base rápida y ordenada para buscar, filtrar y ordenar, que es lo que va a necesitar el Sprint 4.

**Alternativas consideradas:** (a) *una tabla por tipo de vehículo* — descartada porque cada tipo nuevo obliga a crear una tabla y tocar código en el backend y el frontend, que es exactamente lo que se pidió evitar; (b) *guardar todo en la ficha flexible, incluso marca y precio* — descartada porque se pierde la capacidad de filtrar y ordenar rápido y nada impide cargar datos sucios en campos críticos; (c) *tabla de atributos sueltos (EAV)* — descartada porque cada consulta necesita muchos cruces, escala mal y los datos quedan ilegibles en el panel de Supabase.

**Riesgo asumido y cómo se cubre:** una columna JSON acepta cualquier cosa por defecto. Por eso el backend valida cada publicación contra el catálogo antes de guardarla: si el tipo declara "cilindrada" como número obligatorio, no entra una publicación sin ese dato o con texto. La flexibilidad está en el esquema, no en la validación.

Detalle completo del modelo en [`../docs/modelo_datos.md`](../docs/modelo_datos.md).

## 2026-08-07 — Dos excepciones a "todo pasa por el backend": login y subida de fotos

El Sprint 0 estableció que el frontend nunca habla directo con Supabase. Se definen dos excepciones acotadas: la **sesión de login** la maneja la librería oficial de Supabase en el navegador (con la clave pública `anon`), y las **fotos suben directo del navegador a Supabase Storage**. Todo lo demás — leer y escribir publicaciones — sigue pasando por el backend.

**Por qué:** en el caso del login, la librería de Supabase está diseñada para manejar la sesión y su renovación del lado del cliente; replicarlo a mano en Express sería reescribir algo que ya funciona y suele hacerse mal. En el caso de las fotos, pasarlas por el backend implica que cada imagen viaje dos veces y que el servidor tenga que manejarlas en memoria, sin ganar nada a cambio. En ambos casos la seguridad no se apoya en el backend sino en las reglas de acceso de Supabase (RLS y políticas de Storage), que ya son la última línea de defensa igual.

El principio de fondo del Sprint 0 se mantiene: **la clave de servicio de Supabase y la clave de Gemini siguen viviendo únicamente en el backend**, y el backend valida el token del usuario en cada pedido. Esta excepción ya estaba contemplada en [`../app/frontend/README.md`](../app/frontend/README.md), que preveía definir explícitamente cuándo conviene que el frontend use la clave pública.

**Alternativas consideradas:** subir las fotos por el backend con `multer` — descartada por el doble viaje de datos y porque agrega manejo de archivos en memoria, más piezas para que fallen en un equipo chico.

## 2026-08-07 — La interfaz pasa a fondo claro, con los mismos colores del logo

Después de probar la aplicación funcionando, se decidió rediseñar la interfaz con fondo claro, al estilo de un clasificado tipo Facebook Marketplace o MercadoLibre, en lugar del fondo casi negro definido en el Sprint 0. Los colores siguen siendo los del logo del cliente: cambió el rol de cada uno, no la paleta. Detalle en [`../diseño/paleta_colores.md`](../diseño/paleta_colores.md).

**Por qué:** en un clasificado, lo que vende son las fotos de los vehículos, y un fondo oscuro compite con ellas en vez de dejarlas respirar. Además, es el lenguaje visual que los usuarios ya conocen de las plataformas donde compran y venden hoy: la familiaridad reduce la fricción. El plateado claro del logo (`#F0F2F5`) resultó ser exactamente el fondo que hacía falta, así que el cambio no obligó a inventar colores.

**Un ajuste técnico que salió de esto:** el azul principal `#2E9EFF` es demasiado claro para llevar texto blanco encima, así que los botones y enlaces usan el azul secundario `#1565C0` y el principal queda para acentos, bordes y foco. Las dos siguen siendo colores del logo.

**Lo que NO cambió:** la regla de no usar rojo ni naranja en ningún estado, ni siquiera en errores. Sigue vigente y ahora está resuelta en un componente compartido para que no se rompa por descuido.

**Alternativas consideradas:** copiar también los colores de Facebook — descartado porque tiraba la identidad que vino del logo del cliente; y mantener el fondo oscuro cambiando solo la disposición — descartado porque el problema de fondo era el contraste con las fotos, no el acomodo de los botones.

## 2026-08-07 — Todos los vehículos se miden en kilómetros

Se elimina el concepto de "horas de uso". Hasta ahora, cada tipo declaraba su unidad y los pesados (cuatriciclo, camión, bus) se medían en horas de trabajo. Ahora todos usan kilometraje, y las columnas que sostenían esa distinción se eliminaron de la base en vez de quedar siempre con el mismo valor.

**Por qué:** al cargar una publicación resultaba confuso que el campo cambiara de nombre según el tipo elegido. Se priorizó que el formulario sea uniforme y previsible por sobre la precisión del dato.

**Reserva registrada:** un camión de trabajo con pocos kilómetros pero muchas horas de motor va a parecer menos usado de lo que está, y ese es justamente el tipo de inconsistencia que el análisis del Sprint 2 debería detectar. La decisión se tomó conociendo esa contra. Si más adelante la IA necesita ese dato, la vuelta atrás es agregar "Horas de uso" como campo específico opcional de esos tres tipos — desde el panel de Supabase, sin tocar código.

## 2026-08-07 — Ningún campo específico es obligatorio

Los campos propios de cada tipo (cilindrada de una moto, ejes de un camión) dejan de exigirse, y en el formulario pasan a una sección "Más detalles" plegada.

**Por qué:** trababan a quien no tenía el dato a mano en el momento de publicar. La fricción al publicar es lo que decide si una plataforma se llena de avisos o queda vacía, y un dato faltante es preferible a una publicación que nunca se carga.

**Lo que se preservó:** el sistema de campos por tipo sigue intacto — era el requisito central del sprint. Cambió cuánto se insiste con ellos, no que existan. Volver a exigir uno puntual es cambiar `is_required` a `true` desde el panel de Supabase.

## 2026-08-07 — Catálogo de ciudades para autocompletar

Se agrega una tabla `cities` con las localidades principales de cada provincia, que el formulario sugiere mientras el usuario escribe.

**Por qué:** sin sugerencias, la misma ciudad termina cargada de cinco formas distintas y los filtros del Sprint 4 no encuentran nada.

**La ciudad se sigue guardando como texto libre**, no como referencia a esa tabla. Es a propósito: la lista tiene las localidades principales, no las miles que existen, y quien vive en un pueblo chico tiene que poder publicar igual. El catálogo ayuda a escribir, no obliga.

**Pendiente relacionado:** marca y modelo siguen siendo texto libre y son los que más van a ensuciar los datos. Queda anotado para una tanda propia.

## 2026-08-08 — Cierre del flujo de publicación: editar, reordenar fotos y administrar lo propio

Se completaron tres huecos que dejó el Sprint 1 y que aparecieron al usar la aplicación con datos reales: editar una publicación, reordenar las fotos, y una pantalla propia para las publicaciones de uno.

**Por qué se trataron como cierre y no como funcionalidad nueva:** sin edición, quien se equivocaba en el precio tenía que borrar todo y volver a subir las fotos. Eso no es una funcionalidad faltante, es un flujo roto.

**Tres decisiones de diseño que salieron de esto:**

- **Guardar cambios no cambia el estado de la publicación.** Un borrador sigue siendo borrador y una publicada sigue publicada. Publicar quedó como acción aparte y explícita, para que nadie muestre algo sin querer al entrar a corregir un precio.
- **Las fotos se reordenan con botones, no arrastrando.** Arrastrar es más elegante pero falla con el dedo en un celular y es inutilizable con teclado. Se priorizó que funcione en todos lados.
- **"Mis publicaciones" pasó de pestaña a pantalla propia** (`/mis-publicaciones`), enlazada desde el encabezado. Estaba como pestaña en la pantalla principal y no se encontraba: quien publicaba algo no sabía dónde volver a verlo. Se muestra en lista y no en grilla porque ahí uno viene a administrar, no a mirar vidriera.

El formulario se extrajo a un componente compartido por crear y editar, para que las dos pantallas no se desincronicen con el tiempo.

## 2026-08-08 — Catálogo de marcas, pero no de modelos

Se agregó un catálogo de marcas por tipo de vehículo, con sugerencias al escribir. **Se decidió no hacer el catálogo de modelos.**

**Por qué las marcas sí:** es donde está el problema real. La misma marca terminaba cargada como "Volkswagen", "VW" y "volkswagen", que para la base son tres marcas distintas. Los filtros del Sprint 4 habrían encontrado un tercio de los vehículos que existen, y para entonces habría publicaciones reales que limpiar a mano. Es barato ahora y caro después.

**Por qué los modelos no:** son cientos por marca, cambian todos los años, y no había forma de cargarlos con datos verificables — se habrían escrito de memoria, con modelos faltantes y errores. Además el problema es mucho menor: "Gol" y "gol" se parecen lo suficiente como para que una búsqueda por texto los encuentre; "Volkswagen" y "VW" no.

**Alternativa considerada:** postergar todo hasta el Sprint 4, cuando haga falta para los filtros — descartada porque el costo de limpiar datos sucios crece con cada publicación que se carga.

La marca se sigue guardando como **texto libre**, igual que la ciudad. El catálogo sugiere pero no obliga: quien vende una marca que no está en la lista tiene que poder publicar igual.

## 2026-08-08 — El flujo tenía salida para el que vende, pero no para el que compra

Al revisar el objetivo del Sprint 1 antes de arrancar el 2, apareció el hueco de fondo: la aplicación estaba completa para el que **publica** y terminaba en una pared para el que **mira**. Un comprador veía el vehículo, le interesaba, y no podía hacer absolutamente nada.

Se cerraron cinco cosas:

- **Contacto con el vendedor** por WhatsApp (con el mensaje ya escrito, incluyendo qué vehículo y a qué precio) y por llamada.
- **Al menos una foto para publicar.** Un vehículo sin fotos no lo puede evaluar ni un comprador ni la IA del Sprint 2. Los borradores sí pueden guardarse sin fotos, porque son trabajo a medio hacer.
- **Estados vendido y pausado.** Antes había que borrar el aviso al vender, y con él se iba todo el historial. Peor: los avisos de vehículos ya vendidos seguían figurando como disponibles, que es la queja número uno en cualquier clasificado.
- **Paginación del muro**, que cortaba en 100 publicaciones sin avisarle a nadie.
- **Limpieza de fotos huérfanas**: las de formularios abandonados quedaban en Storage para siempre.

**Dos decisiones de diseño:** un aviso **pausado** desaparece del muro como si fuera un borrador, pero uno **vendido se sigue viendo** por enlace — quien lo tenía guardado tiene que poder entender que ya se vendió, en vez de encontrarse con una página que no existe. Y `published_at` se conserva al editar, pausar o vender: es la fecha en que el aviso salió al público y no cambia porque después se lo haya tocado.

## 2026-08-08 — La aplicación no entraba en un celular

Los cuatro botones del encabezado (Publicar, Mis publicaciones, Mi perfil, Salir) necesitaban 544px de ancho. Un celular común tiene 375. Se salían de la pantalla, medido.

Se resolvió con **barra de navegación inferior en celular** — Inicio, Publicar, Mis avisos, Perfil — y el encabezado completo de tablet para arriba. "Salir" se mudó a la pantalla de perfil, que es donde se busca y donde no compite por lugar.

**Por qué abajo y no un menú hamburguesa:** es donde llega el pulgar y es lo que hacen las apps de clasificados. Un menú escondido agrega un toque a todo lo que se usa seguido.

**La lección de fondo:** las pantallas estaban escritas con clases responsive desde el principio, pero **nunca se habían mirado en un celular**. Escribirlo no es lo mismo que verificarlo.

## 2026-08-08 — La mensajería interna se posterga al Sprint 5, con WhatsApp como puente

Se evaluó hacer el chat interno ahora. Se decidió postergarlo y resolver el contacto con un enlace a WhatsApp.

**Por qué:** la mensajería no es un botón — es tabla de conversaciones y mensajes con sus reglas de acceso, pantalla de conversaciones, estado de leído/no leído y avisos. Es un sprint entero, y hacerlo ahora empujaba varias semanas la IA de Gemini, que es lo único que diferencia esta plataforma de cualquier otro clasificado.

WhatsApp cubre la necesidad hoy —además es donde la gente ya compra y vende— y queda comprometido como **Sprint 5** en el roadmap, no como un "más adelante" difuso.

**Contra asumida:** el contacto se va de la plataforma, así que no queda registro de la conversación ni se puede medir cuántas consultas genera cada aviso. Se acepta a cambio de llegar antes a la IA.

## 2026-08-08 — Estado al cierre de los Sprints 1, 1.5 y 1.6

Entrada de cierre, para que quien retome el proyecto sepa exactamente de dónde parte sin tener que reconstruirlo leyendo código.

### Qué está construido y andando

**Base de datos (Supabase).** Siete migraciones aplicadas, verificadas contra el proyecto real: catálogos, perfiles, publicaciones y fotos, almacenamiento, kilometraje único y ciudades, marcas, y estados de publicación. Cargado y comprobado: **7 tipos de vehículo, 34 campos específicos, 24 provincias, 265 ciudades y 100 marcas** repartidas por tipo. Todas las tablas con reglas de acceso (RLS) activas.

**Backend (Express + TypeScript).** Catálogos, publicaciones con validación dinámica contra el catálogo, cambio de estado, perfil. Cada pedido actúa con la identidad real del usuario, así que las reglas de la base se aplican siempre.

**Frontend (Next.js + Tailwind).** Siete pantallas: login, muro, publicar, editar, mis publicaciones, detalle y perfil. Interfaz clara con la paleta del logo, navegación inferior en celular, formularios que se arman solos según el tipo de vehículo.

**El requisito central del cliente se cumple:** agregar un tipo de vehículo nuevo es cargar filas de catálogo desde el panel de Supabase. El tipo aparece en el selector y su formulario se dibuja solo, sin tocar código ni redesplegar.

### Qué se verificó y qué no

**Verificado:** ambos proyectos compilan sin errores de tipos; el backend levanta, responde y rechaza pedidos sin sesión; el frontend carga sin errores de consola; no hay desborde horizontal en 375px de ancho; los catálogos se leen de la base real con los acentos correctos.

**No verificado de punta a punta por quien escribe esto:** el recorrido completo con una cuenta real (publicar, editar, marcar vendido, contactar por WhatsApp). Requiere iniciar sesión, que es algo que hace el equipo, no la herramienta.

### Pendientes conocidos

- **Nada está commiteado en git.** Todo el trabajo de estos días está en el disco, fuera del historial. Es lo primero a resolver.
- **El modelo sigue siendo texto libre.** Se decidió no hacer catálogo de modelos; ver la entrada del 2026-08-08 sobre marcas.
- **Sin búsqueda ni filtros** — Sprint 4.
- **Sin mensajería interna** — Sprint 5; hoy el contacto sale por WhatsApp.
- **La carpeta del repositorio se llama `AlassistantAI`**, con una ele donde va una i mayúscula. El proyecto es **AIassistant**. Es el mismo problema tipográfico que se resolvió en la interfaz pintando el "AI" de otro color; la carpeta quedó sin corregir.

### Una lección de proceso que costó dos sesiones

Correr `npm run build` mientras el servidor de desarrollo está levantado destruye la carpeta `.next` compartida y deja la aplicación en pantalla blanca con "Cargando…". Pasó dos veces y las dos parecía un problema de la base o del código. Ya está documentado en el README del frontend, y el `next.config.ts` permite compilar en otra carpeta con `NEXT_DIST_DIR`.

### Lo que sigue

**Sprint 2 — Análisis de fotos con IA.** Es lo único que diferencia esta plataforma de cualquier otro clasificado. Todo lo que necesita ya está guardado: las fotos, el tipo de vehículo y su ficha específica. El prompt tiene que adaptarse al tipo leyendo el catálogo, no con una lista escrita en el código.

## 2026-08-12 — La IA es un asistente del comprador, no una herramienta del vendedor

Al arrancar el Sprint 2 se replanteó para quién es la IA. El roadmap la planteaba como una función del sistema: "análisis de fotos", una etiqueta que se le pega a la publicación. Se decidió que sea **un asistente del comprador**, en dos piezas: un botón "Analizar" en cada aviso, y un chat disponible en toda la aplicación que sabe qué vehículo hay en pantalla y puede buscar entre las publicaciones.

**Por qué:** el que compra es el que está solo. El vendedor ya tiene control sobre su aviso — elige las fotos, escribe la descripción, pone el precio. El que mira tiene que decidir con lo que le muestran, y no tiene forma de contrastarlo. Ahí es donde una segunda opinión cambia algo. Además resuelve un problema de incentivos que la versión orientada al vendedor tenía de raíz: una herramienta que le señala defectos a quien publica es una herramienta que quien publica no va a querer usar.

**Qué implica:** cualquiera que pueda ver un aviso puede pedir su análisis, no solo el dueño. El resultado se guarda una vez y lo aprovechan todos los que miren esa publicación.

**Alternativas consideradas:** (a) *análisis privado del vendedor* — descartada porque el comprador no ganaba nada y se perdía el diferencial de la plataforma; (b) *que el vendedor decida si mostrarlo* — descartada porque un aviso con el análisis oculto pasa a ser sospechoso por omisión, y había que construir la lógica del interruptor para empeorar la señal.

## 2026-08-12 — El análisis no dictamina si conviene comprar

El análisis describe lo que se ve y señala lo que no cierra, pero **no dice si es una buena oportunidad ni si el precio está bien**. Está prohibido explícitamente en el prompt, porque un modelo opina de precios igual si no se le aclara.

**Por qué:** todavía no tiene contra qué comparar. Las referencias de precios de mercado llegan en el Sprint 3. Un veredicto sin esos datos sería una opinión con cara de dato — y la confianza es exactamente lo que la plataforma vende. El resto del análisis (qué se ve, qué falta ver, qué preguntar) es útil igual y no depende de conocer el mercado.

**Se retoma en el Sprint 3**, cuando la estimación de precio le dé la base que hoy no tiene.

## 2026-08-12 — El backend empieza a usar la clave de servicio de Supabase

Hasta el Sprint 1, el backend trabajaba siempre con la identidad real de cada usuario, para que las reglas de acceso de la base se aplicaran solas. Con el Sprint 2 aparece la primera excepción: **los análisis de IA se escriben con la clave de servicio**, y la tabla `listing_analyses` no tiene ninguna política de escritura.

**Por qué:** el análisis es una afirmación de la plataforma sobre un vehículo, no un dato que carga un usuario. Si cualquiera pudiera escribir en esa tabla desde el navegador con la clave pública, un vendedor podría inventarse el análisis de su propio aviso. Eso no es un agujero cualquiera: es exactamente la confianza que la plataforma vende.

**Lo que NO cambió:** las lecturas siguen yendo por el cliente del usuario, así que nadie ve el análisis de un borrador ajeno. La clave de servicio tiene un solo uso permitido en todo el proyecto y está documentado en `app/backend/src/lib/supabase.ts`.

## 2026-08-12 — El análisis se guarda con una huella de lo que analizó

El resultado se guarda (una fila por publicación) y se reusa. Si cambian las fotos **o los datos declarados**, queda marcado como viejo y se ofrece rehacerlo.

**Por qué la huella incluye los datos y no solo las fotos:** si el vendedor corrige el kilometraje, un análisis que decía "el desgaste no cierra con los km declarados" quedó tan obsoleto como si hubiera cambiado una imagen. Mostrarlo como vigente sería justamente el tipo de inconsistencia que la plataforma promete detectar.

**Por qué se guarda en vez de recalcular:** cada análisis cuesta plata y tarda entre diez y treinta segundos. Recalcular por visitante haría que un aviso popular costara una fortuna y cargara lento.

**Detalle que salió de esto:** el análisis corre en segundo plano y el navegador pregunta cada tres segundos hasta que está. No es adorno — si dos compradores aprietan el botón a la vez, el segundo se engancha al que ya está corriendo en vez de pagar un segundo análisis.

## 2026-08-12 — La conversación del asistente no se guarda

El chat mantiene el hilo mientras dura la visita y se pierde al cerrar la pestaña. No hay tabla de conversaciones.

**Por qué:** guardar conversaciones es tabla de mensajes con sus reglas de acceso, pantalla de historial y datos personales que custodiar — buena parte de lo que cuesta la mensajería del Sprint 5. Para validar si el asistente es útil no hace falta.

**Sí se cuidó que la conversación sobreviva a la navegación** entre pantallas: el estado vive en el layout y no dentro del panel. Sin eso, entrar a mirar el vehículo del que se estaba hablando borraba el hilo, y el asistente dejaba de sentirse un acompañante.

## 2026-08-12 — El buscador que usa el asistente se escribió pensando en el Sprint 4

Para que el asistente pueda responder "mostrame motos hasta dos millones", se construyó una búsqueda con filtros (tipo, marca, precio, año, kilómetros, provincia) en `app/backend/src/services/listing-search.ts`.

**Por qué se hizo así y no a la medida del chat:** es la misma consulta que va a necesitar la pantalla de búsqueda del Sprint 4, con otra puerta de entrada. Escribirla acotada al chat implicaba escribirla dos veces.

**Se ejecuta con la sesión del usuario**, no con la clave de servicio: las reglas de acceso siguen mandando aunque el pedido venga de un modelo. Un borrador ajeno no aparece ni aunque el modelo lo pida explícitamente.

## 2026-08-12 — El módulo de IA se mudó de `app/ia/` a `app/backend/src/ia/`

Desvío respecto de la estructura que definió el Sprint 0.

**Por qué:** Node busca las librerías partiendo de la carpeta del archivo que las importa. Desde `app/ia/`, un `import` de `@google/genai` no encontraba nada, porque las dependencias están instaladas en `app/backend/`. Mantenerlo afuera obligaba a darle a la carpeta su propio `package.json`, su propio `npm install` y su propia compilación — tres piezas más para que se desincronicen, en un módulo de cinco archivos y en un equipo que priorizó simplicidad desde el principio.

**Lo que se preservó:** sigue siendo su propia carpeta, con su propio README y su responsabilidad clara. El Sprint 0 ya decía que el módulo de IA "vive dentro del backend y se despliega junto con él"; lo que cambió es dónde está esa carpeta, no la arquitectura.

## 2026-08-17 — La IA quedó verificada andando, y aparecieron dos fallas que solo se ven ejecutando

El Sprint 2 se cerró con la IA **sin probar de punta a punta**: las claves estaban vacías y la migración sin aplicar. Se completó esa verificación con Gemini contestando de verdad. Aparecieron dos fallas, las dos invisibles hasta ese momento porque el proyecto compilaba perfecto con ambas.

**El modelo de Gemini estaba dado de baja.** El código pedía `gemini-2.5-flash` y Google ya no lo entrega: contesta que el modelo "ya no está disponible" y que hay que usar `gemini-3.6-flash`. Se cambió el modelo por defecto en `app/backend/src/config/env.ts`.

**El chat perdía la firma de las llamadas a herramientas.** Desde Gemini 3, cuando el modelo pide usar una herramienta la respuesta viene acompañada de una firma interna que hay que devolverle intacta en la vuelta siguiente. El código rearmaba ese paso desde cero y la perdía, así que Google rechazaba el pedido entero. En pantalla se veía como "ocurrió un problema en el servidor" apenas el asistente intentaba buscar publicaciones — un mensaje que no decía nada del motivo real. Corregido en `app/backend/src/ia/chat.ts`: ahora se reenvía la respuesta del modelo tal cual vino.

**Por qué las dos aparecieron juntas y no antes:** la firma es un requisito que introdujo Gemini 3 y que el modelo anterior no tenía. Actualizar el modelo por obligación destapó la segunda falla. Ninguna de las dos es un error de razonamiento del código del sprint: las dos son consecuencia de que el proveedor de IA se movió debajo del proyecto.

**Qué se verificó, ahora sí:** el análisis del Toyota Supra de prueba detectó que las tres fotos son de autos distintos sacados de internet con patentes extranjeras, que el modelo de las fotos (MK4) no puede ser de 1983, y que el precio y el kilometraje son valores irreales — respetando la restricción de no opinar sobre el precio. El chat ejecutó la búsqueda contra la base real y contestó correctamente que no hay autos en pesos por debajo del monto pedido.

**La lección de proceso, que es la misma del 2026-08-08 con el celular:** escribirlo y que compile no es lo mismo que verificarlo. Un sprint entero de IA pasó los controles de tipos con un modelo que ya no existía.

**Consecuencia para el futuro:** el modelo de IA es una dependencia externa que se mueve sola, sin avisar y sin romper la compilación. Conviene revisarlo cada vez que se retome el proyecto después de un tiempo, antes de suponer que un fallo es del código propio.


## 2026-08-17 — Datos de prueba: un cargador propio, con fotos reales de licencia libre

Antes de arrancar el Sprint 3 se cargaron **unas 70 publicaciones de prueba** en la base, con un script nuevo en [`../app/backend/scripts/`](../app/backend/scripts/README.md). La base tenía dos avisos inventados a mano, y con eso no se puede probar nada de lo que viene.

**Por qué ahora:** el Sprint 3 es la estimación de precio. Estimar es comparar, y comparar necesita **varios avisos del mismo modelo en años y kilometrajes distintos**. Con dos publicaciones sueltas, cualquier cosa que se construya va a parecer que funciona sin que haya forma de saber si acierta. Por eso el catálogo tiene seis Toyota Corolla, seis Hilux, tres Kangoo, tres CB 190R — y dos casos deliberadamente fuera de mercado (un Corolla 2015 con muy pocos kilómetros al precio de uno mucho más nuevo, y una Hilux con 341.000 km a precio de remate) que son los que tienen que hacer ruido cuando la estimación exista.

**Las fotos salen de Wikimedia Commons**, que las publica con licencia libre. No son fotos del vehículo exacto de cada aviso: son del mismo modelo, a veces de otro país. Se registran autor y licencia de cada una en `fotos-usadas.json`.

**Alternativas consideradas para las fotos:** (a) *imágenes generadas con un color y el texto "foto de prueba"* — descartada porque el análisis de IA del Sprint 2 no tendría nada real que mirar, y probar el análisis contra una placa gris no prueba nada; (b) *fotos sacadas de sitios de venta* — descartada por licencia: son de otros, y este repositorio se publica.

**Excepción a la regla de la clave de servicio.** [`../app/CLAUDE.md`](../app/CLAUDE.md) dice que la clave de servicio de Supabase se usa solo para guardar los análisis de IA. Este script la usa también, y es la única excepción: crea publicaciones a nombre de cuatro vendedores distintos, y las reglas de acceso — con razón — no dejan publicar a nombre de otro. Es una herramienta de desarrollo que se corre a mano, no se despliega y ningún usuario la puede invocar. Queda anotado acá para que no se lea como un descuido.

**Por qué es un script y no un `seed*.sql` más:** el SQL no puede subir fotos a Storage ni crear cuentas. Se puede volver a correr todas las veces que haga falta sin duplicar nada: el id de cada publicación se calcula a partir de su clave, así que la segunda corrida actualiza las mismas filas.

**Lo que apareció al correrlo:** Wikimedia corta el paso cuando se le piden muchas cosas seguidas (error 429). La primera corrida dejó 42 avisos sin fotos. Se agregó espera y reintento, y una regla: si un aviso se queda sin fotos, entra como **borrador** en vez de aparecer publicado y vacío — la aplicación no deja publicar sin fotos desde el Sprint 1.6, y los datos de prueba no tienen por qué ser la excepción.

**Cómo quedó la base:** las 71 publicaciones están cargadas, y **48 tienen fotos y se ven** (46 publicadas y 2 vendidas): 24 autos, 14 camionetas, 7 utilitarios, 3 motos y 1 camión. Las 21 restantes quedaron como borrador sin fotos — la descarga se cortó a propósito a mitad de camino, porque con lo cargado ya alcanza para probar y terminar habría llevado media hora más de espera. Los tipos que quedaron sin representación en el muro son **cuatriciclos y buses**, y motos y camiones quedaron flojos. Para completarlos, más adelante y sin rehacer nada:

```bash
npm run seed:demo -- --solo cb190-2019,outlander-2019,o500-2015
```

**Regla que quedó del corte:** ninguna publicación visible se quedó sin fotos. El script degrada a borrador la que no consiguió ninguna, y las siete que habían quedado publicadas y vacías por la corrida fallida se corrigieron.

## 2026-08-21 — El catálogo de prueba quedó completo: 71 avisos, todos con fotos

Se terminó la carga que la entrada anterior había dejado a mitad de camino. La base tiene ahora **71 publicaciones y ninguna sin fotos**: 66 publicadas, 2 vendidas, 2 pausadas y 1 borrador. Los siete tipos de vehículo están representados — 25 autos, 14 camionetas, 11 motos, 7 utilitarios, 6 camiones, 4 buses y 4 cuatriciclos.

**Qué faltaba y por qué:** la corrida del 17 se cortó a propósito con 48 avisos visibles, porque Wikimedia frena los pedidos seguidos y terminar iba a llevar media hora más de espera. Quedaban sin representación cuatriciclos y buses, y flojos motos y camiones — justamente los tipos donde el análisis de IA tiene que comportarse distinto. Se completó con corridas parciales (`--solo`), que es para lo que existe esa opción.

**El único cambio en el repositorio es `fotos-usadas.json`**, que ahora registra autor y licencia de las fotos de las 71 publicaciones. El script no cambió: hizo lo que ya sabía hacer.

**Con esto queda destrabado el Sprint 3.** Estimar un precio es compararlo contra avisos parecidos, y recién ahora hay varios avisos del mismo modelo en años y kilometrajes distintos en todos los tipos, más los dos casos fuera de mercado que se cargaron a propósito para que hagan ruido cuando la estimación exista.

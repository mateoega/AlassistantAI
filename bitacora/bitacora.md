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

## 2026-08-21 — De dónde salen los precios de referencia, y por qué hoy no se paga por ellos

Antes de escribir el Sprint 3 se evaluaron las cuatro fuentes de precios que existen para el mercado argentino. Se probaron de verdad, no se leyeron folletos: es la lección del 17 de agosto, cuando un sprint entero pasó los controles con un modelo de IA que ya no existía.

**Lo que se encontró:**

- **InfoAuto** es la guía oficial del país hace 25 años y cubre los siete tipos con una sola fuente. No publica API ni precios: hay que negociar un contrato de empresa.
- **La tabla de valuación de la DNRPA** es gratis, oficial y cubre todo lo que se patenta en el país — camiones y buses incluidos. Se bajó la tabla vigente (01/08/2026, 217 páginas) y se leyó: trae marca, modelo, tipo y precio año por año desde 0km hasta 2002, en texto que se puede procesar. **Pero son valuaciones fiscales para calcular aranceles de transferencia, no precios de mercado**, y la calidad es despareja: hay entradas congeladas hace años (una moto de 110cc con valor 0km de $49.100) al lado de otras realistas.
- **Arg Autos** es una API pública y gratuita. Se probó de punta a punta: devolvió 58 versiones del Corolla, y el SEG CVT 2015 dio USD 11.976, que es un precio realista. Cubre autos, camionetas y utilitarios; no expone motos, camiones ni buses.
- **MercadoLibre quedó descartada.** Su API de búsqueda ya no es anónima — devuelve 403 sin credenciales — y usar sus precios para alimentar un clasificado que les compite es un problema de términos de uso antes que técnico.

**La decisión: tres capas, ninguna paga.** La propia base como referencia principal (es la única que cubre los siete tipos desde el día uno y son precios que alguien pide hoy), Arg Autos como ancla externa donde llega, y la DNRPA solo para camiones y buses, presentada como valor oficial de referencia y no como precio de mercado.

**Por qué no se contrata InfoAuto ahora:** no está definido cómo monetiza la plataforma, así que un costo fijo mensual no tiene contra qué justificarse. Primero se pone online y se mira si entra gente y la usa. La estimación se construye para funcionar sin fuente paga, y **con la fuente de precios como pieza intercambiable**, para que contratarla después no obligue a reescribir el sprint.

**Consecuencia de proceso.** De esta decisión salió [`../docs/para_mas_adelante.md`](../docs/para_mas_adelante.md): un solo lugar para todo lo que se posterga hasta tener señales de uso real, con el motivo de cada postergación y **la señal concreta que la destraba**. Se escribió así a pedido de Mateo y para que la lista no se convierta en un depósito de deseos: un punto sin señal que lo dispare no se puede decidir nunca. Se le mudaron los pendientes que estaban sueltos al final del roadmap y los dos que arrastraba el Sprint 0 — modelo de negocio y alcance legal.

**Un punto de esa lista conviene no dejarlo para el final:** el descargo de responsabilidad sobre las estimaciones. Es texto, no desarrollo, y hay que resolverlo antes de que la use gente que no conocemos, no después.

## 2026-08-21 — La estimación quedó verificada andando, y las migraciones ahora las aplica Claude

**La primera capa de la estimación funciona.** Se corrió contra la base real y los dos casos que se habían plantado a propósito en los datos de prueba salieron marcados: el Corolla 2015 con pocos kilómetros pedido a USD 27.000 aparece **64% por encima** del rango estimado, y la Hilux con 341.000 km, **20% por debajo**. Los avisos con precio de mercado caen dentro del rango, con desvíos de entre 0% y 3%.

**Se cambió cómo se aplican las migraciones.** Hasta hoy había que entrar al panel de Supabase y pegar el SQL a mano. Mateo se logueó una vez en el navegador integrado y de ahí en adelante las aplica la herramienta sola. Quedó escrito como skill en `.claude/skills/migracion-supabase/`.

Dos cosas que se aprendieron haciéndolo y quedaron anotadas ahí, porque no son obvias: **el portapapeles del sistema no llega al navegador integrado** (copiar y pegar deja el editor vacío), y **tipear el SQL tampoco sirve**, porque el editor cierra paréntesis y comillas solo y corrompe la consulta. Lo que funciona es escribir directo en el editor pasando el archivo codificado.

**Lo que no cambia:** Claude no ingresa credenciales. Si la sesión se cae, se corta y se le pide a Mateo que se loguee.

**Los coeficientes de depreciación terminaron en la base y no en el código.** Estaban escritos como una lista de tipos de vehículo dentro del servicio de estimación, que es exactamente lo que `app/CLAUDE.md` prohíbe: agregar un tipo nuevo no puede obligar a tocar código. Ahora son dos columnas de `vehicle_types` (migración 20260821000001). El efecto secundario es mejor que la corrección: cuando haya datos reales, esos números se van a poder ajustar sin desplegar nada.

**Quedó un script de verificación** (`npm run verificar:estimacion`) que corre la estimación real contra toda la base y muestra qué le da a cada aviso. No es un test automático: es la forma de mirar de un vistazo si el motor está diciendo algo razonable, y de comprobar que los dos casos plantados siguen haciendo ruido después de cada cambio.

## 2026-08-21 — Cuántos avisos parecidos hacen falta para estimar: se midió antes de decidir

La primera versión pedía **tres** comparables. Al verificarla contra la base real, solo 10 de 68 publicaciones recibían estimación. Antes de tocar el número se midieron las dos palancas posibles, en vez de elegir por intuición:

| | Avisos con estimación | ¿Detecta los casos plantados? |
|---|---|---|
| Mínimo 3, ventana ±4 años | 10 de 68 | Sí (+64%, −20%) |
| Mínimo 3, ventana ±6 | 12 de 68 | Sí |
| Mínimo 2, ventana ±4 | 21 de 68 | Sí |
| **Mínimo 2, ventana ±6** | **27 de 68** | Sí (+65%, −21%) |

**Lo que mostró la medición:** el cuello de botella no eran los años, era el mínimo. Ampliar la ventana sola apenas sumaba dos avisos y después saturaba.

**La decisión, que tomó Mateo:** mínimo de dos comparables, con la confianza informada como **"baja"** y los dos avisos usados a la vista. Con uno solo no se estima nunca — un único aviso no es un mercado.

**Por qué se aflojó una regla que el Sprint 2 había puesto:** porque el motivo original sigue respetado. La regla era no dar un número que parezca un dato sin serlo. Un número acompañado de "esto sale de comparar con estos dos avisos" no finge ser más de lo que es; el que decide es el comprador, con la evidencia enfrente.

**Y porque para motos, camiones, buses y cuatriciclos no hay alternativa.** No existe fuente externa gratuita para esos tipos: o se comparan contra los pocos avisos propios, o no tienen estimación en todo el sprint. Con el cambio, las tres Honda CB 190R pasaron a tener estimación, y el precio pedido de cada una cae dentro del rango.

**La lección de proceso:** el número que había puesto la herramienta era defendible y estaba mal para este caso. La diferencia la hizo medirlo contra datos reales, no discutirlo. Por eso quedó el script `npm run verificar:estimacion`: cada vez que se toque un umbral, se vuelve a correr.

## 2026-08-21 — Sprint 3 terminado: la estimación de precio, y una capa que se descartó

Quedó construido, cargado y verificado. El detalle completo está en [`../docs/sprint3.md`](../docs/sprint3.md); acá van las decisiones que no son obvias leyendo el código.

### La tabla de referencias es el contrato, no el proveedor

La fuente externa no se consulta en vivo: un script la baja a una tabla propia (`market_references`) y la aplicación lee de ahí. El motivo inmediato es que la fuente gratuita corta a los pocos pedidos por minuto y no se puede consultar cada vez que alguien mira un aviso.

El motivo de fondo es mejor: **esa tabla es la pieza intercambiable que se prometió al decidir no pagar por datos.** La columna `source` dice de dónde salió cada fila. Contratar InfoAuto más adelante es escribir otro script que llene la misma tabla — la estimación no se entera.

Efecto secundario que no se buscaba: si la fuente desaparece mañana, lo ya cargado sigue sirviendo.

### La capa 3 se probó y se descartó, y el motivo es de calidad, no de esfuerzo

La tabla de valuación de la DNRPA iba a cubrir camiones y buses, que es donde no hay nada gratuito. Se bajó y se intentó leer antes de escribir el cargador.

**No se puede saber a qué año corresponde cada precio.** Cada fila trae una serie de valores por año, pero las filas no arrancan todas en la misma columna: "COROLLA 2.0 SEG CVT" empieza en 54.392.000 y el mismo modelo "MY21" —modelo 2021— empieza en 38.807.100. Al extraer el texto del PDF se pierde la posición de las columnas, así que asignar años sería adivinar, y adivinar mal siempre para el mismo lado.

Sumado a lo que ya se sabía —son valuaciones fiscales, con entradas congeladas hace años—, cargarla habría puesto delante de un comprador un número con cara de dato oficial calculado sobre un año equivocado.

**Es la misma decisión que se viene tomando desde el Sprint 2**, aplicada a un dato en vez de a una opinión: antes que mostrar algo que parece un dato sin serlo, no se muestra nada. El costo está asumido y escrito: camiones, buses y cuatriciclos dependen solo de los avisos propios.

**Cómo se supo:** probándola. Escribir el cargador primero y descubrirlo después habría costado un día y habría dejado la tentación de usarlo igual.

### El permiso de la IA para hablar de precios viene del dato, no del prompt

Al levantar la restricción del Sprint 2 había una forma fácil y una correcta. La fácil era sacar la regla del prompt. La correcta fue **pasarle la estimación junto con los datos del vehículo, y las reglas de cómo hablar de precios en el mismo bloque**: si no hay estimación, no viaja nada y la prohibición del Sprint 2 sigue vigente para ese vehículo.

La diferencia importa porque los prompts se editan y las reglas sueltas sobreviven a su motivo. Con esto, la única forma de que la IA opine de precios es que haya un precio calculado. Quedó anotado en `app/CLAUDE.md` como regla: **no agregar al prompt un permiso suelto para opinar de precios.**

### Un efecto colateral que hubo que resolver: el análisis guardado envejece distinto

El análisis de fotos se guarda y se reusa. Ahora que puede mencionar el precio, un análisis hecho cuando el aviso estaba "20% por encima" queda viejo si hoy está dentro del rango.

Se resolvió metiendo la estimación en la huella del análisis, **pero en grueso**: la posición y la decena de desvío, no el valor exacto. Con el valor exacto, cada publicación nueva de un modelo habría invalidado todos los análisis de ese modelo, y cada análisis cuesta plata.

### La clave de servicio pasa a tener dos usos, y la lista es cerrada

El cargador de referencias necesita escribir en una tabla que —igual que los análisis de IA— **ningún usuario puede escribir desde la aplicación**: un precio de referencia es una afirmación de la plataforma, no un dato que carga alguien.

`app/CLAUDE.md` decía "un solo uso permitido". Ahora dice dos, con la lista completa a la vista y la aclaración de que sumar un tercero es una decisión de arquitectura que va a la bitácora. Se prefirió eso antes que dejar la regla desactualizada, que es como las reglas dejan de cumplirse.

### Qué encontró la carga

De los 40 modelos publicados en la plataforma, la fuente externa conoce 20. Los 19 que no conoce son **motos, camiones, buses y cuatriciclos** — y el script no tiene ninguna lista de tipos de vehículo: simplemente busca, no encuentra y sigue. La regla del proyecto se sostuvo sola.

## 2026-08-21 — La referencia externa informa, pero no juzga: lo dijeron los números

Al terminar la capa 2 quedó una decisión tomada por medición y no por criterio previo, y es la más importante del sprint.

**El diseño original decía:** si no hay avisos parecidos suficientes, estimar con la fuente externa. Parecía obvio — es más cobertura, y la fuente es gratis y anda.

**Lo que mostró correrlo contra la base:** con la fuente externa fijando el rango, **22 de 47 publicaciones quedaban marcadas fuera de mercado**. Comparando solo entre avisos propios eran 5 de 27. Y aparecían casos imposibles: una Nissan Frontier 2020 marcada 106% por encima, una Amarok 2021 marcada 117%.

**El motivo:** la fuente publica valores sistemáticamente más bajos que los precios que se piden, y bastante más bajos en camionetas. No se puede saber cuál de los dos tiene razón sin una tercera fuente — nuestros propios datos de prueba también son inventados.

**La decisión:** la referencia externa **se muestra pero no juzga**. Se sigue devolviendo y se sigue mostrando en pantalla, incluso cuando no alcanza para estimar — es información útil por sí sola. Lo que no hace más es decidir si el precio pedido está bien o mal.

**Por qué así y no bajando el umbral o corrigiendo la fuente:** porque el error que se estaba por cometer no era de precisión, era de tipo. Acusar a uno de cada dos vendedores de pedir de más, con un dato que no está ajustado por kilómetros ni por estado, es exactamente el daño que esta plataforma existe para evitar. Un rango equivocado se corrige; una acusación equivocada se la come el vendedor.

**Lo que costó:** la cobertura vuelve de 47 a 27 publicaciones estimadas. Se paga con gusto.

**La lección, que es la tercera vez que aparece en este proyecto:** la diferencia la hizo correrlo y mirar los números, no razonarlo. El diseño era defendible en el papel y estaba mal.

### Cómo se verificó la pantalla sin poder iniciar sesión

La aplicación pide sesión y la herramienta no ingresa credenciales. Para poder verificar igual, el componente se partió en dos: el que pide los datos y el que dibuja. Con eso se pudo renderizar la pantalla con estimaciones **reales** capturadas del backend, en una página temporal que se borró después.

Se verificó: los cuatro casos (con comparables, fuera de rango, solo con referencia externa, y sin estimación), que no hay rojo ni naranja en ningún estado —incluido el de precio fuera de rango, que es donde más tienta romper la regla—, y que no hay desborde horizontal en 375px.

**La división quedó**, porque es la que permite volver a mirar los cuatro casos sin fabricar publicaciones cada vez.

## 2026-08-21 — La IA hablando de precios, verificada contra Gemini de verdad

Siguiendo la lección del 2026-08-17 —que compile no es que ande—, se probó el asistente contra Gemini real, en los dos casos que importan.

**Con estimación** (el Corolla 2015 sobrevaluado, que pide USD 27.000): citó el rango estimado de USD 15.000 a 17.600, dijo que el precio está 65% por encima, y cuando se le preguntó explícitamente si conviene comprarlo contestó que *"si te conviene o no comprarlo es una decisión personal"*. Mencionó el kilometraje bajo como factor, sin sacar conclusión.

**Sin estimación** (el camión Scania, que no tiene con qué compararse): contestó que *"no tengo la estimación de precio de la plataforma para este Scania, así que no sabría decirte con certeza si los US$ 95.000 están bien"*, y ofreció lo que sí puede hacer — analizar las fotos, buscar camiones parecidos.

**Es exactamente el comportamiento buscado, y por el motivo buscado.** No se calló porque una regla del prompt se lo prohibiera: se calló porque no había dato. Es la diferencia entre una restricción que alguien puede borrar sin darse cuenta y una que se sostiene sola.

## 2026-08-21 — Verificado dentro de la app, con sesión real: tres cosas que solo se ven así

Mateo inició sesión en el navegador integrado y se recorrió la pantalla del Corolla sobrevaluado. El panel de precio cargó con datos reales, marcó el **65% por encima**, listó los cuatro avisos con los que comparó, y el asistente contestó citando el rango y negándose a decir si conviene comprarlo. Sin errores de consola, sin rojo ni naranja, sin desborde a 375px.

Aparecieron **tres cosas que ninguna verificación anterior podía encontrar**, y las tres son de la misma familia: cosas que quedaron diciendo lo de antes.

**Dos textos viejos del Sprint 2.** Abajo del análisis de fotos seguía diciendo *"Todavía no compara precios de mercado"*, y el saludo del asistente, *"No estimo precios de mercado todavía"* — con el panel de precio de referencia justo arriba. Corregidos los dos.

**Un fallo del proveedor disfrazado de error nuestro.** Gemini devolvió 503 —"este modelo está con mucha demanda"— y en pantalla se leía *"Ocurrió un problema en el servidor"*. Eso manda a buscar la falla en el lugar equivocado: no hay nada roto de este lado, hay que esperar un rato. Ahora un 503 o un 429 del modelo se traducen a *"El asistente está con mucha demanda en este momento. Probá de nuevo en unos segundos."*

**Es la tercera vez que este proyecto tropieza con lo mismo:** el 2026-08-17 un modelo dado de baja y una firma de herramientas perdida se presentaron como un error genérico y costaron una sesión encontrarlos. La regla que queda: **cuando el proveedor de IA falla, el mensaje tiene que decir que falló el proveedor.**

**La lección de proceso, en cambio, es nueva:** los textos de la interfaz envejecen con las decisiones y no los agarra ningún control de tipos ni ningún script. La única forma de encontrarlos fue abrir la pantalla y leerla. Conviene releer los descargos y los textos de ayuda cada vez que un sprint levanta una restricción del anterior.

## 2026-08-23 — La búsqueda no es una pantalla: es el muro con menos vehículos

El roadmap decía "pantalla de búsqueda" desde el Sprint 0. **Mateo la cambió antes de que se escribiera una línea:** una barra arriba del muro, en la misma pantalla donde ya están los autos.

El motivo es de producto y es más fuerte que la comodidad de implementar: el que entra ya está mirando vehículos. Mandarlo a un buscador aparte lo hace empezar de nuevo en una pantalla vacía, y lo obliga a saber qué quiere antes de ver qué hay. Buscar acá no es ir a otro lado — es ver menos.

Consecuencia concreta: **no existe la ruta `/buscar`**. Una búsqueda es el muro con parámetros, `/?q=corolla&tipo=auto`.

### Lo que se busca vive en la dirección de la página, y eso no es un detalle técnico

Los filtros podrían haber vivido adentro del componente, que es lo más corto de escribir. Se escriben en la dirección, que cuesta un poco más, por un movimiento que hace todo el que compra: **mirar un aviso, volver, mirar el siguiente.** Con el estado adentro del componente, ese "volver" devuelve el muro entero y la búsqueda se perdió. Con la búsqueda en la dirección, el botón "atrás" vuelve a los resultados.

De yapa, una búsqueda se puede pasar por mensaje: el enlace lleva los filtros puestos.

Lo que cuesta: la pantalla principal tiene que envolver al muro en un `Suspense`, porque Next lo exige para cualquier componente que lea la dirección. Quedó anotado en el código el motivo, para que nadie lo borre por parecer de más.

### Lo que se compartió con el asistente no es la búsqueda: es qué significa cada filtro

El Sprint 2 ya había construido un motor de búsqueda para que el asistente pudiera contestar "mostrame motos hasta dos millones", y el roadmap anotaba que el Sprint 4 lo iba a reusar "tal cual". **Reusarlo tal cual habría estado mal:** ese motor devuelve ocho resultados como máximo, en texto corto y sin fotos, porque va adentro de una conversación. El muro necesita tarjetas con foto y paginadas.

Lo que sí tiene que ser idéntico es **qué significa cada filtro**. Si buscar "volks" encuentra "Volkswagen" en la barra, tiene que encontrarlo también preguntándole al asistente. Así que se separó esa parte a `listing-filters.ts`, que usan las dos puertas de entrada, y cada una se queda con su formato y su tope.

**Se verificó midiendo, no razonando:** el mismo pedido por las dos puertas —camionetas en dólares hasta 25.000— devolvió los mismos cuatro vehículos, en el mismo orden.

### Tres decisiones chicas que se tomaron mirando la pantalla

**Pesos y dólares no se mezclan.** Filtrar por precio sin elegir moneda compara 20.000 dólares con 20.000 pesos. El filtro de precio se aplica dentro de la moneda elegida, y está escrito en la pantalla en vez de quedar como sorpresa.

**Un filtro que no existe no muestra el muro entero.** Si la dirección trae un tipo de vehículo que no está en el catálogo, la respuesta es vacía. Ignorar el filtro y mostrar todo sería mentir sobre lo que se está viendo — es la misma familia de decisión que la del Sprint 2: antes que mostrar algo que parece lo pedido sin serlo, no se muestra nada.

**Sin resultados no es lo mismo que sin publicaciones.** Son dos pantallas vacías distintas. Ofrecer "publicá el primero" cuando hay sesenta avisos que no coinciden con la búsqueda es no haber entendido qué pasó; lo que corresponde ahí es ofrecer aflojar la búsqueda.

### Un tropiezo del compilador que vale anotar

Devolver la consulta de Supabase desde una función `async` la ejecutaba antes de tiempo: una consulta también es una promesa, así que el `await` de quien llamaba la disparaba ahí mismo, sin dejar ordenarla ni paginarla. Lo agarró el control de tipos antes de correr nada. La consulta filtrada ahora vuelve adentro de un objeto, con el motivo escrito al lado para que no parezca una vuelta de más.

### Cómo se verificó

Con la aplicación andando y sesión real: búsqueda por texto (5 Corollas), filtros combinados (8 camionetas en dólares hasta 30.000), "ver más" arrastrando los filtros a la página siguiente (48 de 60), búsqueda sin resultados, ida a un aviso y vuelta con el botón "atrás" —conservó el texto buscado y los 6 resultados—, el asistente contestando con la misma búsqueda por su lado, sin errores de consola y sin desborde horizontal a 375px.

## 2026-08-23 — Favoritos: la primera tabla que existe para el que compra

Hasta hoy todo el modelo de datos giraba alrededor del aviso: lo escribe el que vende, lo lee cualquiera. `favorites` guarda algo que es **del que mira**, y que no le interesa a nadie más.

### La decisión que define la tabla: no se pueden contar

Las reglas de acceso dejan a cada usuario leer, agregar y sacar únicamente sus propias filas. **No hay ninguna política que permita leer las de otro, ni siquiera contarlas.**

Eso descarta el clásico "23 personas guardaron este vehículo". No es una omisión ni algo que se sume después: **ese contador existe para apurar al que duda**, que es exactamente la presión que esta plataforma dice no querer ejercer. Y a quien guarda un aviso nadie le pidió permiso para contárselo al vendedor.

Quedó escrito como regla en `app/CLAUDE.md`: agregar cualquier lectura agregada de `favorites` contradice el diseño.

**Se verificó midiendo, no leyendo el SQL:** con una fila real guardada en la base, un cliente sin sesión pide la tabla y recibe 0 filas, y pedir la cuenta devuelve 0. La misma fila la ve la clave de servicio.

### Qué hacer con un guardado que el vendedor pausó

Desde el Sprint 1.6 un aviso pausado deja de ser visible para todos menos su dueño. Eso convierte a un favorito en un puntero a algo invisible: **no se sabe nada de ese vehículo, ni la marca.**

Lo fácil era hacer desaparecer la tarjeta. Se eligió decir cuántos son —"Un vehículo que guardaste ya no está disponible: el vendedor pausó el aviso"—, que es todo lo que se puede decir sin inventar. Un guardado que se esfuma sin explicación es la clase de cosa que hace desconfiar de una aplicación entera.

**Un guardado que se vendió, en cambio, se sigue viendo** con su cartel de vendido: enterarse es mejor que buscarlo y no encontrarlo nunca más.

### Otra vez: abrir la pantalla encontró lo que el compilador no

La primera versión de la pantalla de guardados mostraba, al mismo tiempo, *"un vehículo que guardaste ya no está disponible"* y *"todavía no guardaste ningún vehículo"*. **Se contradicen.**

El motivo es que había un solo cartel de "vacío" para dos situaciones que no son la misma: no haber guardado nunca nada, y tener guardados que hoy están pausados. Ahora cada una dice lo suyo.

No lo agarra ningún control de tipos, igual que los textos viejos del 2026-08-21. Sigue valiendo la regla: **cuando una pantalla puede estar vacía por más de un motivo, hay que abrirla en cada uno.**

### Un efecto colateral que era predecible y se midió igual

Sumar "Guardados" dejó cinco botones en la barra de celular y cuatro en la de escritorio, y los de arriba ya no entraban entre 640 y 768px. El corte entre las dos barras **pasó de 640 a 768**, el mismo número en las dos.

Es exactamente el problema del Sprint 1.6, así que se midió igual: a 375, 700, 767, 768 y 1078px hay siempre exactamente una barra visible y ningún desborde horizontal. En celular la etiqueta más ancha ("Guardados", 53px) entra holgada en su celda de 75px.

### La migración quedó aplicada y verificada contra la base

Se aplicó con el procedimiento del skill, en el navegador integrado. Después, desde afuera: la tabla existe y responde; guardar dos veces el mismo par usuario-publicación **lo rechaza la base** (23505) sin que el código tenga que preguntarlo; guardar apuntando a un aviso inexistente también (23503).

Y con la aplicación andando: guardar desde el muro escribió la fila real, sacar desde la ficha la borró, tres guardados aparecieron en `/guardados` ordenados del último al primero, y sacar uno desde ahí adentro sacó la tarjeta en el acto. Sin errores de consola en una pestaña limpia.

**Un detalle de método que conviene recordar:** las primeras lecturas de la consola mostraban errores que ya no existían —eran del rato en que el código estaba a medio escribir y el servidor recargaba solo—. Se confirmó abriendo una pestaña nueva, que arranca con la consola vacía. Mirar una consola vieja lleva a arreglar lo que ya está arreglado.

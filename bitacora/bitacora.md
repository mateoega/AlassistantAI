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

## 2026-08-23 — Filtrar por la ficha: el catálogo dibuja, y los números se comparan como números

Última pieza del Sprint 4. Elegido un tipo de vehículo, la barra suma sus campos propios: cilindrada y estilo en motos, asientos y aire acondicionado en buses, capacidad de carga en camiones.

### Lo primero fue mirar el catálogo, no diseñar

Antes de dibujar nada se listaron los campos que existen en los siete tipos. **No hay ni uno de texto libre**: todo es número, opción o sí/no. Eso borró de un saque la forma más incómoda de resolver —un buscador de texto adentro de la ficha— que se iba a construir para nadie.

Quedaron tres formas, y las tres salen del catálogo: número con desde y hasta, opción con "Cualquiera" adelante, y sí/no como lista de tres — **un casillero no sabe decir "me da igual"**.

### El error que se veía bien y andaba mal

Postgres puede sacar un dato de la ficha de dos formas: como texto, o respetando el tipo que tiene adentro del JSON. La primera versión de la prueba dio el mismo resultado con las dos, y por poco se toma como que daba igual.

Daba igual **por casualidad de los datos de motos**: con cilindradas de tres cifras, comparar "184" y "250" como texto ordena igual que como número. Se probó de nuevo con kilos, que llegan a cuatro cifras:

| Filtro: carga desde 800 kg | Resultados |
|---|---|
| Comparando como número | **23** |
| Comparando como texto | 8 |

Como texto, "1000" es menor que "800", así que se perdían **todas** las camionetas de una tonelada — justo las que alguien que filtra por carga está buscando. Los filtros numéricos comparan como número, con el número de la medición anotado al lado en el código.

**La lección no es sobre JSON:** es que una prueba que pasa con los datos que uno eligió no prueba nada. El caso que la rompía estaba a una tabla de distancia.

### Las claves de la ficha salen del catálogo, nunca de la dirección

Lo que viene en la dirección no se usa para armar la consulta. Se recorren los campos que el catálogo declara para el tipo elegido y, para cada uno, se busca su parámetro. Una clave inventada no existe entre los campos declarados, así que no llega nunca a la base.

Es la misma regla que protege la carga de publicaciones desde el Sprint 1 —un dato que el tipo no declaró no entra—, ahora aplicada a la lectura. Quedó anotada en `app/CLAUDE.md`.

### Otra vez un texto que solo se ve abriendo la pantalla

El título de la sección decía **"Datos del moto"**. Lo armaba una regla que deducía el género por la terminación del nombre, y "moto" termina en o.

Se sacó la regla entera en vez de agregarle excepciones: ahora dice el plural —"Datos de motos", "Datos de camionetas"—, que no necesita artículo. **No falla con ningún tipo, ni con los que se carguen mañana**, que es mejor que una regla que acierta casi siempre.

### Lo que este sprint deja abierto a propósito

El asistente **no** puede filtrar por la ficha: no entiende "motos de más de 250cc". Para que pueda hay que pasarle los campos del catálogo dentro de su herramienta de búsqueda, y eso toca el prompt. Es la única diferencia de capacidad entre las dos puertas de entrada; lo que ya comparten —qué significa cada filtro— sigue en un solo lugar.

Se verificó que el asistente siga andando después de tocar ese módulo compartido: pidiéndole camionetas hasta 25.000 dólares devuelve los mismos cuatro vehículos que antes del cambio.

### Cómo se verificó todo lo demás

Contra la base y con la aplicación andando: motos enduro desde 140cc (2 de 10), buses con aire y 40 asientos o más (2, queda afuera el minibús de 19), autos automáticos desde 1.6 litros (7, con los decimales funcionando), camiones volcadores de 3 ejes (ninguno — y se comprobó que cada filtro por separado da 1, así que el vacío es real). Cambiar el tipo de vehículo borra los filtros del tipo anterior. El botón "atrás" vuelve a los resultados con la ficha puesta. Sin desborde horizontal a 375px, tres columnas a 1280, y sin errores de consola en una pestaña limpia.

## 2026-08-23 — Sprint 5: la conversación entra a la plataforma, y WhatsApp se va

Mensajería interna entre comprador y vendedor: `/mensajes` con la bandeja de entrada, el hilo con el vehículo siempre a la vista, leído/no leído y globito de mensajes nuevos. Reemplaza el enlace a WhatsApp que el Sprint 1.6 había puesto **marcado como provisorio desde el día que se puso**.

### Se sacó WhatsApp del todo, y no como una opción más

La alternativa cómoda era dejar el botón abajo, de segunda opción. Se descartó por un motivo concreto: **mientras el botón esté, la conversación se da afuera**, y todo lo que la plataforma sabe del vehículo —el análisis de las fotos, la estimación de precio— se queda de este lado sin que nadie lo mire, justo en el momento en que se decide.

Lo que eso cuesta, asumido y anotado: **al vendedor le llegan las consultas solo si entra a la aplicación.** No hay mail ni notificación. Es la única ventaja real que tenía WhatsApp y quedó como el primer punto a resolver si la mensajería se usa.

### El teléfono dejó de viajar en cada aviso

Efecto colateral que no estaba en el plan y salió de mirar qué quedaba sin dueño: el teléfono del vendedor viajaba dentro de **cada publicación del muro** porque la ficha lo necesitaba para armar el enlace de WhatsApp. Sin ese enlace no lo mostraba ninguna pantalla, así que seguir mandándolo era repartir veinticuatro teléfonos por página a cualquiera con una cuenta.

Salió de la consulta. No hizo falta tocar la base: el dato sigue guardado y el perfil lo sigue pidiendo, ahora declarado **opcional y privado**.

### Dos decisiones que viven en la base y no en el código

**El leído va en su propia tabla.** Lo natural era una columna para cada lado adentro de la conversación, y no se puede hacer seguro: las políticas de Postgres se escriben **por fila, no por columna**, así que la política que deja al comprador actualizar "su" columna lo deja también pisar la del vendedor y apagarle el globito. Con una tabla aparte y el usuario en la clave, la regla vuelve a ser de fila.

Se midió, no se supuso: el comprador intentando adelantar la marca del vendedor afecta **0 filas**, e insertando una a su nombre la base contesta `42501 new row violates row-level security policy`. La marca del vendedor quedó intacta y la propia sí se puede mover.

**Los mensajes no se editan ni se borran.** No hay política de UPDATE ni de DELETE sobre `messages`: lo dicho en una negociación es prueba para el otro. Verificado desde el cliente del usuario — editar y borrar un mensaje propio devuelven cero filas.

**La conversación sobrevive al aviso.** Guarda el título del vehículo copiado del día que empezó la charla, así que si el vendedor pausa o borra el aviso la conversación se sigue leyendo y dice de qué era. Es lo contrario de los favoritos, donde borrar el aviso borra el favorito: un favorito es un puntero a un aviso, una conversación es algo que dos personas dijeron.

### El error que solo se veía abriendo la pantalla

El hilo quedaba **parpadeando en "Cargando…"** y no se llegaba a leer nunca. Andaba en las pruebas contra la API, compilaba, y no había ningún error en la consola.

La causa: el refresco estaba atado al **objeto de sesión** de la librería de Supabase, y esa librería lo reemplaza sola cada vez que renueva el token o cuando se vuelve a la pestaña. Cada reemplazo volvía a pedir el hilo desde cero y volvía a poner el cartel de cargando.

Se arregló en dos partes, y las dos importan: el efecto se ata a **quién** está mirando (`session.user.id`), no al objeto; y el cartel de "Cargando…" aparece **solo mientras no hay nada que mostrar** — si el hilo ya está en pantalla, un refresco de fondo no lo reemplaza por un cartel.

**El mismo error estaba en la ficha del vehículo desde el Sprint 1** y nadie lo había visto: ahí el refresco silencioso no molestaba lo suficiente como para notarlo. Se arregló igual, porque es donde vive el botón nuevo.

**Cómo apareció:** instrumentando la pantalla con registros de cada render y cada corrida del efecto, después de que mirar la consola y la red no alcanzara. La red mostraba pedidos cada 2 segundos que nadie había pedido.

### Cómo se verificó

Con un script contra la base y el backend reales, entrando como **tres usuarios distintos** —vendedor, comprador y un tercero— sin usar contraseñas: se pide un enlace de acceso con la clave de servicio y se llama a la API como lo haría el navegador. **30 comprobaciones, todas en verde**, entre ellas:

- Consultar dos veces el mismo aviso sigue la misma conversación, y no abre una nueva.
- Al vendedor le aparece con 1 sin leer; leerla la apaga; contestar cuenta como haber leído.
- Un tercero no puede abrir la conversación (404), ni escribir en ella (404), ni verla desde la base, ni **contar** cuántos preguntaron por un aviso.
- Un aviso pausado no se puede consultar, pero la conversación que ya existía se sigue leyendo y dice de qué vehículo era.

Y con la aplicación andando: se abrió una conversación desde la ficha de un vehículo —lleva al hilo vacío, sin mandar ningún mensaje automático—, se escribió con el botón y con la tecla Enter, el mensaje apareció en el acto, y el globito de la navegación pasó de vacío a 1 y volvió a apagarse al abrir el hilo.

### La navegación se quedó sin lugar, por tercera vez

Sprint 1.6, Sprint 4 y ahora. Con "Mensajes" eran **seis botones en la barra de celular**, y seis en 375px son 62px cada uno, con el texto cortado.

Salió **"Mi perfil"**, que pasó a un botón chico arriba a la derecha —en celular el encabezado solo tenía el logo—. Es lo que menos se toca de los seis. Medido a 375, 767 y 768px: **exactamente una barra visible, cinco botones de 75px justos, y ningún desborde horizontal.**

Un detalle más que salió de mirar: el globito decía **"1 mensajes sin leer"**. Ahora dice "1 mensaje" cuando es uno.

## 2026-08-24 — Repaso de pendientes: lo que arrastraban los cinco sprints

Con el Sprint 5 cerrado se revisaron los seis documentos de sprint, el roadmap, la bitácora y el código buscando una sola cosa: **qué quedó abierto y no está en ninguna lista que alguien mire.**

**Lo que apareció.** Cuatro pendientes reales que vivían solo adentro del documento del sprint que los dejó abiertos, y que por eso no figuraban en `para_mas_adelante.md`:

- El **asistente no puede filtrar por los campos de la ficha** (Sprint 4). Es la única diferencia de capacidad entre las dos puertas de búsqueda.
- Los **coeficientes de depreciación son provisorios** (Sprint 3): salen del mercado en general, no de datos propios.
- El **chat no contesta escribiéndose** (Sprint 2).
- El **recorrido del que publica nunca se verificó con una cuenta real** (Sprint 1): publicar, editar, marcar vendido.

**Adónde fue cada uno, y por qué no todos al mismo lado.** Los tres primeros esperan una señal de uso real, así que entraron a [`para_mas_adelante.md`](../docs/para_mas_adelante.md) con la señal que los destraba —los coeficientes como punto propio, los otros dos entre las mejoras que hoy no bloquean nada—. El cuarto **no espera ninguna señal**: es trabajo de media hora que nadie hizo. Meterlo en un archivo que arranca diciendo "esto es lo que se decidió no hacer hasta ver si la app se usa" habría sido esconderlo con buena letra. Fue al final del [roadmap](../docs/roadmap.md), junto al descargo de responsabilidad y a denunciar y bloquear: **las tres cosas que hay que hacer antes de poner la aplicación online.**

**Un error de numeración que se arrastraba.** `para_mas_adelante.md` decía que denunciar y bloquear "va junto con el punto 6" —el aviso por mail— cuando las dos cosas que destraban salir de pruebas son el descargo y el bloqueo. Corregido, junto con la renumeración que trajo el punto nuevo.

**Y una documentación que había quedado vieja.** El README del módulo de IA seguía diciendo *"Sprint 3 (pendiente)"* y que la IA "hoy tiene prohibido opinar" de precios — dejó de ser cierto hace tres sprints, cuando `price-context.ts` levantó esa restricción. Era el único lugar del repositorio desactualizado: el README raíz, `app/CLAUDE.md` y el roadmap estaban al día. Ahora dice lo que el módulo hace y lo que sigue sin hacer, con el archivo que faltaba en la tabla.

## 2026-08-24 — Sprint 6: se cierran los pendientes de los cinco sprints

El repaso de la mañana encontró seis cosas abiertas. Cinco se hicieron hoy; la sexta no se puede hacer todavía y el motivo importa más que la lista.

### El descargo de responsabilidad, que venía del Sprint 0

Es la pantalla `/legales`, enlazada desde el pie de todas las pantallas, desde la estimación, desde el análisis y desde el login —antes de crear la cuenta, no después: un descargo que solo se lee estando adentro llega tarde—.

**Está escrito en castellano y no en abogado.** La plataforma le habla a la gente en castellano en todas las demás pantallas; un texto legal que nadie puede leer cumple con la formalidad y no con lo que la formalidad busca. Dice qué hace la plataforma, qué no hace, y qué queda en manos de cada uno: que el precio de referencia sale de precios pedidos y no de ventas, que el análisis lo hace un programa que se puede equivocar en las dos direcciones, y que las publicaciones las escriben las personas que venden.

**Lo escribió Claude, no un abogado.** Queda anotado acá y en `para_mas_adelante.md`: antes de una salida a producción de verdad tiene que leerlo alguien del oficio. La responsabilidad civil de un intermediario en una compraventa entre particulares no la define un texto bien redactado, por honesto que sea.

### Bloquear y denunciar, y el error que casi se cuela

Son dos cosas separadas y ninguna dispara a la otra: bloquear corta en el acto y lo decide la persona; denunciar deja constancia. Encadenarlas sería decidir por quien está del otro lado.

**El detalle que ordenó el diseño** es que las reglas de acceso de Postgres también se aplican a las consultas que hace una regla de acceso. La versión obvia de la política —un `exists (select 1 from user_blocks ...)` adentro de la política de `messages`— corre con la identidad de quien escribe, y quien escribe **no puede ver** la fila de quien lo bloqueó, porque esa fila es de otro. La consulta habría vuelto vacía siempre: una regla que se lee bien, compila bien y no frena nada.

Por eso la pregunta la hace `blocked_with`, una función `security definer` que solo responde por pares donde está quien pregunta. Es el mismo tipo de trampa que la vista `conversation_overview` del Sprint 5, donde faltaba `security_invoker`: **el modo por omisión de Postgres es el equivocado en las dos, y en direcciones opuestas.**

Tres decisiones más quedaron adentro: el bloqueo **corta en las dos direcciones** —dejar al que bloqueó seguir escribiendo sin poder recibir respuesta sería quedarse con la última palabra—, **no se dice quién bloqueó a quién** —a quien fue bloqueado se le dice que ahí no se puede escribir, y nada más—, y **los mensajes viejos se siguen leyendo**, porque para una denuncia son justamente lo que hay que poder mostrar.

Las denuncias se leen desde el panel de Supabase. No hay pantalla de moderación y no la va a haber hasta que haya algo que moderar.

### El recorrido del que publica, verificado cinco sprints después

El Sprint 1 lo dejó anotado como no verificado y ahí quedó. Ahora es `npm run verificar:recorrido`: entra con tres cuentas reales sin usar contraseñas, recorre publicar, editar, consultar, bloquear, denunciar, pausar, vender y borrar, y limpia todo lo que crea. **47 comprobaciones, todas en verde.**

Es el tercer uso de la clave de servicio en el proyecto y quedó documentado en `app/CLAUDE.md`: se usa para pedir los enlaces de acceso de un solo uso y para la limpieza final. Todo lo que verifica lo hace después con la sesión de cada usuario.

**Lo que encontró la primera corrida** no fue un error del código sino de la red: un `fetch failed` contra Supabase que llegó a la pantalla como "ocurrió un problema en el servidor". Es la tercera vez que esta bitácora anota lo mismo — un fallo de un servicio externo disfrazado de error propio.

### Dos cosas más que estaban en la lista de "no bloquean nada"

**El asistente ya filtra por la ficha.** Se verificó contra la base: "motos de más de 180cc" devuelve exactamente las cuatro que superan esa cilindrada y deja afuera las de 150, 125 y 110. Lo que el modelo pide se traduce al mismo parámetro que usaría la dirección del navegador y lo valida la misma función que el muro — escribir una validación aparte para el asistente sería la forma más fácil de que las dos puertas empiecen a diferir de a poco.

**El chat contesta mientras escribe.** Los pedazos llegan a los 7,0s, 7,1s y 28s: el ritmo lo pone el modelo. Dos detalles quedaron adentro: los encabezados del stream **no se mandan hasta que hay algo que mandar**, para que un error anterior al primer byte siga viajando como una respuesta HTTP normal en vez de como un evento dentro de un 200; y las partes crudas del turno se juntan igual, porque ahí viaja la firma que Gemini 3 exige devolver intacta — el error del 2026-08-17, con una forma nueva de volver.

### Lo que NO se hizo, y por qué

**Los coeficientes de depreciación siguen sin calcularse con datos propios.** Con setenta publicaciones no hay con qué: un coeficiente medido sobre esa cantidad de avisos sería tan inventado como el de hoy, pero con cara de haber sido medido. Sigue en `para_mas_adelante.md` con la señal que lo destraba.

### La migración 013 quedó aplicada y verificada

Aplicada desde el panel y comprobada desde afuera con el script, que es lo que vale: que el editor diga "Success" no alcanza.

## 2026-08-26 — La aplicación online, y el muro que deja de pedir cuenta

Dos cosas en el mismo día, y la segunda salió de mirar la primera andando.

### Primero, ponerla online

El [roadmap](../docs/roadmap.md) tenía el despliegue como lo único pendiente después del Sprint 6. Quedó en dos plataformas: el backend en Render, el frontend en Vercel. El procedimiento entero está en [`despliegue.md`](../docs/despliegue.md).

**Son dos plataformas porque son dos aplicaciones.** La tentación era Vercel sola y un panel único, y se descartó por dos números que ya estaban medidos en esta bitácora: el chat contesta por SSE con pedazos que llegan a los 28s, contra un tope de 60s por invocación en las funciones del plan gratuito — anda, pero sin margen para el día que el modelo se demore. Y `photos.ts` redimensiona con sharp, que es lo más pesado del proyecto y no quiere arrancar en frío en cada pedido. El backend ya era un servicio de larga vida: se lo dejó siéndolo.

**Tres cosas del código no hubo que tocarlas**, y por suerte, porque son las que suelen obligar a una rama para producción: las direcciones ya salían del entorno con `localhost` solo como valor por omisión; `dotenv` no pisa lo que ya existe, así que donde no hay archivo los valores salen del panel; y `next.config.ts` lista una por una las variables que pasa al navegador, sin la clave de servicio ni la de Gemini.

**La trampa fue el orden.** `NEXT_PUBLIC_API_URL` se hornea al compilar el frontend: queda escrita adentro de los archivos que baja el navegador. Cambiarla no es tocar una variable en un panel, es volver a desplegar. Por eso el backend primero.

**Quedó una asimetría anotada:** el backend se despliega solo con cada push; el frontend no, porque la cuenta de Vercel no tiene vinculado un acceso de GitHub y `vercel link` no pudo conectar el repositorio. Se va a cobrar sola el día que alguien pushee un cambio de pantalla y no lo vea.

### Y después, mirar la pantalla de login y darse cuenta

Con la aplicación arriba, lo primero que ve cualquiera es un formulario de login. **Para ver un solo aviso había que crear una cuenta.** En un clasificado esa es la barrera más cara que existe: quien busca un auto no se registra para mirar, mira y después decide.

La regla nueva es corta: **mirar no necesita cuenta; hacer, sí.** Se abren el muro, la búsqueda, la ficha, el precio de referencia, el análisis ya hecho y el chat del asistente. Siguen pidiendo sesión guardar, escribirle al vendedor, publicar, editar, borrar y **pedir un análisis nuevo** — cada análisis es una llamada paga al modelo.

**Del chat se dejó constancia del costo.** Se ofreció dejarlo detrás del login por eso mismo y la decisión fue abrirlo: la duda la tiene la persona en el momento en que mira el vehículo, no después de registrarse. Hoy no hay límite por IP y está escrito en el propio `routes/assistant.ts`: si la factura de Gemini aparece rara, ese es el primer lugar donde mirar.

**El detalle que ordenó la migración fue el nombre del vendedor.** El muro lo trae con un join a `profiles`. Para que una visita anónima lo vea hay que abrirle esa tabla, y ahí está la trampa: **las reglas de acceso de Postgres son por fila, no por columna.** Una política `using (true)` no deja pasar el nombre, deja pasar la fila entera — con el teléfono adentro, que el Sprint 5 hizo privado justamente para que dejara de repartirse solo.

La herramienta correcta para recortar columnas no es la política, son los permisos de tabla: `revoke select on profiles from anon` y después `grant select (id, display_name)`. Hacen falta las dos, y es la contracara exacta de lo que apareció en el Sprint 6 con `blocked_with`: allá el modo por omisión de Postgres era demasiado estrecho y había que rodearlo, acá es demasiado ancho y hay que recortarlo. **En las dos, el modo por omisión era el equivocado.**

### Un error de cinco sprints que apareció de paso

Al leer las políticas para escribir las nuevas apareció otra cosa. El Sprint 1.6 amplió la de `listings` a `('published', 'sold')` para que un aviso vendido se siguiera viendo por enlace — pero no tocó la de `listing_photos`, que siguió exigiendo `published`. **Un aviso vendido se abre con todos sus datos y sin una sola foto**, y así estuvo desde el 2026-08-08.

Nadie lo reportó porque para verlo hay que abrir por enlace directo un aviso vendido que no es tuyo, que es exactamente el caso que nadie prueba a mano. Va arreglado en la misma migración, y la regla que deja es que `listing_photos` y `listing_analyses` heredan la visibilidad de su publicación: si cambia la de arriba, se revisan las de abajo.

### Cómo se verificó

`npm run verificar:acceso`, un script nuevo que consulta con la **clave anónima** y no con la de servicio — con la de servicio esto no probaría nada, porque esa clave se saltea las reglas. **13 comprobaciones, todas en verde:** ve los 68 avisos con fotos y nombre del vendedor, y no ve borradores, pausados, favoritos ni mensajes. El teléfono lo rechaza la base, no la pantalla.

## 2026-08-27 — Ajustes de cliente antes del MVP

Primera tanda de cambios que no salen de un sprint sino de mirar la aplicación andando: dos los notó Mateo usándola y uno lo pidió el cliente.

### El zoom que parecía un error de resolución

El síntoma era claro y engañoso: se toca algo, se pasa a otra pantalla y la pantalla nueva se ve agrandada, como una foto a la que hay que hacerle zoom out. Parecía la aplicación calculando mal el tamaño de la pantalla.

No era eso, y conviene que quede escrito porque el reflejo es buscar un desborde. **Se midió el sitio online a 375px de ancho y la página mide exactamente 375**: no hay nada que se salga. Lo que pasa es de iPhone — **Safari agranda la pantalla solo al enfocar un campo cuyo texto mide menos de 16px, y no la vuelve a achicar cuando el campo pierde el foco.** El zoom queda puesto y sobrevive a la navegación, así que el error se ve en una pantalla que no tiene ningún campo.

Todos los campos de la aplicación usaban `text-sm`, que son 14px. Va arreglado con **una sola regla en `globals.css`** y no campo por campo: son más de treinta y un campo nuevo también tiene que quedar cubierto. La regla vive **fuera de toda capa de Tailwind**, que es lo que la deja ganarle a `text-sm` sin `!important`, y se corta en 639px: de tablet para arriba los campos siguen midiendo 14px, porque ahí ningún navegador agranda nada.

Verificado a los dos anchos: 16px a 375, 14px a 750.

### El asistente ahora saluda primero

Al abrir el chat lo primero que había era un texto de pantalla vacía explicando para qué servía la caja. Ahora es **un globito del asistente**, con el mismo componente que el resto de los mensajes: quien lo abre por primera vez ve que del otro lado ya le hablaron.

**El saludo no se le manda al modelo.** Vive solo en la pantalla y `messages` sigue arrancando vacío, así que no viaja en el historial ni gasta una llamada. Lo que el asistente contesta sigue saliendo de su prompt, que está en el backend.

### Los términos: de leerse en todas las pantallas a aceptarse una vez

Este es el cambio de fondo, y es una decisión de producto del cliente que **da vuelta lo que hizo el Sprint 6**.

El Sprint 6 puso el descargo a la vista en todas partes: en el pie de cada pantalla, debajo del análisis, debajo de la estimación de precio y en el login. La idea era que nadie pudiera decir que no lo había visto. En la práctica el cliente lo leyó como ruido: un cartel legal que aparece todo el tiempo deja de informar.

**La regla nueva es que los términos se aceptan una vez, y después no vuelven a aparecer.** Se sacaron los cuatro párrafos con sus enlaces "Qué alcance tiene". Queda un solo enlace discreto en el pie, para el que los quiera releer.

En su lugar, dos puertas:

1. **Un cartel en la primera visita**, una vez por navegador. No aparece en `/legales` —taparlo sería pedir que acepten algo que no los deja leer— ni en `/login`, donde la casilla del formulario ya lo pregunta.
2. **Una casilla obligatoria al crear la cuenta.** Es `required`, así que el navegador no deja enviar el formulario sin tildarla.

**La constancia se guarda en dos lados y por motivos distintos.** En el navegador, que es el único lugar posible para quien mira sin cuenta —el muro, la ficha, el precio y el asistente se abren sin sesión, así que no hay a quién atar la aceptación—; y en `profiles.terms_accepted_at`, que sí sobrevive al navegador. La consecuencia asumida: **el que mira sin cuenta y borra los datos del navegador vuelve a ver el cartel.** No hay forma de evitarlo sin pedirle una cuenta para mirar, que es justamente lo que el 2026-08-26 se decidió no hacer.

**La fecha la pone el servidor, nunca el navegador.** El formulario manda `terms_accepted: true` —una marca, no un tiempo— y el disparador de la base la convierte en `now()`. Un dato de tiempo escrito por el cliente no sirve como constancia de nada. Por el mismo motivo `POST /api/profile/terms` **no pisa una aceptación anterior**: la constancia que vale es la primera, y volver a entrar no debería mover esa fecha hacia adelante.

**Una frase se mudó en vez de borrarse.** El descargo del precio terminaba con "los precios en pesos y en dólares se comparan usando el {fuente}". Eso no es un descargo: es parte de la cuenta, y quien mira el rango tiene derecho a saber con qué dólar se armó. Pasó a la línea que explica de dónde sale el número.

**Lo que esto no cambia:** el texto de `/legales` es el mismo, y sigue pendiente que lo lea alguien del oficio — punto 5 de `para_mas_adelante.md`. Aceptar un texto que ningún abogado revisó es exactamente igual de sólido que mostrarlo sin aceptar.

### Sobre hacer el chat en n8n

Apareció la pregunta de por qué el asistente no se armó como un flujo de n8n. Queda anotada la respuesta porque va a volver.

Lo que n8n daba: una primera versión sin escribir código, historial visual de cada ejecución, reintentos y conectores ya hechos. Lo que costaba, y por lo que se descartó para **este** caso:

- **El chat contesta mientras escribe.** n8n es pedido → respuesta entre nodos; mandar la respuesta de a pedazos al navegador no es para lo que está hecho.
- **Quién ve qué lo decide la base.** El chat consulta con la sesión de quien pregunta, así que las reglas de acceso se aplican solas y el asistente ve lo mismo que el muro público. Un flujo corre con las credenciales cargadas en n8n —en la práctica, una clave de servicio—: sería una segunda puerta a los datos que no obedece las políticas, y habría que reimplementar adentro del flujo quién puede ver qué. Es la regla que este proyecto tiene escrita desde el Sprint 6.
- **Qué significa cada filtro se decide en un solo lugar.** El buscador del muro y el del asistente comparten `listing-filters.ts`. En n8n el del asistente viviría en un nodo, fuera del repositorio.
- **No está en git ni se despliega con el push**, y sería una tercera pieza para hostear y vigilar.

**Dónde sí encaja:** avisar fuera de la aplicación, el punto 6 de `para_mas_adelante.md`. Eso tiene forma de flujo — corre solo, nadie lo mira, y necesita conectores de mail o WhatsApp que hoy no existen en el proyecto.


## 2026-08-27 — La prueba del cliente en un celular real

El cliente probó el MVP entero desde un teléfono y devolvió trece puntos ordenados por prioridad. No pidió funciones nuevas: pidió corregir y pulir lo que ya está. Lo que anduvo y no había que romper —navegar sin cuenta, la ficha, el precio de referencia, el análisis de fotos y el chat contextual— sigue igual.

Trece puntos, nueve cambios: varios eran el mismo problema visto desde dos pantallas distintas.

### El botón del asistente, que se apoyaba sobre todo

El síntoma era "se superpone con campos, textos, botones y publicaciones". Eran tres causas y cada una necesitaba su arreglo:

1. **Era un cartel de 140×46.** En un celular de 375px eso cubre tres o cuatro renglones. Ahora en celular es un círculo de 56px sin la palabra; el cartel con texto vuelve de tablet para arriba, donde sobra ancho.
2. **Esquivaba una barra que no siempre está.** Tenía un `bottom-20` fijo para no pisar la barra de navegación de abajo — pero esa barra no existe sin sesión, que es justo como el cliente recorrió la aplicación. El botón flotaba a 80px del borde, en el aire, encima del contenido. Y entre 640 y 768px la barra sí existe y el botón le caía encima. La condición ahora se escribe **una sola vez**, en `useMobileNavVisible()`, y la miran el botón y el pie.
3. **Nadie le reservaba lugar.** El pie reservaba el de la barra, no el del botón: el último renglón de cada pantalla quedaba abajo de él.

Con eso resuelto todavía quedaba lo peor. **Se midió el muro entero, de arriba abajo: 13 posiciones de scroll, 13 tarjetas tapadas, y en una de ellas el corazón de guardar.** Con un botón quieto no hay lugar en la pantalla donde eso no pase — las tarjetas ocupan el ancho completo. Así que **mientras la persona baja, el botón se corre solo, y vuelve apenas sube**. Es lo que hace cualquier aplicación con barra flotante: leyendo no hay nada encima del contenido, y el asistente sigue a un gesto. Arriba de todo siempre se ve, que es donde se entra a cada pantalla. Solo en celular: de 768px para arriba el botón queda en un margen vacío, y aparecer y desaparecer con la rueda del mouse sería un tic.

### La pregunta que se envió sola

El cliente reportó que en una prueba una pregunta salió sin que nadie tocara "Enviar". Se buscó el camino y hay uno solo: **las tres sugerencias que el asistente ofrece al abrirse enviaban en el acto**. Se veían como tres renglones de texto para leer —del ancho del panel, sin forma de botón—, así que alcanzaba con apoyar el dedo.

Ahora **tocar una sugerencia la escribe en la caja y deja el cursor ahí**. La pregunta queda a la vista antes de salir, se puede editar o borrar, y son etiquetas chicas con forma de botón. Cuesta un toque más y ninguna pregunta se va sola.

Se descartó el resto: `Button` es `type="button"` por omisión, así que ningún botón suelto envía un formulario por accidente, y las preguntas sugeridas del análisis de fotos son texto, no botones.

### El minuto de espera, y el silencio

La demora que reportaron (varios segundos lo normal, cerca de un minuto una vez) tenía dos partes, y las dos se atacaron.

**Lo que se podía medir y sacar.** Cada respuesta del asistente arrancaba pidiéndole a Supabase el catálogo de tipos y provincias, y en la ficha de un vehículo además la publicación, su tipo, su análisis y su estimación —que por dentro vuelve a pedir la publicación y el tipo—. Diez idas y vueltas contra una base que está del otro lado de internet, **antes de que el modelo empezara a pensar**, y repetidas en cada mensaje. Dos cambios:

- **El catálogo se guarda en memoria cinco minutos.** Se puede porque es público e igual para todos: se lee con la clave anónima, no con la sesión de nadie. El precio asumido es que un tipo de vehículo nuevo tarda hasta cinco minutos en aparecer, el mismo trato que ya tenía la cotización del dólar. `getVehicleTypeById` ahora sale de esa misma lista en vez de hacer su propia consulta.
- **Las tres consultas de la ficha van juntas.** Ninguna necesitaba el resultado de la otra; estaban encadenadas nada más que por cómo se escribieron.

**Lo que no se puede sacar, pero sí contar.** Cuando la pregunta hace que el asistente salga a buscar publicaciones, hay vueltas enteras del modelo sin una sola letra en pantalla, y desde afuera ese silencio es idéntico al de "se colgó". Ahora el servidor manda **en qué anda** (`paso`) y la pantalla lo muestra con tres puntos que se mueven: "Pensando…", "Buscando publicaciones…", y a los quince segundos "está tardando más que de costumbre, pero sigue trabajando".

**El primer aviso no sale hasta que hubo una llamada al modelo que anduvo**, para no romper la regla del Sprint 2: mientras no salió un byte, un error todavía puede viajar como respuesta HTTP normal en vez de disfrazado adentro de un 200.

**Lo que se midió después**, contra el servidor y no contra la pantalla, para no mezclar el tiempo del modelo con el del navegador:

| | |
|---|---|
| Catálogo de tipos, primera vez / con memoria | 467 ms → **76 ms** |
| Provincias, primera vez / con memoria | 348 ms → **75 ms** |
| Pregunta sobre el vehículo abierto, de punta a punta | **4,7 – 5,6 s** |
| Pregunta que obliga a buscar publicaciones, de punta a punta | **11,5 s** |

En la que busca, el desglose muestra dónde se va el tiempo y por qué hacía falta contarlo: 6,8 s hasta que el modelo decide buscar, 1 s de búsqueda, 3,3 s más hasta la primera letra de la respuesta. **Casi once segundos sin una sola palabra en pantalla** — ahí es donde antes no pasaba nada y ahora se lee "Buscando publicaciones…".

**El minuto que reportó el cliente no se reprodujo.** Lo que se sacó son las idas y vueltas a la base, que son medibles y constantes; lo que puede tardar un minuto es el modelo, y eso no está en nuestras manos. Por eso la otra mitad del arreglo es contar la espera en vez de dejarla muda.

De paso: el modelo contestaba en markdown y la pantalla muestra el texto tal cual, así que se leían los asteriscos de `**Precio:**`. Se le pidió texto plano en el prompt, que es más barato que meter un intérprete de markdown en el navegador.

### Los filtros, que estaban a dos pantallas de distancia

Dos puntos del cliente —los filtros ocupan demasiado, y no se entiende qué hace "Filtros"— eran el mismo componente. Cuatro reglas nuevas, escritas arriba de `SearchBar`:

- **Un solo botón de enviar a la vista.** Convivían "Buscar" arriba y "Aplicar filtros" abajo haciendo exactamente lo mismo. "Buscar" ahora existe solo con el panel cerrado.
- **El botón que abre dice qué va a hacer:** "Filtros" cuando va a abrir, "Ocultar filtros" cuando va a cerrar, con el número de filtros puestos siempre a la vista.
- **"Aplicar filtros" no se persigue scrolleando.** El panel tiene su propia altura máxima y hace scroll adentro. Medido a 375×812: el botón queda a 712px del borde de arriba **sin scrollear nada**, y con un tipo de vehículo elegido —que suma los filtros de la ficha— sigue a 723 aunque adentro haya 715px de campos. Antes había que recorrer casi dos pantallas.
- **Enviar cierra el panel**, y la pantalla se para en los resultados.

Además los campos pasaron a dos columnas en celular, y "desde/hasta" de precio y año dejaron de ser cuatro filtros sueltos para ser dos rangos: cuatro renglones menos.

### Dónde queda la pantalla después de cada acción

Dos lugares donde había que ir a buscar el resultado a mano:

- **Después de buscar**, la pantalla se para donde empiezan los resultados. Solo cuando la búsqueda la pidió alguien: entrar al muro no mueve la pantalla de nadie.
- **Cuando termina el análisis de fotos** —que tarda entre diez y treinta segundos y aparece en una tarjeta bien abajo de la ficha—, la pantalla va hasta él. Solo si lo pidió esa persona desde ese botón: entrar a un aviso que ya tenía análisis hecho no salta a ningún lado, y el cartel que dice "podés seguir navegando" no puede terminar arrastrando a quien le hizo caso.

### Las tarjetas cortadas

Se veían "Chevrolet Cruze Premie…" y "Cañuelas, Buen…". En dos columnas de 375px cada tarjeta mide 166px, y ahí no entran el modelo con el año pegado atrás ni el kilometraje y la ubicación compartiendo renglón. Ahora cada dato tiene su lugar: precio, marca y modelo hasta en dos renglones, "año · kilómetros" juntos porque son cortos, y la ubicación sola con el ancho entero. **El año salió del renglón del modelo justamente para devolverle ese lugar.**

Y una repetición que se notaba solo en los avisos de Capital: `formatLocation` decía "Ciudad Autónoma de Buenos Aires, Ciudad Autónoma de Buenos Aires" —435px en una tarjeta de 166—. Ahora, cuando la localidad y la provincia se llaman igual, se dice una sola vez. No es un caso escrito a mano para CABA: es la regla general de no repetir un nombre dos veces seguidas.

**Medido después: cero textos cortados en el muro y cero en la ficha del vehículo.**

### Un `<a>` adentro de otro `<a>`, en cada tarjeta del muro

Lo cantaba la consola del navegador y no lo había reportado nadie: **dos errores de hidratación de React por cada carga del muro**. La tarjeta entera era un enlace al aviso, y adentro vivía el corazón de guardar, que **sin sesión también es un enlace** —lleva a iniciar sesión—. Un `<a>` adentro de otro `<a>` es HTML inválido, el navegador deshace el anidado al parsear, y lo que React dibuja deja de coincidir con lo que hay en la página.

Es anterior a esta tanda: entró cuando el muro se abrió a las visitas sin cuenta. **Solo se ve navegando sin sesión**, que es la única forma en que nadie lo había mirado con la consola abierta — y es exactamente como recorrió la aplicación el cliente.

Va arreglado con el patrón de siempre: **el enlace envuelve solo el nombre del vehículo** y se estira sobre la tarjeta con un pseudo-elemento. La tarjeta se sigue tocando entera —verificado punto por punto: la foto, el precio y hasta el último píxel de abajo abren el aviso—, el corazón queda por encima del estirado y sigue llevando a iniciar sesión, y de paso el enlace pasó a tener un texto de verdad para un lector de pantalla ("Chevrolet Cruze Premier") en lugar del contenido entero de la tarjeta.

**Medido después: cero anchors anidados y cero errores en la consola**, en el muro y en la ficha del vehículo.

### El texto chico y el aire de más

- **`text-xs` pasó de 12 a 13px**, en la escala y no clase por clase: es la clase de todo lo secundario de la aplicación —las ayudas de los campos, la fecha de publicación, el último mensaje de cada conversación— y el próximo texto que alguien escriba también tiene que quedar cubierto. Misma idea que la regla de los 16px en los campos.
- **El gris de los textos secundarios se oscureció** de `#5a6472` a `#4c5768`: 7,3:1 sobre el blanco de las tarjetas y 6,5:1 sobre el fondo, contra el 4,5:1 que pide la norma. En un monitor el anterior pasaba; en un celular al sol, no.
- **Menos aire vertical en celular**: el margen de la página, el relleno de las tarjetas, los carteles de pantalla vacía y la bajada del muro —que es marca, no información, y empujaba la búsqueda hacia abajo—. De tablet para arriba queda todo como estaba. El muro terminó **más corto que antes** aun con un renglón más por tarjeta.

### La tipografía

La aplicación usaba `system-ui`: la letra que traiga el sistema operativo. La misma pantalla se veía con una letra en un iPhone, otra en Android y otra en Windows, y ninguna era una decisión de nadie. Es buena parte de la "sensación de prototipo" del punto 12.

Ahora usa **Inter**, dibujada para pantallas y para textos chicos —precios, kilometrajes, fichas—, con números de ancho fijo que alinean solos una columna de precios. **No es una dependencia nueva ni un pedido a Google:** `next/font` viene dentro de Next, baja los archivos en el build y los sirve desde el mismo dominio, así que el navegador de la persona no le pide nada a un tercero.

### La ficha del vehículo, dada vuelta

Las dos cosas que la plataforma quiere que pasen estaban al final de la pantalla. Se levantó la pregunta como decisión de producto y Mateo la resolvió: suben las dos.

**"Consultar al vendedor" pasó de 2.790px a 612px.** Vivía adentro de la tarjeta del vendedor, al fondo de todo. Es la salida del embudo —lo único que el comprador vino a hacer— y estaba atrás de la descripción, la ficha técnica, el precio y el análisis. Ahora va pegado al precio, con "Guardar" al lado: son las dos mitades de la misma decisión, escribir ahora o dejarlo anotado para después.

**El análisis de fotos pasó de ~2.100px a 795px, y eso da vuelta una decisión del Sprint 3.** El precio de referencia iba primero con este argumento: es lo primero que se quiere saber y aparece sin que nadie apriete nada. La segunda mitad de esa frase es justamente lo que lo manda atrás. **El precio se dibuja solo, así que se ve igual un lugar más abajo; el análisis no existe hasta que alguien toca el botón**, y un botón que está a dos pantallas de distancia no se toca. Estar abajo no cuesta lo mismo en los dos casos. Y es la pieza que diferencia esta plataforma de cualquier otro clasificado: en la prueba fue lo que más les interesó al cliente. Enterrarla era esconder el producto.

El orden nuevo en celular, medido: acciones a 612 y 716, el análisis a 795, el precio de referencia a 2.005, la descripción a 2.264, la ficha técnica a 2.391 y el vendedor —ya solo el nombre y la fecha, sin acciones— a 2.661.

### El saludo del asistente dejó de prometer lo que no hace

Decía "preguntame lo que quieras, sobre un aviso **o sobre cómo funciona la aplicación**". Probándolo salió que era mentira: preguntado por cómo funciona el análisis de fotos contesta "no tengo esa información". Y tiene razón — el asistente conoce el catálogo, el aviso que hay en pantalla, su análisis y su estimación, pero nadie le contó nunca cómo funciona la plataforma. **La primera pregunta de alguien que le creyera al saludo terminaba en un no.**

Se sacó la frase, del saludo y de la bajada del encabezado, que repetía la misma promesa en letra chica. Quedan nombradas las tres cosas que sí hace. La alternativa —contarle al modelo cómo funciona la plataforma— es agrandar el prompt de todos los pedidos para una pregunta que casi nadie hace; si algún día se hace, la frase vuelve.

## 2026-08-27 — El asistente se quedó sin cuota, y por qué el error mentía

Al terminar de subir las correcciones del cliente, el chat dejó de contestar en producción. El síntoma desde la pantalla era el cartel de siempre: "el asistente está con mucha demanda en este momento, probá de nuevo en unos segundos".

**El cartel mentía, y esa es la parte que hay que recordar.** `pedirAlModelo` mapea al mismo mensaje los dos errores que devuelve Gemini —429 y 503— porque cuando se escribió parecían la misma cosa: el modelo no está disponible ahora, probá después. No son la misma cosa. Un 503 es saturación y se va en segundos; un 429 puede ser una cuota agotada que no se repone hasta mañana. El mensaje mandaba a reintentar algo que no iba a andar por reintentarlo.

### Qué era realmente

Preguntándole a la API directamente con la misma clave:

```
quotaId : GenerateRequestsPerDayPerProjectPerModel-FreeTier
metric  : generativelanguage.googleapis.com/generate_content_free_tier_requests
model   : gemini-3.6-flash
limit   : 20
```

**Veinte llamadas por día**, no por minuto. El `quotaId` dice `PerDay`, y se confirmó esperando: después de noventa segundos limpios sin tocar nada, seguía en 429. El campo `retryDelay` que devuelve Google —"retry in 48s"— es lo que más confunde, porque suena a un límite por minuto.

Veinte por día es menos de lo que parece. **Una sola pregunta que hace buscar publicaciones cuesta entre 2 y 4 llamadas**, porque el modelo pide la herramienta de búsqueda y hay que volver a llamarlo con el resultado. Sumado a que cada análisis de fotos es otra llamada y usa el mismo modelo, verificar el asistente durante una tarde alcanza para agotarla. Fue exactamente lo que pasó.

### Qué se hizo

Se pasó `GEMINI_MODEL` a `gemini-3.5-flash`, que tiene su propia cuota diaria y respondía con la misma clave —probado contra la API y contra el backend local antes de tocar producción—. Está escrito como parche en los dos lugares que lo definen, `config/env.ts` y `render.yaml`, con la condición para volver atrás.

**No es una solución.** También se agota, y es un modelo anterior: el análisis de fotos y el chat pueden bajar de calidad. La salida de fondo es activar facturación en el proyecto de Google, y ahí se vuelve a 3.6.

### Lo que queda anotado para después

- **El mensaje de 429 sigue diciendo lo que no es.** Separar cuota agotada de saturación es un cambio chico y no se hizo en el momento para no mezclarlo con el parche. Mientras no se haga, un 429 en producción se va a leer como "esperá un rato" cuando en realidad puede ser "hasta mañana no".
- **Antes de la prueba completa del cliente hay que resolver la cuota.** Con veinte llamadas por día, el asistente se apaga a las pocas preguntas y el cliente va a reportar como roto algo que no lo está — que es justo lo que pasó acá.
- **El límite es por proyecto y por modelo**, así que dos personas probando al mismo tiempo comparten las mismas veinte.

## 2026-08-27 — La revisión de Norber: cuatro agujeros que no se veían mirando la pantalla

Norber revisó el código del ZIP y devolvió cuatro puntos. Ninguno se ve probando la aplicación con calma: los cuatro aparecen cuando dos cosas pasan al mismo tiempo, o cuando algo del otro lado no se comporta como se espera. Los cuatro se corrigieron el mismo día.

### 1. El asistente no tenía ningún freno de consumo

El chat se puede usar sin cuenta —es una decisión de producto y sigue igual—, y cada respuesta es una llamada paga a Gemini. No había límite de ningún tipo: ni por visitante, ni por día, ni por servidor. El comentario del propio archivo lo decía en voz alta desde el Sprint 2 y quedó ahí.

Ahora hay **dos frenos**, en `middleware/rate-limit.ts`, y **cortan antes de llamar al modelo**:

- **Por visitante** —doce pedidos cada cinco minutos—, contados por usuario cuando hay sesión y por dirección de IP cuando no la hay. No protege de nadie decidido; protege de que un solo navegador insistiendo se lleve puesta la prueba de los demás.
- **Global del día** —ciento veinte pedidos en todo el servidor—, que es el único que se puede comparar contra la cuota de Google y el único que sirve cuando quien insiste son veinte visitantes distintos.

**El orden importa y está escrito en el código:** primero se mira el freno del visitante y después el del día. Al revés, cada insistencia de alguien ya frenado le comería presupuesto a los demás sin llegar nunca al modelo.

**El freno cubre también el análisis de fotos**, que gasta de la misma cuota. Cubrir solo el chat era dejar abierta la otra mitad de la canilla. Que el análisis pida cuenta no es un límite: crear una es gratis.

**`app.set('trust proxy', 1)`** en `index.ts` es parte de la corrección, no un detalle: detrás del proxy de Render, `req.ip` es la dirección del proxy, así que sin esto **todas las visitas sin cuenta serían el mismo visitante** y la primera dejaría afuera al resto.

**Lo que este freno no es.** La cuenta vive en la memoria del proceso: con una sola instancia —lo que hay hoy— alcanza, con dos el límite efectivo sería el doble. Y Render duerme el servicio gratuito por inactividad: al despertar, el contador del día arranca de cero. Las dos fugas están escritas en el archivo y son el motivo de que los números por defecto sean conservadores. Se cambian sin tocar código, con `IA_LIMITE_VISITANTE`, `IA_VENTANA_MINUTOS` e `IA_LIMITE_DIARIO`.

Verificado contra el backend levantado: trece pedidos seguidos al chat, los doce primeros pasan y el trece contesta 429 con el mensaje en español. Se hizo con el cuerpo vacío a propósito, para que la validación los rechace antes de Gemini y la prueba no gaste cuota.

### 2. Una búsqueda vieja podía pisar a la nueva

Dos búsquedas seguidas son dos pedidos, y nada garantiza que contesten en el orden en que salieron: la consulta amplia tarda más que la que se pidió después. La respuesta vieja llegaba última y **escribía los resultados igual**. Lo que quedaba en pantalla no era lo que decían los filtros de arriba, y no hay manera de que la persona se dé cuenta.

Cada carga se lleva ahora un número (`generacion`, un `ref` y no estado) y al volver compara: si ya no es la última, se descarta entera —resultados, total, error y el cartel de "Cargando…"—. Lo mismo en `loadMore`, que además evitaría mezclar la mitad de arriba de una búsqueda con la mitad de abajo de otra.

Se eligió el contador y no `AbortController` porque la respuesta que sobra ya se pagó: lo único que hay que evitar es que se escriba.

Verificado en el navegador con el backend demorando a propósito la primera búsqueda cuatro segundos: se busca "renault", enseguida "toyota", y al llegar la respuesta lenta la pantalla sigue mostrando los doce Toyota. La demora se sacó al terminar.

### 3. Dos pedidos simultáneos pagaban dos análisis del mismo aviso

`startAnalysis` preguntaba si había uno corriendo y después escribía la fila. Son dos viajes con un hueco en el medio, y en ese hueco entra el segundo pedido: los dos leen "no hay nada", los dos escriben, los dos llaman a Gemini. La fila única evitaba el registro duplicado, no el gasto duplicado. Alcanza con tocar "Analizar" dos veces porque la primera pareció no hacer nada.

Tomar el trabajo y anunciarlo pasan a ser **la misma operación, y la resuelve Postgres**: `claim_listing_analysis` (migración 016) escribe la fila en "corriendo" solo si nadie la tiene tomada, con un `insert … on conflict do update` cuyo `where` vuelve a evaluarse contra la versión ya actualizada por el primero. Quien gana se lleva un identificador de intento; quien pierde se lleva un `null` y acompaña el análisis en curso.

El identificador de intento también arregla algo que no estaba reportado: un trabajo vencido que vuelve tarde ya no puede escribir encima del que está corriendo. `finish_listing_analysis` guarda solo si el intento sigue siendo el vigente, y el backend anota en la consola cuando descarta uno.

**No se usó un candado en memoria del backend.** Hoy hay una sola instancia, pero un candado ahí adentro deja de servir el día que haya dos, y de eso no se entera nadie: se entera la factura.

**La migración 016 quedó aplicada en la base real** el mismo 2026-08-27, desde el editor SQL del panel ("Success. No rows returned"), y se verificó desde afuera con la clave de servicio: la columna `attempt_id` existe; dos pedidos simultáneos sobre el mismo aviso devuelven un solo identificador y un `null`; con uno corriendo el siguiente no arranca otro; un intento vencido no pisa al vigente y el vigente sí guarda; terminado el análisis se puede pedir otro; y con la clave pública las dos funciones no se pueden ejecutar. La prueba corrió sobre una publicación que no tenía análisis guardado y borró al final la fila que ella misma creó — no se tocó ningún análisis existente.

### 4. El chat podía quedarse esperando para siempre

La lectura del stream no tenía ninguna salida propia: seguía hasta que el servidor cerrara la conexión. El camino normal la cierra, pero eso no es una garantía — alcanza con un intermediario que la sostenga abierta para que una respuesta **ya completa** se quede sin entregar, con el botón de enviar bloqueado y los puntitos girando.

`apiStream` ahora termina de cuatro maneras y todas terminan: con el evento `done`, con el evento `error`, a los **45 segundos de silencio** o a los **tres minutos** en total. Los 45 salen de una medición, no del gusto: el peor caso registrado el 2026-08-24 tuvo un silencio de unos veinte segundos entre señales, así que el límite deja el doble de margen. El reloj del silencio se reinicia con cada pedazo que llega, así que una respuesta larga que viene bien no se corta nunca.

Y el panel tiene **botón de cancelar**: mientras el asistente contesta, "Enviar" se convierte en "Cancelar" —nunca están los dos, misma regla que la barra de búsqueda—. Cancelar no le ahorra al servidor la llamada al modelo, que ya salió; devuelve el control de la pantalla, que es lo que se le estaba negando a la persona. La pregunta vuelve a la caja en los tres casos: error, espera vencida y cancelación. Y cancelar **no dibuja un cartel de error**: lo decidió la persona, ya sabe lo que pasó.

Verificado con siete pruebas aisladas sobre el archivo real (camino normal, `done` sin cierre, silencio, silencio que se reinicia, techo total, cancelación y evento de error del servidor) y en el navegador, con el backend demorado a propósito: aparece "Cancelar", se cancela, vuelve la pregunta y no queda ningún cartel.

### Lo que la revisión no probaba, y sigue sin probarse

Norber fue explícito y conviene repetirlo acá: su punto 4 no demuestra que la demora que vio el cliente en el celular haya sido esta. La ruta normal del servidor cierra la conexión. Lo que se arregló es que la pantalla ya no depende de que el otro lado se porte bien.

## 2026-09-01 — El rediseño: se fue el gris, entraron las sombras y el vidrio

El cliente pidió cuatro cosas concretas, mirando capturas de Marketplace en el celular: que las fotos ocupen **lo máximo posible** de la pantalla, que **se saque el gris** y sea blanco con azul, que haya **sombreado**, y que se sienta el **efecto vidrio del iPhone**. Es la primera vez que se toca el aspecto sin que el pedido sea arreglar un error: no se corrigió nada roto, se cambió cómo se ve.

### El gris de fondo era el problema, y no era un problema de gusto

El fondo era `#F0F2F5`, el plateado del logo, con tarjetas blancas encima. Eso funciona en un monitor y se lee mal en un celular: es la forma de una planilla —cajas blancas flotando sobre un gris— y no la de un clasificado.

**Ahora la página y las piezas son el mismo blanco**, y lo que las separa es la sombra. Es un cambio más grande de lo que suena: si se saca el gris sin poner nada en su lugar, todo queda pegado a todo y la pantalla se vuelve ilegible. Por eso el rediseño es blanco **y** sombras, las dos cosas juntas.

El plateado no desapareció del proyecto: sigue en el logo. Lo que salió es su uso como fondo.

**El gris seguía haciendo falta adentro de las cosas** —el hueco de una foto que no cargó, la burbuja del que contesta en el chat, el resaltado de una fila al pasar por encima—. Esos diez lugares usaban `bg-canvas`, y al volverse blanco el fondo se habrían quedado sin pintar. El relleno pasó a tener su propio nombre, `mist`, y no es un gris: es `#F1F7FE`, blanco azulado. Era literalmente lo que pidió el cliente ("blanco con azul") y de paso resuelve el problema de nomenclatura.

### Las sombras son azules, y eso no es un detalle

Son tres, definidas en `globals.css`, y son la escala completa: `soft` para lo que apenas se despega, `card` para lo que es una pieza, `float` para lo que está por encima de la página. No se escriben sombras sueltas en las pantallas.

**Ninguna es negra.** Cada una lleva dos capas: una de contacto casi imperceptible que apoya el borde, y una difusa teñida con el azul secundario de la marca. Una sombra gris sobre blanco ensucia; una azul sobre blanco se lee como profundidad. Es la manera de que la identidad esté presente en toda la pantalla sin pintar nada de azul.

La línea de los bordes también se azuló y se aclaró (`#DDE1E7` a `#E4EBF4`). Sobre un fondo gris un borde tiene que ser oscuro para verse; sobre blanco, el mismo borde se lee como un recuadro dibujado con marcador.

### Las fotos se salen del margen

El `<main>` deja 16px de aire a cada lado. Para un texto está bien; para una grilla de fotos es plata tirada: con esos 16px y 12px de separación, en una pantalla de 375px cada foto medía **165px**.

La grilla del muro y la foto principal de la ficha ahora **se salen de ese margen en celular** (`-mx-2` y `-mx-4`). La foto del muro pasó a medir **179px**, un 8% más grande, y la de la ficha ocupa el ancho entero de la pantalla.

**Ocho píxeles y no cero en el muro.** Pegar la foto al filo se ve bien en la maqueta, pero el texto de abajo —el precio, el modelo— queda apoyado en el borde y se lee incómodo; y en los celulares con pantalla curva el filo se dobla. De tablet para arriba las dos vuelven al margen normal: ahí sobra ancho, y una grilla que toca los bordes de un monitor se ve descuidada, no amplia.

### La foto principal ya no tiene una caja negra alrededor

El fondo de la galería era `bg-ink`, casi negro, para que una foto vertical se recortara contra algo oscuro. Sobre una página blanca esa caja pasó a ser lo único oscuro de la pantalla y se llevaba toda la atención.

Pero cambiarla por blanco dejaba a la vista el otro problema: la caja mide 4:3 y las fotos vienen con cualquier forma, así que una apaisada dejaba **dos franjas vacías de unos 90px** arriba y abajo — casi un cuarto de la pantalla del celular, justo en lo primero que se mira.

Recortar la foto para llenar la caja no es opción: quien compra necesita ver el vehículo entero, y un `object-cover` le corta el techo o las ruedas.

**Las franjas se llenan con la misma foto, ampliada y desenfocada**, como hacen las aplicaciones de música con la tapa del disco. El color de la foto sigue, la pantalla se ve llena y no se pierde nada de lo que importa. **No es una segunda descarga**: es la misma dirección, el navegador la sirve de su memoria. Va con `alt` vacío y `aria-hidden` porque es decoración: un lector de pantalla que la nombre estaría diciendo dos veces la misma foto.

### El vidrio esmerilado

Lo usan las tres cosas que quedan fijas mientras la página se mueve por debajo: la barra de arriba, la de abajo en celular y el corazón de guardar que se apoya sobre cada foto. Con fondo blanco opaco, ese "por debajo" no se ve —el contenido desaparece detrás de una franja blanca y la barra parece un pedazo de página cortado—. Con el vidrio, las fotos que pasan se adivinan borrosas y se entiende que hay una sola pantalla que se mueve.

**La saturación al 180% no es decoración.** El desenfoque solo lava los colores de abajo y la barra queda de un gris sucio; subir la saturación devuelve el color de lo que está pasando por detrás, y es la mitad del efecto.

**Es una clase de `globals.css` y no clases sueltas de Tailwind**, por la regla de reserva: en un navegador donde el desenfoque no corre, el fondo pasa a ser casi opaco (`@supports not`). Sin eso, el texto del listado se leería a través de la barra. Esa regla no se puede escribir en el atributo `class` de un componente, y olvidarla no se ve hasta que alguien abre la aplicación en ese navegador.

### El botón se hunde al tocarlo

Todos los botones de la aplicación se achican un dos por ciento mientras están apretados, y el corazón de guardar un diez.

En celular no hay `hover`: el dedo tapa el botón justo en el momento en que habría que confirmarle a la persona que la pulsación llegó. El hundido es ese acuse de recibo. En el corazón es más marcado a propósito: guardar no cambia de pantalla ni muestra ningún cartel, así que el único aviso de que pasó algo es que el corazón se llene — y eso, debajo de un dedo, se pierde.

### Un solo redondeo

Convivían esquinas de 8px y de 12px en la misma pantalla. Ahora son 12px para lo chico (botones, campos, miniaturas) y 16px para lo grande (tarjetas, paneles, fotos). Es de las cosas que no se nombran al mirar una pantalla pero que hacen que se sienta armada de a pedazos.

### Lo que NO cambió, a propósito

- **El orden de la ficha del vehículo.** Precio, las dos acciones del comprador, análisis, precio de referencia, descripción, ficha técnica, vendedor. Es lo que salió de la prueba del 2026-08-27 y no se tocó: esto fue un cambio de aspecto, no de estructura.
- **Cada dato de la tarjeta en su renglón.** También salió de esa prueba, por los textos cortados a la mitad. Las tarjetas ahora son 14px más anchas, así que el problema aprieta menos, pero la regla se mantiene.
- **Los 13px del texto chico y el `#4C5768` del texto secundario.** Se volvió a medir el contraste contra el fondo nuevo: 7,3:1 sobre el blanco y 6,8:1 sobre el relleno azulado, las dos bien arriba del 4,5:1 de la norma.
- **Nada de rojo ni naranja**, ni siquiera en errores. La regla de identidad sigue igual.

### Qué se verificó y qué no

Verificado en el navegador, a 375px y en escritorio: el muro, la ficha de un vehículo y el login. Se comprobó que los colores nuevos y las tres sombras se resuelven de verdad en el navegador —no quedaron como clases que Tailwind no generó— y que la barra de arriba tiene el desenfoque puesto. Sin errores en la consola.

**No se verificaron con los ojos las pantallas que piden cuenta** —publicar, guardados, mis publicaciones, mensajes, perfil—: en esta máquina no hay contraseñas de prueba, y entrar con enlaces de un solo uso pide la clave de servicio. Usan las mismas piezas compartidas (`Card`, `Button`, `inputClass`, `Field`) que sí se miraron, y los diez lugares que dependían del gris de fondo se cambiaron uno por uno, pero conviene darles una pasada la próxima vez que haya una sesión abierta.

## 2026-09-04 — El encabezado del muro: sin título, sin tarjeta y con los filtros a la vista

El muro dejó de empezar con un título y una tarjeta de búsqueda. Ahora arranca con el buscador solo: una píldora con el campo, un botón azul redondo con la lupa al lado, y debajo una línea de fichas que nombra los filtros puestos.

**Por qué:** lo pidió el cliente, y lo que había arriba del listado eran cuatro renglones que no mostraban ni un vehículo — el título "Vehículos publicados", su bajada, el campo dentro de un rectángulo con borde y sombra, y un botón "Buscar" del ancho de la pantalla. En un celular de 812px de alto, eso es casi un tercio de la primera pantalla gastado en decir lo que se ve solo.

Lo que se sacó, uno por uno:

- **El título y la bajada.** Quien abrió la aplicación ya sabe qué está mirando. El título sigue en el documento con `sr-only`: una página sin `h1` deja sin punto de partida a un lector de pantalla y sin tema a un buscador, y eso no era lo que había que sacar.
- **La tarjeta.** Desde el rediseño del 2026-09-01 la página es blanca, así que un rectángulo blanco con borde apoyado sobre blanco no separaba nada: dibujaba un marco alrededor de algo que no lo necesita.
- **El botón "Buscar" de ancho completo.** Lo reemplaza un círculo azul de 48px con la lupa, pegado al campo. Gasta 48 píxeles de ancho en vez de un renglón entero de alto, y no hace falta leerlo.

**Los filtros puestos ahora se ven sin abrir nada.** Antes, con el panel cerrado, lo único que decía que había una búsqueda filtrada era un número al lado de la palabra "Filtros" — "(6)" no dice cuáles ni deja sacar ninguno. Ahora hay una ficha por filtro, con el nombre que le da el catálogo ("Autos", "Córdoba", "Combustible: Nafta"), y se saca tocándola.

**El desde y el hasta de un mismo dato son una sola ficha** ("Precio 2.000.000–9.000.000", "Cantidad de puertas 4–5"). Partirlo en dos fichas que se sacan por separado deja medio rango puesto sin que se note. De paso, eso explica por qué se fue el número: un precio con desde y hasta son dos filtros y una sola ficha, así que el contador decía "(6)" al lado de cinco fichas.

**Las fichas describen lo que se está mostrando, no lo que hay tipeado en el panel.** Una ficha es una afirmación sobre los resultados que están en pantalla; si saliera del borrador anunciaría un filtro que todavía no se aplicó.

**Los nombres salen del catálogo, como todo lo demás.** No hay ninguna lista de campos, unidades ni opciones escrita en el componente: un tipo de vehículo nuevo trae sus fichas solo. Si el catálogo todavía no llegó, la ficha muestra el valor crudo — feo, pero infinitamente mejor que un listado filtrado sin nada que lo diga.

**Se corrige una regla del 2026-08-27: la lupa no se esconde con el panel abierto.** Aquella regla —"un solo botón de enviar a la vista"— salió de dos botones grandes con texto, "Buscar" y "Aplicar filtros", que se leían como dos acciones distintas. Un ícono pegado al campo no compite con eso: se lee como parte del campo, y hacerlo aparecer y desaparecer movería la barra justo cuando la persona está tocando otra cosa. Lo que sí se mantiene es que no haya dos botones **con texto** haciendo lo mismo: por eso se sacó también el "Ver todos" que estaba al lado del contador de resultados, que ahora es el "Limpiar" de la línea de fichas, dos renglones más arriba.

**El panel arranca siempre cerrado**, incluso al entrar a una dirección con filtros. Antes se abría solo en ese caso, para que se viera qué había filtrado; eso ahora lo dicen las fichas en un renglón en vez de media pantalla.

**La píldora es la única de la aplicación y es a propósito.** Los campos de los formularios siguen siendo rectángulos de 12px: este no es un campo de formulario sino un buscador, y comparte forma con las fichas de abajo, el corazón de guardar y el botón del asistente. El redondeo completo ya se usaba para esas piezas, así que no es un tercer radio en la escala de las cajas.

**Qué se verificó.** En el navegador, a 375px y en escritorio, con el backend y el catálogo reales: el campo mide 287×48 y el botón 48×48 dentro de los 375 sin desborde horizontal; el texto del campo mide 16px, así que Safari de iPhone no agranda la pantalla al tocarlo; las fichas salen con los nombres del catálogo, tanto las de los filtros comunes como las de la ficha del tipo; sacar una ficha reescribe la dirección y deja las demás; sacar la del tipo de vehículo se lleva también los filtros de su ficha; con el panel abierto, "Aplicar filtros" queda a 754px del borde de arriba, adentro de la pantalla. Sin errores en la consola.

## 2026-09-04 — Las fotos del muro, de borde a borde

La grilla del muro (y la de guardados, que es la misma) pasó a llegar hasta el filo de la pantalla en celular: `-mx-4` en vez de `-mx-2`, 2px de separación entre columnas en vez de 8, y las fotos sin esquinas redondeadas ni sombra. En una pantalla de 375px cada foto pasó de **179 a 187px de lado**.

**Por qué:** lo pidió el cliente con una referencia concreta —Marketplace de Facebook— y una comparación lado a lado con la pantalla nuestra: allá las fotos ocupan el ancho entero y acá quedaban dentro de rectángulos con aire a los costados. Tenía razón en el diagnóstico: en un clasificado, la foto es lo único que hace que alguien se detenga, y todo píxel que gaste el marco se lo saca a la foto.

**Se da vuelta el argumento del 2026-09-01 para no llegar al borde**, que era que el texto de abajo —el precio, el modelo— quedaba apoyado en el filo y se leía incómodo, y que en las pantallas curvas el filo se dobla. El problema era real; lo que estaba mal era la solución. Se arreglaba donde nace: **la foto llega al borde y el texto tiene su propio margen** (`px-2` en la tarjeta, 8px). Es exactamente lo que hace Marketplace, y se ve en la captura que mandó el cliente: la foto arranca en el píxel cero y el precio de abajo, no.

**Las esquinas redondeadas y la sombra se van solo en celular** (`sm:rounded-2xl sm:shadow-card`). Una esquina de 16px contra el borde de la pantalla deja un triangulito blanco que se lee como un error de dibujo, y una sombra no tiene dónde caer si no hay página alrededor. De tablet para arriba la grilla vuelve a tener margen, las fotos vuelven a ser piezas separadas sobre blanco, y las dos cosas vuelven con ella.

**No se tocó el recorte.** La miniatura del muro es cuadrada y recortada (`object-cover`) desde siempre, y así queda: en una grilla de dos columnas, respetar la forma original de cada foto daría filas de alturas distintas. La regla de no recortar sigue valiendo donde importa, que es la foto grande de la ficha del vehículo: ahí el comprador tiene que ver el vehículo entero, y las franjas que sobran se llenan con la misma foto ampliada y desenfocada.

**Qué se verificó.** En el navegador a 375px, con el backend real: las fotos miden 187×187, la primera columna arranca en x=0, la segunda termina en el borde, la separación es de 2px y el precio queda a 8px del filo; sin desborde horizontal. A 1024px la grilla vuelve a cuatro columnas con margen, esquinas de 16px y la sombra `card` puesta.

## 2026-09-04 — La tarjeta del muro, en un renglón

Debajo de cada foto del muro quedó **un solo renglón: el precio en negrita, un punto medio, y la marca y el modelo**, cortado con puntos suspensivos si no entra ("US$ 21.000 · Chevrolet Cru…"). El año, el kilometraje y la ubicación salieron de la tarjeta.

**Por qué:** lo pidió el cliente, con Marketplace otra vez como referencia y con el objetivo dicho en una frase — que entren la mayor cantidad de vehículos en la pantalla sin tener que scrollear. Medido en el mismo teléfono de 375×812, con las dos versiones desplegadas:

| | Antes | Ahora |
|---|---|---|
| Alto de la tarjeta | 299px | 213px |
| Alto de una fila (con la separación) | 315px | 229px |
| Tarjetas que se alcanzan a ver | 4 | 6 |

Son **un 37% más de vehículos por pantallazo de scroll**.

**Esto da vuelta una regla que salió de la prueba en celular del 2026-08-27** —"cada dato en su renglón y ninguno cortado a la mitad"— y la da vuelta el mismo que la pidió, sabiendo que el modelo se va a cortar ("por más de que no se diga del todo"). No es que aquella regla estuviera mal: resolvía un problema real, que "Chevrolet Cruze Premie…" cortado no se entendía. **Lo que cambió es qué se está optimizando.** Antes, entender cada tarjeta; ahora, cuántas se ven de un vistazo. En un clasificado se recorre primero y se lee después, y los dos datos que hacen frenar el pulgar —la foto y el precio— son justamente los que no se cortan nunca.

**Lo que se corta es el dibujo, no el contenido.** El renglón entero está en el documento, así que un lector de pantalla sigue leyendo "US$ 21.000 · Chevrolet Cruze Premier 1.4 Turbo" completo, y el enlace sigue teniendo el nombre entero del vehículo como texto.

**Dónde quedaron los tres datos que se fueron.** El año, el kilometraje y la ubicación están enteros en la ficha del vehículo, a un toque de distancia, y los tres se pueden **filtrar** desde la barra del muro: quien busca por año o por kilómetros no necesita leerlos en cada tarjeta, necesita que el listado ya venga recortado. Se dejó anotado en `app/CLAUDE.md` que volver a agregarle un dato a la tarjeta es deshacer este cambio.

**Un efecto lateral que conviene saber:** con un precio largo en pesos, del modelo queda muy poco ("$ 12.500.000 · Renault …"). Es el mismo comportamiento que tiene Marketplace y se aceptó así; si molesta, la salida no es agregar un renglón sino achicar un punto el precio.

## 2026-09-04 — La barra de búsqueda se despega y flota sobre el listado

Al bajar por el muro, la píldora de búsqueda se suelta de su lugar y queda flotando ocho píxeles debajo de la barra de arriba, de vidrio esmerilado, con las fotos pasando por detrás. Buscar deja de exigir volver al principio de la página.

**Por qué:** lo pidió el cliente, y con un motivo dicho: que la aplicación se vea moderna y se diferencie. Es la misma idea que ya venía funcionando en las dos barras de navegación, aplicada a lo que más se usa del muro.

**Se despega SOLO la píldora.** No el fondo blanco de la página, no las fichas de filtros, y no el botón azul de afuera: la lupa se le mete adentro de la píldora y pierde el círculo. Eso fue explícito en el pedido y tiene sentido visual — dos piezas flotando sobre el listado se leen como una barra de herramientas pegada arriba; una sola forma se lee como algo que flota. Lo que queda sobre las fotos es un rectángulo de bordes redondos y nada más.

**La lupa no desaparece del todo, se muda.** Un campo de búsqueda sin nada que tocar es un callejón sin salida en un celular, porque la tecla de buscar del teclado no siempre está a la vista. Adentro de la píldora, sin círculo azul, no rompe la forma.

**Es `fixed` y no `sticky`, y el motivo es concreto.** Una pieza pegajosa se despega apenas termina la caja de su padre, y el padre acá es el formulario de búsqueda, que mide lo que miden la píldora y las fichas: la barra se habría vuelto a ir de la pantalla a los 100px de scroll. Con `fixed` no hay padre que la limite.

**El lugar se lo guarda una caja vacía de 48px** (`h-12`). Al pasar a `fixed`, la píldora sale del flujo; sin esa caja, todo el listado saltaría 48px hacia arriba justo en el momento del cambio.

**Quién dispara el cambio es un `IntersectionObserver`, no un manejador de `scroll`.** Un `scroll` corre decenas de veces por segundo comparando posiciones; acá el trabajo lo hace el navegador y avisa solo cuando el estado cambia. Dos detalles que importan:

- El `rootMargin` corre el borde de arriba de la pantalla hasta abajo de la barra superior. Lo que importa no es si la caja se ve, sino si se ve **por debajo** de esa barra, que es fija y tapa lo que pasa atrás.
- Se mira `intersectionRatio < 1` y no `isIntersecting`: la barra se despega cuando **empieza** a esconderse, no cuando terminó. Así aparece flotando exactamente donde estaba y el cambio no se ve. Es el mismo número —el alto de la barra de arriba más los ocho píxeles de aire— el que decide dónde se para y cuándo se despega, justamente para que las dos posiciones coincidan.

**Los ocho píxeles de aire tampoco son decorativos.** Pegadas una a la otra, la barra de arriba y la de búsqueda son dos franjas de vidrio apiladas y se leen como una sola barra doble. Con el aire en el medio se ven pasar las fotos por atrás, y ahí se entiende que la píldora está flotando.

**El alto de la barra de arriba se mide, no se escribe.** Son 61px sin sesión, y cambia con sesión y de tablet para arriba, donde le entran los botones de navegación. Un número escrito a mano dejaría la píldora montada sobre la barra, o con un hueco, según quién esté mirando.

**Qué se verificó.** En el navegador a 375px y a 1024px: la píldora se despega a los pocos píxeles de scroll y queda en y=69 —61 de la barra más 8—, alineada con el margen de la página (x=16) en los dos anchos; el desenfoque se resuelve de verdad (`saturate(1.8) blur(20px)`); escribir y tocar la lupa con la barra despegada busca y trae los resultados; al volver arriba, la píldora vuelve a su lugar con el botón azul afuera. Sin errores en la consola.

## 2026-09-04 — La IA sale del rincón: barra de abajo de cuatro lugares y un violeta propio

La barra inferior pasó de cinco destinos a cuatro lugares —Inicio, Mensajes, **IA** y Mis avisos—, el botón flotante del asistente desapareció de donde hay barra, y todo lo que llama al modelo se pinta de un violeta nuevo.

**Por qué:** lo pidió el cliente y el motivo es de producto, no de estética: que se entienda desde la primera pantalla que esta aplicación tiene IA, porque es lo que la diferencia de un clasificado común. El asistente estaba escondido en un botón flotante que además andaba esquivando el contenido.

### Qué se movió

- **"Publicar" salió de la barra.** Estaba dos veces: `/mis-publicaciones` ya es la pantalla de lo que uno publica y ya tiene arriba su "+ Publicar vehículo". El de la barra llevaba al mismo lugar desde un renglón más abajo.
- **"Guardados" subió al encabezado**, al lado del perfil y solo en celular. Los dos son lo propio de cada uno —lo que guardé, quién soy— y por eso viven en la misma esquina. De tablet para arriba siguen siendo enlaces con texto, como estaban.
- **El botón flotante del asistente ya no se dibuja donde hay barra.** Queda en dos lugares: de tablet para arriba, y en celular sin sesión —ahí la barra no se dibuja y al asistente se lo puede usar sin cuenta—. Dos accesos a lo mismo, uno encima del otro, es el problema que el cliente ya había reportado. De paso, el botón dejó de depender del alto de la barra: ese `calc(4.25rem…)` que lo apoyaba encima ya no puede pasar.
- **"Mis avisos" ocupa el ancho de dos lugares.** Con los cuatro iguales, el centro del botón violeta caía en 234 de una pantalla de 375: 46px corrido del eje. Se midió y se corrigió; ahora cae en 188, que es el centro exacto.

### El violeta

Un color nuevo, `#6D28D9`, con su relleno suave y su propia sombra, y **una sola función: marcar lo que llama al modelo**. Hoy son el botón "IA" y "Analizar esta publicación"; el que se sume mañana usa el mismo. Si aparece violeta en algo que no es IA, el código de color deja de querer decir algo.

**Se evaluó el naranja, que era una de las tres opciones que puso el cliente sobre la mesa, y se descartó.** La regla de identidad del proyecto —no se usa rojo ni naranja en ningún estado, ni siquiera en errores— no es un capricho: sobre azul y blanco, un botón naranja se lee como advertencia o como oferta, que es el tono de "marketplace agresivo" que este proyecto viene evitando desde el primer día. El violeta es vecino del azul, así que convive con la marca, y es con lo que hoy se nombra la IA en casi todas las aplicaciones: se entiende sin leer. Contraste medido: 7,1:1 con blanco encima.

**El cohete es el símbolo, y es uno solo** (`RocketIcon` en `ui.tsx`), compartido por el botón de la barra y el flotante. Nunca se ven los dos a la vez —uno es de celular y el otro de escritorio—, y con dos dibujos distintos se leerían como dos funciones distintas.

**El botón de la barra no es un enlace.** El asistente no es una pantalla: es un panel que se abre encima de la que se está mirando, y por eso puede hablar del aviso que hay abajo. Es el único de la barra sin `href` y sin marca de "página actual".

**Dice "IA" y no "Asistente"**: es la palabra que la gente busca, entra en el ancho sin achicar la letra, y el nombre completo está en el encabezado del panel apenas se abre.

**Qué se verificó.** En el navegador a 375px con una sesión de prueba real (enlace de un solo uso, sin contraseñas): la barra muestra los cuatro lugares con el violeta centrado en 188 de 375, el botón abre el panel del asistente, el flotante queda en `display: none`, y el encabezado muestra el corazón y el perfil juntos arriba a la derecha. En la ficha de un vehículo, "Analizar de nuevo" quedó violeta con la sombra violeta. A 1024px: la barra de abajo no se dibuja, el flotante sí y en violeta, y el encabezado sigue con sus enlaces de texto, "Guardados" incluido. Sin errores en la consola.

### Ajuste del mismo día: el lugar de la IA se pinta entero

La píldora violeta del medio pasó a ser un lugar como los demás —cohete arriba, la palabra abajo— pero con el espacio **completo** pintado de violeta, de piso a techo de la barra.

**Por qué:** el cliente lo vio y pidió que ocupara todo. Tenía razón y el motivo se ve al mirarlo: una píldora chica adentro de un espacio transparente se lee como un botón **metido** en la barra, no como parte de ella, y encima quedaba más chica que los otros tres lugares cuando es la que más se quiere que se toque. Ahora lo que la distingue no es la forma sino el color, que es más fuerte y molesta menos.

Se le fueron con eso la sombra violeta, las esquinas redondeadas y el hundido del dos por ciento: no flota sobre la barra, es un pedazo de la barra —encogerla dejaría ver la barra por los costados—. El acuse de recibo al toque lo da el violeta, que se oscurece mientras el dedo está apoyado.

**Dice "Chat"**, como lo pidió el cliente. Queda anotado que al lado está "Mensajes", que también son conversaciones —las que se tienen con el vendedor—: en la pantalla, lo que separa a una de la otra es el violeta y el cohete, no la palabra. El nombre completo lo dice el `aria-label` ("Abrir el chat del asistente de IA") y el encabezado del panel.

Medido: el violeta ocupa 75 × 57px, arranca a un píxel del borde de arriba de la barra —ese píxel es la línea de la barra— y llega hasta abajo; su centro cae en 188 de una pantalla de 375, el eje exacto.

### Segundo ajuste del mismo día: dónde queda cada cosa

Quedó así, después de que el cliente lo probara en el teléfono:

| Antes de hoy | Ahora |
|---|---|
| Barra: Inicio, Publicar, Guardados, Mensajes, Mis avisos | Barra: Inicio, **Guardados**, **Chat IA**, Mis avisos |
| Encabezado en celular: perfil | Encabezado: **Notificaciones** (campana) y perfil |
| Asistente: botón flotante | Asistente: el lugar violeta del medio de la barra |

**"Guardados" se quedó abajo y "Mensajes" subió.** El criterio es qué hace la mano: el corazón se toca **mientras** se recorre el listado, decenas de veces por sesión, y eso es trabajo de pulgar; los mensajes se miran cuando se los va a buscar, una o dos veces por día, y para eso el encabezado alcanza y sobra.

**"Mensajes" pasó a llamarse "Notificaciones", y el ícono es una campana.** No es solo un cambio de nombre: es reservar el lugar de **todo lo que llega**. Hoy lo que llega son conversaciones; cuando existan los avisos que no son conversaciones —un vehículo guardado que bajó de precio, una función nueva— van a aparecer en la misma lista y en el mismo botón, sin tener que mudar a nadie de pantalla ni enseñarle un lugar nuevo. **La dirección sigue siendo `/mensajes`** a propósito: cada conversación cuelga de ella (`/mensajes/[id]`) y esos enlaces ya están guardados en el historial de la gente.

**El aviso de "hay algo nuevo" es un punto y es azul.** Un punto y no un número porque el botón mide 38px y desde afuera la única pregunta que hay que contestar es "¿hay algo para mirar?". Azul y no rojo —el cliente lo pidió "rojo o algo"— por la regla de identidad del proyecto, que no usa rojo ni naranja en ningún estado: el rojo de las notificaciones de otras aplicaciones dice "algo anda mal", y acá casi siempre es alguien contestando un mensaje. Lleva un anillo blanco para que no se apoye sobre el borde del botón y se lea como una mancha. Cambiarlo a rojo es una línea, si el cliente lo prefiere igual.

**Al violeta se le redondearon las esquinas** (`rounded-xl`, los mismos 12px de todo lo chico de la aplicación, con cuatro píxeles de aire alrededor). Un rectángulo de esquinas vivas adentro de una barra de vidrio se veía puntiagudo; el cliente lo marcó y tenía razón. Medido: 73 × 53px, centrado en 188 de una pantalla de 375.

## 2026-09-04 — La ficha del vehículo: dos acciones en un renglón y la IA adentro de un botón

Dos cambios en la ficha, los dos pedidos por el cliente después de mirarla en el teléfono.

### Consultar y guardar comparten renglón

"Consultar al vendedor" ocupaba el ancho entero y el corazón quedaba en el renglón de abajo. Ahora van juntos: consultar se queda con 279px de los 375 —es la salida del embudo— y el corazón con 52, **sin la palabra "Guardar"**: el corazón ya dice qué hace, y ahí la palabra solo le come ancho al botón que importa.

**Los dos miden exactamente lo mismo de alto porque el renglón los estira** (`items-stretch`), no porque tengan una altura escrita. Un `h-full` en el corazón, que fue lo primero que se probó, hace justo lo contrario: `height: 100%` contra un padre de alto automático se resuelve como "el alto de mi contenido", y quedó de 20px al lado de un botón de 48. Se vio midiendo, no mirando.

Cuando el aviso no está publicado —vendido, pausado— no hay botón de consultar, así que el corazón vuelve a llevar su palabra: solo en un renglón vacío no se entiende qué está esperando.

### Todo lo que hace la IA vive adentro de un botón

Debajo de esas dos acciones hay ahora un botón violeta de ancho completo, con el cohete: **"Analizar con IA"**. Adentro están el análisis de las fotos y el precio de referencia, y **no se dibuja nada hasta que alguien lo toca**.

**Por qué:** las dos tarjetas juntas pasan los 1.500px en un celular. Estaban abiertas apenas se bajaba un poco, así que entrar a un aviso era comerse una pared de texto antes de llegar a la descripción y a los datos. Medido en un aviso con análisis hecho: la ficha pasó de **3.145px a 1.493px**, menos de la mitad.

**Cerrado también cuando el análisis ya está hecho**, y eso fue explícito en el pedido. Que aparezca solo porque otro lo pidió antes es exactamente la misma pared de texto, y quien entra a mirar un vehículo no pidió leerla.

**El botón abre la caja; no gasta un análisis.** Adentro, si no hay ninguno hecho, está el botón que sí lo pide —también violeta—; si ya hay uno, se lee el guardado. Un solo toque que empiece a gastar plata sin avisar es lo que el proyecto viene evitando desde la prueba en celular: nada se manda sin que la persona lo pida.

**El contenido no se monta hasta que se abre**, así que cerrado no le pide nada al servidor: son dos consultas menos por cada ficha que alguien abre y no analiza. Al cerrarla se desmonta y al volver a abrirla cada panel se pone al día solo, porque el estado del análisis vive en la base y no en la pantalla.

**Y el panel del análisis ahora avisa mientras carga.** Antes no dibujaba nada mientras le preguntaba al servidor, y estaba bien: se montaba solo al abrir la ficha, y un "Cargando…" que aparece sin que nadie pida nada es ruido. Ahora se monta cuando alguien aprieta un botón, y un botón que se aprieta y no muestra nada durante un segundo se lee como que no anduvo.

El orden de adentro no cambió: el análisis primero y el precio de referencia después, como salió de la prueba del 2026-08-27.

### Tercer ajuste de la ficha: las fotos se deslizan y se va un cartel

**La tira de miniaturas se fue.** Debajo de la foto principal había hasta seis cuadraditos para elegir cuál mirar: unos 60px de alto más su separación, en el lugar más caro de la pantalla —entre la foto y el precio—, para hacer lo mismo que hace el dedo. Ahora las fotos se pasan deslizando al costado y **el precio quedó pegado abajo de la imagen**, sin nada en el medio.

**Cómo funciona, sin librería y sin JavaScript de arrastre:** es una fila que desborda a lo ancho y se corta en seco en cada foto (`snap-x snap-mandatory` con `snap-center`). El desplazamiento lo hace el navegador, así que tiene la inercia y el rebote de siempre y anda igual con el dedo, con el trackpad y con la rueda del mouse. El único JavaScript es el que mira dónde quedó la fila para prender el puntito que corresponde.

**Los puntitos van encima de la foto**, no debajo: abajo volverían a costar el alto que se acaba de ganar. Son puntos y no números porque lo único que hay que contestar es "¿hay más?" y "¿por dónde voy?". **Las flechas aparecen de tablet para arriba**: en un celular sobran y taparían la foto, pero con mouse no hay forma evidente de pasar de foto, porque la barra de desplazamiento está escondida a propósito (`.sin-barra` en `globals.css`, dos reglas de navegadores distintos que no se pueden escribir en un atributo `class`).

**Se fue también el cartel "La conversación queda dentro de AIassistant, junto a este aviso."**, que estaba entre el botón de consultar y el de analizar. Lo pidió el cliente y tiene razón: explicaba algo que se entiende al tocar el botón —la conversación se abre adentro de la aplicación— y ocupaba dos renglones justo entre las dos acciones más importantes de la pantalla.

Medido en el mismo aviso: la ficha cerrada pasó de 1.493px a **1.382px**, y en una pantalla de 812px ahora entran la foto, el precio, el modelo, los datos, las dos acciones, el botón violeta y el principio de la descripción.

## 2026-09-04 — La escala de texto creció un punto

`text-xs` pasó de 13 a 14px y `text-sm` de 14 a 15. Entre las dos llevan casi todo el texto de la aplicación: las ayudas debajo de los campos, las fechas, el último mensaje de cada conversación, la descripción, la ficha técnica, el análisis de IA, el precio de referencia, las conversaciones, los botones y los campos.

**Por qué:** el cliente reportó que no llegaba a leer. No es una preferencia de gusto: quien compra un vehículo no tiene veinte años, y a los cincuenta la vista de cerca ya no es la misma. Es la segunda vez que pasa —el 2026-08-27 `text-xs` había pasado de 12 a 13— y las dos veces se resolvió igual.

**Se cambia en la escala y no clase por clase.** Son más de cien lugares, y el próximo texto que alguien escriba también tiene que quedar cubierto. Los interlineados se recalcularon con los tamaños nuevos: un texto más grande con el interlineado de antes se lee apretado, que es la mitad del problema que se está arreglando.

**Lo que no creció, y por qué:**

- **El precio y el modelo de la ficha** (`text-3xl` y `text-lg`). Ya eran grandes; el cliente los marcó como "no tocar" y tiene razón: si crecen todos, la jerarquía se aplana.
- **El renglón de las tarjetas del muro**, clavado en 14px. Fue la otra excepción que pidió el cliente y es la más justificada de las dos: ahí el texto se corta con puntos suspensivos, así que cada píxel de más es una letra menos del modelo a la vista, y lo que se cuida en esa pantalla es la densidad.

**Lo que sí creció aunque estaba en la lista de "no tocar":** el renglón de kilómetros y ubicación de la ficha, que pasó de 14 a 15px porque comparte la clase con todo el resto. La jerarquía que el cliente quería conservar queda intacta —precio 30, modelo 18, ese renglón 15— y es información real que alguien tiene que poder leer. Si molesta, se clava en 14 con una línea, igual que la tarjeta del muro.

**Las etiquetas de la barra de abajo pasaron de 11 a 12px.** No estaban en el pedido, pero eran el texto más chico que quedaba en pantalla y la barra es lo que más se toca. A 12px "Guardados" y "Mis avisos" siguen entrando enteros en su espacio, medido a 375px.

**Qué se verificó.** A 375px, con sesión: el muro, la ficha con el análisis abierto, notificaciones, mis publicaciones y el login. El precio quedó en 30px, el modelo en 18, el título de cada tarjeta de la ficha en 16 y el cuerpo en 15; el renglón del muro sigue en 14. Sin desborde horizontal en ninguna de las cinco pantallas.

## 2026-09-04 — El chat de IA: violeta y dorado, y un saludo que se escribe

El cliente lo miró y dijo que era "muy poco estético". Lo que salió de ahí:

**El encabezado es de vidrio violeta y dice "Chat con IA" en dorado.** Antes decía "Asistente AI" con una bajada que explicaba qué sabía hacer ("Sabe qué vehículo estás mirando"); la bajada se fue. Lo que el asistente sabe se ve en lo que contesta, no en un renglón de letra chica.

Para que el vidrio signifique algo, **el encabezado se mudó adentro de la caja que se desplaza** y quedó pegado arriba (`sticky`): los mensajes pasan por debajo y se adivinan borrosos. Con el encabezado afuera no habría nada detrás que dejar ver, y el vidrio sería un color más. El botón de cerrar sigue donde estaba, pero pasó a blanco translúcido: sobre el violeta, el borde gris y el texto oscuro de antes quedaban ilegibles.

**Nace el dorado, y es la tipografía del violeta.** `#FCD34D` para las letras y los íconos de todo lo que está pintado de violeta: el botón "Chat IA" de la barra, "Analizar con IA", "Analizar esta publicación", el flotante de escritorio, el botón de enviar del chat —que además pasó de azul a violeta— y el título del panel. **Solo sobre el violeta**: sobre blanco da 1,5:1 de contraste y es prácticamente invisible; sobre el violeta, 4,9:1.

Es un **amarillo dorado y no un naranja**, y la diferencia no es un capricho: la regla de identidad del proyecto sigue siendo que no hay rojo ni naranja en ningún estado. Esto no es un estado ni una alarma, es la tipografía de una pieza.

**El saludo se escribe en vez de estar puesto.** Al abrir el chat aparecen tres puntitos y a los cinco segundos llega el mensaje, como cuando alguien contesta del otro lado. Corre una sola vez por visita: cerrar y volver a abrir no obliga a esperar de nuevo.

**El saludo sigue sin ser un mensaje del hilo**, y eso es lo que hay que cuidar si alguien lo toca: si fuera un mensaje de verdad, viajaría al modelo como parte de la conversación en cada pregunta.

**Se fueron las tres sugerencias** ("¿Qué le preguntarías al vendedor?" y las otras dos). Las pidió sacar el cliente. Quedan anotadas en la bitácora del 2026-08-27 por el problema que dieron —enviaban al tocarlas— y la regla que salió de ahí sigue viva aunque las etiquetas ya no estén: nada de la aplicación envía sin que la persona lo pida.

**Los puntitos ahora rebotan en vez de titilar.** Usaban `animate-pulse`, que sube y baja la opacidad de los tres a destiempo y se lee como algo que parpadea, no como alguien escribiendo. Ahora saltan tres píxeles con el retraso de siempre, y son los mismos tres puntos para las dos esperas: el saludo y cada respuesta. Se apagan solos con `prefers-reduced-motion`, porque hay gente a la que el movimiento le marea.

**Los globitos cambiaron de color.** El del asistente pasó del gris al violeta suave y el de la persona sigue en azul suave: los dos lados de la conversación se distinguen por color y no solo por de qué lado están.

**Qué se verificó.** A 375px, con el backend real: el encabezado de vidrio violeta con el título en dorado (`rgb(252, 211, 77)` medido en pantalla), los puntitos y "Escribiendo…" al abrir, el saludo llegando a los cinco segundos en un globito violeta, una pregunta de verdad al modelo —con sus puntitos de "Pensando…" y la respuesta— y el botón de enviar en violeta con las letras doradas. Sin errores en la consola.

## 2026-09-04 — Se saca el dorado, y la conversación se rehace con el formato del chat

Dos cambios, los dos pedidos por el cliente el mismo día que se sumó el dorado.

### El dorado duró unas horas

El cliente lo vio y no le convenció. Todo lo que decía `text-ai-gold` volvió a blanco: el botón "Chat IA" de la barra, "Analizar con IA", "Analizar esta publicación", el flotante de escritorio, el título y el botón de enviar del chat. Se borró también el token `--color-ai-gold` de `globals.css` y los párrafos que explicaban por qué era dorado y no naranja — quedaba documentando un color que ya no está, y eso es peor que no documentar nada. Lo que queda escrito, en la bitácora y en la paleta, es que se probó y se sacó, para que a nadie se le ocurra reponerlo sin que el cliente lo pida.

### La pantalla de una conversación, rehecha con el formato del chat de IA

El cliente la vio al lado del chat de IA y la encontró fea, con un defecto concreto: el nombre del vehículo se salía del cuadro que lo contenía, cortado por el borde de la pantalla.

**La causa del desborde era un `truncate` sobre un enlace, y los enlaces son `inline` por omisión.** La utilidad `truncate` de Tailwind pone `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`, pero ninguna de esas tres reglas hace nada si el elemento no tiene un ancho contra el cual recortar — y un elemento `inline` no tiene ancho propio, fluye. Le faltaba `block` (o `inline-block`) al lado de `truncate`. Es un error fácil de repetir: cualquier `<Link>` o `<a>` con `truncate` y sin `block` va a hacer lo mismo, tarde o temprano, en cualquier pantalla nueva.

**El resto era el formato.** La pantalla eran piezas sueltas: un enlace de "← Volver" flotando solo, una tarjeta con borde y sombra para el vehículo, otra tarjeta aparte para los mensajes. El cliente pidió calcarle el formato al chat de IA, así que ahora:

- **El vehículo vive en un encabezado de vidrio pegado arriba** de la conversación, en el mismo lugar donde el chat de IA tiene su título — y es **azul** (`.glass`), no violeta: el violeta es la etiqueta de lo que llama al modelo, y esta pantalla es una conversación entre dos personas. Pintarla de violeta diría que la IA está leyendo, que es justamente lo que este proyecto no hace.
- **Todo el bloque del vehículo es un solo enlace a su ficha** — antes eran tres renglones sueltos y solo uno llevaba a la ficha. El botón de volver quedó aparte, al lado y no adentro del enlace, para no anidar un botón dentro de un `<a>`.
- **Los mensajes fluyen directo sobre la página**, sin la tarjeta con borde que los envolvía: es lo que hace que se lea como una conversación y no como un documento con una lista adentro.
- **El encabezado queda pegado (`sticky`) exactamente debajo de la barra de arriba**, midiendo su alto en vivo (`useAltoBarraSuperior`, que se extrajo de la barra de búsqueda del muro a `lib/useAltoBarraSuperior.ts` para no repetir la misma medición en dos lugares) — el mismo motivo por el que la barra de búsqueda hace lo mismo: la barra de arriba cambia de alto con sesión y de tablet para arriba.

**Qué se verificó.** Con una conversación real, a 375px y a 1024px: cero píxeles de desborde horizontal (antes lo había), el nombre y el modelo se cortan con puntos suspensivos en vez de salirse de la pantalla, el encabezado queda fijo al bajar por los mensajes, el botón de volver lleva a `/mensajes`, el enlace lleva a la ficha del vehículo, y se pudo escribir y mandar un mensaje nuevo. Sin errores en la consola. `npm run build` pasa.


## 2026-09-04 — El texto pesa más, y las fotos se agrandan sin agrandar la página

Dos pedidos del cliente, los dos de la misma prueba en el celular.

### La letra: primero más grande, después más gruesa

El pedido inicial fue "más grande, sobre todo los textos chicos". Se subió la escala un punto —`text-xs` de 14 a 15 y `text-sm` de 15 a 16— y el cliente lo miró y **cambió el pedido: más grande no, más gruesa**. Se dio vuelta el tamaño y quedó como estaba.

**Lo que quedó es el peso: el texto normal pasó de 400 a 500.** Es una sola línea en `globals.css`, en el `body`, por lo mismo que la escala de tamaños: son más de cien lugares y lo que alguien escriba mañana también tiene que quedar cubierto. Inter es variable, así que 500 es un peso dibujado y no una letra engordada por el navegador.

**No es 600 ni 700, que sería "negrita" de verdad**, porque el cliente agregó "que no arruine la estética" y ahí está el límite: si el texto normal pesa lo mismo que un título, no hay títulos. Toda la jerarquía de la aplicación se apoya en que los títulos (`font-semibold`, 600) y los precios (`font-bold`, 700) se vean más gruesos que lo que los rodea; el texto sube un escalón y los otros se quedan donde están, así que la distancia se mantiene.

**Efecto de costado que conviene saber:** `font-medium` también es 500, así que las clases sueltas de `font-medium` que hay en las pantallas dejaron de agregar algo. No estorban y no se sacaron. Lo que cambia es la regla para lo que venga: **resaltar algo hoy es `font-semibold`**, no `font-medium`.

### Las fotos: zoom adentro de la foto, y no de la página

El cliente reportó que en la ficha no se podía agrandar una foto. Se podía —pellizcando— pero lo que se agrandaba era **la página entera**, barras incluidas, y no volvía sola a su tamaño: hay que achicarla a mano. Es el zoom del navegador, no de la aplicación.

**Ahora la foto se abre a pantalla completa y el zoom vive ahí** (`components/PhotoViewer.tsx`, sin librería): se pellizca para agrandar hasta 4x anclado al punto entre los dos dedos, se arrastra con un dedo para recorrerla, dos toques agrandan a 2,5x o vuelven a la foto entera, y con la foto entera un arrastre al costado pasa de foto y uno hacia abajo cierra. Con mouse: Ctrl y rueda agrandan la foto, las flechas pasan de foto, Escape cierra.

**Por qué a pantalla completa y no adentro del carrusel.** El carrusel se pasa deslizando y ese deslizamiento lo hace el navegador; un pellizco en esa misma caja pelea con él —un dedo pasando de foto, el otro intentando agrandar—. El visor, en cambio, se queda con los dedos (`touch-action: none`) y no tiene con qué pelear.

**Qué hace que el navegador no se meta.** `touch-action: none` en el visor y `pan-x pan-y` en el carrusel le sacan el pellizco dejándole los desplazamientos; y en Safari de iPhone eso no alcanza, porque además de los eventos de toque tiene los suyos (`gesturestart`, `gesturechange`), que hay que cancelar a mano. Los dos van con `addEventListener` y `passive: false`: React registra `touchstart` y `wheel` como pasivos, así que desde un `onTouchStart` no se puede frenar nada.

**El pellizco sobre el carrusel abre el visor**, no solo el toque. Es el gesto con el que la gente pide zoom sin pensarlo; si ahí no pasara nada, el visor no existiría para quien no descubrió el toque.

**Dos errores que se encontraron verificando, y valen para cualquier gesto que se escriba después:**

1. **Calcular adentro de un actualizador de estado sale mal.** El zoom se escribía con un `setDesplazamiento` anidado adentro de un `setEscala(prev => …)`. React puede llamar a un actualizador dos veces —en desarrollo lo hace a propósito—, así que el zoom se aplicaba dos veces y un doble toque terminaba pegado contra el borde en vez de centrado donde se tocó. Ahora el zoom y el movimiento viven también en una referencia, que es lo que se lee en el medio de un gesto: un pellizco manda decenas de eventos por segundo y React no vuelve a dibujar entre uno y otro.
2. **`requestAnimationFrame` no corre con la pestaña oculta.** Al cerrar el visor, el carrusel se para en la foto que quedó a la vista allá adentro; ese salto estaba adentro de un `rAF` y no pasaba nunca mientras el navegador de la verificación estaba escondido. No hacía falta esperar nada: el visor es `fixed` y no le cambia el ancho a la fila, así que la fila está montada y medida. Quedó sincrónico.

**El tope del movimiento se calcula con el tamaño real de la foto dibujada, no con el de la caja.** Una foto apaisada en una pantalla de 375x812 ocupa 375x281 y el resto es negro: midiendo con la caja, la foto se podría arrastrar hasta dejar a la vista una franja vacía, y eso se lee como que la aplicación se rompió.

**Qué se verificó.** A 375px, con el backend real y fotos reales: peso 500 medido en pantalla en el muro y en la ficha; pellizco de 100 a 240px dando 2,4x y el de vuelta volviendo a la foto entera; doble toque a la izquierda del centro dando 2,5x anclado (+101,25px, el número exacto que corresponde); arrastre topeado justo en el borde de la foto (281,25px) sin dejar ver negro; `visualViewport.scale` **en 1 durante todo el zoom** —la página no se agrandó ni una vez—; pellizco sobre el carrusel abriendo el visor y cancelando el gesto del navegador; deslizar de la foto 2 a la 3 y el carrusel quedando parado en la 3 al cerrar; Escape, la cruz y el arrastre hacia abajo cerrando. Sin errores en la consola. `npm run build` pasa.

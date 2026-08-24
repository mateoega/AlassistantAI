# Contexto del proyecto para Claude Code

Este archivo le da contexto a Claude Code (u otra IA asistente) sobre el proyecto AIassistant, para que cualquier tarea futura respete las decisiones ya tomadas.

## Qué es AIassistant

Plataforma que ayuda a comprar y vender vehículos de **todo el rubro automotor** con más confianza: analiza las fotos, detecta inconsistencias y estima un precio de mercado. Visión completa en [`../docs/vision_general.md`](../docs/vision_general.md).

**El alcance es cualquier vehículo motorizado terrestre** — autos, camionetas, utilitarios, motos, cuatriciclos, camiones, buses y los que se sumen. Esto no es un detalle: el tipo de vehículo es una pieza central del modelo de datos, y agregar un tipo nuevo **no debe requerir tocar código**. Antes de escribir cualquier cosa que asuma "auto", leer [`../docs/modelo_datos.md`](../docs/modelo_datos.md).

## Arquitectura

```
frontend (Next.js) → backend (Express) → Supabase (Postgres + Storage + Auth)
                            └──► backend/src/ia/ → API de Gemini
```

- **`frontend/`** — pantallas, componentes, llamadas a la API del backend. Nunca llama a Gemini ni usa la clave de servicio de Supabase. **Dos excepciones deliberadas:** el login (librería de Supabase con la clave pública `anon`) y la subida de fotos a Storage. Todo lo demás pasa por el backend.
- **`backend/`** — rutas de la API, validación, orquesta las llamadas al módulo de IA y a Supabase. Valida la ficha `specs` de cada publicación contra el catálogo de campos del tipo de vehículo.
- **`backend/src/ia/`** — la lógica que arma los prompts, llama a Gemini con las fotos, y parsea la respuesta. Tiene su propio [README](backend/src/ia/README.md). *Estaba en `app/ia/` hasta el Sprint 2; se movió porque Node no encontraba sus librerías desde ahí.*

Detalle completo en el `README.md` de la raíz del proyecto.

## Estado actual

Sprint 6 terminado — no agregó funciones nuevas: cerró lo que los cinco sprints anteriores dejaron abierto. Ver [`../docs/roadmap.md`](../docs/roadmap.md) y [`../docs/sprint6.md`](../docs/sprint6.md).

Las piezas: la **mensajería interna** entre comprador y vendedor, ahora con **bloquear y denunciar** (Sprints 5 y 6), la **barra de búsqueda** arriba del muro y los **favoritos** (Sprint 4), el **precio de referencia** en cada publicación (Sprint 3), el **botón "Analizar"** que mira las fotos junto con los datos declarados, el **chat del asistente** —que sabe qué aviso hay en pantalla, busca entre las publicaciones y contesta mientras escribe—, y la pantalla **`/legales`** con el descargo de responsabilidad.

**El contacto es por mensajes y solo por mensajes.** El enlace a WhatsApp y el botón de llamar se sacaron en el Sprint 5, junto con el teléfono del vendedor, que dejó de viajar dentro de cada publicación. Volver a poner un contacto por fuera de la plataforma es deshacer el sprint, no agregarle algo: la conversación se da afuera y el análisis y la estimación se quedan sin nadie que los mire. El teléfono sigue en el perfil, pero es privado y no sale en ningún aviso.

**Los favoritos son privados y no se pueden contar.** Ninguna regla de acceso permite leer los favoritos de otro usuario **ni contarlos**, así que no existe —ni debe existir— un "23 personas guardaron este vehículo". Es una decisión de producto: ese contador sirve para apurar al que duda. Agregar cualquier lectura agregada de `favorites` contradice el diseño.

**Buscar no es una pantalla aparte.** No existe la ruta `/buscar`: una búsqueda es el muro con parámetros en la dirección (`/?q=corolla&tipo=auto`). Los filtros viven en la dirección y no en el estado del componente, para que el botón "atrás" vuelva a los resultados. Ver [`../docs/sprint4.md`](../docs/sprint4.md).

**Los mensajes son privados, y la IA no los lee.** Una conversación la ven sus dos participantes y nadie más — tampoco el asistente. Y no hay forma de contar cuántas personas preguntaron por un aviso, igual que con los favoritos: no existe ruta ni política que lo permita, y agregarla contradice el diseño.

**Bloquear corta de verdad, y no dice quién bloqueó a quién.** El bloqueo lo aplican las políticas de la base —no la pantalla— en las dos direcciones, y las de `messages` y `conversations` preguntan por él a través de `blocked_with`. A quien fue bloqueado se le dice que en esa conversación no se puede escribir, **nunca quién lo decidió**: no existe consulta que devuelva "quién me bloqueó". Denunciar es otra cosa y no bloquea por su cuenta. Ver [`../docs/sprint6.md`](../docs/sprint6.md).

**La IA trabaja para el comprador, no para el vendedor.** Es la decisión que viene definiendo el proyecto desde el Sprint 2 y la que explica el tono de los prompts. Si aparece una función de IA pensada para ayudar a quien publica, contradice el diseño — ver [`../bitacora/bitacora.md`](../bitacora/bitacora.md), 2026-08-12.

**El análisis no dictamina si conviene comprar.** Eso sigue prohibido y no depende de tener datos: es una decisión de quien compra.

**Sobre precios sí puede hablar, pero solo cuando se le pasa la estimación.** Desde el Sprint 3, la estimación de la plataforma viaja junto con los datos del vehículo. Si no hay estimación, no se le pasa nada y vuelve a regir la restricción del Sprint 2. **No agregar al prompt un permiso suelto para opinar de precios**: el permiso tiene que venir del dato. Ver [`backend/src/ia/price-context.ts`](backend/src/ia/price-context.ts).

## Convenciones

- **Todo el código en TypeScript.** Frontend, backend y módulo de IA.
- **Nombres de variables, funciones y archivos en inglés.** Los textos que ve el usuario (UI) van en español.
- **La clave de Gemini (`GEMINI_API_KEY`) y las claves de servicio de Supabase viven solo en el backend**, leídas desde variables de entorno. Nunca se exponen al frontend ni se hardcodean en el código.
- **Paleta de colores e identidad visual:** ver [`../diseño/paleta_colores.md`](../diseño/paleta_colores.md). Regla importante: no se usa rojo ni naranja para estados de alerta o error — la marca usa azul consistentemente, incluso para alertas.

## Reglas para cualquier cambio futuro

- Nunca commitear el archivo `.env` (ya está bloqueado en `.gitignore`).
- Nunca poner una clave de API en código del frontend.
- Antes de agregar una dependencia nueva, preferir la opción más simple — este proyecto prioriza simplicidad sobre escalabilidad en esta etapa.
- Cualquier decisión de arquitectura o tecnología que se tome, registrarla en [`../bitacora/bitacora.md`](../bitacora/bitacora.md).
- **Nunca escribir código que dependa de una lista de tipos de vehículo hardcodeada.** Los tipos y sus campos se leen siempre del catálogo en la base (`vehicle_types` y `vehicle_type_fields`). Si aparece un `if (tipo === 'auto')` o un `switch` por tipo en el código, el diseño se rompió: agregar un tipo nuevo tiene que funcionar cargando filas en el catálogo, sin redesplegar.
- **Los filtros por datos propios de cada tipo se arman desde el catálogo, igual que el formulario.** Las claves de la ficha (`specs`) que llegan en la dirección no se usan nunca para construir la consulta: se recorren los campos que el catálogo declara para el tipo elegido y se busca el parámetro de cada uno. Una clave que el catálogo no declara no llega a la base. Ver [`backend/src/services/listing-filters.ts`](backend/src/services/listing-filters.ts), `buildSpecFilters`.
- **Un número guardado en la ficha se compara como número, no como texto.** `specs->clave` respeta el tipo del dato; `specs->>clave` lo saca como texto, y ahí "1000" es menor que "800". Se midió: un filtro de carga mínima de 800 kg devolvía 8 resultados en vez de 23.
- **Qué significa cada filtro de búsqueda se decide en un solo lugar**, [`backend/src/services/listing-filters.ts`](backend/src/services/listing-filters.ts). Hay dos puertas de entrada a la misma búsqueda —la barra del muro y la herramienta del asistente— y devuelven formatos distintos a propósito, pero los filtros tienen que significar lo mismo en las dos. Si aparece un filtro escrito directamente en uno de los dos servicios, el diseño se rompió.
- **Los prompts de IA también se arman desde el catálogo.** La regla anterior no se detiene en el formulario: el prompt del análisis recibe el tipo y sus campos leídos de la base, y deja que el modelo razone según eso. No se escriben instrucciones del estilo "si es una moto, mirá la cadena". Ver [`backend/src/ia/vehicle-context.ts`](backend/src/ia/vehicle-context.ts).
- **Un efecto que pide datos se ata al id del usuario, no al objeto de sesión.** La librería de Supabase reemplaza ese objeto cada vez que renueva el token o cuando se vuelve a la pestaña; un `useEffect` con `[session, ...]` en las dependencias vuelve a pedir todo sola. Va `session?.user?.id`. Y el cartel de "Cargando…" se muestra **solo mientras no hay nada en pantalla**: un refresco de fondo no reemplaza por un cartel lo que la persona está leyendo. Se encontró en el Sprint 5 —el hilo de mensajes quedaba parpadeando— y estaba también en la ficha del vehículo desde el Sprint 1.
- **El leído de una conversación vive en su propia tabla (`conversation_reads`), y no como dos columnas adentro de `conversations`.** No es una preferencia de modelado: las políticas de acceso de Postgres son por fila y no por columna, así que una política que deje al comprador actualizar "su" columna lo deja también pisar la del vendedor. Si aparece una columna `*_last_read_at` en `conversations`, el diseño se rompió. Ver la migración 012.
- **Los mensajes no se editan ni se borran.** `messages` no tiene política de UPDATE ni de DELETE, a propósito: lo dicho en una negociación es prueba para el otro. Agregarlas es una decisión de producto y va a la bitácora. Bloquear tampoco los borra: corta lo que viene, no lo que pasó.
- **Una política que consulta otra tabla puede no ver lo que necesita.** Las reglas de acceso también se aplican adentro de una regla de acceso: un `exists (select 1 from user_blocks ...)` en la política de `messages` corre con la identidad de quien escribe, que no puede ver la fila de quien lo bloqueó, y volvería vacío siempre. Por eso la pregunta la hace `public.blocked_with(uuid)`, que es `security definer` y solo responde por pares donde está quien pregunta. Si aparece una política que consulta una tabla con RLS más restrictiva que la política misma, hay que mirarla dos veces. Ver la migración 013.
- **Lo que el asistente pide filtrar de la ficha se valida contra el catálogo, en el backend.** `ia/chat.ts` copia los pedidos sin mirarlos: qué campos declara cada tipo lo sabe el catálogo, no el módulo de IA. `specFiltersFromRequests` los traduce al mismo parámetro que usaría la dirección del navegador y los valida con `buildSpecFilters`, la función del muro. Escribir una validación aparte para el asistente rompe la regla de "un solo lugar decide qué significa cada filtro".
- **La respuesta del asistente se pide siempre de a pedazos**, con o sin alguien mirándolos (`replyToChat` recibe un `onDelta` opcional). Las rutas `/chat` y `/chat/stream` son dos presentaciones de la misma llamada: si aparece una segunda implementación para el camino rápido, la que se use menos se va a romper sin que nadie se entere. Y el stream **no abre los encabezados hasta que hay algo que mandar**, para que un error anterior al primer byte siga viajando como una respuesta HTTP normal.
- **Una vista que se lee con la identidad del usuario se declara `security_invoker`.** Una vista de Postgres corre por omisión con los permisos de quien la creó y saltea las reglas de acceso de las tablas de abajo. `conversation_overview` la usa; cualquier vista nueva sobre datos de usuarios también tiene que usarla.
- **La clave de servicio de Supabase tiene usos contados, y esta lista es la lista completa:**
  1. Guardar los **análisis de IA**, en una tabla que ningún usuario puede escribir.
  2. Los **scripts de desarrollo que se corren a mano** y no se despliegan: el cargador de datos de prueba (`scripts/seed-demo.ts`) y el de referencias de precio (`scripts/cargar-referencias.ts`). Ninguno de los dos lo puede invocar un usuario.
  3. La **verificación del recorrido completo** (`scripts/verificar-recorrido.ts`), para pedir los enlaces de acceso de un solo uso con los que entra como las cuentas de prueba —sin contraseñas— y para limpiar al final lo que creó. Todo lo que verifica lo hace después con la sesión de cada usuario, no con esta clave. Sumado en el Sprint 6.

  Todo lo demás va con el cliente del usuario, para que las reglas de acceso de la base se apliquen siempre. Agregar un uso más a esta lista es una decisión de arquitectura: va a la bitácora. Ver [`backend/src/lib/supabase.ts`](backend/src/lib/supabase.ts).

# Sprint 2 — Registro de decisiones

Fecha: 2026-08-12

## Objetivo del sprint

Conectar la IA. Es lo único que diferencia esta plataforma de cualquier otro clasificado: hasta acá, el Sprint 1 dejó un flujo de publicación completo pero indistinguible del de cualquier competidor.

## El replanteo del que salió todo lo demás

El roadmap planteaba este sprint como **"análisis de fotos"**: una función del sistema que mira las imágenes y le pega un resultado a la publicación. Al arrancarlo se hizo la pregunta que faltaba: *¿para quién es esto?*

La respuesta cambió el sprint entero. La IA pasa a ser **un asistente del comprador**.

**Por qué.** El que vende ya tiene control sobre su aviso: elige las fotos, escribe la descripción, pone el precio. El que compra tiene que decidir con lo que le muestran y no tiene forma de contrastarlo. Ahí es donde una segunda opinión cambia algo.

Y hay un problema de incentivos que la versión orientada al vendedor tenía de raíz: **una herramienta que le señala defectos a quien publica es una herramienta que quien publica no va a usar.** El análisis habría existido en el papel y no en la práctica.

De ese replanteo salieron las dos piezas del sprint: el botón "Analizar" en cada publicación, y el chat que acompaña al comprador en toda la aplicación.

## Decisiones tomadas

### El análisis no dictamina si conviene comprar

Describe lo que se ve, señala lo que no cierra, dice qué no se puede evaluar y qué preguntarle al vendedor. **No dice si es una buena oportunidad ni si el precio está bien.** Está prohibido explícitamente en el prompt, porque un modelo opina de precios igual si no se le aclara.

**Por qué:** no tiene contra qué comparar. Las referencias de mercado llegan en el Sprint 3. Un veredicto sin esos datos sería una opinión con cara de dato, y la confianza es exactamente lo que la plataforma vende. Lo demás es útil igual y no depende de conocer el mercado.

**Contra asumida:** es menos contundente que un "conviene / no conviene", que es lo que un comprador querría escuchar. Se prefirió no decirlo antes que decirlo mal.

### El prompt se arma leyendo el catálogo

`app/backend/src/ia/vehicle-context.ts` no tiene una lista de tipos de vehículo adentro. Recibe el tipo y sus campos tal como los declara el catálogo, y arma la descripción con eso. El modelo decide qué mirar en una moto y qué en un camión a partir de lo que le llega, no de un `switch`.

**Por qué:** es el requisito central del cliente, el mismo que sostiene el formulario que se dibuja solo. Cargar "motorhome" desde el panel de Supabase tiene que dar un análisis coherente de motorhome sin tocar código.

**Detalle que salió de esto:** al análisis se le pasan también **los campos que el tipo pide y el vendedor dejó vacíos**. La pantalla de detalle no los muestra (nadie quiere ver una lista de huecos), pero para quien está por comprar, que no se haya declarado el tipo de freno de una moto es información.

### La clave de servicio de Supabase entra en juego por primera vez

Los análisis se escriben con la clave de servicio, y la tabla `listing_analyses` no tiene ninguna política de escritura: nadie puede escribir ahí desde el navegador.

**Por qué:** el análisis es una afirmación de la plataforma sobre un vehículo, no un dato que carga un usuario. Con la clave pública, un vendedor podría inventarse el análisis de su propio aviso — que es exactamente la confianza que la plataforma vende.

**Lo que no cambió:** las lecturas siguen yendo con la identidad real del usuario, así que el análisis de un borrador ajeno no se ve. La clave de servicio tiene un solo uso permitido en todo el proyecto y está documentado en el código.

### El análisis se guarda con una huella de lo que analizó

Una fila por publicación. La huella cubre las fotos en orden **y los datos declarados**.

**Por qué incluye los datos:** si el vendedor corrige el kilometraje, un análisis que decía "el desgaste no cierra con los km declarados" quedó tan viejo como si hubiera cambiado una foto. Mostrarlo como vigente sería el tipo exacto de inconsistencia que la plataforma promete detectar.

**Por qué se guarda:** cada análisis cuesta plata y tarda entre diez y treinta segundos. Recalcular por visitante haría que un aviso popular costara una fortuna y cargara lento.

### El análisis corre en segundo plano

El pedido responde enseguida con el análisis "corriendo" y el navegador vuelve a preguntar cada tres segundos.

**Por qué no se espera:** dejar un pedido HTTP colgado treinta segundos es frágil. Y si dos compradores aprietan el botón a la vez, el segundo se engancha al que ya está corriendo en vez de pagar un segundo análisis. Un análisis que queda trabado más de tres minutos se da por caído, para que un reinicio del servidor no deje una publicación bloqueada para siempre.

### Las fotos se achican antes de mandarlas

A 1024px de lado mayor, con `sharp`.

**Por qué:** una foto de celular pesa varios megabytes; diez hacen fallar el pedido por tamaño y se pagan caras. Y no se gana nada: los modelos de visión trabajan sobre una versión reducida igual. 1024px alcanza para ver un rayón, óxido o el desgaste de un neumático.

**Se mandan hasta 8 fotos**, las primeras en el orden que eligió el vendedor. A partir de ahí cada foto extra suma costo sin cambiar las conclusiones.

### La conversación del chat no se guarda

Vive mientras dura la visita. No hay tabla de conversaciones.

**Por qué:** guardar conversaciones es tabla de mensajes con sus reglas de acceso, pantalla de historial y datos personales que custodiar — buena parte de lo que cuesta el Sprint 5. Para validar si el asistente sirve, no hace falta.

**Sí se cuidó que sobreviva a la navegación:** el estado vive en el layout, no dentro del panel. Sin eso, entrar a mirar el vehículo del que se estaba hablando borraba el hilo.

### El chat puede buscar entre las publicaciones

Se le dio al asistente una herramienta de búsqueda con filtros por tipo, marca, precio, año, kilómetros y provincia.

**Por qué se escribió como servicio general y no a medida del chat:** es la misma consulta que va a necesitar la pantalla de búsqueda del Sprint 4. Acotarla al chat implicaba escribirla dos veces.

**Corre con la sesión del usuario**, no con la clave de servicio: las reglas de acceso siguen mandando aunque el pedido venga de un modelo. Un borrador ajeno no aparece ni aunque el modelo lo pida.

**Las fotos no viajan en el chat.** Mandarlas en cada mensaje sería lento y caro. Si la publicación ya tiene análisis, se le pasa ese texto: el asistente habla de lo que se ve sin volver a mirar las imágenes.

### El módulo de IA se mudó de carpeta

De `app/ia/` a `app/backend/src/ia/`. Desvío respecto de la estructura del Sprint 0.

**Por qué:** Node busca las librerías partiendo de la carpeta del archivo que las importa, y desde `app/ia/` no encontraba las del backend. Mantenerlo afuera obligaba a un `package.json`, un `npm install` y una compilación propios para un módulo de cinco archivos.

**Lo que se preservó:** sigue siendo su propia carpeta con su propio README. El Sprint 0 ya decía que el módulo de IA vive dentro del backend y se despliega con él; cambió dónde está la carpeta, no la arquitectura.

## Qué se construyó

**Base de datos.** Una migración: `listing_analyses`, con lectura heredada de la publicación y sin ninguna política de escritura.

**Backend.** El módulo `ia/` (cliente de Gemini, contexto del vehículo desde el catálogo, procesamiento de fotos, análisis y chat), tres servicios nuevos (`analysis`, `assistant`, `listing-search`), el formateo de la ficha extraído a `spec-display` para que la IA y la pantalla de detalle hablen del mismo vehículo, y las rutas `/api/listings/:id/analysis` y `/api/assistant/chat`.

**Frontend.** El panel de análisis en la pantalla de detalle, y el asistente conversacional montado en el layout: botón flotante en toda la aplicación, panel lateral en escritorio y pantalla completa en celular.

**Dos dependencias nuevas**, las únicas del sprint: `@google/genai` y `sharp`.

## Qué quedó afuera, a propósito

- **Estimación de precio y veredicto de oportunidad** — Sprint 3. Es lo que destraba la restricción que este sprint se impuso.
- **Análisis automático al publicar** — descartado por costo. Corre cuando alguien lo pide.
- **Historial de conversaciones guardado** — la charla vive mientras dura la visita.
- **Pantalla de búsqueda con filtros** — Sprint 4. El motor está hecho; falta la pantalla.
- **Respuestas del chat que aparecen escribiéndose** (streaming). Se muestra "Pensando…" y llega la respuesta completa. Se puede sumar después sin rehacer nada.

## Qué se verificó y qué no

**Verificado al cerrar el sprint:** los dos proyectos compilan sin errores de tipos; el frontend compila para producción; el backend levanta y las rutas nuevas rechazan pedidos sin sesión.

**Verificado el 2026-08-17, con Gemini contestando de verdad:** claves cargadas, migración aplicada, y el recorrido completo probado en la aplicación. El análisis de una publicación de prueba detectó que sus fotos eran de tres autos distintos sacados de internet y que el modelo no correspondía al año declarado, sin opinar sobre el precio. El chat ejecutó una búsqueda real contra la base y respondió con lo que efectivamente hay publicado.

**Dos fallas que aparecieron recién ahí, y que el sprint no podía haber detectado compilando:** el modelo `gemini-2.5-flash` había sido dado de baja por Google, y el chat perdía la firma que Gemini 3 exige devolver al usar herramientas. Las dos están corregidas y explicadas en la entrada del 2026-08-17 de [`../bitacora/bitacora.md`](../bitacora/bitacora.md).

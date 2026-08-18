# Sprint 1 — Registro de decisiones

Fecha: 2026-08-07

## Objetivo del sprint

Dos cosas a la vez: absorber la ampliación del alcance al rubro automotor completo, y construir sobre ese alcance la primera versión funcional de la aplicación — login, muro de publicaciones, carga con fotos y vista de detalle. Sin IA todavía.

## El cambio de alcance, y por qué se atendió primero

El cliente amplió el alcance de "vehículos usados" (entendido como autos) a **todo el rubro automotor**: cualquier vehículo motorizado terrestre.

Se frenó el arranque del sprint para replantear el modelo de datos antes de escribirlo. El motivo es de costo: el proyecto no tenía una sola línea de código ni una tabla creada, así que absorber el cambio costó reescribir tres documentos. El mismo cambio, llegando después de tener la base armada alrededor de "auto", habría obligado a rehacer las tablas, migrar los datos ya cargados y tocar todas las pantallas.

## Decisiones tomadas

### Modelo de datos: catálogo de tipos + ficha flexible por tipo

Los campos comunes a cualquier vehículo (marca, modelo, año, precio, uso, ubicación, vendedor, fotos) son columnas normales. Los tipos de vehículo y los campos que pide cada uno viven en dos tablas de catálogo. Las respuestas a esos campos se guardan en una columna JSON (`specs`) dentro de cada publicación.

**Por qué:** el requisito fue explícito — agregar un tipo de vehículo el día de mañana no puede implicar rediseñar la base. Con este esquema, sumar "motorhome" es cargar filas de catálogo desde el panel de Supabase: el tipo aparece en el selector y su formulario se dibuja solo, sin tocar código ni redesplegar. A la vez, dejar los campos comunes como columnas reales mantiene la base rápida y ordenada para buscar y filtrar, que es lo que va a necesitar el Sprint 4.

**Alternativas descartadas:** una tabla por tipo (cada tipo nuevo obliga a tocar código en tres lugares); guardar todo en la ficha flexible (se pierde el filtrado rápido y la validación de los campos críticos); una tabla de atributos sueltos, EAV (consultas con muchos cruces, datos ilegibles en el panel de Supabase).

Explicación completa en [`modelo_datos.md`](modelo_datos.md).

### El uso se mide en kilómetros o en horas, según el tipo

Un auto y una moto se miden en kilómetros; un camión, un bus y un cuatriciclo, en horas de trabajo. El uso se guarda como número + unidad, y **la unidad la define el tipo de vehículo en el catálogo, no el usuario**. La etiqueta del formulario ("Kilometraje" / "Horas de uso") también sale de ahí.

**Por qué:** es el punto donde el alcance ampliado rompe el diseño pensado para autos. Dejarlo como "kilometraje" habría obligado a que un camionero cargue horas en un campo que dice km.

### La validación de la ficha flexible es dinámica y estricta

Una columna JSON acepta cualquier cosa. El backend valida cada publicación contra el catálogo antes de guardarla: campos obligatorios presentes, números dentro del rango declarado, opciones que existen en la lista, y rechazo de cualquier campo que el tipo no haya declarado.

**Por qué:** sin esto, la flexibilidad se convierte en una base llena de datos sucios en seis meses. La flexibilidad está en el esquema, no en la validación.

### Dos excepciones a "todo pasa por el backend": login y subida de fotos

El Sprint 0 estableció que el frontend nunca habla directo con Supabase. Se acotaron dos excepciones: la sesión de login (la maneja la librería oficial de Supabase en el navegador) y la subida de fotos a Storage (directo, para que las imágenes no viajen dos veces).

**Por qué:** replicar el manejo de sesión a mano en Express es reescribir algo que ya funciona; pasar cada foto por el servidor duplica el tráfico sin ganar nada. En ambos casos la seguridad se apoya en las reglas de acceso de Supabase, que son la última línea de defensa igual. El principio de fondo se mantiene: las claves privadas siguen viviendo solo en el backend.

### El backend actúa con la identidad del usuario, no con permisos totales

Cada pedido crea un cliente de Supabase con el token de quien lo hizo, en lugar de usar la clave de servicio.

**Por qué:** así las reglas de acceso de la base se aplican siempre. Si el código del backend tuviera un error y pidiera un borrador ajeno, la base igual lo rechazaría. La seguridad deja de depender de que el código esté bien escrito. Como efecto secundario, la clave de servicio de Supabase todavía no hace falta.

### Interfaz: Tailwind con la paleta de la marca

Se cargó la paleta de [`../diseño/paleta_colores.md`](../diseño/paleta_colores.md) como variables de color, incluida la regla de identidad: **no se usa rojo ni naranja en ningún estado, ni siquiera en errores**. Los avisos usan el azul intenso, el borde y la jerarquía tipográfica.

Se sumaron dos tonos de fondo (`surface` y `border`) que no están en el documento original: son variantes del mismo azul casi negro, un poco más claras, necesarias para separar las tarjetas del fondo. No son colores nuevos.

## Alcance de este sprint

**Se construyó:** el esquema completo en Supabase con sus reglas de acceso y datos iniciales (7 tipos de vehículo, 24 provincias); el backend con validación dinámica; el frontend con login, muro público, sección de publicaciones propias, formulario de carga con campos que se arman solos, subida de fotos y vista de detalle.

**No se construyó (a propósito):** todo lo relacionado con IA — la carpeta `app/ia/` sigue vacía y `GEMINI_API_KEY` todavía no se usa.

> *Nota posterior:* la IA se construyó en el Sprint 2 y esa carpeta se mudó a `app/backend/src/ia/`. El motivo está en [`sprint2.md`](sprint2.md).

## Pendientes explícitos (no se decidieron en este sprint)

- **Proveedor de datos de mercado** para la estimación de precio (Sprint 3). Sigue pendiente del Sprint 0, y ahora con una arista nueva: las referencias de mercado de motos y de camiones son distintas y probablemente vengan de fuentes distintas.
- **Modelo de negocio** y **alcance legal** — siguen sin definir desde el Sprint 0.
- **Catálogo de marcas y modelos.** Hoy la marca se escribe libre, lo que va a generar variantes ("Volkswagen", "VW", "volkswagen") que complican el filtrado del Sprint 4. Se dejó así a propósito para no frenar este sprint.
- **Administración de tipos de vehículo desde la app.** Hoy se cargan desde el panel de Supabase. Funciona, pero depende de que alguien del equipo entre al panel.
- **Fotos huérfanas.** Si alguien sube fotos en el formulario y después abandona sin guardar, los archivos quedan en Storage sin publicación asociada. No molesta a nadie hoy; a futuro conviene una limpieza periódica.
- **Confirmación de email.** Si está activada en Supabase, el registro pide confirmar antes de poder entrar. Para desarrollo conviene desactivarla; para producción, no.

## Verificación hecha

Actualizado el 2026-08-08, después de aplicar todo contra el proyecto real de Supabase.

- ✅ Ambos proyectos compilan sin errores de tipos.
- ✅ El backend levanta, responde en `/api/health` y rechaza con 401 los pedidos sin sesión.
- ✅ Las siete migraciones están aplicadas en la base real.
- ✅ Los catálogos se leen correctamente: **7 tipos de vehículo, 34 campos específicos, 24 provincias, 265 ciudades, 100 marcas**, todo con los acentos bien.
- ✅ Las reglas de acceso funcionan: un visitante sin sesión ve los catálogos pero ninguna publicación ni perfil.
- ✅ El frontend carga sin errores de consola y no desborda horizontalmente en 375px de ancho.

**Lo que falta verificar:** el recorrido completo con una cuenta real — publicar, editar, marcar como vendido, contactar por WhatsApp. Requiere iniciar sesión, así que lo hace el equipo.

## Qué se sumó después de este sprint

Al probar la aplicación con datos reales aparecieron huecos que se cerraron en dos tandas. El detalle está en [`roadmap.md`](roadmap.md) y el porqué de cada decisión en [`../bitacora/bitacora.md`](../bitacora/bitacora.md).

- **Sprint 1.5** — editar publicación, reordenar fotos, pantalla propia de "Mis publicaciones" y catálogo de marcas.
- **Sprint 1.6** — navegación en celular, mínimo de una foto para publicar, contacto con el vendedor, estados vendido y pausado, paginación del muro y limpieza de fotos huérfanas.

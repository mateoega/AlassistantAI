# Sprint 0 — Registro de decisiones

Fecha: 2026-08-06

## Objetivo del sprint

Dejar la base del proyecto lista antes de escribir la primera línea de código de la aplicación: arquitectura, tecnologías, estructura de carpetas y documentación inicial.

## Decisiones tomadas

### Arquitectura: Frontend → Backend → Supabase, con IA dentro del backend

Se eligió una arquitectura de tres capas donde el frontend nunca habla directo con la IA ni con la base de datos — todo pasa por el backend. El módulo de IA vive como una carpeta dentro del backend, no como un servicio separado.

**Por qué:** para un equipo chico, tener una sola puerta de entrada (el backend) es más fácil de entender, depurar y asegurar que tener múltiples servicios independientes. Las claves de API quedan siempre del lado del servidor. Si en el futuro el módulo de IA necesita escalar por separado, se puede extraer — hoy separarlo de entrada sería complejidad sin beneficio real.

**Alternativa descartada:** un solo proyecto Next.js con la lógica de backend en `/api` (sin Express separado). Se descartó porque diluye la separación entre "lo que ve el usuario" y "la lógica que procesa datos", que es justamente la que el equipo pidió mantener clara.

### Stack: todo TypeScript

Frontend, backend y módulo de IA en TypeScript. Un solo lenguaje en todo el repositorio.

**Por qué:** menos herramientas que instalar, menos sintaxis que aprender, y cualquier persona del equipo puede moverse entre las tres capas sin cambiar de contexto mental. Para un equipo sin mucha experiencia técnica, esto pesa más que cualquier ventaja de usar Python en el módulo de IA.

### IA: API de Gemini

El análisis de fotos y la estimación de precio se hacen llamando a la API de Gemini (`@google/genai`, modelo de la familia Flash con capacidad de visión) desde el backend.

**Por qué:** Gemini Flash procesa imágenes y texto en una sola llamada a un costo bajo, lo cual es apropiado para un prototipo que todavía no genera ingresos. La clave de API (`GEMINI_API_KEY`) se define como variable de entorno y se usa exclusivamente en `app/backend/` — nunca se expone al frontend.

### Base de datos, fotos y login: Supabase

Postgres administrado + Storage de archivos + Auth, todo en una sola plataforma con plan gratis.

**Por qué:** evita levantar y mantener tres servicios distintos (base de datos, almacenamiento de archivos, sistema de autenticación) a mano. Es la opción con menos fricción para un prototipo que necesita manejar fotos desde el primer sprint con datos reales.

### Identidad visual: paleta tomada del logo del cliente

Se definió la paleta de colores a partir del logo ya existente (ver `diseño/paleta_colores.md`). El logo usa cuatro íconos de "confianza" (escudo, lupa, alerta, apretón de manos) todos en el mismo tono de azul, sin rojo ni naranja — esa consistencia se mantiene como regla para toda la interfaz futura, incluidos los estados de alerta o error.

## Alcance de este sprint

Se creó la estructura de carpetas, la documentación inicial y los archivos de configuración base (`.gitignore`, `.env.example`). No se instalaron dependencias, no se creó ningún archivo de código, no se inicializó el repositorio git.

## Pendientes explícitos (no se decidieron en este sprint)

- **Proveedor de datos de mercado** para la estimación de precio (Sprint 3). Falta evaluar opciones para el mercado local.
- **Modelo de negocio** — todavía no está definido cómo monetiza la plataforma.
- **Alcance legal** — qué responsabilidad asume la plataforma sobre las estimaciones que da, y si hace falta un descargo de responsabilidad visible para el usuario.
- **Inicialización del repositorio git** — se ofrece al equipo, no se hizo en este sprint.

# Contexto del proyecto para Claude Code

Este archivo le da contexto a Claude Code (u otra IA asistente) sobre el proyecto AIassistant, para que cualquier tarea futura respete las decisiones ya tomadas.

## Qué es AIassistant

Plataforma que ayuda a comprar y vender vehículos de **todo el rubro automotor** con más confianza: analiza las fotos, detecta inconsistencias y estima un precio de mercado. Visión completa en [`../docs/vision_general.md`](../docs/vision_general.md).

**El alcance es cualquier vehículo motorizado terrestre** — autos, camionetas, utilitarios, motos, cuatriciclos, camiones, buses y los que se sumen. Esto no es un detalle: el tipo de vehículo es una pieza central del modelo de datos, y agregar un tipo nuevo **no debe requerir tocar código**. Antes de escribir cualquier cosa que asuma "auto", leer [`../docs/modelo_datos.md`](../docs/modelo_datos.md).

## Arquitectura

```
frontend (Next.js) → backend (Express) → Supabase (Postgres + Storage + Auth)
                            └──► módulo ia/ → API de Gemini
```

- **`frontend/`** — pantallas, componentes, llamadas a la API del backend. Nunca llama a Gemini ni usa la clave de servicio de Supabase. **Dos excepciones deliberadas:** el login (librería de Supabase con la clave pública `anon`) y la subida de fotos a Storage. Todo lo demás pasa por el backend.
- **`backend/`** — rutas de la API, validación, orquesta las llamadas al módulo `ia/` y a Supabase. Valida la ficha `specs` de cada publicación contra el catálogo de campos del tipo de vehículo.
- **`ia/`** — la lógica que arma los prompts, llama a Gemini con las fotos, y parsea la respuesta. Vive dentro del backend conceptualmente (se despliega junto con él).

Detalle completo en el `README.md` de la raíz del proyecto.

## Estado actual

Sprint 1 — base multivehículo y flujo completo de publicación (login, muro, carga con fotos, detalle). Sin IA todavía: eso es Sprint 2. Ver [`../docs/roadmap.md`](../docs/roadmap.md).

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

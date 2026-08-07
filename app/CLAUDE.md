# Contexto del proyecto para Claude Code

Este archivo le da contexto a Claude Code (u otra IA asistente) sobre el proyecto AIassistant, para que cualquier tarea futura respete las decisiones ya tomadas.

## Qué es AIassistant

Plataforma que ayuda a comprar y vender vehículos usados con más confianza: analiza fotos del auto, detecta inconsistencias y estima un precio de mercado. Visión completa en [`../docs/vision_general.md`](../docs/vision_general.md).

## Arquitectura

```
frontend (Next.js) → backend (Express) → Supabase (Postgres + Storage + Auth)
                            └──► módulo ia/ → API de Gemini
```

- **`frontend/`** — pantallas, componentes, llamadas a la API del backend. Nunca llama directo a Gemini ni a Supabase.
- **`backend/`** — rutas de la API, validación, orquesta las llamadas al módulo `ia/` y a Supabase.
- **`ia/`** — la lógica que arma los prompts, llama a Gemini con las fotos, y parsea la respuesta. Vive dentro del backend conceptualmente (se despliega junto con él).

Detalle completo en el `README.md` de la raíz del proyecto.

## Estado actual

Sprint 0 — solo existe estructura de carpetas y documentación. No hay código todavía. Ver [`../docs/roadmap.md`](../docs/roadmap.md) para los próximos sprints.

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

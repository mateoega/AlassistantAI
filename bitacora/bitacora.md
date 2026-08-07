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

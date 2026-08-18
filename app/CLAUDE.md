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

Sprint 2 — el asistente de IA para el comprador, sobre la base multivehículo del Sprint 1. Ver [`../docs/roadmap.md`](../docs/roadmap.md).

Dos piezas: el **botón "Analizar"** en cada publicación (mira las fotos junto con los datos declarados) y el **chat del asistente**, disponible en toda la aplicación, que sabe qué aviso hay en pantalla y puede buscar entre las publicaciones.

**La IA trabaja para el comprador, no para el vendedor.** Es la decisión que define este sprint y la que explica el tono de los prompts. Si aparece una función de IA pensada para ayudar a quien publica, contradice el diseño — ver [`../bitacora/bitacora.md`](../bitacora/bitacora.md), 2026-08-12.

**El análisis no dictamina si conviene comprar ni opina de precios.** Es a propósito: no tiene referencias de mercado hasta el Sprint 3, y está pedido explícitamente en el prompt. No sacar esa restricción sin haber cargado esas referencias.

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
- **Los prompts de IA también se arman desde el catálogo.** La regla anterior no se detiene en el formulario: el prompt del análisis recibe el tipo y sus campos leídos de la base, y deja que el modelo razone según eso. No se escriben instrucciones del estilo "si es una moto, mirá la cadena". Ver [`backend/src/ia/vehicle-context.ts`](backend/src/ia/vehicle-context.ts).
- **La clave de servicio de Supabase tiene un solo uso permitido:** guardar los análisis de IA, en una tabla que ningún usuario puede escribir. Todo lo demás va con el cliente del usuario, para que las reglas de acceso de la base se apliquen siempre. Ver [`backend/src/lib/supabase.ts`](backend/src/lib/supabase.ts).

# Frontend — AIassistant

Pantallas y componentes que ve el usuario. Construido con Next.js (React + TypeScript).

## Qué va acá

- Páginas y rutas de la aplicación (alta de vehículo, vista de análisis, búsqueda, etc.)
- Componentes de interfaz (formularios, tarjetas de vehículo, indicadores de estado)
- Llamadas a la API del backend (nunca directo a Gemini ni a Supabase)
- Estilos, siguiendo la paleta definida en [`../../diseño/paleta_colores.md`](../../diseño/paleta_colores.md)

## Qué NO va acá

- Lógica de negocio (validaciones de reglas, cálculos de precio) — eso vive en `../backend/`
- Llamadas directas a la API de Gemini — el frontend nunca tiene la clave de IA
- Llamadas directas a Supabase con la clave de servicio — solo el backend tiene esa clave. Si el frontend necesita leer datos de Supabase directamente (con la clave pública `anon`), se define explícitamente cuándo conviene hacerlo así en vez de pasar por el backend

## Estado actual

Vacío. Se completa a partir del Sprint 1, cuando exista la primera pantalla (alta de vehículo).

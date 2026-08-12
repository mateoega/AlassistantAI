# Módulo de IA — AIassistant

La lógica que analiza fotos de vehículos y estima precios, usando la API de Gemini. Vive dentro del backend conceptualmente — se despliega junto con él, aunque está separado en su propia carpeta para mantener esa responsabilidad clara.

## Qué modelo se usa y por qué

API de Gemini (`@google/genai`), modelo de la familia **Flash** con capacidad de visión. Procesa imágenes y texto en una sola llamada, a un costo bajo — apropiado para un prototipo que todavía no genera ingresos.

## Qué va acá

- **Análisis de fotos**: arma el pedido a Gemini con las imágenes del vehículo y un prompt que pide describir el estado observable y señalar inconsistencias (fotos que no parecen ser del mismo vehículo, daño no declarado, desgaste que no coincide con el uso declarado).

  **El prompt tiene que adaptarse al tipo de vehículo.** No se mira lo mismo en una moto que en un camión, y el uso no siempre se mide en kilómetros. La publicación ya trae el tipo y su ficha específica cargados desde el Sprint 1 — el prompt se arma con esos datos, leyendo el catálogo, no con una lista de tipos escrita en el código. Ver [`../../docs/modelo_datos.md`](../../docs/modelo_datos.md).
- **Estimación de precio**: combina los datos declarados por el vendedor, el resultado del análisis de fotos y referencias de mercado (proveedor todavía a definir, ver `../../docs/sprint0.md`) para proponer un rango de precio con su justificación.
- El parseo de la respuesta de Gemini a un formato que el backend pueda guardar y el frontend pueda mostrar.

## Qué NO va acá

- Las rutas de la API — eso vive en `../backend/`, que simplemente invoca las funciones de este módulo.
- Nada de interfaz de usuario.

## Advertencia importante

**La clave `GEMINI_API_KEY` se lee desde una variable de entorno, nunca se escribe en el código.** Este módulo corre exclusivamente en el servidor (dentro del backend); si en algún momento se necesitara ejecutar algo similar en el navegador, esa clave no puede viajar al frontend.

## Estado actual

Vacío. Se completa a partir del Sprint 2 (análisis de fotos) y Sprint 3 (estimación de precio) — ver [`../../docs/roadmap.md`](../../docs/roadmap.md).

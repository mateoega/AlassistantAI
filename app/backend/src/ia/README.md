# Módulo de IA — AIassistant

La lógica que habla con Gemini: arma los prompts, manda las fotos y parsea lo que vuelve.

> **Antes vivía en `app/ia/`.** Se movió acá en el Sprint 2 por una razón práctica: Node busca las librerías (`@google/genai`, `sharp`) partiendo de la carpeta del archivo que las importa, y desde `app/ia/` no encontraba las del backend. Mantenerlo afuera obligaba a un `package.json` y un `npm install` propios para un módulo de cinco archivos. La separación de responsabilidad se mantiene — es su propia carpeta, con su propio README —, solo que dentro de donde compila y resuelve. Registrado en la [bitácora](../../../../bitacora/bitacora.md).

## Para quién trabaja este módulo

**Para el comprador.** Es la decisión que define el Sprint 2 y la que explica cómo están escritos los prompts: no dicen "sacá mejores fotos", dicen "esto es lo que se ve, esto no cierra, esto convendría preguntar". Ver la [bitácora](../../../../bitacora/bitacora.md).

## Qué modelo se usa y por qué

API de Gemini (`@google/genai`), modelo de la familia **Flash** con capacidad de visión. Procesa imágenes y texto en una sola llamada, a un costo bajo — apropiado para un prototipo que todavía no genera ingresos.

Se configura con `GEMINI_MODEL` en el `.env` de la raíz. Si está vacía usa un valor por defecto, así que no hace falta tocarla salvo que Google publique un modelo nuevo que convenga probar.

## Los archivos

| Archivo | Qué hace |
|---|---|
| `client.ts` | La conexión con Gemini. Es el único archivo del proyecto que conoce `GEMINI_API_KEY`. |
| `vehicle-context.ts` | Describe el vehículo en palabras, leyendo el catálogo. **Es la pieza clave — ver abajo.** |
| `photos.ts` | Baja las fotos, las achica a 1024px y las deja listas para enviar. |
| `analysis.ts` | El análisis de una publicación: el prompt, la llamada y el parseo. |
| `chat.ts` | El asistente conversacional, con la búsqueda de publicaciones como herramienta. |
| `types.ts` | La forma del resultado del análisis. La comparten la base, el backend y el frontend. |

## La regla que sostiene todo: el prompt sale del catálogo

`vehicle-context.ts` **no tiene una lista de tipos de vehículo adentro.** No dice "si es una moto mirá la cadena, si es un camión mirá los ejes". Lo que hace es contarle al modelo qué tipo es (con el nombre que declara el catálogo) y qué datos pide ese tipo (con las etiquetas y unidades que declara el catálogo), y dejar que razone en consecuencia.

La consecuencia práctica: si mañana alguien carga "motorhome" en `vehicle_types` desde el panel de Supabase, el análisis de un motorhome habla de motorhomes **sin que nadie toque una línea de código ni vuelva a desplegar**. Es el mismo mecanismo por el que el formulario de carga se dibuja solo.

Si en algún momento aparece acá adentro un `if (slug === 'moto')`, el diseño se rompió. Ver [`modelo_datos.md`](../../../../docs/modelo_datos.md).

## Por qué se achican las fotos

Una foto de celular pesa varios megabytes. Diez de esas en un pedido lo hacen fallar por tamaño, tardan una eternidad y se pagan caras. Y no se gana nada: los modelos de visión trabajan sobre una versión reducida igual. 1024px de lado mayor alcanza para ver un rayón, óxido o el desgaste de un neumático, que es lo que hay que detectar.

## Qué NO va acá

- Las rutas de la API — eso vive en `../routes/`, que invoca las funciones de este módulo a través de `../services/`.
- Las consultas a la base — van en `../services/`. Este módulo recibe datos ya leídos y devuelve texto ya parseado.
- Nada de interfaz de usuario.

## Advertencia importante

**`GEMINI_API_KEY` se lee de una variable de entorno, nunca se escribe en el código.** Este módulo corre exclusivamente en el servidor. Si alguna vez se necesitara algo parecido en el navegador, esa clave no puede viajar al frontend: tendría que pasar por el backend igual.

## Estado actual

**Sprint 2 completo:** análisis de publicaciones y asistente conversacional.

**Sprint 3 (pendiente):** la estimación de precio, que combina los datos declarados, el análisis de fotos y referencias de mercado. Es lo que va a permitir que el asistente responda si un precio es razonable — hoy tiene prohibido opinar de eso, justamente porque no tiene con qué compararlo. Ver [`roadmap.md`](../../../../docs/roadmap.md).

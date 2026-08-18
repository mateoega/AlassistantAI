# Backend — AIassistant

La API que recibe pedidos del frontend, valida datos y coordina con Supabase. Node.js + Express (TypeScript).

## Cómo levantarlo

```bash
npm install
npm run dev
```

Escucha en `http://localhost:4000` (o el `PORT` que esté en el `.env` de la raíz del proyecto).

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor y lo reinicia solo al guardar cambios. |
| `npm run typecheck` | Revisa que no haya errores de tipos, sin generar archivos. |
| `npm run build` | Compila a `dist/` para producción. |
| `npm start` | Corre lo compilado. |

## Estructura

```
src/
  index.ts               arranque del servidor
  config/env.ts          lee el .env de la raíz del proyecto
  lib/supabase.ts        clientes de Supabase (público, del usuario y de servicio)
  lib/http-error.ts      errores con mensaje en español para el usuario
  middleware/auth.ts     verifica el token del usuario en cada pedido
  middleware/error-handler.ts
  routes/catalog.ts      tipos de vehículo, provincias, ciudades y marcas
  routes/listings.ts     publicaciones y su análisis de IA
  routes/profile.ts      perfil del vendedor
  routes/assistant.ts    el chat del asistente
  services/catalog.ts    lectura del catálogo
  services/listings.ts   alta, edición, borrado y armado de la respuesta
  services/spec-display.ts   la ficha específica en palabras (la usan el detalle y la IA)
  services/analysis.ts   cuándo se corre un análisis y cuándo se reusa el guardado
  services/assistant.ts  junta el contexto del chat y llama al modelo
  services/listing-search.ts  búsqueda con filtros (la usa el asistente; el Sprint 4 la reusa)
  validation/listing-input.ts  campos comunes a cualquier vehículo
  validation/specs.ts    campos específicos, contra el catálogo
  ia/                    todo lo que habla con Gemini — tiene su propio README
```

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/health` | Comprobar que el servidor está vivo. |
| GET | `/api/catalog/vehicle-types` | Tipos de vehículo con sus campos específicos. |
| GET | `/api/catalog/provinces` | Provincias para el selector de ubicación. |
| GET | `/api/catalog/cities` | Localidades sugeridas al escribir la ciudad. |
| GET | `/api/catalog/brands` | Marcas sugeridas, con los tipos de vehículo en los que aparecen. |
| GET | `/api/profile` | Datos del vendedor que inició sesión. |
| PUT | `/api/profile` | Guardar nombre y teléfono de contacto. |
| GET | `/api/listings?scope=public\|mine` | El muro público, o las publicaciones propias. |
| GET | `/api/listings/:id` | Una publicación con todos sus datos. |
| POST | `/api/listings` | Crear una publicación. |
| PUT | `/api/listings/:id` | Reemplazar los datos de una publicación. |
| POST | `/api/listings/:id/status` | Publicar, pausar, marcar vendido o volver a borrador. |
| DELETE | `/api/listings/:id` | Borrar una publicación y sus fotos. |
| GET | `/api/listings/:id/analysis` | El análisis de IA guardado, si hay. |
| POST | `/api/listings/:id/analysis` | Dispararlo. Responde enseguida, con el análisis "corriendo". |
| POST | `/api/assistant/chat` | El chat del asistente. |

Todo lo de `/api/listings`, `/api/profile` y `/api/assistant` requiere el token del usuario en el encabezado `Authorization: Bearer …`.

El análisis lo puede pedir **cualquiera que pueda ver el aviso**, no solo su dueño: es una herramienta del comprador. Quién ve qué lo siguen decidiendo las reglas de acceso de la base.

## Tres cosas importantes de cómo está armado

**1. El backend actúa con la identidad del usuario, no con permisos totales.**
Cada pedido crea un cliente de Supabase con el token de quien lo hizo. Así, las reglas de acceso de la base (RLS) se aplican siempre: si este código tuviera un error y pidiera un borrador ajeno, la base igual lo rechazaría. La seguridad no depende de que el código esté bien escrito.

**Con una sola excepción, deliberada:** los análisis de IA se guardan con la clave de servicio, porque la tabla `listing_analyses` no acepta escrituras de ningún usuario. El análisis es una afirmación de la plataforma sobre un vehículo; si se pudiera escribir desde el navegador, un vendedor podría inventarse el de su propio aviso. Las lecturas siguen yendo con la identidad real. Ver `lib/supabase.ts` y la migración 008.

**2. La validación de los campos específicos es dinámica.**
`validation/specs.ts` no sabe qué es una cilindrada ni una capacidad de carga. Lee del catálogo qué campos declara el tipo de vehículo elegido y valida contra eso: obligatorios presentes, números dentro del rango, opciones que existen, y nada que el tipo no haya declarado.

**Nunca escribir un `if (tipo === 'auto')` ni un `switch` por tipo de vehículo.** Si aparece uno, el diseño se rompió: agregar un tipo tiene que funcionar cargando filas en el catálogo, sin tocar código. Ver [`../../docs/modelo_datos.md`](../../docs/modelo_datos.md).

**3. Los prompts de IA también salen del catálogo.**
La regla anterior no se detiene en la validación. `src/ia/vehicle-context.ts` le cuenta al modelo qué tipo de vehículo está mirando y qué campos pide ese tipo, leídos de la base, y lo deja razonar. No hay instrucciones del estilo "si es una moto, mirá la cadena". Un tipo nuevo cargado desde el panel de Supabase se analiza correctamente sin redesplegar.

## Qué NO va acá

- Componentes de interfaz — eso es `../frontend/`
- Los prompts y la llamada a Gemini — eso vive en [`src/ia/`](src/ia/README.md); los servicios de este backend lo invocan

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
  lib/supabase.ts        clientes de Supabase
  lib/http-error.ts      errores con mensaje en español para el usuario
  middleware/auth.ts     verifica el token del usuario en cada pedido
  middleware/error-handler.ts
  routes/catalog.ts      tipos de vehículo y provincias
  routes/listings.ts     publicaciones
  services/catalog.ts    lectura del catálogo
  services/listings.ts   alta, edición, borrado y armado de la respuesta
  validation/listing-input.ts  campos comunes a cualquier vehículo
  validation/specs.ts    campos específicos, contra el catálogo
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
| POST | `/api/listings/:id/publish` | Pasar un borrador a publicado. |
| DELETE | `/api/listings/:id` | Borrar una publicación y sus fotos. |

Todo lo de `/api/listings` requiere el token del usuario en el encabezado `Authorization: Bearer …`.

## Dos cosas importantes de cómo está armado

**1. El backend actúa con la identidad del usuario, no con permisos totales.**
Cada pedido crea un cliente de Supabase con el token de quien lo hizo. Así, las reglas de acceso de la base (RLS) se aplican siempre: si este código tuviera un error y pidiera un borrador ajeno, la base igual lo rechazaría. La seguridad no depende de que el código esté bien escrito.

**2. La validación de los campos específicos es dinámica.**
`validation/specs.ts` no sabe qué es una cilindrada ni una capacidad de carga. Lee del catálogo qué campos declara el tipo de vehículo elegido y valida contra eso: obligatorios presentes, números dentro del rango, opciones que existen, y nada que el tipo no haya declarado.

**Nunca escribir un `if (tipo === 'auto')` ni un `switch` por tipo de vehículo.** Si aparece uno, el diseño se rompió: agregar un tipo tiene que funcionar cargando filas en el catálogo, sin tocar código. Ver [`../../docs/modelo_datos.md`](../../docs/modelo_datos.md).

## Qué NO va acá

- Componentes de interfaz — eso es `../frontend/`
- Los prompts y la llamada a Gemini — eso vive en `../ia/`, el backend solo la invoca (Sprint 2)

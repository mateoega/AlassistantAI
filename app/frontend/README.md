# Frontend — AIassistant

Las pantallas que ve el usuario. Next.js (React + TypeScript) con Tailwind.

## Cómo levantarlo

```bash
npm install
npm run dev
```

Abre en `http://localhost:3000`. **El backend tiene que estar levantado también**, si no las pantallas no tienen de dónde traer los datos.

> ⚠️ **No corras `npm run build` mientras `npm run dev` está levantado.** Los dos escriben en la misma carpeta `.next`, y el de desarrollo queda apuntando a archivos que el build borró.
>
> El síntoma: pantalla en blanco con "Cargando…" que no avanza, o un error 500 con `Cannot find module`. En la consola del navegador se ven los archivos `.js` dando 404 — el navegador recibe la página pero no el código.
>
> **Si necesitás compilar con el servidor levantado**, mandá el build a otra carpeta:
>
> ```bash
> $env:NEXT_DIST_DIR = '.next-build'; npm run build
> ```
>
> **Si ya pasó:** parar los dos procesos, borrar la carpeta `.next` y volver a levantar `npm run dev`.

## Pantallas

| Ruta | Qué hace |
|---|---|
| `/login` | Registro e inicio de sesión con email y contraseña. |
| `/` | Muro con todas las publicaciones + pestaña "Mis publicaciones" (incluye borradores). |
| `/publicar` | Carga de una publicación: fotos primero, datos mínimos, y los campos propios del tipo plegados como opcionales. |
| `/publicar/[id]` | Edición de una publicación propia. Usa el mismo formulario que la de crear. |
| `/mis-publicaciones` | Las publicaciones propias en lista, con editar, publicar y borrar. |
| `/vehiculo/[id]` | Detalle: galería, datos, ficha específica del tipo, **análisis de IA** y vendedor. |
| `/perfil` | Nombre y teléfono de contacto del vendedor. |

El **asistente** no tiene pantalla propia: es un panel que se abre desde un botón flotante y está disponible en todas las rutas.

## Estructura

```
src/
  app/
    layout.tsx           estructura común y encabezado
    globals.css          la paleta de la marca
    page.tsx             muro + mis publicaciones
    login/page.tsx
    publicar/page.tsx
    vehiculo/[id]/page.tsx
  components/
    SessionProvider.tsx  mantiene la sesión disponible en toda la app
    SiteHeader.tsx
    MobileNav.tsx        barra de navegación inferior, solo en celular
    ListingForm.tsx      el formulario, compartido por crear y editar
    DynamicField.tsx     dibuja un campo específico leyendo el catálogo
    SuggestInput.tsx     campo con sugerencias (marca y ciudad), texto libre
    PhotoUploader.tsx    sube fotos a Supabase Storage
    ListingCard.tsx
    AnalysisPanel.tsx    el análisis de IA de una publicación
    AssistantProvider.tsx  guarda la conversación al navegar entre pantallas
    AssistantChat.tsx    el panel del asistente, disponible en toda la app
    ui.tsx               botones, campos, avisos, campo numérico con miles
  lib/
    supabase.ts          cliente del navegador (login y fotos)
    api.ts               llamadas al backend, con el token de la sesión
    types.ts             lo que devuelve la API
    format.ts            precios, uso, ubicación y fechas en formato local
```

## Reglas

**El formulario no tiene campos escritos adentro.** `DynamicField.tsx` no sabe qué es una cilindrada ni una capacidad de carga: recibe la definición del campo desde el catálogo y la dibuja. Por eso, cuando alguien carga un tipo de vehículo nuevo en Supabase, su formulario aparece solo. **No agregar listas de tipos de vehículo hardcodeadas.**

**Nada de rojo ni naranja, ni siquiera en errores.** Es una decisión de identidad, no un descuido — ver [`../../diseño/paleta_colores.md`](../../diseño/paleta_colores.md). Los avisos usan el azul secundario (`brand-deep`), el borde y la jerarquía tipográfica. El componente `Notice` de `ui.tsx` ya lo resuelve; usarlo en vez de inventar estilos nuevos.

**Los botones y enlaces usan `brand-deep` (`#1565C0`), no `brand` (`#2E9EFF`).** El azul principal es demasiado claro para llevar texto encima y no se lee bien. `brand` queda para bordes activos, foco y acentos. Y ningún color se llama `base`: Tailwind ya usa `text-base` para el tamaño de fuente.

**El asistente no puede tapar la barra de navegación inferior.** En celular el botón flotante se levanta por encima de ella (`bottom-20 sm:bottom-6`). El panel abierto sí la cubre entero, a propósito: tiene su propio botón de cerrar. Es el problema de espacio que costó el Sprint 1.6 — verificarlo en 375px de ancho, no solo escribirlo.

**Lo que muestra la IA es orientativo y hay que decirlo.** El panel de análisis aclara que no reemplaza una revisión mecánica y que todavía no compara precios de mercado. No es texto de relleno: es lo que separa una segunda opinión de una tasación, y está en [`vision_general.md`](../../docs/vision_general.md).

## Qué habla directo con Supabase y qué no

El frontend usa la clave pública de Supabase para **exactamente dos cosas**, ambas decisiones deliberadas y registradas en la bitácora:

1. **El login y la sesión** — la maneja la librería oficial de Supabase.
2. **Subir las fotos** a Storage — para que las imágenes no viajen dos veces.

**Todo lo demás pasa por el backend.** Leer publicaciones, crearlas, editarlas y borrarlas se hace con `api()` de `lib/api.ts`. Nunca se usa la clave de servicio de Supabase ni se llama a Gemini desde acá.

## Qué NO va acá

- Lógica de negocio (validaciones de reglas, cálculos de precio) — eso vive en `../backend/`
- Llamadas a la API de Gemini — el frontend nunca tiene la clave de IA

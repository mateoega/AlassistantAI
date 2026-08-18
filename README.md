# AIassistant

Plataforma que usa inteligencia artificial para dar más confianza al comprar y vender vehículos de **todo el rubro automotor** — autos, camionetas, utilitarios, motos, cuatriciclos, camiones, buses y cualquier vehículo motorizado terrestre. Analiza las fotos, detecta inconsistencias entre lo declarado y lo que se ve, y estima un precio de mercado con su justificación.

**Estado actual: Sprint 2 — el asistente de IA para el comprador.** Ver [`docs/roadmap.md`](docs/roadmap.md).

---

## Cómo funciona (arquitectura)

```
                        Usuario
                           │
                           │  sube fotos + datos del vehículo
                           ▼
              ┌────────────────────────┐
              │  FRONTEND (Next.js)    │   lo que ve el usuario: pantallas
              └───────────┬────────────┘
                          │  llama a la API
                          ▼
              ┌────────────────────────┐
              │  BACKEND (Express)     │   recibe, valida, coordina, guarda
              └───┬────────────────┬───┘
                  │                │
                  │                ▼
                  │      ┌────────────────────┐
                  │      │  SUPABASE          │
                  │      │  ├─ Postgres       │  tipos, publicaciones, análisis
                  │      │  ├─ Storage        │  las fotos
                  │      │  └─ Auth           │  login de usuarios
                  │      └────────────────────┘
                  ▼
        ┌────────────────────┐
        │  MÓDULO IA         │   analiza fotos y estima precio
        └─────────┬──────────┘
                  │  llama a la API de Gemini
                  ▼
        ┌────────────────────┐
        │  Gemini (visión)   │
        └────────────────────┘
```

### Por qué está armado así

- **El frontend habla con el backend.** Nunca llama a Gemini, ni usa la clave de servicio de Supabase. Una sola puerta de entrada es más fácil de entender, de depurar y de asegurar, y las claves privadas quedan del lado del servidor. Hay dos excepciones acotadas y deliberadas: el **login** (lo maneja la librería de Supabase en el navegador con la clave pública) y la **subida de fotos** (van directo a Supabase Storage para no hacerlas viajar dos veces). Ambas están protegidas por las reglas de acceso de Supabase y registradas en la bitácora.
- **El módulo de IA vive dentro del backend**, no es un servicio aparte. Se despliega junto con él. Si algún día necesita escalar por su cuenta, se separa; hoy sería complejidad sin beneficio.
- **Supabase reemplaza tres cosas** que normalmente hay que montar y mantener por separado: base de datos, almacenamiento de archivos y autenticación. Para un prototipo que maneja fotos, es la opción con menos fricción.

### Dónde entra la IA — un asistente para el que compra

La IA de AIassistant trabaja **para quien compra, no para quien vende**. El que publica ya controla su aviso: elige las fotos, escribe la descripción, pone el precio. El que mira tiene que decidir con lo que le muestran. Ahí es donde una segunda opinión cambia algo.

1. **Análisis de una publicación.** Cualquiera que pueda ver un aviso puede pedirlo. Las fotos se envían a Gemini junto con los datos declarados, y vuelve: qué se ve, qué no cierra (fotos que parecen de vehículos distintos, daños no declarados, desgaste que no cuadra con el kilometraje), qué no se puede evaluar con esas fotos y qué preguntarle al vendedor. **El análisis se adapta al tipo de vehículo** — no se mira lo mismo en una moto que en un camión —, y lo hace leyendo el catálogo, no con una lista escrita en el código.
2. **Chat del asistente.** Disponible en toda la aplicación. Sabe qué aviso hay en pantalla, puede citar su análisis y puede buscar entre las publicaciones que están a la venta.
3. **Estimación de precio** *(Sprint 3, todavía no)*. Hasta que existan las referencias de mercado, el asistente tiene explícitamente prohibido opinar sobre si un precio es razonable: sería una opinión con cara de dato.

---

## Estructura del proyecto

```
AIassistant/
├── docs/                      documentación del proyecto
│   ├── vision_general.md      qué es, para quién, qué problema resuelve
│   ├── roadmap.md             sprints planificados, de prototipo a producto
│   ├── modelo_datos.md        cómo se guardan los vehículos y sus tipos
│   ├── sprint0.md             qué se decidió acá y qué quedó pendiente
│   ├── sprint1.md             decisiones del Sprint 1
│   └── sprint2.md             decisiones del Sprint 2 (el asistente de IA)
├── supabase/
│   ├── migrations/            el esquema de la base, en archivos SQL
│   └── seed.sql               tipos de vehículo y provincias iniciales
├── diseño/
│   ├── logo/                  archivos del logo
│   └── paleta_colores.md      colores, tipografía, tono visual
├── bitacora/
│   └── bitacora.md            registro de decisiones con fecha
├── app/                       el código de la aplicación
│   ├── CLAUDE.md              contexto del proyecto para Claude Code
│   ├── frontend/              lo que ve el usuario (pantallas)
│   └── backend/               la lógica que procesa datos
│       └── src/ia/            los prompts y la llamada a Gemini
├── README.md                  este archivo
├── .gitignore                 qué archivos NO se suben al repositorio
└── .env.example               plantilla de variables de entorno
```

Cada carpeta de código tiene su propio `README.md` explicando qué va ahí y qué no. Si tenés dudas sobre dónde poner un archivo nuevo, esa es la respuesta.

---

## Tecnologías y por qué

| Pieza | Tecnología | Por qué la elegimos |
|---|---|---|
| Frontend | Next.js (React + TypeScript) | El framework de React mejor documentado. Se publica online con un click. |
| Backend | Node.js + Express (TypeScript) | La forma más simple de escribir una API. Mismo lenguaje que el frontend. |
| Base de datos | Supabase (Postgres) | Administrada, con plan gratis y un panel visual para ver los datos sin escribir SQL. |
| Fotos | Supabase Storage | Ya viene incluido con la base. Sin configurar servidores de archivos. |
| Login | Supabase Auth | Email, Google y más, sin implementar contraseñas a mano. |
| IA | API de Gemini (`@google/genai`), familia Flash con visión | Analiza imágenes y razona sobre ellas en una sola llamada, a costo bajo. |

**Todo el proyecto está en TypeScript.** Esa es la decisión que más simplifica la vida del equipo: un solo entorno que instalar, una sola sintaxis que aprender, y cualquier persona puede moverse entre frontend, backend e IA sin cambiar de contexto.

---

## Cómo empezar

### 1. Crear el proyecto en Supabase

Crear un proyecto nuevo (plan gratis) en [supabase.com](https://supabase.com). Después, en el panel:

- **SQL Editor** → pegar y ejecutar, **en orden**, cada archivo de [`supabase/migrations/`](supabase/migrations/), y al final [`supabase/seed.sql`](supabase/seed.sql). Pasos detallados en [`supabase/README.md`](supabase/README.md).
- **Authentication → Providers** → verificar que "Email" esté habilitado. Para probar más rápido, se puede desactivar "Confirm email" mientras se desarrolla.

### 2. Configurar las claves

Copiar `.env.example` a `.env` en la raíz del proyecto y completar `SUPABASE_URL` y `SUPABASE_ANON_KEY` (panel de Supabase → Settings → API).

Para que funcione el asistente de IA hacen falta además `GEMINI_API_KEY` ([se saca acá](https://aistudio.google.com/apikey)) y `SUPABASE_SERVICE_KEY` (mismo panel de Supabase). Sin ellas todo lo demás anda igual: el asistente avisa que no está configurado en vez de romper el arranque.

Es un único `.env` para todo el proyecto: lo leen tanto el backend como el frontend.

**Nunca subas el archivo `.env` al repositorio** — contiene claves privadas y ya está bloqueado en `.gitignore`.

### 3. Levantar el backend

```bash
cd app/backend && npm install && npm run dev
```

Queda escuchando en `http://localhost:4000`. Para comprobarlo, abrir `http://localhost:4000/api/health`.

### 4. Levantar el frontend

En otra terminal:

```bash
cd app/frontend && npm install && npm run dev
```

Abrir `http://localhost:3000`, crear una cuenta y publicar el primer vehículo.

> Los dos tienen que estar corriendo al mismo tiempo: el frontend le pide los datos al backend.

---

## Requisitos del entorno

- Node.js 20 o superior (verificado con 24.14.1)
- npm (verificado con 11.11.0)
- git
- Una cuenta de Supabase (plan gratis)
- Una clave de API de Google AI Studio para Gemini

---

## Convenciones del proyecto

- **Documentación en español.** Todo lo que está en `docs/`, `bitacora/` y los README.
- **Código en inglés, interfaz en español.** Los nombres de variables, funciones y archivos van en inglés; los textos que ve el usuario van en español.
- **Cada decisión importante se anota** en `bitacora/bitacora.md` con fecha y motivo. Dentro de seis meses nadie se va a acordar por qué elegimos algo.

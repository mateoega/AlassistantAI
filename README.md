# AIassistant

Plataforma que usa inteligencia artificial para dar más confianza al comprar y vender vehículos usados. Analiza las fotos del auto, detecta inconsistencias entre lo declarado y lo que se ve, y estima un precio de mercado con su justificación.

**Estado actual: Sprint 0 — base del proyecto.** Todavía no hay código. Esta es la estructura, la arquitectura decidida y la documentación sobre la que se va a construir.

---

## Cómo funciona (arquitectura)

```
                        Usuario
                           │
                           │  sube fotos + datos del auto
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
                  │      │  ├─ Postgres       │  autos, publicaciones, análisis
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

- **El frontend solo habla con el backend.** Nunca llama directo a Gemini ni a Supabase. Una sola puerta de entrada es más fácil de entender, de depurar y de asegurar. Además, las claves de API quedan del lado del servidor, donde nadie las puede leer.
- **El módulo de IA vive dentro del backend**, no es un servicio aparte. Se despliega junto con él. Si algún día necesita escalar por su cuenta, se separa; hoy sería complejidad sin beneficio.
- **Supabase reemplaza tres cosas** que normalmente hay que montar y mantener por separado: base de datos, almacenamiento de archivos y autenticación. Para un prototipo que maneja fotos, es la opción con menos fricción.

### Dónde entra la IA — dos usos distintos

1. **Análisis de fotos.** Las imágenes se envían a Gemini, que tiene capacidad de visión. Devuelve el estado observable del vehículo y señales de inconsistencia: fotos que parecen de autos distintos, daños no declarados, desgaste que no cuadra con el kilometraje informado.
2. **Estimación de precio.** Combina los datos declarados, lo detectado en las fotos y referencias de mercado, y devuelve un rango con su justificación en lenguaje claro.

---

## Estructura del proyecto

```
AIassistant/
├── docs/                      documentación del proyecto
│   ├── vision_general.md      qué es, para quién, qué problema resuelve
│   ├── roadmap.md             sprints planificados, de prototipo a producto
│   └── sprint0.md             qué se decidió acá y qué quedó pendiente
├── diseño/
│   ├── logo/                  archivos del logo
│   └── paleta_colores.md      colores, tipografía, tono visual
├── bitacora/
│   └── bitacora.md            registro de decisiones con fecha
├── app/                       el código de la aplicación
│   ├── CLAUDE.md              contexto del proyecto para Claude Code
│   ├── frontend/              lo que ve el usuario (pantallas)
│   ├── backend/               la lógica que procesa datos
│   └── ia/                    análisis de fotos, precios
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

## Cómo empezar (cuando haya código)

Todavía no hay nada que ejecutar. Cuando el Sprint 1 agregue el primer código, el arranque va a ser:

1. Copiar `.env.example` a `.env` y completar las claves.
2. Instalar dependencias en `app/frontend/` y `app/backend/`.
3. Levantar el backend y el frontend.

Los pasos exactos se documentan acá cuando existan. **Nunca subas el archivo `.env` al repositorio** — contiene claves privadas y ya está bloqueado en `.gitignore`.

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

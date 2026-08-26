# Despliegue — poner AIassistant online

Hasta ahora todo corría en la máquina de quien programa. Este documento es cómo sale de ahí.

No agrega funcionalidad. Es el paso que el [roadmap](roadmap.md) dejó anotado al cerrar el Sprint 6, en "Lo que sigue".

---

## Por qué dos plataformas y no una

AIassistant son **dos aplicaciones**, no una:

- **El frontend** es Next.js. Va a **Vercel**, que es la plataforma de quien hace Next.js. No hay decisión que tomar acá.
- **El backend** es un Express con `app.listen()`. Va a **Render**, como servicio de larga vida.

La tentación es poner las dos en Vercel y tener un solo panel. Se descartó por dos cosas medidas, no supuestas:

**El chat contesta por streaming, y a veces tarda.** Los pedazos de una respuesta llegan a los 7,0s, 7,1s y 28s — está anotado en la bitácora del 2026-08-24. En una función serverless de plan gratuito el tope es 60 segundos por invocación. Anda, pero sin margen: el día que el modelo se demore un poco más de lo habitual, la respuesta se corta a la mitad y el usuario ve media frase.

**Redimensionar fotos es lo más pesado que hace el proyecto.** [`ia/photos.ts`](../app/backend/src/ia/photos.ts) pasa cada foto por sharp antes de mandarla a Gemini. En un servidor de larga vida eso pasa una vez y el proceso queda caliente; en funciones, arranca en frío en cada pedido, sobre un servicio que ya de por sí espera a un modelo.

El código no cambia en ninguno de los dos lados. El backend ya es exactamente lo que Render necesita: `npm run build && npm start`.

## Lo que ya estaba resuelto sin saberlo

Tres cosas del código no hubo que tocarlas, y conviene saber por qué para no romperlas después:

- **Las direcciones son configurables.** `API_URL` y `FRONTEND_URL` salen del entorno, con `localhost` solo como valor por omisión para desarrollo.
- **`dotenv` no pisa lo que ya existe.** Los dos `env.ts` leen el `.env` de la raíz del repositorio, pero ese archivo está en `.gitignore` y no viaja. En Render y en Vercel el archivo no existe, `dotenv` no hace nada y los valores salen de `process.env`, que es donde los pone el panel de cada plataforma. Funciona sin agregar una rama para producción.
- **El frontend nunca vio las claves privadas.** [`next.config.ts`](../app/frontend/next.config.ts) lista una por una las variables que pasa al navegador, y la clave de servicio de Supabase y la de Gemini no están en esa lista. Si estuvieran, terminarían adentro del código que descarga cualquier visitante.

---

## El orden importa

Los tres pasos van en este orden y no en otro:

**1. Primero el backend.** Hasta que exista, no se sabe su dirección.

**2. Después el frontend**, con `API_URL` apuntando a la dirección que devolvió el paso 1.

El motivo es que `NEXT_PUBLIC_API_URL` **se hornea en el momento de compilar**, no se lee al andar: queda escrita adentro de los archivos que descarga el navegador. Cambiarla después no es tocar una variable en el panel de Vercel — es volver a desplegar. Es la trampa más fácil de este despliegue.

**3. Recién ahí, cerrar el círculo.** Con el dominio del frontend ya conocido, se completa `FRONTEND_URL` en Render (que es lo que habilita el CORS) y se agregan las direcciones de producción a Supabase Auth.

---

## Paso 1 — El backend en Render

El archivo [`render.yaml`](../render.yaml) de la raíz ya describe el servicio: carpeta, comandos, chequeo de salud y qué variables hay que completar. Render lo lee solo al conectar el repositorio.

Las variables que pide, y de dónde sale cada una:

| Variable | De dónde | Nota |
|---|---|---|
| `SUPABASE_URL` | Panel de Supabase, Project Settings > API | La del proyecto a secas, no la de `/rest/v1` — igual `env.ts` normaliza las dos |
| `SUPABASE_ANON_KEY` | Mismo lugar | Es pública por diseño |
| `SUPABASE_SERVICE_KEY` | Mismo lugar | **Privada.** Se saltea las reglas de acceso de la base |
| `GEMINI_API_KEY` | Google AI Studio | **Privada.** Sin ella el asistente no anda, pero el servidor arranca igual |
| `GEMINI_MODEL` | Ya viene con valor | `gemini-3.6-flash` |
| `FRONTEND_URL` | **Se completa en el paso 3** | Hasta entonces, el CORS rechaza al frontend |

`PORT` la pone Render sola y `config/env.ts` ya la lee.

> **El plan gratuito se duerme.** Después de 15 minutos sin pedidos, Render apaga el servicio y el siguiente pedido tarda cerca de un minuto en despertarlo. Para mirar si la aplicación se usa alcanza; el día que haya gente entrando, es lo primero que hay que pagar.

## Paso 2 — El frontend en Vercel

Se despliega la carpeta `app/frontend` como raíz del proyecto. Next.js lo detecta solo: no hace falta un `vercel.json`.

Las variables que hay que cargar en el panel de Vercel:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | La misma que en Render |
| `SUPABASE_ANON_KEY` | La misma que en Render |
| `API_URL` | La dirección que devolvió Render en el paso 1 |

**Y ninguna más.** `SUPABASE_SERVICE_KEY` y `GEMINI_API_KEY` no van acá. No es que sobren: ponerlas sería el error de seguridad más caro del proyecto.

## Paso 3 — Cerrar el círculo

Dos cosas, las dos fuera del código:

**En Render**, completar `FRONTEND_URL` con el dominio de Vercel. Sin esto el navegador rechaza cada pedido a la API por CORS y la aplicación se ve entera pero vacía.

**En Supabase**, agregar el dominio de producción a *Authentication > URL Configuration*: como Site URL y en la lista de Redirect URLs. Sin esto el login manda el correo de acceso y el enlace devuelve a `localhost`, que en la máquina de quien lo recibe no existe.

---

## Cómo se sabe que quedó bien

En este orden, y los tres tienen que dar:

1. `GET /api/health` del backend devuelve `{"ok":true}`.
2. El muro carga con publicaciones en el dominio de Vercel — si carga vacío con la consola marcando CORS, falta el paso 3.
3. Entrar con una cuenta real y pedir el análisis de un vehículo. Es lo que atraviesa todo: sesión, base, reglas de acceso, Gemini y sharp.

El script `npm run verificar:recorrido` del Sprint 6 se puede apuntar al backend de producción cambiando la dirección de la API. **Cuidado:** crea y borra publicaciones de verdad. Contra la base de producción hace exactamente lo mismo que contra la de desarrollo, porque **es la misma base**.

---

## Lo que este despliegue NO resuelve

- **No hay integración continua.** No hay tests automatizados ni nada que corra solo al subir un cambio. Lo que hay son los tres scripts de verificación, y se corren a mano.
- **Hay un solo entorno.** Render y Vercel apuntan a la misma base de Supabase que la máquina de desarrollo. Un `verificar:recorrido` mal apuntado toca datos reales.
- **Sigue sin haber aviso fuera de la aplicación.** Es el punto 6 de [`para_mas_adelante.md`](para_mas_adelante.md), y con gente de verdad usándola pasa de deuda anotada a problema visible.
- **El descargo de `/legales` sigue sin leerlo un abogado.** Punto 5 del mismo archivo. Es lo que separa "pruebas entre conocidos" de una salida a producción de verdad.

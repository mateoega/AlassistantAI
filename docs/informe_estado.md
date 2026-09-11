# Informe de estado — qué se puede, qué no, y qué cuesta

**Fecha: 2026-09-11.** Escrito para el cliente, después de cuatro vueltas de discusión sobre la Arena.

Este informe no opina sobre si la Arena es una buena idea. Eso ya se discutió y quedó en [`arena.md`](arena.md), y la respuesta corta es que sí, es buena. Este informe contesta otra cosa, que hasta ahora nadie puso por escrito: **con qué se cuenta realmente para hacerla.**

Está escrito para que se entienda sin saber programar. Donde hay un número, es un número.

---

## 1. La parte incómoda, primero

Conviene empezar por acá porque todo lo demás depende de esto.

**La infraestructura completa del proyecto es:**

- **una persona**, de veinte años, que programa;
- **una computadora** de gama media;
- **una suscripción a una IA** que ayuda a programar;
- y **cuatro servicios en su plan gratuito**: Vercel (las pantallas), Render (el servidor), Supabase (la base de datos y las fotos) y Google Gemini (la inteligencia artificial).

**No hay empresa, no hay servidores, no hay equipo y no hay un presupuesto asignado.** No hay una cuenta de la que salga plata todos los meses. Cero.

Eso no es una queja ni un pedido: es el dato que hay que tener en la cabeza al leer cualquier idea, porque cambia qué significa "se puede hacer". Casi todo se puede hacer. La pregunta real es siempre **cuántas semanas de una sola persona cuesta, y qué se rompe cuando entra gente de verdad.**

---

## 2. Qué hay hecho hoy, y no es poco

Esto ya existe, funciona y está online desde el **26 de agosto de 2026**:

- **La plataforma entera de compraventa**: publicar un vehículo con fotos, editarlo, pausarlo, marcarlo vendido, y un muro donde se busca y se filtra.
- **Cubre todo el rubro automotor** —autos, camionetas, utilitarios, motos, cuatriciclos, camiones, buses— y cada tipo tiene sus propios datos. Agregar un tipo nuevo no obliga a reprogramar nada.
- **El análisis de fotos con IA** (lo que llamamos La Lupa): mira las fotos junto con lo que declara el vendedor y devuelve qué se ve, qué no cierra y qué no se puede evaluar.
- **La estimación de precio**, con la lista de avisos contra los que comparó a la vista.
- **El asistente que conversa**, disponible en toda la aplicación, que sabe qué aviso hay en pantalla y busca entre las publicaciones.
- **Mensajería interna** entre comprador y vendedor, con bloquear y denunciar.
- **Mirar no pide cuenta.** El muro, la búsqueda, la ficha, el precio y el análisis se abren sin registrarse. La cuenta se pide para hacer, no para entrar.
- **El descargo legal** en `/legales`, aceptado una vez.

**Seis sprints de trabajo.** Es un producto real, no una maqueta. Ese es el activo del proyecto y es más de lo que la mayoría de las ideas llegan a tener.

---

## 3. Los cinco límites duros de hoy

Acá está lo que el entusiasmo suele saltearse. Ninguno de estos es un error: **son las condiciones de los planes gratuitos**, y todos se destraban con plata. Lo importante es saber cuáles son antes de invitar gente.

### 3.1. La inteligencia artificial tiene 20 usos por día. En total.

El plan gratuito de Gemini da **veinte llamadas diarias** para el modelo que usa la plataforma. Y no cuesta una llamada por persona:

- pedir el análisis de un vehículo → **1 llamada**;
- una pregunta al asistente que lo obliga a buscar publicaciones → **entre 2 y 4 llamadas**.

Traducido: **la IA de la plataforma aguanta entre cinco y diez interacciones reales por día, sumando a todos los usuarios del mundo.** Después de eso, a todo el que entre le aparece "el asistente está con mucha demanda" hasta el día siguiente.

Hoy no se nota porque entra poca gente. **El día que entre gente, se nota en los primeros minutos.**

### 3.2. El servidor se duerme, y tarda un minuto en despertar

En el plan gratuito de Render, el servidor **se apaga solo después de 15 minutos sin visitas**. El siguiente que entra espera **cerca de un minuto** con la pantalla cargando.

Esto es lo más grave para un evento, y merece decirse con todas las letras: **si se hace publicidad para que la gente entre un domingo a las 20:00, el primero que llegue va a encontrar la aplicación dormida.** Nadie espera un minuto. La plata de la publicidad se gasta en mandar gente a una puerta cerrada.

### 3.3. Hay un solo entorno: probar y producción son el mismo lugar

La computadora del desarrollador, el servidor online y la base de datos son **la misma base de datos**. No hay un lugar aparte para probar sin tocar lo real. Tampoco hay pruebas automáticas que corran solas al subir un cambio.

En un proyecto chico se convive con eso. En un proyecto con un evento anunciado, significa que **tocar algo el sábado a la noche es jugar con la única copia que existe.**

### 3.4. Hay del orden de setenta publicaciones

Setenta vehículos es suficiente para probar que la plataforma funciona. **No es suficiente para recibir una multitud.** Si un evento sale bien y trae trescientas personas, se van a encontrar con un catálogo que se recorre entero en cinco minutos, y con vehículos que ya vieron en la Arena anterior.

### 3.5. La plataforma no puede avisarle nada a nadie

No hay mail ni notificación al celular. Quien recibe un mensaje **se entera solo si entra**. Y una cuenta regresiva de "faltan 3 días" solo la ve quien ya está adentro, que es justo el que no necesita el recordatorio.

**Y una que no es técnica pero es la más seria:** el descargo legal **todavía no lo leyó un abogado**. Mientras la aplicación la usan conocidos, se convive. Un evento público, anunciado y con publicidad paga es otra categoría de exposición.

---

## 4. Qué pasaría si la Arena saliera bien mañana

Vale la pena imaginarlo completo, porque es el riesgo real del proyecto y no es el que uno esperaría:

> Se hace la publicidad. Funciona. Doscientas personas entran el domingo a las 20:05.
> La primera espera un minuto a que el servidor despierte. Muchas se van antes.
> Las que entran empiezan a preguntarle al asistente. **A las diez preguntas, la IA se agotó por el día** y a todos los demás les aparece un cartel de error.
> Las que se quedan recorren setenta publicaciones y en cinco minutos las vieron todas.
> Y a ninguna se le puede avisar cuándo es la próxima.

**El peor escenario de este proyecto no es que la Arena fracase. Es que funcione.** Una idea buena, ejecutada sobre una infraestructura gratuita, quema la única cosa que no se recupera: la primera impresión de la gente que vino porque la invitaron.

Esa es la conclusión central de este informe.

---

## 5. Qué cuesta destrabar cada límite

La buena noticia: **es barato.** Sorprendentemente barato. Los números son órdenes de magnitud en dólares por mes y hay que confirmarlos el día de contratar, porque los precios cambian.

| Límite | Cómo se destraba | Costo | ¿Urgente? |
|---|---|---|---|
| El servidor se duerme | Plan pago de Render | **~7 USD/mes** | **Sí. Antes de cualquier publicidad.** |
| 20 usos de IA por día | Activar facturación en Google (se paga por uso, no fijo) | **centavos por análisis**; con uso bajo, pocos dólares al mes | **Sí. Antes de cualquier publicidad.** |
| Un solo entorno | Una segunda base de datos de prueba | **0 USD** (otro proyecto gratuito de Supabase) | Recomendable, cuesta horas y no plata |
| Avisar por mail | Servicio de envío | 0 USD al principio; lo caro es configurarlo | No. Hay una alternativa gratis (ver 7.3) |
| Las pantallas (Vercel) | Está en el plan gratuito, **que es para uso no comercial** | ~20 USD/mes el día que sea un negocio | **A verificar.** Es un riesgo dormido |
| Revisión legal | Un abogado lee el descargo | Lo que cobre un abogado | Antes de publicidad paga a desconocidos |

**El mínimo para poder invitar gente sin hacer papelones: del orden de 10 dólares por mes.** Eso es todo. Es menos que el costo de la publicidad de un solo día.

Y dicho al revés, que es como conviene entenderlo: **no tiene sentido gastar un peso en publicidad antes de gastar esos diez dólares.** Es la inversión con mejor relación de todo el proyecto, y hoy no está hecha.

---

## 6. La Arena, revisada contra la realidad

Con lo de arriba en la mano, esto es lo que se puede y lo que no.

### Se puede, sin plata nueva y con lo que ya existe

- **La Lupa** (el análisis revelado en el evento): ya está construida. Un evento consume **una** llamada de IA. Cero problema.
- **"¿Cuánto vale para vos?"** con las dos rondas: no usa IA, son filas en la base. Miles de participaciones no mueven la aguja del plan gratuito.
- **La cartelera, la cuenta regresiva y la gatera**: pantallas y formularios. Sin costo por uso.
- **El personaje que conduce, en texto**: un nombre, una marca visual y unas frases fijas. **Cero código y cero pesos.**

### No se puede, o no conviene hoy

- **Un avatar que reaccione en vivo a lo que dice el vendedor: no.** Con calidad aceptable y costo sensato, hoy no está al alcance. Además rompería la regla del formato (la IA no le contesta al vendedor).
- **Voz hablada dentro del evento en vivo: se puede, no conviene todavía.** Es un servicio externo más y un costo fijo nuevo para un formato sin señal. En un Reel grabado, sí: ahí se amortiza.
- **Que el asistente conteste preguntas del público durante la Arena: HOY NO.** Con 20 llamadas diarias, se agota en los primeros cinco minutos. Esto no es una limitación de diseño: es la cuota. Con facturación activada, se puede.
- **Un evento en vivo con cientos de personas simultáneas dentro de la plataforma: no con esta infraestructura.** Con veinte a cincuenta personas, sí, perfectamente. Esa es la escala realista de la primera Arena, y conviene planificarla para ese número en vez de para el número que nos gustaría.
- **La estética de cámaras, sonidos y movimientos: se puede y es cara** en horas de una sola persona, y pesa en los celulares donde va a estar casi todo el público.

---

## 7. Qué hay que corregir de lo que ya planeamos

Tres cosas de las cuatro vueltas anteriores no sobreviven al contacto con estos números. Es el momento de decirlo.

### 7.1. El orden estaba al revés: primero pagar los diez dólares, después la publicidad

En las partes I a IV hablamos de mecánicas, de estética y de personaje sin haber dicho que **la plataforma hoy no está en condiciones de recibir una visita masiva**. Cualquier plan que empiece por "hagamos publicidad" antes de destrabar el servidor dormido y la cuota de IA está mal ordenado, por buena que sea la idea.

### 7.2. Las 80 a 140 horas de la parte IV hay que traducirlas a tiempo real

Esa estimación suponía a alguien trabajando a tiempo completo. La realidad es **una persona, part-time**. A un ritmo sostenible de diez a quince horas por semana, la Arena completa dentro de la plataforma son **entre dos y tres meses de calendario**, sin contar imprevistos ni el resto del proyecto.

**Dos o tres meses para un formato que todavía no sabemos si le interesa a alguien es la decisión más cara que se puede tomar hoy.**

### 7.3. La cuenta regresiva y los recordatorios se resuelven afuera

No hace falta un servicio de mails. Un botón que agregue el evento al calendario del teléfono cuesta **cuatro horas y cero pesos**, y el recordatorio lo da el celular. Ya estaba propuesto; ahora es además la única opción sensata.

---

## 8. La recomendación del experto

Es una sola idea, y es la parte más importante del informe.

### La Arena no tiene que vivir dentro de la plataforma. Todavía no.

El evento necesita tres cosas: **que haya público, que alguien conduzca, y que el vendedor esté para contestar.** Ninguna de las tres necesita que la plataforma sepa hacer un evento.

**Instagram y WhatsApp ya hacen todo eso, gratis, y no se caen.** Ahí hay transmisión en vivo, comentarios, encuestas, cuenta regresiva, recordatorio automático y moderación — todo resuelto, mantenido por otro, y con la audiencia ya adentro. Y la infraestructura es de ellos: si entran quinientas personas, el problema es de Meta y no del servidor de siete dólares.

Entonces, el reparto que recomiendo:

| Qué | Dónde |
|---|---|
| El anuncio, la cuenta regresiva, la expectativa | Instagram |
| El vivo: La Lupa leída, el vendedor contestando | Instagram en vivo |
| "¿Cuánto vale para vos?", antes y después | Encuestas de historias |
| **La ficha del vehículo, el análisis completo, la estimación, el contacto con el vendedor** | **La plataforma** |
| El registro de lo que pasó, para el que llegó tarde | La plataforma |

**La plataforma es el destino y el archivo. Instagram es el escenario.**

Eso permite hacer la Primera Arena **el mes que viene**, con cero pesos de infraestructura, cero líneas de código nuevas, y medir de verdad si a alguien le interesa. Y si resulta que sí, entonces —y solo entonces— tiene sentido discutir si vale la pena mudar el escenario adentro de casa, con los números de la Arena 0 sobre la mesa en vez de con entusiasmo.

Construir la Arena dentro de la web antes de eso es **pagar dos o tres meses de la única persona del proyecto para averiguar algo que se puede averiguar gratis en tres semanas.**

---

## 9. Plan realista, en tres tiempos

**Tiempo 1 — Poner la casa en condiciones. ~10 USD/mes, unas 6 a 10 horas.**
Pagar Render, activar facturación en Google, y armar la base de prueba aparte. Sin esto, nada de lo demás importa: es lo que evita que un éxito se transforme en un papelón.

**Tiempo 2 — La Arena 0, afuera. 0 pesos de infraestructura, 10 a 15 horas de producción.**
Seis vehículos, uno estelar, anuncio tres días antes, el vivo por Instagram y la plataforma como destino. Lo que hay que mirar es una sola cosa: **cuánta gente vuelve a la Arena siguiente sin que nadie la invite de nuevo**. Y una segunda, casi tan importante: **cuántos vehículos nuevos se publican para poder entrar.**

**Tiempo 3 — Solo si el tiempo 2 dio señal: una pieza, no la Arena entera.**
Construir **"¿Cuánto vale para vos?" con las dos rondas** (16 a 24 horas). Es la única del listado que da motivo de volver, produce el material de publicidad del mes siguiente, y **mejora el producto**: alimenta con datos propios la estimación de precios, que hoy usa números provisorios por falta de volumen.

---

## 10. Lo que recomiendo no hacer

- **No hacer publicidad paga antes del Tiempo 1.** Es tirar la plata literalmente a un servidor dormido.
- **No construir la Arena completa dentro de la web antes de la Arena 0.** Dos o tres meses de la única persona del proyecto, apostados a una corazonada.
- **No contratar ningún servicio de voz, avatar o video todavía.** Costo fijo nuevo sobre un formato sin una sola prueba hecha.
- **No prometer en la publicidad un evento más grande de lo que la infraestructura aguanta.** Veinte a cincuenta personas es el número realista de la primera. Es un número digno, y es infinitamente mejor que doscientas mirando una pantalla que carga.

---

## 11. Una última cosa, dicha con respeto

El proyecto tiene un producto real, funcionando y online, hecho por una persona en seis sprints. Eso es genuinamente valioso y no es lo habitual.

Lo que no tiene es **infraestructura, presupuesto y equipo**. Y las ideas que se están discutiendo —un evento en vivo, un conductor con voz, una producción mensual— son ideas de una empresa con un equipo de contenido y una partida de marketing.

No están mal. Están **fuera de orden**. Casi todas se pueden hacer, algunas por mucho menos plata de lo que uno imagina, pero **no todas a la vez y no antes de que entre la primera persona de verdad.**

La pregunta que conviene hacerse antes de cada decisión de acá en adelante es siempre la misma:

> **¿Esto se puede probar sin construirlo?**

Con la Arena, la respuesta es que sí. Y cuesta tres semanas y cero pesos averiguarlo.

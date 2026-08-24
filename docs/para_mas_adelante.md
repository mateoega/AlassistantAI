# Para más adelante — lo que se hace una vez validada la app

Este archivo junta **todo lo que se decidió no hacer todavía**, con el motivo y con la señal concreta que lo destraba.

No es una lista de deseos ni de deudas. Es una decisión de fondo, tomada el 2026-08-21: **hoy no se invierte plata ni tiempo en cosas que solo valen la pena si la aplicación se usa.** Primero se pone online, se mira si entra gente y si la usa. Recién ahí se mejora, y con datos reales sobre qué mejorar.

Cada punto está escrito igual: **qué es**, **por qué no ahora** y **qué señal lo dispara**.

---

## 1. Contratar una fuente de precios profesional (InfoAuto)

**Qué es.** [InfoAuto](https://www.infoauto.com.ar/empresas) es la guía oficial de precios de la Argentina desde hace más de 25 años. Es la que usa la industria. Cubre los siete tipos de vehículo de la plataforma con una sola fuente — autos, camionetas, utilitarios, motos, camiones, buses y cuatriciclos — sobre unos 15.000 vehículos.

**Por qué no ahora.** Cuesta plata y no publica precios: hay que hablar con un comercial y negociar un contrato de empresa. La plataforma todavía no tiene definido cómo monetiza (pendiente desde el Sprint 0), así que no hay contra qué justificar un costo fijo mensual. El Sprint 3 se construyó a propósito para funcionar sin esto y para que enchufarlo después **no obligue a reescribir nada**: la fuente de precios es una pieza intercambiable.

**Qué señal lo dispara.** Que la estimación de precio se use de verdad — gente entrando, mirando avisos y pidiendo la estimación — y que se vea que las fuentes gratuitas se quedan cortas. Ahí el costo pasa a ser una inversión con un número al lado en vez de una apuesta.

## 2. Precios de referencia para camiones, buses y cuatriciclos

**Qué es.** La estimación del Sprint 3 se apoya en dos fuentes: las publicaciones de la propia plataforma y [Arg Autos](https://argautos.com/docs/api). Arg Autos cubre autos, camionetas y utilitarios, pero **no camiones, buses ni cuatriciclos**. En esos tipos, si no hay al menos dos avisos parecidos publicados, no hay estimación.

**Por qué no ahora.** La fuente gratuita que los cubriría —[la tabla de valuación de la DNRPA](https://www.dnrpa.gov.ar/valuacion/valuaciones.php)— se probó durante el Sprint 3 y **se descartó por calidad del dato**, no por esfuerzo: al extraer el PDF se pierde la posición de las columnas y no se puede saber a qué año corresponde cada precio, y encima son valuaciones fiscales con entradas congeladas hace años. El detalle está en [`sprint3.md`](sprint3.md). Cargarla habría puesto un número con cara de dato oficial sobre un año probablemente equivocado.

**Qué señal lo dispara.** Que haya volumen real de publicaciones en esos tipos —en cuyo caso la capa 1 se arregla sola—, o que se contrate la fuente del punto 1, que sí los cubre. La tabla `market_references` ya está preparada para recibir otra fuente sin tocar la estimación.

## 3. Asegurar la fuente gratuita que hoy se usa

**Qué es.** Arg Autos es una API pública y gratuita hecha **por una sola persona**. Anda bien y los precios que devuelve son realistas — se verificó contra modelos concretos antes de adoptarla. Pero no declara de dónde saca los datos, no tiene licencia de uso publicada y no garantiza ningún nivel de servicio. Puede dejar de existir sin aviso.

**Por qué no ahora.** Es gratis, funciona y la estimación no depende solo de ella: si la fuente externa no responde, la comparación contra la propia base sigue dando un resultado. La aplicación degrada, no se rompe.

**Qué señal lo dispara.** Que se caiga y no vuelva, o que la app crezca lo suficiente como para que depender de un proyecto personal sea un riesgo del negocio y no un detalle técnico.

## 4. Definir el modelo de negocio y el alcance legal

**Qué es.** Dos pendientes explícitos que arrastra el proyecto desde el [Sprint 0](sprint0.md): cómo monetiza la plataforma, y **qué responsabilidad asume sobre las estimaciones que da** — incluido si hace falta un descargo de responsabilidad visible.

**Por qué no ahora.** El primero necesita saber si la aplicación le sirve a alguien. El segundo empieza a importar cuando hay usuarios reales tomando decisiones de plata con lo que la plataforma les muestra.

**Qué señal lo dispara.** El día que salga de pruebas y la use gente que no conocemos. El descargo de responsabilidad conviene resolverlo **antes** de ese día, no después: es texto, no desarrollo, y es lo más barato de la lista.

## 5. Denunciar y bloquear en los mensajes

**Qué es.** El Sprint 5 abrió un canal de mensajes entre desconocidos y no dejó forma de cortarlo: no se puede bloquear a alguien ni denunciar una conversación.

**Por qué no ahora.** Mientras la aplicación esté en pruebas, entre gente conocida, no hay a quién bloquear. Construirlo antes sería moderar una comunidad que todavía no existe.

**Qué señal lo dispara.** El día que la use gente que no conocemos, y **antes de ese día, no después**. Va junto con el punto 6: son las dos cosas que hay que resolver para salir de pruebas. Es lo más barato de construir de esta lista después del descargo, y lo más caro de no tener.

## 6. Avisar de un mensaje nuevo fuera de la aplicación

**Qué es.** Hoy, a quien le escriben se entera solo si entra a AIassistant. No hay mail ni notificación al celular. Es la única ventaja real que tenía el enlace a WhatsApp que el Sprint 5 sacó.

**Por qué no ahora.** Mandar mails necesita un servicio de envío contratado y configurado, y un mail mal armado termina en la carpeta de correo no deseado, que es peor que no mandarlo. Con poca gente usando la aplicación, el costo de entrar a mirar es bajo.

**Qué señal lo dispara.** Que haya conversaciones empezadas que se queden sin respuesta más de un día. Ese número se puede mirar en la base sin construir nada.

## 7. Mejoras de producto que hoy no bloquean nada

Ninguna de estas impide usar la aplicación. Todas se hacen mejor con datos de uso real que adivinando hoy.

- **Administrar los tipos de vehículo desde la propia app.** Hoy un tipo nuevo se carga desde el panel de Supabase. Debería poder hacerlo alguien del equipo desde una pantalla de administración. *Señal:* que haga falta crear tipos seguido, o que lo tenga que hacer alguien que no es técnico.
- **Catálogo de marcas y modelos por tipo.** Hoy la marca sale de un catálogo pero **el modelo se escribe libre**. Un catálogo cerrado mejoraría la estimación de precio (comparar "Corolla" con "corola" hoy no es automático) y la búsqueda. *Señal:* ver en los avisos reales cuánto se escribe mal el mismo modelo. Recién ahí se sabe si el problema es grande o imaginario.
- **Mandar fotos en un mensaje.** "Mandame una foto del motor" es de las preguntas más comunes y hoy se contesta con palabras. La subida a Storage existe desde el Sprint 1; falta decidir quién ve esas fotos y por cuánto tiempo. *Señal:* que aparezca pedido en las conversaciones reales.
- **Verificación de documentación legal del vehículo.** *Señal:* que aparezca como pedido de los usuarios, o como diferencial necesario frente a la competencia.
- **Historial de mantenimiento.** *Señal:* misma que la anterior.
- **Versión mobile.** La aplicación ya se ve bien en un celular; esto sería una app nativa. *Señal:* que el tráfico sea mayoritariamente de celular **y** que la web se quede corta.

---

## Lo que NO va acá

Esto no es el depósito de todo lo que falta. Lo que ya está planificado con sprint asignado vive en el [roadmap](roadmap.md), donde con el **Sprint 5** terminaron los sprints previstos. Este archivo es solo para lo que se decidió postergar **hasta tener señales de uso real**.

Dos de los puntos de arriba tienen fecha aunque no tengan sprint: el **descargo de responsabilidad** (punto 4) y **denunciar y bloquear** (punto 5) se resuelven *antes* de que entre gente que no conocemos, no después.

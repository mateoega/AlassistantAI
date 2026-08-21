# Para más adelante — lo que se hace una vez validada la app

Este archivo junta **todo lo que se decidió no hacer todavía**, con el motivo y con la señal concreta que lo destraba.

No es una lista de deseos ni de deudas. Es una decisión de fondo, tomada el 2026-08-21: **hoy no se invierte plata ni tiempo en cosas que solo valen la pena si la aplicación se usa.** Primero se pone online, se mira si entra gente y si la usa. Recién ahí se mejora, y con datos reales sobre qué mejorar.

Cada punto está escrito igual: **qué es**, **por qué no ahora** y **qué señal lo dispara**.

---

## 1. Contratar una fuente de precios profesional (InfoAuto)

**Qué es.** [InfoAuto](https://www.infoauto.com.ar/empresas) es la guía oficial de precios de la Argentina desde hace más de 25 años. Es la que usa la industria. Cubre los siete tipos de vehículo de la plataforma con una sola fuente — autos, camionetas, utilitarios, motos, camiones, buses y cuatriciclos — sobre unos 15.000 vehículos.

**Por qué no ahora.** Cuesta plata y no publica precios: hay que hablar con un comercial y negociar un contrato de empresa. La plataforma todavía no tiene definido cómo monetiza (pendiente desde el Sprint 0), así que no hay contra qué justificar un costo fijo mensual. El Sprint 3 se construyó a propósito para funcionar sin esto y para que enchufarlo después **no obligue a reescribir nada**: la fuente de precios es una pieza intercambiable.

**Qué señal lo dispara.** Que la estimación de precio se use de verdad — gente entrando, mirando avisos y pidiendo la estimación — y que se vea que las fuentes gratuitas se quedan cortas. Ahí el costo pasa a ser una inversión con un número al lado en vez de una apuesta.

## 2. Precios de referencia para motos, camiones y buses

**Qué es.** Hoy la estimación se apoya en dos fuentes externas gratuitas, y ninguna cubre bien esos tipos:

- **[Arg Autos](https://argautos.com/docs/api)** cubre autos, camionetas y utilitarios con buena calidad, pero **no expone motos, camiones ni buses** en su API pública (los datos de motos existen en su base; los endpoints todavía no están publicados).
- **[La tabla de valuación de la DNRPA](https://www.dnrpa.gov.ar/valuacion/valuaciones.php)** sí cubre todo lo que se patenta en el país, pero son **valuaciones fiscales para calcular aranceles de transferencia, no precios de mercado**, y la calidad es despareja: al revisar la tabla vigente del 01/08/2026 aparecieron entradas congeladas hace años (una moto de 110cc con valor 0km de $49.100) al lado de otras realistas.

**Por qué no ahora.** Para esos tipos, la comparación contra las publicaciones de la propia plataforma es la referencia menos mala que existe gratis, y mejora sola a medida que entran avisos. Pagar una fuente para cubrir motos y camiones antes de saber si alguien publica motos y camiones es invertir a ciegas.

**Qué señal lo dispara.** Que haya volumen real de publicaciones en esos tipos, o que la estimación quede visiblemente peor ahí que en autos. Se resuelve con el punto 1, o pidiéndole a Arg Autos acceso a sus datos de motos.

## 3. Asegurar la fuente gratuita que hoy se usa

**Qué es.** Arg Autos es una API pública y gratuita hecha **por una sola persona**. Anda bien y los precios que devuelve son realistas — se verificó contra modelos concretos antes de adoptarla. Pero no declara de dónde saca los datos, no tiene licencia de uso publicada y no garantiza ningún nivel de servicio. Puede dejar de existir sin aviso.

**Por qué no ahora.** Es gratis, funciona y la estimación no depende solo de ella: si la fuente externa no responde, la comparación contra la propia base sigue dando un resultado. La aplicación degrada, no se rompe.

**Qué señal lo dispara.** Que se caiga y no vuelva, o que la app crezca lo suficiente como para que depender de un proyecto personal sea un riesgo del negocio y no un detalle técnico.

## 4. Definir el modelo de negocio y el alcance legal

**Qué es.** Dos pendientes explícitos que arrastra el proyecto desde el [Sprint 0](sprint0.md): cómo monetiza la plataforma, y **qué responsabilidad asume sobre las estimaciones que da** — incluido si hace falta un descargo de responsabilidad visible.

**Por qué no ahora.** El primero necesita saber si la aplicación le sirve a alguien. El segundo empieza a importar cuando hay usuarios reales tomando decisiones de plata con lo que la plataforma les muestra.

**Qué señal lo dispara.** El día que salga de pruebas y la use gente que no conocemos. El descargo de responsabilidad conviene resolverlo **antes** de ese día, no después: es texto, no desarrollo, y es lo más barato de la lista.

## 5. Mejoras de producto que hoy no bloquean nada

Ninguna de estas impide usar la aplicación. Todas se hacen mejor con datos de uso real que adivinando hoy.

- **Administrar los tipos de vehículo desde la propia app.** Hoy un tipo nuevo se carga desde el panel de Supabase. Debería poder hacerlo alguien del equipo desde una pantalla de administración. *Señal:* que haga falta crear tipos seguido, o que lo tenga que hacer alguien que no es técnico.
- **Catálogo de marcas y modelos por tipo.** Hoy la marca sale de un catálogo pero **el modelo se escribe libre**. Un catálogo cerrado mejoraría la estimación de precio (comparar "Corolla" con "corola" hoy no es automático) y la búsqueda. *Señal:* ver en los avisos reales cuánto se escribe mal el mismo modelo. Recién ahí se sabe si el problema es grande o imaginario.
- **Verificación de documentación legal del vehículo.** *Señal:* que aparezca como pedido de los usuarios, o como diferencial necesario frente a la competencia.
- **Historial de mantenimiento.** *Señal:* misma que la anterior.
- **Versión mobile.** La aplicación ya se ve bien en un celular; esto sería una app nativa. *Señal:* que el tráfico sea mayoritariamente de celular **y** que la web se quede corta.

---

## Lo que NO va acá

Esto no es el depósito de todo lo que falta. Lo que ya está planificado con sprint asignado vive en el [roadmap](roadmap.md) — hoy, la **búsqueda y filtros con favoritos** (Sprint 4) y la **mensajería interna** (Sprint 5). Este archivo es solo para lo que se decidió postergar **hasta tener señales de uso real**.

# Sprint 3 — Estimación de precio

Qué se construyó, qué se decidió y por qué. Las decisiones día por día están en [`../bitacora/bitacora.md`](../bitacora/bitacora.md).

## Qué hace

En la pantalla de cada vehículo aparece un **precio de referencia**: un rango de lo que se está pidiendo por vehículos parecidos, y dónde queda el precio de este aviso respecto de ese rango. Debajo se lista **con qué se comparó**, aviso por aviso.

Es lo que destraba lo que el Sprint 2 había dejado explícitamente afuera: hasta ahora, tanto el análisis de fotos como el chat tenían prohibido opinar sobre precios. Ahora pueden, **pero solo cuando existe una estimación para ese vehículo**.

## Qué a propósito NO hace

**No dice si conviene comprar.** Dice cuánto piden por vehículos parecidos y dónde queda este entre ellos. La diferencia no es de redacción: lo primero es un consejo financiero, lo segundo es un dato con el método a la vista.

**No es una tasación.** Sale de precios que los vendedores están *pidiendo*, que no son necesariamente precios de venta. Está escrito en la pantalla, no en letra chica.

## De dónde salen los números

Dos capas en funcionamiento y una tercera que se descartó con motivo. Ninguna paga. La evaluación de las cuatro fuentes que existen para el mercado argentino, y por qué no se contrata una guía profesional todavía, están en [`para_mas_adelante.md`](para_mas_adelante.md).

### Capa 1 — Las publicaciones de la propia plataforma

Es la principal y la única que funciona para los siete tipos de vehículo. Busca avisos del mismo tipo, marca y familia de modelo, dentro de una ventana de años, y **corrige cada uno por año y por kilómetros** para llevarlo al vehículo que se está mirando.

Decisiones que quedaron adentro:

- **Mediana, no promedio.** Un solo aviso disparatado mueve un promedio; no mueve una mediana. Es lo que impide que alguien corra la referencia publicando un número absurdo.
- **Mínimo dos comparables**, con la confianza informada como "baja" y los avisos usados a la vista. Se midió antes de decidirlo: con tres, solo 10 de 68 publicaciones recibían estimación; con dos, 27.
- **Máximo dos comparables por vendedor.** Sin ese tope, alguien con seis avisos del mismo modelo fijaría él solo su propio precio de referencia.
- **Entran las publicaciones vendidas.** Un aviso que efectivamente se vendió es la señal de precio más fuerte que hay.
- **Se calcula en el momento y no se guarda.** A diferencia del análisis de fotos, no cuesta plata ni tarda. Guardarlo traería el problema de saber cuándo quedó viejo, y queda viejo con cada aviso nuevo — que es justamente lo que tiene que reflejar.

### Capa 2 — Una fuente de precios externa, que informa pero no juzga

La referencia externa **se muestra siempre que exista, y nunca decide si el precio pedido está bien o mal.** Aparece al lado del rango propio, y también cuando no alcanzó para estimar — ahí es lo único que hay, y sigue siendo información útil.

**Esa restricción no estaba en el diseño original: la impusieron los números.** Al principio, cuando no había avisos parecidos suficientes, la estimación salía de la fuente externa. Al correrlo contra la base, **22 de 47 publicaciones quedaban marcadas fuera de mercado** —contra 5 de 27 comparando solo entre avisos propios— y aparecían casos imposibles: una Frontier 2020 marcada 106% por encima.

El motivo es que la fuente publica valores sistemáticamente más bajos que los precios que se piden, y bastante más bajos en camionetas. Sin una tercera fuente no se puede saber cuál tiene razón. Lo que sí se sabe es que acusar a uno de cada dos vendedores de pedir de más, con un dato que no está ajustado por kilómetros ni por estado, es el daño que esta plataforma existe para evitar.

**El costo:** la cobertura baja de 47 a 27 publicaciones con estimación. Se paga con gusto — un rango equivocado se corrige, una acusación equivocada se la come el vendedor.

**Vive en una tabla nuestra y no se consulta en vivo.** La fuente gratuita corta a los pocos pedidos por minuto, así que la carga la hace un script a mano ([`cargar-referencias.ts`](../app/backend/scripts/README.md)). Si la fuente desaparece, lo cargado sigue sirviendo.

**Esa tabla es la pieza intercambiable.** Hoy la llena Arg Autos; mañana puede llenarla InfoAuto o la tabla de la DNRPA — la columna `source` dice de dónde salió cada fila. Cambiar de proveedor es cambiar el script que la carga, no la estimación que la lee.

### Capa 3 — La tabla oficial de la DNRPA: evaluada y NO cargada

Estaba planificada como la fuente para camiones y buses, que es donde no hay nada gratuito. **Se probó antes de escribirla y se decidió no cargarla.** El motivo no es de esfuerzo, es de calidad del dato.

**No se puede saber a qué año corresponde cada precio.** La tabla es un PDF donde cada fila trae una serie de valores por año, pero **las filas no arrancan todas en la misma columna**. En la tabla vigente, "COROLLA 2.0 SEG CVT" trae ocho valores empezando en 54.392.000, y "COROLLA 2.0 SEG CVT MY21" trae cinco empezando en 38.807.100. "MY21" significa modelo 2021: su primer valor no puede ser el de 0 km. Al extraer el texto del PDF se pierde la posición de las columnas, así que asignar años sería adivinar — y adivinar mal de forma sistemática.

**Y los valores que sí se pueden leer son desparejos.** Son valuaciones fiscales para calcular aranceles de transferencia, no precios de mercado. Hay entradas congeladas hace años conviviendo con otras realistas: una moto de 110cc figura con valor 0 km de $49.100.

**Por qué eso alcanzó para descartarla:** cargarla habría puesto delante de un comprador un número con cara de dato oficial, calculado sobre un año probablemente equivocado. Es exactamente lo que este proyecto viene negándose a hacer desde el Sprint 2. La tabla `market_references` la sigue esperando —la columna `source` está para eso— pero con una fuente que se pueda leer bien.

**Qué queda sin cubrir:** camiones y buses dependen solo de la capa 1. Si no hay dos avisos parecidos publicados, no tienen estimación. Está anotado en [`para_mas_adelante.md`](para_mas_adelante.md) con la señal que lo destraba.

## Cómo se compara un peso con un dólar

Las publicaciones se cargan en pesos o en dólares y las dos cosas conviven. Todo se lleva a dólares para hacer la cuenta y vuelve a la moneda del aviso para mostrarse, usando el **dólar blue** — que es el que usa el mercado de usados argentino, no el del banco.

Si la cotización no se puede obtener, la estimación no se rompe: compara solo entre avisos que ya están en la misma moneda.

## Cómo pierde valor cada tipo de vehículo

Un camión no se deprecia como una moto, y 300.000 km en un camión son normales mientras que en un auto son muchos. Esos dos coeficientes **viven en el catálogo** (`vehicle_types.annual_depreciation` y `wear_per_10k_km`), no en el código.

Es la regla del proyecto: agregar un tipo de vehículo nuevo tiene que funcionar cargando una fila, sin redesplegar. Y trae un beneficio que no se buscaba: cuando la plataforma tenga volumen real, esos números se van a poder ajustar sin tocar código.

**Los valores de hoy son provisorios y gruesos.** Salen de cómo se comporta el mercado argentino en general; con setenta publicaciones no hay con qué calcularlos.

## La familia del modelo, y por qué es una heurística

"Corolla XEI 1.8" y "Corolla SEG 2.0 CVT" son los dos un Corolla y tienen que compararse entre sí. Como el modelo se escribe libre, no hay forma exacta de saber dónde termina el nombre del modelo y dónde empieza la versión: se toma la primera palabra, salvo que sea muy corta — "CB 190R", "ZB 110" —, donde el nombre real necesita también la segunda.

**El día que exista un catálogo de modelos, esa función desaparece.** Está anotado en [`para_mas_adelante.md`](para_mas_adelante.md).

## Cómo se le levantó la mordaza a la IA

El Sprint 2 le prohibió explícitamente opinar de precios, y el motivo estaba escrito: no tenía con qué comparar. Ahora puede, con un matiz que importa:

**El permiso no viene de una instrucción del prompt, viene de tener el dato.** La estimación se le pasa junto con los datos del vehículo. Si no hay estimación para ese vehículo, no se le pasa nada y la restricción del Sprint 2 sigue vigente para ese caso. No hay una instrucción del tipo "ahora podés hablar de precios" suelta en el prompt.

Sigue prohibido, con o sin estimación, decir si conviene comprar.

**Un detalle que salió de esto:** el análisis de fotos se guarda, así que su huella tuvo que incorporar la estimación — un análisis hecho cuando el aviso estaba "20% por encima" quedó viejo si hoy está dentro del rango. Pero entra **en grueso** (la posición y la decena de desvío), no con el valor exacto: si entrara el número exacto, cada publicación nueva de ese modelo invalidaría todos los análisis del modelo, y cada análisis cuesta plata.

## Lo que cambió en la base

| Migración | Qué agrega |
|---|---|
| `20260821000001_depreciacion_por_tipo.sql` | Dos columnas en `vehicle_types`: cuánto pierde por año y por cada 10.000 km cada tipo. |
| `20260821000002_referencias_de_mercado.sql` | La tabla `market_references`. Nadie puede escribirla desde la aplicación: un precio de referencia es una afirmación de la plataforma, no un dato que carga un usuario. Es la misma decisión que se tomó con los análisis de IA en el Sprint 2. |

## Cómo se verifica

```bash
npm run verificar:estimacion
```

Corre la estimación real contra toda la base y muestra qué le da a cada aviso. Los dos casos plantados a propósito en los datos de prueba son la prueba de fuego: el Corolla 2015 con pocos kilómetros pedido al precio de uno mucho más nuevo tiene que salir **por encima** del rango, y la Hilux con 341.000 km, **por debajo**.

## Cómo se verificó la pantalla sin poder iniciar sesión

La aplicación pide sesión y la herramienta no ingresa credenciales de nadie. Para poder verificar igual, el componente está partido en dos: **el que pide los datos y el que dibuja** (`PriceEstimatePanel` y `PriceEstimateView`).

Eso permite renderizar la pantalla con estimaciones **reales capturadas del backend**, sin fabricar publicaciones ni iniciar sesión. Los cuatro casos que hay que mirar cuando se toque esto son: con comparables, fuera de rango, solo con referencia externa, y sin estimación.

Se verificó además que **no hay rojo ni naranja en ningún estado** —incluido el de precio fuera de rango, que es donde más tienta romper la regla de identidad— y que no hay desborde horizontal a 375px de ancho.

## Pendientes que deja el sprint

- **Camiones, buses y cuatriciclos dependen solo de la capa 1.** No hay fuente externa gratuita y legible para esos tipos: si no hay dos avisos parecidos publicados, no hay estimación. Ver [`para_mas_adelante.md`](para_mas_adelante.md).
- **El descargo de responsabilidad legal** sobre las estimaciones sigue sin definirse. Conviene resolverlo antes de que la use gente que no conocemos: es texto, no desarrollo.
- **Los coeficientes de depreciación no se calcularon con datos propios**, porque todavía no hay volumen para hacerlo.

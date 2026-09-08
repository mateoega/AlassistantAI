# La Arena — nota de concepto

**Estado: idea en discusión. No hay nada construido ni comprometido.** Este archivo existe para que la idea se pueda discutir escrita, no para planificar un sprint. Si algo de acá se decide hacer, se anota en el [roadmap](roadmap.md) y recién ahí es un compromiso.

La idea, en una frase: **un evento con nombre, fecha y hora, donde un puñado de vehículos de la plataforma se presentan en público, y donde entrar a mirar no cuesta nada ni pide cuenta.**

El objetivo tampoco es vender más. Es más difícil que eso, y está bien planteado en el pedido original: **que alguien entre a Mechanic un domingo a la noche aunque hoy no necesite comprar un vehículo.**

---

## 1. La pregunta que hay que contestar antes que ninguna otra

Los dos ejemplos que trajimos —Collecting Cars y eBay Built— tienen fecha, nombre, estética y expectativa. Pero eso no es lo que los hace funcionar. Lo que los hace funcionar es que **a la hora señalada pasa algo que no se puede deshacer**.

En Collecting Cars, a las 20:00 la subasta cierra: el vehículo se vende o no se vende, y quien no estuvo se lo perdió. En Built, al final del episodio se sabe qué taller ganó y después los vehículos se rematan. En los dos casos el reloj no es decorativo: el reloj tiene consecuencia.

Un evento sin consecuencia es un afiche. Si la Primera Arena Mechanic es "los mismos avisos, presentados lindo, el domingo a las 20:00", entonces a las 20:01 no pasó nada, y no hay ninguna razón para volver el domingo siguiente. La estética compra la primera visita. La consecuencia compra la segunda.

**Entonces la pregunta de diseño es una sola: ¿qué es lo irreversible que sucede a las 20:00?**

Y tiene que ser algo que no nos convierta en lo que dijimos que no queríamos ser. Descartando subasta y apuesta, quedan candidatos legítimos:

- **Se revela algo que hasta ese momento estaba tapado.** El análisis de la IA del vehículo estelar, por ejemplo. Antes del evento se ven las fotos y los datos que declara quien vende; a las 20:00 se abre lo que la plataforma encontró.
- **Se cierra algo.** Una ventana de preguntas al vendedor que estuvo abierta tres días y que a las 20:00 se contesta en vivo y no se vuelve a abrir.
- **Se decide algo.** Qué vehículo entra a la próxima Arena.
- **Se sabe si acertaste.** Un pronóstico que hiciste antes y que a las 20:00 se compara contra el número real.

Las cuatro son consecuencias reales, ninguna es azar y ninguna mueve plata. Las cuatro caben en una sola pantalla.

---

## 2. Qué se puede tomar de los dos ejemplos, y qué no

**De Collecting Cars — "No Reserve Sunday".**
Lo que sirve no es la subasta sin reserva: es que **agrupar** convierte un catálogo en un programa. Diez avisos sueltos en el muro son diez avisos. Los mismos diez con un nombre, una fecha y un orden son un evento del que se puede hablar. Es la diferencia entre una lista de canciones y un recital, y no cuesta nada más que decidir cuáles entran.

Lo que **no** hay que tomar: la reserva y la puja. Ahí empieza otro producto, con otra responsabilidad legal (ver punto 7).

**De eBay Motors "Built".**
Lo que sirve es la estructura: **historia + público + participación + desenlace**. Y sobre todo lo que ya viste bien: la gente no solamente miraba, votaba. Mirar sin poder tocar nada es televisión; mirar pudiendo tocar algo, aunque sea mínimo, es pertenencia.

Lo que **no** hay que tomar: la producción. Built es una serie de diez episodios con talleres, transformaciones y cámaras. Nosotros no tenemos eso ni lo vamos a tener, y una imitación pobre de una producción cara se nota en el primer segundo. Lo que sí podemos producir es **una ficha bien presentada y una revelación**. Eso se hace con buena tipografía, buenas fotos y un reloj.

---

## 3. Otras referencias que conviene mirar

- **Bring a Trailer.** Es la referencia más cercana a lo que buscamos y casi nadie la nombra por el motivo correcto. La gente entra a BaT a **leer los comentarios**, no a comprar. La comunidad despedaza el auto en público: alguien reconoce el modelo por una foto del tablero, otro ve que la soldadura no es de fábrica, el vendedor tiene que salir a contestar. El espectáculo es el escrutinio, y es gratis: lo pone el público. *Lo adaptable:* la conversación pública alrededor de un vehículo vale más que cualquier animación.
- **Cars & Bids.** Pocos vehículos por día, elegidos por alguien con criterio y con nombre. Demuestra que **curar es contenido**: no hace falta volumen, hace falta selección visible.
- **Cars and Coffee / los encuentros de autos del domingo.** El noventa por ciento va a mirar y no compra nada, y aun así el encuentro se llena todas las semanas. Es exactamente nuestra hipótesis, ya probada afuera de una pantalla: **el evento recurrente, gratis y sin obligación de participar se sostiene solo con los que miran.** El día y la hora fijos son la mitad del truco.
- **Barrett-Jackson y Mecum por televisión.** Es la prueba de que el remate de vehículos funciona como espectáculo televisado desde hace décadas, con el mismo formato que estamos imaginando: lote estelar, lotes participantes, ficha rápida, presentador. La estética que buscamos ya existe y no es de una película.
- **Los "drops" de zapatillas (SNKRS, Supreme).** Hora fija, cantidad limitada, todos entran al mismo tiempo. Enseñan algo incómodo pero cierto: **la escasez la fabrica el calendario, no el producto.** Nosotros tenemos poco stock; el calendario convierte eso en una virtud en vez de una carencia.
- **Wordle.** Una sola cosa por día, igual para todos, que se puede comentar con otro. Sin cuenta, sin instalación, sin novedades. Es el ejemplo más limpio de "volver todos los días" con la menor cantidad de producto posible.

---

## 4. La ventaja que tenemos y que ninguna de esas plataformas tiene

Collecting Cars, BaT y eBay muestran vehículos. **Nosotros los analizamos.**

El análisis de fotos y la estimación de precio ya están construidos, se adaptan al tipo de vehículo y son, hoy, lo único de la plataforma que Mercado Libre no puede copiar en una tarde. Si la Arena va a tener un espectáculo, el espectáculo natural no es una animación de un auto en la oscuridad: es **el veredicto**.

La secuencia se cuenta sola:

1. Acá está la moto. Esto dice quien la vende.
2. Estas son las fotos. Miralas vos primero.
3. A las 20:00 se abre lo que encontró el análisis: qué se ve, qué no cierra, qué no se puede evaluar con estas fotos, y qué habría que preguntarle al vendedor.
4. El vendedor está y contesta.

Eso tiene tensión de verdad —¿aguanta o no aguanta?— y no la fabricamos nosotros con luces: la fabrica el hecho de que alguien se anime a poner su vehículo bajo esa lupa en público. **Entrar a la Arena es, para quien vende, una señal de confianza.** Y para quien mira es entretenimiento y utilidad al mismo tiempo, que es la combinación difícil.

Además alinea el evento con lo que la plataforma dice ser. Ese es el punto del apartado 7: una Arena de puro hype rema en contra del producto; una Arena de escrutinio rema a favor.

---

## 5. Cinco mecánicas simples, ordenadas por ganas de volver sobre costo de construir

Ninguna de estas es azar, ninguna mueve plata, ninguna convierte la web en un videojuego.

### 5.1. La cartelera, la cuenta regresiva y "avisame"

Una sola pantalla, `/arena`, que antes del evento muestra la fecha, el vehículo estelar y los participantes, y durante el evento muestra lo que esté pasando. La cuenta regresiva es un número que baja.

El "avisame" es el único detalle que hay que resolver bien, y hay una versión barata: **un botón que agrega la Arena al calendario del teléfono** (un archivo `.ics` o un enlace de Google Calendar). No necesita cuenta, no necesita servicio de mails, no necesita permisos del navegador, y el recordatorio lo da el teléfono. Sin eso, la cuenta regresiva solo existe en Instagram y no en la plataforma.

*Costo:* bajo. *Vuelve la gente:* solo si hay algo en el punto 5.2 al 5.5.

### 5.2. Adiviná el precio

Antes del evento, cualquiera —con cuenta o sin cuenta— pone a cuánto cree que se va a vender el vehículo estelar. A las 20:00 se muestra la distribución de lo que dijo la gente, la estimación de la plataforma y, cuando se venda, el número real.

Es la mecánica que más recomiendo mirar, por cuatro motivos:

- **Da un motivo concreto para volver.** Dejaste un número; querés saber si acertaste.
- **No es apuesta.** No hay dinero, no hay premio en dinero, no hay riesgo. Es el mismo juego que hace cualquiera que mira un aviso y dice "esto no vale eso".
- **Se juega en cinco segundos y sin registrarse**, que es exactamente la barrera que el muro público ya bajó a propósito.
- **Y lo más importante para el producto: produce el dato que hoy nos falta.** El proyecto tiene anotado que los coeficientes de depreciación son provisorios y que no hay volumen para calcularlos ([`para_mas_adelante.md`](para_mas_adelante.md), punto 3). Un juego que hace que cientos de personas estimen precios de vehículos concretos es, además de entretenimiento, una fuente de referencia de mercado. Es raro que una mecánica de entretenimiento alimente el motor del producto. Esta lo hace.

*Costo:* medio-bajo. *Vuelve la gente:* sí, y vuelve sola.

### 5.3. Las preguntas públicas

Durante la Arena, las preguntas al vendedor del vehículo estelar se hacen **a la vista de todos** y él las contesta ahí. Es el mecanismo de Bring a Trailer, reducido a un solo vehículo y a dos horas.

Cuidado con dos cosas: esto **no** toca la mensajería privada del Sprint 5 —ahí no entra nadie más, y esa decisión no se revisa—, y necesita moderación, aunque sea a mano, la primera vez. Con un solo vehículo y dos horas, moderar es alguien mirando el teléfono.

*Costo:* medio. *Vuelve la gente:* sí, es lo que más conversación genera, y lo más riesgoso si sale mal.

### 5.4. El veredicto revelado

Lo del punto 4: el análisis del vehículo estelar se publica en el evento y no antes.

*Costo:* bajo, porque el análisis ya existe: lo único nuevo es **cuándo** se muestra. *Vuelve la gente:* es lo que le da sentido a la hora.

### 5.5. Quién entra a la próxima

Al final de la Arena, entre tres candidatos, se define cuál es el estelar de la próxima. Cierra el evento con un desenlace y abre el siguiente en el mismo movimiento, que es lo que hace toda serie.

*Costo:* bajo. *Cuidado:* leer el apartado 7 antes de mostrar cualquier contador.

---

## 6. La Arena 0 — cómo hacer la primera casi sin programar

Antes de construir nada conviene **hacer una Arena a mano** y ver si alguien viene. Una plataforma que anuncia un evento y no consigue público tiene un problema mucho más caro que la falta de funciones.

Una versión posible, sin código nuevo:

1. Se eligen seis avisos que ya están publicados. Uno es el estelar.
2. Se anuncia en Instagram y por WhatsApp tres días antes, con el vehículo estelar y la hora.
3. La "cartelera" es una página estática con las seis fichas y los enlaces a los avisos reales de la plataforma.
4. A las 20:00 se publica el análisis del estelar y se contesta en vivo. Puede ser en la historia de Instagram si hace falta; el destino de todos los enlaces es igual la plataforma.
5. "Adiviná el precio" se juega, la primera vez, con una encuesta.

Lo que hay que mirar después: cuánta gente entró, cuántos se quedaron más de un minuto, cuántos abrieron un aviso que **no** era el estelar, y cuántos preguntaron cuándo es la próxima. Esa última pregunta, hecha sin que nadie la induzca, es la señal más fuerte que puede dar la Arena 0.

Recién con eso se decide qué mecánica del punto 5 se construye.

---

## 7. Lo que la Arena rompe si nadie lo mira

Estas son las contradicciones concretas entre la idea y decisiones que el proyecto **ya tomó**. Ninguna es un impedimento; todas necesitan una decisión explícita.

**Los contadores públicos están prohibidos por una decisión anterior.** Los favoritos son privados y deliberadamente no se pueden contar: se descartó el "23 personas guardaron esto" porque *sirve para apurar al que duda* ([roadmap](roadmap.md), Sprint 4). Un contador de votos, de seguidores o de gente mirando un vehículo es exactamente eso mismo con otro nombre. Se puede convivir: que se vote **entre candidatos** y se muestre solo el ganador, nunca el marcador por vehículo. Pero hay que decidirlo a propósito y no descubrirlo cuando ya esté hecho.

**Sin aviso fuera de la aplicación, la cuenta regresiva no existe.** Hoy no hay mail ni notificación al celular ([`para_mas_adelante.md`](para_mas_adelante.md), punto 6). "Faltan 3 días" solo lo ve quien ya está adentro, que es justamente el que no necesita el recordatorio. El botón de calendario del punto 5.1 lo resuelve por izquierda y sin contratar nada; conviene tenerlo claro antes de prometer recordatorios.

**El stock.** Hay del orden de setenta publicaciones. Una Arena semanal de seis vehículos consume el catálogo entero en tres meses, y una Arena con vehículos que ya pasaron dos veces se nota. Dos salidas: que la Arena sea **mensual** hasta que haya volumen, o que entrar a la Arena sea el motivo por el que alguien publica —"tu vehículo puede entrar a la próxima"—, con lo cual la Arena deja de ser una función de marketing y pasa a ser el motor de altas. La segunda es más ambiciosa y más interesante.

**La estética oscura va contra dos decisiones tomadas.** La aplicación pasó de fondo oscuro a claro el 2026-08-07, de plateado a blanco el 2026-09-01 porque el cliente pidió sacar el gris, y el chat con dorado y vidrio violeta se revirtió a los pocos días. Nada de eso impide que la Arena sea oscura, pero sí impide que la Arena oscura se derrame al resto de la plataforma. La forma sana es tratarla como **una sala aparte**: la Arena es una pantalla con su propio clima, y cuando salís de la Arena volvés a la aplicación blanca de siempre. Un recital puede ser oscuro; el hall del teatro no.

**Hype contra confianza.** Todo el producto se apoya en un argumento sobrio: acá te decimos de dónde sale cada número y qué no es. La estética de espectáculo empuja para el otro lado. La reconciliación es la del punto 4: **el espectáculo es la revelación, no la presión.** Si la Arena termina generando urgencia por comprar, se comió al producto. Si genera curiosidad por mirar, lo alimenta.

**Las palabras.** "Subasta" y "remate" tienen en Argentina un régimen propio y una figura profesional detrás. Mientras la Arena sea presentación, preguntas y pronóstico sin apuesta, estamos lejos de ese terreno; el día que aparezca una puja con aceptación obligatoria, no lo estamos. Es un punto para que lo mire el abogado que ya tiene que leer el descargo ([`para_mas_adelante.md`](para_mas_adelante.md), punto 5), no una opinión legal de este documento. Mientras tanto, conviene no usar esas dos palabras en la publicidad ni de casualidad.

**Una Arena vacía es un fracaso visible.** Un muro sin visitas no lo ve nadie. Un evento anunciado con hora al que no entra nadie lo ve todo el que entró. Por eso la Arena 0 tiene que ser chica, honesta —es la primera— y anunciada donde la audiencia ya está, no donde queremos que esté.

---

## 8. Qué no es la Arena

Conviene escribirlo ahora, que es cuando no cuesta nada:

- **No es una subasta.** No hay pujas ni adjudicación.
- **No es una apuesta ni un juego de azar.** No se pone plata y no se gana plata.
- **No es un videojuego.** No hay avatares, ni niveles, ni carreras.
- **No cambia cómo se compra.** El que quiere el vehículo le escribe al vendedor por la mensajería de siempre. La Arena presenta; la compraventa sigue donde estaba.
- **No pide cuenta para mirar.** Entrar es gratis y anónimo, igual que el muro. La cuenta se pide cuando hay algo que hacer.

---

## 9. Cómo se sabría si funcionó

Con una sola pregunta, medida sobre la Arena 0 y la Arena 1: **¿cuánta de la gente que entró a mirar volvió a la Arena siguiente sin que nadie la volviera a invitar?**

Todo lo demás —visitas, avisos abiertos, mensajes al vendedor, publicaciones nuevas— es útil, pero es consecuencia. Si nadie vuelve solo, la Arena es una campaña de publicidad con un nombre lindo, y una campaña se puede hacer sin construir nada.

---

## 10. Lo que falta decidir

1. **Qué pasa a las 20:00.** Hay que elegir una de las cuatro consecuencias del punto 1. Es la única decisión que no se puede postergar: todo lo demás se acomoda alrededor.
2. **Cada cuánto.** Semanal es un compromiso de producción que hoy no sé si el equipo puede sostener; mensual da margen y hace la fecha más importante. Con setenta avisos, mensual.
3. **Si la Arena es marketing o es el motor de altas.** Cambia todo lo demás, incluido si conviene cobrar por entrar un vehículo —que además sería la primera respuesta concreta al pendiente más viejo del proyecto, cómo monetiza la plataforma.
4. **Si se muestra algún contador,** y cómo se concilia con la decisión de los favoritos privados.

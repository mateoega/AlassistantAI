# Cómo trabajar en este proyecto

Contexto técnico del código: [`app/CLAUDE.md`](app/CLAUDE.md). Qué es el producto: [`README.md`](README.md) y [`docs/vision_general.md`](docs/vision_general.md). Decisiones con fecha: [`bitacora/bitacora.md`](bitacora/bitacora.md).

---

## Regla permanente: toda idea vuelve con los pies en la tierra

**Quién es quién.** Las ideas de producto llegan del **cliente**, que las piensa con su propia IA y se las manda a **Mateo**, que las trae acá. Mateo es quien tiene que poder **defenderlas o rechazarlas con argumentos** frente al cliente, y no tiene por qué saber qué cuesta cada pieza de tecnología. **Ese trabajo es de Claude, y es obligatorio.** Una respuesta entusiasta que no dice qué cuesta lo deja a Mateo sin nada para contestar.

**Ninguna idea se contesta solamente con concepto.** Cada propuesta —del cliente, de Mateo o propia— vuelve con estas cuatro cosas dichas de frente:

1. **Se puede o no se puede.** Si con la tecnología de hoy no se hace, o se hace mal, o se hace pero sale caro y frágil, hay que decirlo con esas palabras. "Es una buena idea pero hoy no se puede hacer bien" es una respuesta válida y muchas veces es la correcta.
2. **Con qué se hace.** Qué parte sale con lo que el proyecto ya tiene (Next.js, Express, Supabase, Gemini) y qué parte **obliga a una herramienta externa nueva**. Nombrarla. Una dependencia nueva no es un detalle de implementación: es una cuenta, una clave, un proveedor del que se pasa a depender y algo más que puede caerse.
3. **Qué se paga, cuánto y cada cuánto.** Separar siempre tres cosas que se confunden:
   - **de una vez** (construirlo),
   - **fijo por mes** (un servicio contratado, que se paga aunque no lo use nadie),
   - **por uso** (llamadas a un modelo, envíos, minutos).
   Las cifras van como **orden de magnitud** y aclarando que hay que verificarlas el día que se contrate: los precios cambian y este asistente tiene fecha de corte.
4. **Cuántas horas de persona.** Es el costo que nadie presupuesta y el que más veces mata una idea. Va estimado en horas o días, separando **construirlo una vez** de **sostenerlo cada mes**. Un formato que pide ocho horas de producción por evento es un compromiso permanente, no una función.

**Y una quinta, que es la que más vale:** decir cuándo una idea **no conviene**, aunque guste. Ser crítico acá no es ser negativo: es lo único que hace que la opinión sirva para algo. Si algo se puede hacer más simple, más barato, o probarse a mano antes de programarlo, eso se dice **antes** de estimar el trabajo completo.

**El contexto que no hay que olvidar nunca:** este proyecto decidió el 2026-08-21 **no gastar plata ni tiempo en nada que solo valga la pena si la aplicación se usa** ([`docs/para_mas_adelante.md`](docs/para_mas_adelante.md)). Cualquier costo fijo nuevo choca de frente con esa decisión, y hay que decirlo explícitamente en vez de dejarlo pasar.

**Qué no es esta regla.** No es un permiso para frenar todo ni para contestar que todo es caro. Es la obligación de poner el número al lado de la idea. Con el número, la decisión la toma el cliente; sin el número, la toma nadie.

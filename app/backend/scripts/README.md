# Datos de prueba

Acá vive el cargador de **publicaciones de prueba**: vehículos inventados, pero verosímiles, para poder usar la aplicación como si tuviera avisos reales adentro.

No es parte de la aplicación. Es una herramienta que se corre a mano desde la computadora de quien programa.

```
scripts/
  demo-vehicles.ts   el catálogo de vehículos: qué se carga (solo datos)
  seed-demo.ts       el que lo carga en Supabase (habla con la base y con Wikimedia)
  fotos-usadas.json  qué foto se usó en cada aviso, con su autor y su licencia
  verificar-estimacion.ts
                     corre la estimación de precio del Sprint 3 contra la base
                     real y muestra qué le da a cada aviso
  cargar-referencias.ts
                     baja de una fuente externa los precios de referencia de
                     los modelos que hay publicados
  .cache-fotos/      fotos ya descargadas, para no volver a pedírselas a Wikimedia
                     (no se sube al repositorio)
```

## Cómo se usa

Desde `app/backend/`:

```bash
npm run seed:demo
```

Eso carga las publicaciones con sus fotos. Tarda unos minutos la primera vez porque descarga las imágenes; la segunda vez es casi instantáneo, porque quedan en caché.

Otras formas de correrlo:

| Comando | Qué hace |
|---|---|
| `npm run seed:demo -- --sin-fotos` | Carga solo los datos. Rápido, para cuando ya están las fotos. |
| `npm run seed:demo -- --solo corolla-2015,hilux-2020` | Carga o rehace solo esos avisos. |
| `npm run seed:demo -- --borrar` | Borra **solo** las publicaciones de prueba. |
| `npm run seed:demo -- --borrar-todo` | Borra **todas** las publicaciones de la base, sean de prueba o no. |

## Verificar la estimación de precio

```bash
npm run verificar:estimacion
```

Corre la estimación **real** —el mismo código que usa la API— contra todas las publicaciones de la base, y muestra el rango que le da a cada una y cuánto se desvía el precio pedido. Se le puede pasar un texto para filtrar: `npm run verificar:estimacion corolla`.

Sirve para ver de un vistazo si el motor está diciendo algo razonable. Los dos casos plantados a propósito en los datos de prueba son la prueba de fuego: el Corolla 2015 con pocos kilómetros a precio de uno mucho más nuevo tiene que salir marcado **por encima** del rango, y la Hilux con 341.000 km, **por debajo**. Si esos dos no hacen ruido, el motor no sirve.

**Se puede correr todas las veces que haga falta.** El id de cada publicación se calcula a partir de su `key`, así que volver a correrlo actualiza las mismas filas en vez de llenar la base de duplicados.

## Qué carga

Alrededor de 70 publicaciones repartidas en los siete tipos de vehículo, con **varios avisos del mismo modelo en años y kilometrajes distintos** (seis Toyota Corolla, seis Hilux, tres Kangoo…). Esa repetición es a propósito: sin varios avisos comparables del mismo modelo, la estimación de precio del Sprint 3 no tiene contra qué compararse.

También hay, deliberadamente:

- **Dos casos fuera de mercado**: un Corolla 2015 con muy pocos kilómetros pedido al precio de uno mucho más nuevo, y una Hilux 2018 con 341.000 km a precio de remate. Son los que tienen que hacer ruido cuando exista la estimación de precio.
- **Precios en pesos y en dólares**, para que ninguna pantalla pueda asumir una sola moneda.
- **Los cuatro estados**: publicado, vendido, pausado y borrador.
- **Vendedores distintos**. Las publicaciones de `alistarpro@gmail.com` son las propias — aparecen en "Mis publicaciones", con un borrador y una pausada. Las demás son de otros vendedores, que es como se prueba la vista del comprador: contactar, analizar, y no poder editar lo ajeno.

Para sumar o cambiar vehículos se edita `demo-vehicles.ts`, que es solo datos y está comentado campo por campo.

## De dónde salen las fotos

De **Wikimedia Commons**, que publica imágenes con licencia libre. El script busca el modelo, se queda con las primeras fotos y las sube a Supabase Storage.

**No son fotos del vehículo exacto del aviso**: son del mismo modelo, o de uno parecido, y a veces de otro país. Para probar la aplicación alcanza y sobra, y es lo más honesto que se puede conseguir sin inventar imágenes. El autor y la licencia de cada una quedan anotados en `fotos-usadas.json`.

Si un modelo no aparece en Commons, el aviso se carga igual pero **como borrador**, porque la aplicación no deja publicar sin fotos (regla del Sprint 1.6). El script avisa cuáles quedaron así al terminar. Se arregla poniéndole al vehículo un campo `photoQuery` con una búsqueda mejor y volviendo a correr solo ese.

Wikimedia es un servicio gratuito: el script le habla despacio y, si pide esperar, espera. No conviene sacarle esas pausas.

## Por qué usa la clave de servicio

El proyecto tiene una regla (ver [`../../CLAUDE.md`](../../CLAUDE.md)): la clave de servicio de Supabase se usa **solo** para guardar los análisis de IA. Este script es la excepción consciente y única.

El motivo: crea publicaciones a nombre de cuatro vendedores distintos, y las reglas de acceso de la base — con razón — no dejan publicar a nombre de otro. La alternativa sería iniciar sesión como cada uno de los cuatro. Como es una herramienta de desarrollo que no se despliega, no la puede invocar ningún usuario y no queda expuesta en ninguna pantalla, se aceptó el atajo.

## Cargar los precios de referencia

```bash
npm run cargar:referencias
```

Busca en una fuente externa cuánto vale cada modelo que hay publicado en la plataforma y lo guarda en la tabla `market_references`. Es lo que le da a la estimación del Sprint 3 una referencia que no depende de nuestros propios avisos.

| Comando | Qué hace |
|---|---|
| `npm run cargar:referencias` | Carga los modelos que todavía no tienen referencias. |
| `npm run cargar:referencias -- --solo corolla` | Solo los modelos cuyo nombre contenga ese texto. |
| `npm run cargar:referencias -- --rehacer` | Vuelve a bajar todo, incluso lo ya cargado. |

**Tarda, y es a propósito.** La fuente es gratuita y corta a los pocos pedidos por minuto, así que el script le habla despacio y espera lo que le pida. **Se puede cortar y volver a correr**: arranca por los modelos que todavía no tienen referencias.

**Solo carga lo que hace falta**: las combinaciones de marca y modelo que existen hoy en las publicaciones. No tiene sentido bajarse el mercado entero para estimar setenta avisos.

Si la fuente no conoce una marca —no tiene camiones ni motos—, la búsqueda vuelve vacía y ese modelo se saltea solo. No hay ninguna lista de tipos de vehículo en el código.

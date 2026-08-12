# Modelo de datos — AIassistant

Cómo se guardan los vehículos en la base, explicado sin tecnicismos. Vigente desde el Sprint 1 (2026-08-07).

---

## El problema que resuelve

AIassistant cubre todo el rubro automotor. Una moto tiene cilindrada. Un camión tiene capacidad de carga y cantidad de ejes. Un bus tiene cantidad de asientos. Un auto no tiene nada de eso, tiene tipo de carrocería y cantidad de puertas.

La pregunta era: **¿cómo se guarda eso sin que agregar un tipo de vehículo nuevo obligue a rehacer la base y las pantallas?**

La respuesta tiene tres piezas.

---

## Pieza 1 — Lo que todos comparten va en columnas fijas

Todo vehículo motorizado, sea lo que sea, tiene marca, modelo, año, precio, un uso acumulado, una ubicación, un vendedor y fotos. Eso son **columnas normales** en la tabla de publicaciones.

Que sean columnas fijas trae ventajas concretas: la base puede buscar, ordenar y filtrar por ellas rápido, y puede garantizar que el año sea un año y el precio un número positivo. Es la parte que conviene tener rígida, porque es la parte que no cambia nunca.

Un solo detalle donde el rubro automotor obligó a pensar distinto: **el uso no siempre se mide en kilómetros**. Un auto y una moto se miden en km; un camión, un bus o un cuatriciclo se miden en horas de trabajo. Por eso el uso se guarda en dos campos: el número y la unidad. Cuál corresponde lo dice el catálogo de tipos, no el código.

## Pieza 2 — Un catálogo dice qué tipos existen y qué pide cada uno

Dos tablas hacen de "receta":

**`vehicle_types`** — la lista de tipos de vehículo. Cada fila es un tipo: auto, camioneta, utilitario, moto, cuatriciclo, camión, bus. Además del nombre, cada tipo declara si se mide en kilómetros o en horas, y con qué etiqueta se muestra ese campo en pantalla.

**`vehicle_type_fields`** — para cada tipo, qué campos específicos pide. Una fila por campo, con: cómo se llama internamente, cómo se muestra en pantalla, si es un número / un texto / un sí-o-no / una lista de opciones, cuáles son esas opciones, qué unidad tiene, si es obligatorio y en qué orden aparece.

Un ejemplo real de una fila de `vehicle_type_fields`:

| tipo | key | label | data_type | unit | obligatorio |
|---|---|---|---|---|---|
| moto | `engine_displacement_cc` | Cilindrada | número entero | cc | sí |

Esto **no es código**: son datos. Se cargan y se editan desde el panel visual de Supabase, como quien edita una planilla.

## Pieza 3 — Las respuestas van en una ficha flexible

Cada publicación tiene una columna llamada `specs` que guarda únicamente los campos que le corresponden a su tipo:

```
Una moto:    { "engine_displacement_cc": 250, "moto_style": "enduro", "stroke": "4t" }
Un camión:   { "payload_kg": 8000, "axles": 3, "body_type": "furgon" }
Un auto:     { "fuel_type": "nafta", "transmission": "manual", "doors": 5 }
```

Nadie tiene columnas vacías. La moto no arrastra un campo "cantidad de ejes" en blanco.

---

## Y esto es lo importante: el formulario se arma solo

La pantalla de carga **no tiene los campos escritos adentro**. Lo que hace es:

1. Pedir la lista de tipos al catálogo y llenar el selector.
2. Cuando el usuario elige un tipo, pedir los campos de ese tipo.
3. Dibujar esos campos: los números como casilla de número, las listas como desplegable, los sí-o-no como interruptor.

Por eso agregar un tipo de vehículo nuevo **no requiere programar**. Ver la receta al final de este documento.

---

## Las tablas, en una vista

```
   vehicle_types  ────────────────┐         provinces
   (auto, moto, camión…)          │         (24 provincias)
         │                        │              │
         │                        ▼              │
   vehicle_type_fields        listings ◄─────────┘
   (qué pide cada tipo)       (la publicación)
                                   │  │
                                   │  │
              profiles ────────────┘  └──────► listing_photos
              (el vendedor)                    (las fotos, en orden)
```

| Tabla | Qué guarda |
|---|---|
| `vehicle_types` | El catálogo de tipos de vehículo. Ampliable sin tocar código. |
| `vehicle_type_fields` | Qué campos específicos pide cada tipo. Es lo que arma el formulario. |
| `provinces` | Las 24 provincias, para el selector de ubicación. |
| `profiles` | Nombre y teléfono del vendedor, enlazado a su usuario. |
| `listings` | La publicación: campos comunes en columnas + ficha `specs` con lo específico. |
| `listing_photos` | Las fotos de cada publicación y su orden. La primera es la principal. |

Los archivos SQL que crean todo esto están en [`../supabase/migrations/`](../supabase/migrations/), y los datos iniciales en [`../supabase/seed.sql`](../supabase/seed.sql).

---

## Quién ve qué

Las reglas de acceso están en la base misma, no solo en el código de la app. Aunque alguien intentara saltearse el backend, la base no se lo permite:

- **Los catálogos** los lee cualquiera. Nadie los modifica desde la app.
- **Las publicaciones publicadas** las ve cualquier usuario logueado. **Los borradores, solo su dueño.**
- **Crear, editar y borrar una publicación**: solo su dueño, y no puede publicar a nombre de otro.
- **Las fotos** heredan el permiso de su publicación, y cada usuario solo puede subir archivos a su propia carpeta.

---

## Por qué así, y no de otra manera

Se evaluaron tres alternativas antes de decidir:

**Una tabla por tipo de vehículo** (tabla `autos`, tabla `motos`, tabla `camiones`). Descartada: cada tipo nuevo obliga a crear una tabla y a tocar código en el backend y en el frontend. Es exactamente lo que se pidió evitar.

**Guardar todo en la ficha flexible**, incluso marca y precio. Descartada: se pierde la capacidad de filtrar y ordenar rápido, y nada impide que se cargue basura en los campos que más importan.

**Una tabla de atributos sueltos** (cada dato en su propia fila: "publicación X, campo cilindrada, valor 250"). Descartada: cada consulta necesita muchos cruces, escala mal, y en el panel de Supabase los datos quedan ilegibles — justo lo contrario de lo que se buscaba al elegir Supabase.

El enfoque elegido es el híbrido: **rigor donde importa, flexibilidad donde hace falta.**

### El riesgo, y cómo se cubre

Una ficha flexible acepta cualquier cosa por defecto. Ese es el precio de la flexibilidad, y si no se controla, la base se llena de datos sucios en seis meses.

Por eso **el backend valida cada publicación contra el catálogo antes de guardarla**. Lee qué campos declara el tipo de vehículo elegido y verifica uno por uno: que estén los obligatorios, que los números sean números y estén dentro del rango, que las opciones elegidas existan en la lista, y que no venga ningún campo que ese tipo no declaró.

La flexibilidad está en el esquema. La validación sigue siendo estricta.

---

## Receta: agregar un tipo de vehículo nuevo

Ejemplo — sumar "motorhome". Todo desde el panel de Supabase, sin programar y sin redesplegar nada:

**1. Cargar el tipo.** En la tabla `vehicle_types`, una fila nueva:

| slug | name | name_plural | usage_unit | usage_label | sort_order |
|---|---|---|---|---|---|
| `motorhome` | Motorhome | Motorhomes | `km` | Kilometraje | 80 |

**2. Cargar sus campos específicos.** En `vehicle_type_fields`, una fila por campo, apuntando al tipo recién creado:

| key | label | data_type | unit | is_required |
|---|---|---|---|---|
| `sleeps` | Cantidad de plazas para dormir | `integer` | | sí |
| `has_bathroom` | Tiene baño | `boolean` | | no |
| `water_tank_l` | Capacidad del tanque de agua | `number` | L | no |

**3. Recargar la app.** El tipo aparece en el selector y su formulario se dibuja solo.

Los siete tipos que ya vienen cargados están en [`../supabase/seed.sql`](../supabase/seed.sql) — sirven como ejemplo de cómo se escribe cada campo, especialmente los desplegables con sus opciones.

### Detalles a tener en cuenta

- El `slug` va en minúscula, sin espacios ni acentos (`motorhome`, `casa_rodante`). El `name` sí lleva acentos, porque es lo que ve el usuario.
- La `key` de cada campo sigue la misma regla, y **en inglés**, por la convención del proyecto (el `label` va en español).
- Para un campo de tipo lista (`select`), las opciones se cargan en la columna `options` con este formato:
  `[{"value": "chico", "label": "Chico"}, {"value": "grande", "label": "Grande"}]`
- **Nunca borrar un tipo que ya tiene publicaciones** — la base lo impide a propósito. Para sacarlo de circulación, poner `is_active` en `false`: desaparece del selector pero las publicaciones existentes se siguen viendo.
- Cambiar la `key` de un campo que ya está en uso deja huérfanos los datos ya cargados. Si hay que renombrar algo, cambiar el `label` (lo que se ve), no la `key` (cómo se guarda).

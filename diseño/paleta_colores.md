# Paleta de colores — AIassistant

Paleta extraída del logo del cliente. **Actualizada el 2026-08-07**: la interfaz pasó de fondo oscuro a fondo claro. Los colores siguen siendo los mismos del logo, cambió el rol de cada uno. El motivo del cambio está en `bitacora/bitacora.md`.

## Colores

| Nombre | Valor | Uso |
|---|---|---|
| Plateado claro | `#F0F2F5` | Fondo de la aplicación. Es el tono claro del texto plateado del logo. |
| Blanco | `#FFFFFF` | Fondo de tarjetas, formularios y encabezado. |
| Línea | `#DDE1E7` | Bordes y separadores. Variante del plateado. |
| Azul casi negro | `#05070D` | Títulos y texto destacado. Es el fondo del logo, ahora usado como tinta. |
| Gris texto | `#3D4654` | Texto corriente. |
| Gris secundario | `#5A6472` | Texto de apoyo, ayudas, datos secundarios. |
| Azul principal | `#2E9EFF` | Acentos, bordes activos, foco del teclado, resaltados. Es el color de marca. |
| Azul secundario | `#1565C0` | Botones, enlaces y precios — todo lo que lleva texto encima. |
| Azul suave | `#E8F2FD` | Fondos de etiquetas y avisos. Variante clara del azul de marca. |

Los grises y el azul suave no son colores nuevos: son variantes del plateado y del azul del logo, necesarias para separar tarjetas del fondo y para que el texto secundario se distinga del principal.

## Por qué los botones usan el azul secundario y no el principal

`#2E9EFF` es demasiado claro para llevar texto blanco encima: la combinación no llega al contraste mínimo para leerse con comodidad, y sobre fondo blanco tampoco sirve como color de enlace.

Por eso el reparto es:

- **`#1565C0`** para todo lo que lleva texto: botones, enlaces, precios.
- **`#2E9EFF`** para lo que no lo lleva: bordes activos, anillo de foco, acentos, subrayados.

Las dos son colores del logo. No se agregó ningún azul nuevo.

## Regla de consistencia: sin rojo ni naranja

El logo tiene cuatro íconos que representan "confianza" — escudo, lupa, alerta y apretón de manos — y los cuatro están en el mismo azul, incluido el ícono de alerta. Es una decisión de identidad, no un descuido.

**Esta regla se mantiene en toda la interfaz, incluidos los estados de error o advertencia.** No se usa rojo ni naranja para alertar al usuario — ni en mensajes de error, ni en badges de "inconsistencia detectada", ni en ningún otro estado. La forma de comunicar urgencia o advertencia dentro de esta paleta es a través de:

- El azul secundario (`#1565C0`) sobre fondo azul suave (`#E8F2FD`)
- Contraste y jerarquía tipográfica
- Iconografía (el ícono de alerta ya existe en el logo, en azul)

El componente `Notice` de `app/frontend/src/components/ui.tsx` ya resuelve esto. Conviene usarlo en lugar de inventar estilos nuevos para cada aviso.

## El nombre de la marca

El logotipo se escribe **AIassistant** (de *inteligencia artificial*), pero en la mayoría de las tipografías sin serifa la **I** mayúscula es idéntica a una **l** minúscula, y el nombre se lee "Alassistant". Ya pasó: la carpeta del repositorio quedó con ese error.

En la interfaz se resuelve escribiendo el "AI" en el azul secundario y el resto en tinta, para que se lea como dos partes. Si en algún momento se elige una tipografía de marca, conviene priorizar una que distinga la I mayúscula de la l minúscula.

## Tipografía

Todavía no está definida formalmente. La interfaz usa la tipografía del sistema (`system-ui`), que es rápida y se ve nativa en cada dispositivo. Cuando se elija una tipografía propia, evaluar sans-serif geométricas — teniendo en cuenta lo del párrafo anterior.

## Tono visual buscado

Confianza y transparencia — no un marketplace agresivo ni un diseño cargado de ofertas y urgencia artificial. El fondo claro con acentos azules deja que las fotos de los vehículos sean lo que más pesa en la pantalla, que es lo que un comprador realmente mira, y mantiene la sensación seria y ordenada coherente con el rol de "asistente" que analiza y da su opinión objetiva.

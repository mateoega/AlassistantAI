# Paleta de colores — AIassistant

Paleta extraída del logo del cliente. **Actualizada el 2026-09-01**: la interfaz pasó de fondo plateado a fondo blanco, y lo que separa una pieza de otra dejó de ser un cambio de gris para pasar a ser una sombra. Los colores siguen siendo los mismos del logo, cambió el rol de cada uno. El motivo del cambio está en `bitacora/bitacora.md`.

*(La actualización anterior, del 2026-08-07, fue el paso de fondo oscuro a fondo claro.)*

## Colores

| Nombre | Valor | Uso |
|---|---|---|
| Blanco | `#FFFFFF` | Fondo de la aplicación **y** de las tarjetas, formularios y encabezado. Los dos son el mismo blanco: no hay contraste entre fondo y pieza. |
| Blanco azulado | `#F1F7FE` | Rellenos: el hueco de una foto que no cargó, la burbuja del que contesta, el resaltado al pasar por encima de una fila. **Reemplazó al plateado `#F0F2F5`.** |
| Línea | `#E4EBF4` | Bordes y separadores. Un pelo azulado, apenas visible. |
| Azul casi negro | `#05070D` | Títulos y texto destacado. Es el fondo del logo, usado como tinta. |
| Gris texto | `#3A4353` | Texto corriente. |
| Gris secundario | `#4C5768` | Texto de apoyo, ayudas, datos secundarios. |
| Azul principal | `#2E9EFF` | Acentos, bordes activos, foco del teclado, resaltados. Es el color de marca. |
| Azul secundario | `#1565C0` | Botones, enlaces y precios — todo lo que lleva texto encima. **Y el color de todas las sombras.** |
| Azul suave | `#E8F2FD` | Fondos de etiquetas y avisos. Variante clara del azul de marca. |

El plateado `#F0F2F5` **salió de la interfaz**. Sigue en el logo, que es de donde salió, pero como fondo de pantalla hacía que la aplicación se leyera como una planilla: tarjetas blancas flotando sobre un gris. Fue lo primero que el cliente pidió sacar.

## Las sombras son parte de la paleta

Con la página blanca y las piezas blancas, si no hay sombra no hay separación. Las tres sombras están definidas en `globals.css` y son la escala completa: no se escriben sombras sueltas en las pantallas, se elige una de las tres.

| Nombre | Para qué |
|---|---|
| `shadow-soft` | Lo que apenas se despega: campos, avisos, barras fijas, botones. |
| `shadow-card` | Lo que es una pieza: la foto de un vehículo en el muro, la caja de búsqueda, cada panel de la ficha. |
| `shadow-float` | Lo que está por encima de la página: el botón del asistente y su panel. Es la única con brillo azul fuerte. |

**Ninguna es negra.** Cada una lleva una capa de contacto casi imperceptible y una capa difusa **teñida con el azul secundario** (`#1565C0`). Una sombra gris sobre blanco ensucia; una sombra azul sobre blanco se lee como profundidad y mantiene la identidad sin pintar nada de azul.

## El vidrio esmerilado

Las tres cosas que quedan fijas mientras la página se mueve por debajo —la barra de arriba, la barra de abajo en celular y el corazón de guardar que se apoya sobre cada foto— usan la clase `.glass`: blanco al 72% con desenfoque y saturación aumentada.

La saturación no es decorativa: el desenfoque solo lava los colores de abajo y la barra queda de un gris sucio. Subirla devuelve el color de la foto que está pasando por detrás, y es la mitad del efecto.

**La clase tiene una regla de reserva** (`@supports not`) para los navegadores donde el desenfoque no corre: ahí el fondo pasa a ser casi opaco. Sin eso, el texto del listado se leería a través de la barra. Por eso es una clase de `globals.css` y no clases sueltas de Tailwind escritas en cada componente: la regla de reserva no se puede escribir en un atributo `class`, y olvidarla no se ve hasta que alguien abre la aplicación en ese navegador.

## Radios

Un solo redondeo en toda la aplicación:

- **12px (`rounded-xl`)** — botones, campos, miniaturas, etiquetas cuadradas.
- **16px (`rounded-2xl`)** — piezas grandes: tarjetas, paneles, la foto de un vehículo, avisos.
- **Redondo** — corazones, globitos de mensajes sin leer, botón del asistente.

Antes convivían 8px y 12px en la misma pantalla, que es de las cosas que hacen que una interfaz se sienta armada de a pedazos.

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

Confianza y transparencia — no un marketplace agresivo ni un diseño cargado de ofertas y urgencia artificial. El fondo blanco con acentos azules deja que las fotos de los vehículos sean lo que más pesa en la pantalla, que es lo que un comprador realmente mira, y mantiene la sensación seria y ordenada coherente con el rol de "asistente" que analiza y da su opinión objetiva.

Desde el 2026-09-01 se le suma una capa de oficio: sombras azuladas, vidrio esmerilado en lo que queda fijo y un hundido de dos por ciento al tocar cada botón. Nada de eso agrega información; sirve para que la aplicación no se sienta un prototipo, que fue el punto 12 de la devolución del cliente.

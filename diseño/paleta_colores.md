# Paleta de colores — AIassistant

Paleta extraída del logo del cliente. Vigente desde Sprint 0 (2026-08-06).

## Colores

| Nombre | Valor | Uso |
|---|---|---|
| Fondo | `#05070D` | Fondo principal de la aplicación. Tono casi negro, con un dejo de azul. |
| Azul principal | `#2E9EFF` | Acentos, íconos activos, botones primarios, efectos de resplandor (glow). Es el color de marca. |
| Azul secundario | `#1565C0` | Estados de hover, sombras, variantes oscuras del azul principal. |
| Plateado / cromado | degradado `#F0F2F5` → `#8B93A1` | Texto de marca (logotipo, títulos destacados). Se usa como degradado, no como color plano. |
| Blanco | `#FFFFFF` | Texto sobre fondo oscuro, íconos secundarios. |

## Regla de consistencia: sin rojo ni naranja

El logo tiene cuatro íconos que representan "confianza" — escudo, lupa, alerta y apretón de manos — y los cuatro están en el mismo azul (`#2E9EFF`), incluido el ícono de alerta. Es una decisión de identidad, no un descuido.

**Esta regla se mantiene en toda la interfaz futura, incluidos los estados de error o advertencia.** No se usa rojo ni naranja para alertar al usuario — ni en mensajes de error, ni en badges de "inconsistencia detectada", ni en ningún otro estado. La forma de comunicar urgencia o advertencia dentro de esta paleta es a través de:
- Intensidad del azul (`#1565C0` para algo más serio que `#2E9EFF`)
- Contraste y jerarquía tipográfica
- Iconografía (el ícono de alerta ya existe en el logo, en azul)

Cuando se diseñen las pantallas de Sprint 1 en adelante, cualquier componente de alerta, error o advertencia debe respetar esta regla antes de mostrarse.

## Tipografía

Todavía no está definida formalmente — pendiente para cuando se empiece a diseñar la interfaz (Sprint 1). El texto de marca en el logo usa un tratamiento plateado/cromado que sugiere una tipografía de trazo limpio y moderno; se recomienda evaluar candidatas sans-serif geométricas al momento de definirla.

## Tono visual buscado

Confianza y transparencia — no un marketplace agresivo ni un diseño cargado de ofertas y urgencia artificial. El fondo oscuro con acentos azules apunta a una sensación tecnológica y seria, coherente con el rol de "asistente" que analiza y da su opinión objetiva, no de vendedor que empuja una transacción.

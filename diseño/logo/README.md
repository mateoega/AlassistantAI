# Logo — AIassistant

Esta carpeta contiene los archivos del logo. El usuario agrega el archivo original a mano; esta guía define cómo se organizan las variantes a medida que se necesiten.

## Qué va acá

- El logo en formato vectorial (SVG) — versión principal, para usar en la web y en cualquier tamaño sin perder calidad.
- Variantes en PNG, para usos donde no se acepta SVG (redes sociales, documentos).
- Variante para fondo claro y variante para fondo oscuro, si el logo lo necesita (el logo actual está pensado para fondo oscuro, coherente con la paleta en `../paleta_colores.md`).
- Un favicon derivado del logo, cuando se genere.

## Convención de nombres sugerida

```
logo-principal.svg
logo-principal.png
logo-claro.svg        (si existe una variante para fondo claro)
favicon.svg
```

## Qué NO va acá

- Capturas de pantalla o mockups de pantallas — esos van en `docs/` si hace falta documentarlos.
- Assets de UI que no sean el logo en sí (íconos sueltos, ilustraciones) — esos se organizan dentro de `app/frontend/` cuando exista ese código.

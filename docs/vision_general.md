# Visión general — AIassistant

## El problema

Comprar o vender un vehículo usado depende hoy de la confianza entre dos desconocidos. El comprador no puede verificar fácilmente si las fotos corresponden al estado real del auto, si el kilometraje declarado es coherente con el desgaste visible, o si el precio pedido está dentro de lo razonable para ese modelo, año y estado. El vendedor, del otro lado, no siempre sabe a qué precio publicar ni qué fotos generan más confianza.

## Qué hace AIassistant

Una plataforma que usa inteligencia artificial para reducir esa incertidumbre en ambos sentidos:

1. **Analiza las fotos del vehículo.** Detecta el estado observable (carrocería, interior, neumáticos, tablero) y señala inconsistencias: fotos que no parecen ser todas del mismo auto, daños visibles que no fueron declarados, o un desgaste que no coincide con el kilometraje informado.
2. **Estima un precio de mercado.** Combina los datos que declara el vendedor, lo que las fotos confirman o contradicen, y referencias de mercado, para proponer un rango de precio con su justificación en lenguaje simple.

## Para quién es

- **Compradores**, que quieren una segunda opinión objetiva antes de contactar al vendedor o cerrar una compra.
- **Vendedores**, que quieren saber a qué precio publicar y qué fotos suman confianza.

## Qué NO es (por ahora)

- No es una tasación oficial ni un peritaje legal. Es una estimación orientativa.
- No reemplaza una inspección mecánica presencial.
- No verifica documentación legal del vehículo (dominio, deudas, multas) — eso queda fuera del alcance del prototipo.

## Cómo se mide el éxito del prototipo

El prototipo cumple su objetivo si, dado un conjunto de fotos y datos básicos de un vehículo, es capaz de:
- Producir una descripción del estado del auto que coincida con lo que una persona vería a simple vista.
- Señalar al menos las inconsistencias más obvias (fotos mezcladas, daño no declarado).
- Devolver un rango de precio que un conocedor del mercado local consideraría razonable.

No se busca perfección en esta etapa — se busca validar que el enfoque (fotos + IA + contexto de mercado) es útil antes de invertir en pulir la experiencia.

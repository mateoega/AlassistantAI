# Visión general — AIassistant

## Alcance: todo el rubro automotor

AIassistant cubre **cualquier vehículo motorizado terrestre**: autos, camionetas, utilitarios, motos, cuatriciclos, camiones, buses, y los tipos que se sumen más adelante.

No es una plataforma de autos con algunos agregados: el tipo de vehículo es una pieza central del diseño. Cada tipo tiene sus propios datos relevantes — una moto tiene cilindrada, un camión tiene capacidad de carga y ejes, un bus tiene cantidad de asientos — y la plataforma está construida para que sumar un tipo nuevo no obligue a rehacer nada.

## El problema

Comprar o vender un vehículo depende hoy de la confianza entre dos desconocidos. El comprador no puede verificar fácilmente si las fotos corresponden al estado real del vehículo, si el uso declarado es coherente con el desgaste visible, o si el precio pedido está dentro de lo razonable para ese modelo, año y estado. El vendedor, del otro lado, no siempre sabe a qué precio publicar ni qué fotos generan más confianza.

Esa incertidumbre es la misma en todo el rubro, pero **las señales cambian según el tipo de vehículo**. En un auto se mira la carrocería y el desgaste de los neumáticos; en una moto pesan la cadena, la horquilla y el estado del motor a la vista; en un camión o un cuatriciclo el uso ni siquiera se mide en kilómetros, sino en horas de trabajo. Un análisis que solo sabe leer autos no sirve para el resto del rubro.

## Qué hace AIassistant

Una plataforma que usa inteligencia artificial para reducir esa incertidumbre en ambos sentidos:

1. **Analiza las fotos del vehículo.** Detecta el estado observable — según lo que corresponda al tipo: carrocería, interior, neumáticos, tablero, motor, caja de carga — y señala inconsistencias: fotos que no parecen ser todas del mismo vehículo, daños visibles que no fueron declarados, o un desgaste que no coincide con el kilometraje u horas de uso informadas.
2. **Estima un precio de mercado.** Combina los datos que declara el vendedor, lo que las fotos confirman o contradicen, y referencias de mercado del tipo de vehículo correspondiente, para proponer un rango de precio con su justificación en lenguaje simple.

## Para quién es

- **Compradores**, que quieren una segunda opinión objetiva antes de contactar al vendedor o cerrar una compra.
- **Vendedores**, que quieren saber a qué precio publicar y qué fotos suman confianza.
- **Comercios del rubro** que manejan más de un tipo de vehículo y hoy necesitan una herramienta distinta para cada uno.

## Qué NO es (por ahora)

- No es una tasación oficial ni un peritaje legal. Es una estimación orientativa.
- No reemplaza una inspección mecánica presencial.
- No verifica documentación legal del vehículo (dominio, deudas, multas) — eso queda fuera del alcance del prototipo.
- **No cubre vehículos náuticos, aéreos ni maquinaria agrícola autopropulsada.** El límite del alcance es el vehículo motorizado terrestre. El modelo de datos permitiría extenderlo, pero es una decisión de producto que hoy no está tomada.

## Cómo se mide el éxito del prototipo

El prototipo cumple su objetivo si, dado un conjunto de fotos y datos básicos de un vehículo **de cualquiera de los tipos soportados**, es capaz de:
- Producir una descripción del estado que coincida con lo que una persona vería a simple vista.
- Señalar al menos las inconsistencias más obvias (fotos mezcladas, daño no declarado).
- Devolver un rango de precio que un conocedor del mercado local consideraría razonable.
- Hacerlo con la misma calidad en una moto y en un camión, no solo en un auto.

No se busca perfección en esta etapa — se busca validar que el enfoque (fotos + IA + contexto de mercado) es útil antes de invertir en pulir la experiencia.

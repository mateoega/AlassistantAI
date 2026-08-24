# Supabase — esquema de la base

Acá vive la definición de la base de datos: qué tablas existen, qué guarda cada una y quién puede ver qué.

La explicación en lenguaje simple de por qué el modelo está armado así está en [`../docs/modelo_datos.md`](../docs/modelo_datos.md). **Si venís a agregar un tipo de vehículo, leé ese documento — no hace falta tocar nada de acá.**

## Qué hay en esta carpeta

```
migrations/
  20260807000001_catalogs.sql   tipos de vehículo, campos por tipo, provincias
  20260807000002_profiles.sql   perfil del vendedor + creación automática al registrarse
  20260807000003_listings.sql   publicaciones y fotos, con sus reglas de acceso
  20260807000004_storage.sql    el lugar donde se guardan las fotos y quién puede escribir
  20260807000005_kilometers_and_cities.sql
                                solo kilómetros, campos opcionales, tabla de ciudades
  20260808000001_brands.sql     marcas y a qué tipo de vehículo corresponde cada una
  20260808000002_listing_states.sql
                                estados vendido y pausado
  20260811000001_listing_analyses.sql
                                el análisis de IA de cada publicación
  20260821000001_depreciacion_por_tipo.sql
                                cuánto pierde valor por año y por km cada tipo
                                de vehículo (lo usa la estimación de precio)
  20260821000002_referencias_de_mercado.sql
                                precios de referencia de fuentes externas
  20260823000001_favoritos.sql  los vehículos que guardó cada usuario, privados
  20260824000001_mensajeria.sql conversaciones y mensajes entre comprador y
                                vendedor, con el leído de cada uno
seed.sql                        los 7 tipos de vehículo iniciales y las 24 provincias
seed_cities.sql                 las localidades principales de cada provincia
seed_brands.sql                 las marcas habituales del mercado argentino
```

Los archivos de `migrations/` se corren **en orden** (el número al principio del nombre es la fecha, por eso se ordenan solos). Cada uno depende del anterior.

## Cómo aplicarlo la primera vez

La forma más simple, sin instalar nada:

1. Entrar al panel de Supabase → **SQL Editor** → **New query**.
2. Copiar y pegar el contenido de cada archivo de `migrations/`, **en orden**, y ejecutar uno por uno.
3. Al final, hacer lo mismo con los archivos de datos, en este orden: `seed.sql`, `seed_cities.sql` y `seed_brands.sql`.
4. Verificar en **Table Editor** que aparecieron las tablas y que `vehicle_types` tiene 7 filas.

Si el equipo instala la CLI de Supabase más adelante, `supabase db push` hace lo mismo automáticamente.

## Cómo llenarla con publicaciones de prueba

Los archivos de esta carpeta cargan los **catálogos** (tipos, provincias, ciudades, marcas), no publicaciones: la base queda armada pero vacía, y así no se puede probar casi nada.

Para llenarla con vehículos de prueba hay un cargador aparte, en [`../app/backend/scripts/`](../app/backend/scripts/README.md). Desde `app/backend`:

```bash
npm run seed:demo
```

Está separado de los `seed*.sql` porque hace dos cosas que el SQL no puede: subir fotos a Storage y crear publicaciones a nombre de varios vendedores distintos.

## Cómo aplicar una migración nueva

Si la base ya está armada y aparece un archivo nuevo en `migrations/`, va solo ese: SQL Editor → New query → pegar el contenido → ejecutar. Los anteriores ya están aplicados y no se vuelven a correr.

## Reglas

- **Los archivos de `migrations/` no se editan una vez aplicados.** Si hay que cambiar algo, se agrega un archivo nuevo con fecha posterior. Editar uno ya corrido hace que la base de cada persona quede distinta.
- Los archivos `seed*.sql` sí se pueden correr más de una vez: están escritos para no duplicar datos.
- Las tablas tienen **RLS activado**. Eso significa que la base misma decide quién ve qué, sin depender de que el código lo haga bien. El panel de Supabase y el backend (con la clave de servicio) no pasan por esas reglas — el navegador sí.

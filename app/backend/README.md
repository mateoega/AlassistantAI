# Backend — AIassistant

La API que recibe pedidos del frontend, valida datos, coordina con Supabase y con el módulo de IA. Construido con Node.js + Express (TypeScript).

## Qué va acá

- Rutas de la API (por ejemplo: crear vehículo, subir fotos, pedir análisis, pedir estimación de precio)
- Validación de los datos que llegan del frontend
- Acceso a Supabase (base de datos, storage de fotos, autenticación) — usando la clave de servicio, que solo vive acá
- Orquestación: llamar al módulo `../ia/` cuando haga falta analizar fotos o estimar un precio, y guardar el resultado

## Estructura interna prevista (a definir en Sprint 1)

Cuando exista el primer código, se espera algo como:

```
backend/
  src/
    routes/       ← definición de endpoints de la API
    services/     ← lógica que conecta con Supabase y con ia/
    middleware/   ← validación, manejo de errores
  package.json
```

## Qué NO va acá

- Componentes de interfaz o cualquier cosa que el usuario vea directamente — eso es `../frontend/`
- Los prompts y la llamada específica a Gemini — eso vive en `../ia/`, el backend solo la invoca

## Estado actual

Vacío. Se completa a partir del Sprint 1.

# Roadmap — AIassistant

Los sprints están ordenados por dependencia, no por fecha. Cada uno se apoya en el anterior. No hay fechas fijas todavía — se van a definir cuando el equipo tenga una primera estimación de esfuerzo real.

---

## Sprint 0 — Base del proyecto (actual)

Arquitectura decidida, estructura de carpetas creada, tecnologías elegidas, documentación inicial. Sin código todavía.

## Sprint 1 — Alta de vehículo

El vendedor puede cargar los datos básicos de un auto (marca, modelo, año, kilometraje, precio pedido) y subir sus fotos. Se guardan en Supabase. Todavía sin análisis de IA — es la base de datos y el flujo de carga funcionando de punta a punta.

## Sprint 2 — Análisis de fotos con IA

El módulo de IA recibe las fotos cargadas en el Sprint 1 y las analiza con Gemini: estado observable del vehículo y detección de inconsistencias. El resultado se muestra al usuario.

## Sprint 3 — Estimación de precio

Se suma la estimación de precio de mercado, combinando los datos declarados, el análisis de fotos del Sprint 2 y referencias de mercado (proveedor de datos todavía a definir — ver `sprint0.md`).

## Sprint 4 — Publicación y búsqueda

Los vehículos cargados quedan visibles para otros usuarios. Se agrega búsqueda y filtros básicos, y la vista de comprador (ver el análisis de un auto publicado por otra persona).

---

## Más adelante (sin definir todavía)

- Sistema de mensajería entre comprador y vendedor
- Verificación de documentación legal del vehículo
- Historial de mantenimiento
- Versión mobile

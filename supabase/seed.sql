-- ============================================================================
-- Datos iniciales — tipos de vehículo, sus campos específicos y provincias
--
-- Este archivo es el EJEMPLO VIVO de cómo se amplía el catálogo. Si mañana hay
-- que sumar "motorhome", se hace igual que acá: una fila en vehicle_types y
-- sus campos en vehicle_type_fields. Ninguna línea de código cambia.
--
-- Se puede correr más de una vez sin duplicar nada (usa ON CONFLICT).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Tipos de vehículo
--
-- Todos se miden en kilómetros. Hasta la migración 005 cada tipo declaraba su
-- propia unidad (los pesados iban en horas de trabajo); se unificó en km.
-- ----------------------------------------------------------------------------
insert into public.vehicle_types (slug, name, name_plural, sort_order) values
  ('auto',        'Auto',        'Autos',        10),
  ('camioneta',   'Camioneta',   'Camionetas',   20),
  ('utilitario',  'Utilitario',  'Utilitarios',  30),
  ('moto',        'Moto',        'Motos',        40),
  ('cuatriciclo', 'Cuatriciclo', 'Cuatriciclos', 50),
  ('camion',      'Camión',      'Camiones',     60),
  ('bus',         'Bus',         'Buses',        70)
on conflict (slug) do nothing;


-- ----------------------------------------------------------------------------
-- Campos específicos de cada tipo
--
-- La primera columna es el slug del tipo al que pertenece el campo.
-- `key` es cómo se guarda el dato dentro de la ficha `specs` de la publicación.
-- `label` es cómo lo ve el usuario en pantalla.
-- ----------------------------------------------------------------------------
insert into public.vehicle_type_fields
  (vehicle_type_id, key, label, data_type, options, unit, is_required, min_value, max_value, help_text, sort_order)
select
  vt.id, f.key, f.label, f.data_type, f.options, f.unit, f.is_required, f.min_value, f.max_value, f.help_text, f.sort_order
from public.vehicle_types vt
join (values

  -- ===== AUTO ===============================================================
  ('auto'::text, 'fuel_type'::text, 'Combustible'::text, 'select'::text,
   '[{"value":"nafta","label":"Nafta"},{"value":"diesel","label":"Diésel"},{"value":"gnc","label":"GNC"},{"value":"hibrido","label":"Híbrido"},{"value":"electrico","label":"Eléctrico"}]'::jsonb,
   null::text, true::boolean, null::numeric, null::numeric, null::text, 10::integer),

  ('auto', 'transmission', 'Transmisión', 'select',
   '[{"value":"manual","label":"Manual"},{"value":"automatica","label":"Automática"}]'::jsonb,
   null, true, null, null, null, 20),

  ('auto', 'body_style', 'Carrocería', 'select',
   '[{"value":"sedan","label":"Sedán"},{"value":"hatchback","label":"Hatchback"},{"value":"familiar","label":"Familiar"},{"value":"coupe","label":"Coupé"},{"value":"suv","label":"SUV"},{"value":"convertible","label":"Convertible"}]'::jsonb,
   null, false, null, null, null, 30),

  ('auto', 'doors', 'Cantidad de puertas', 'integer',
   null, null, false, 2, 6, null, 40),

  ('auto', 'engine_displacement_l', 'Cilindrada', 'number',
   null, 'L', false, 0.5, 8, 'En litros. Por ejemplo: 1.6', 50),

  -- ===== CAMIONETA ==========================================================
  ('camioneta', 'fuel_type', 'Combustible', 'select',
   '[{"value":"nafta","label":"Nafta"},{"value":"diesel","label":"Diésel"},{"value":"gnc","label":"GNC"},{"value":"hibrido","label":"Híbrido"},{"value":"electrico","label":"Eléctrico"}]'::jsonb,
   null, true, null, null, null, 10),

  ('camioneta', 'transmission', 'Transmisión', 'select',
   '[{"value":"manual","label":"Manual"},{"value":"automatica","label":"Automática"}]'::jsonb,
   null, true, null, null, null, 20),

  ('camioneta', 'traction', 'Tracción', 'select',
   '[{"value":"4x2","label":"4x2"},{"value":"4x4","label":"4x4"}]'::jsonb,
   null, true, null, null, null, 30),

  ('camioneta', 'cab_type', 'Tipo de cabina', 'select',
   '[{"value":"simple","label":"Cabina simple"},{"value":"doble","label":"Cabina doble"}]'::jsonb,
   null, false, null, null, null, 40),

  ('camioneta', 'payload_kg', 'Capacidad de carga', 'number',
   null, 'kg', false, 0, 5000, null, 50),

  -- ===== UTILITARIO =========================================================
  ('utilitario', 'fuel_type', 'Combustible', 'select',
   '[{"value":"nafta","label":"Nafta"},{"value":"diesel","label":"Diésel"},{"value":"gnc","label":"GNC"},{"value":"electrico","label":"Eléctrico"}]'::jsonb,
   null, true, null, null, null, 10),

  ('utilitario', 'transmission', 'Transmisión', 'select',
   '[{"value":"manual","label":"Manual"},{"value":"automatica","label":"Automática"}]'::jsonb,
   null, false, null, null, null, 20),

  ('utilitario', 'cargo_volume_m3', 'Volumen de carga', 'number',
   null, 'm³', false, 0, 30, null, 30),

  ('utilitario', 'payload_kg', 'Capacidad de carga', 'number',
   null, 'kg', false, 0, 5000, null, 40),

  ('utilitario', 'sliding_doors', 'Puertas laterales corredizas', 'integer',
   null, null, false, 0, 2, null, 50),

  -- ===== MOTO ===============================================================
  ('moto', 'engine_displacement_cc', 'Cilindrada', 'integer',
   null, 'cc', true, 30, 2500, 'En centímetros cúbicos. Por ejemplo: 250', 10),

  ('moto', 'moto_style', 'Tipo de moto', 'select',
   '[{"value":"calle","label":"Calle"},{"value":"scooter","label":"Scooter"},{"value":"enduro","label":"Enduro"},{"value":"cross","label":"Cross"},{"value":"deportiva","label":"Deportiva"},{"value":"touring","label":"Touring"},{"value":"custom","label":"Custom"}]'::jsonb,
   null, true, null, null, null, 20),

  ('moto', 'stroke', 'Tiempos', 'select',
   '[{"value":"2t","label":"2 tiempos"},{"value":"4t","label":"4 tiempos"}]'::jsonb,
   null, false, null, null, null, 30),

  ('moto', 'start_type', 'Arranque', 'select',
   '[{"value":"electrico","label":"Eléctrico"},{"value":"patada","label":"Patada"},{"value":"ambos","label":"Eléctrico y patada"}]'::jsonb,
   null, false, null, null, null, 40),

  ('moto', 'cooling', 'Refrigeración', 'select',
   '[{"value":"aire","label":"Aire"},{"value":"liquida","label":"Líquida"}]'::jsonb,
   null, false, null, null, null, 50),

  -- ===== CUATRICICLO ========================================================
  ('cuatriciclo', 'engine_displacement_cc', 'Cilindrada', 'integer',
   null, 'cc', true, 50, 1500, 'En centímetros cúbicos', 10),

  ('cuatriciclo', 'traction', 'Tracción', 'select',
   '[{"value":"2x4","label":"2x4"},{"value":"4x4","label":"4x4"}]'::jsonb,
   null, true, null, null, null, 20),

  ('cuatriciclo', 'use_type', 'Uso principal', 'select',
   '[{"value":"recreativo","label":"Recreativo"},{"value":"utilitario","label":"Utilitario / trabajo"},{"value":"deportivo","label":"Deportivo"}]'::jsonb,
   null, false, null, null, null, 30),

  ('cuatriciclo', 'start_type', 'Arranque', 'select',
   '[{"value":"electrico","label":"Eléctrico"},{"value":"patada","label":"Patada"},{"value":"ambos","label":"Eléctrico y patada"}]'::jsonb,
   null, false, null, null, null, 40),

  -- ===== CAMIÓN =============================================================
  ('camion', 'payload_kg', 'Capacidad de carga', 'number',
   null, 'kg', true, 0, 60000, null, 10),

  ('camion', 'axles', 'Cantidad de ejes', 'integer',
   null, null, true, 2, 6, null, 20),

  ('camion', 'body_type', 'Tipo de carrocería', 'select',
   '[{"value":"chasis","label":"Chasis sin carrozar"},{"value":"furgon","label":"Furgón"},{"value":"volcador","label":"Volcador"},{"value":"tanque","label":"Tanque"},{"value":"plataforma","label":"Plataforma"},{"value":"frigorifico","label":"Frigorífico"},{"value":"tractor","label":"Tractor (para semi)"}]'::jsonb,
   null, true, null, null, null, 30),

  ('camion', 'traction', 'Configuración de tracción', 'select',
   '[{"value":"4x2","label":"4x2"},{"value":"6x2","label":"6x2"},{"value":"6x4","label":"6x4"},{"value":"8x4","label":"8x4"}]'::jsonb,
   null, false, null, null, null, 40),

  ('camion', 'has_hydraulic_system', 'Tiene sistema hidráulico', 'boolean',
   null, null, false, null, null, null, 50),

  -- ===== BUS ================================================================
  ('bus', 'seats', 'Cantidad de asientos', 'integer',
   null, null, true, 5, 90, null, 10),

  ('bus', 'bus_type', 'Tipo de bus', 'select',
   '[{"value":"urbano","label":"Urbano"},{"value":"larga_distancia","label":"Larga distancia"},{"value":"minibus","label":"Minibús"},{"value":"escolar","label":"Escolar"}]'::jsonb,
   null, true, null, null, null, 20),

  ('bus', 'axles', 'Cantidad de ejes', 'integer',
   null, null, false, 2, 4, null, 30),

  ('bus', 'has_air_conditioning', 'Tiene aire acondicionado', 'boolean',
   null, null, false, null, null, null, 40),

  ('bus', 'has_bathroom', 'Tiene baño', 'boolean',
   null, null, false, null, null, null, 50)

) as f (type_slug, key, label, data_type, options, unit, is_required, min_value, max_value, help_text, sort_order)
  on f.type_slug = vt.slug
on conflict (vehicle_type_id, key) do nothing;


-- ----------------------------------------------------------------------------
-- Provincias de Argentina
-- ----------------------------------------------------------------------------
insert into public.provinces (slug, name, sort_order) values
  ('caba',                'Ciudad Autónoma de Buenos Aires', 10),
  ('buenos_aires',        'Buenos Aires',                    20),
  ('catamarca',           'Catamarca',                       30),
  ('chaco',               'Chaco',                           40),
  ('chubut',              'Chubut',                          50),
  ('cordoba',             'Córdoba',                         60),
  ('corrientes',          'Corrientes',                      70),
  ('entre_rios',          'Entre Ríos',                      80),
  ('formosa',             'Formosa',                         90),
  ('jujuy',               'Jujuy',                          100),
  ('la_pampa',            'La Pampa',                       110),
  ('la_rioja',            'La Rioja',                       120),
  ('mendoza',             'Mendoza',                        130),
  ('misiones',            'Misiones',                       140),
  ('neuquen',             'Neuquén',                        150),
  ('rio_negro',           'Río Negro',                      160),
  ('salta',               'Salta',                          170),
  ('san_juan',            'San Juan',                       180),
  ('san_luis',            'San Luis',                       190),
  ('santa_cruz',          'Santa Cruz',                     200),
  ('santa_fe',            'Santa Fe',                       210),
  ('santiago_del_estero', 'Santiago del Estero',            220),
  ('tierra_del_fuego',    'Tierra del Fuego',               230),
  ('tucuman',             'Tucumán',                        240)
on conflict (slug) do nothing;


-- ----------------------------------------------------------------------------
-- Ningún campo específico se exige
--
-- Arriba, algunos campos figuran con `is_required = true`. Eso quedó a
-- propósito, como registro de cuáles se consideraron los más importantes de
-- cada tipo. Pero hoy ninguno se exige: trababa a quien no tenía el dato a
-- mano al momento de publicar (decisión del 2026-08-07).
--
-- Si en algún momento se quiere volver a exigir uno puntual, se cambia su
-- `is_required` a true desde el panel de Supabase. No hace falta tocar código.
-- ----------------------------------------------------------------------------
update public.vehicle_type_fields set is_required = false where is_required;

-- ============================================================================
-- Datos iniciales — marcas del rubro automotor y a qué tipo corresponden
--
-- ESTA LISTA ES PARCIAL A PROPÓSITO. Tiene las marcas que se ven habitualmente
-- en el mercado argentino, no todas las que existen en el mundo. Sirve para
-- sugerir mientras se escribe y evitar que la misma marca quede cargada como
-- "Volkswagen", "VW" y "volkswagen".
--
-- Quien vende una marca que no está acá puede publicar igual: la marca se
-- guarda como texto libre. El catálogo ayuda, no obliga.
--
-- CÓMO AGREGAR UNA MARCA
--   1. Panel de Supabase > Table Editor > brands > Insert row
--      (slug en minúscula y sin espacios; name como se ve en pantalla)
--   2. Después, en brand_vehicle_types, una fila por cada tipo de vehículo
--      en el que esa marca tiene que aparecer.
--
-- Se puede correr más de una vez sin duplicar nada.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Las marcas
-- ----------------------------------------------------------------------------
insert into public.brands (slug, name) values
  -- Automotrices generalistas
  ('volkswagen',     'Volkswagen'),
  ('chevrolet',      'Chevrolet'),
  ('ford',           'Ford'),
  ('fiat',           'Fiat'),
  ('renault',        'Renault'),
  ('peugeot',        'Peugeot'),
  ('citroen',        'Citroën'),
  ('toyota',         'Toyota'),
  ('nissan',         'Nissan'),
  ('honda',          'Honda'),
  ('hyundai',        'Hyundai'),
  ('kia',            'Kia'),
  ('suzuki',         'Suzuki'),
  ('mitsubishi',     'Mitsubishi'),
  ('subaru',         'Subaru'),
  ('chery',          'Chery'),
  ('jeep',           'Jeep'),
  ('ram',            'RAM'),
  ('dodge',          'Dodge'),
  ('chrysler',       'Chrysler'),
  ('seat',           'Seat'),
  ('daihatsu',       'Daihatsu'),
  ('ssangyong',      'SsangYong'),
  ('isuzu',          'Isuzu'),
  ('great_wall',     'Great Wall'),
  ('haval',          'Haval'),
  ('jac',            'JAC'),
  ('baic',           'BAIC'),
  ('byd',            'BYD'),
  ('geely',          'Geely'),
  ('lifan',          'Lifan'),
  ('foton',          'Foton'),
  ('maxus',          'Maxus'),
  ('jinbei',         'Jinbei'),

  -- Premium
  ('mercedes_benz',  'Mercedes-Benz'),
  ('bmw',            'BMW'),
  ('audi',           'Audi'),
  ('volvo',          'Volvo'),
  ('alfa_romeo',     'Alfa Romeo'),
  ('mini',           'Mini'),
  ('land_rover',     'Land Rover'),
  ('jaguar',         'Jaguar'),
  ('porsche',        'Porsche'),
  ('lexus',          'Lexus'),
  ('ds',             'DS Automobiles'),

  -- Motos
  ('yamaha',         'Yamaha'),
  ('kawasaki',       'Kawasaki'),
  ('bajaj',          'Bajaj'),
  ('zanella',        'Zanella'),
  ('motomel',        'Motomel'),
  ('corven',         'Corven'),
  ('gilera',         'Gilera'),
  ('guerrero',       'Guerrero'),
  ('keller',         'Keller'),
  ('mondial',        'Mondial'),
  ('brava',          'Brava'),
  ('siam',           'Siam'),
  ('appia',          'Appia'),
  ('beta',           'Beta'),
  ('ktm',            'KTM'),
  ('royal_enfield',  'Royal Enfield'),
  ('harley_davidson','Harley-Davidson'),
  ('ducati',         'Ducati'),
  ('triumph',        'Triumph'),
  ('benelli',        'Benelli'),
  ('tvs',            'TVS'),
  ('hero',           'Hero'),
  ('voge',           'Voge'),
  ('cfmoto',         'CFMoto'),
  ('kymco',          'Kymco'),
  ('piaggio',        'Piaggio'),
  ('vespa',          'Vespa'),
  ('aprilia',        'Aprilia'),
  ('husqvarna',      'Husqvarna'),
  ('jawa',           'Jawa'),
  ('yumbo',          'Yumbo'),
  ('motorino',       'Motorino'),

  -- Cuatriciclos
  ('can_am',         'Can-Am'),
  ('polaris',        'Polaris'),
  ('gamma',          'Gamma'),
  ('tgb',            'TGB'),
  ('arctic_cat',     'Arctic Cat'),

  -- Camiones y buses
  ('scania',         'Scania'),
  ('iveco',          'Iveco'),
  ('man',            'MAN'),
  ('daf',            'DAF'),
  ('renault_trucks', 'Renault Trucks'),
  ('hino',           'Hino'),
  ('agrale',         'Agrale'),
  ('kenworth',       'Kenworth'),
  ('international',  'International'),
  ('freightliner',   'Freightliner'),
  ('sinotruk',       'Sinotruk'),
  ('shacman',        'Shacman'),
  ('dongfeng',       'Dongfeng'),
  ('marcopolo',      'Marcopolo'),
  ('metalpar',       'Metalpar'),
  ('yutong',         'Yutong'),
  ('higer',          'Higer'),
  ('king_long',      'King Long')
on conflict (slug) do nothing;


-- ----------------------------------------------------------------------------
-- Qué marca aparece en qué tipo de vehículo
--
-- Una marca puede estar en varios tipos: Honda hace autos, motos y
-- cuatriciclos; Mercedes-Benz hace autos, utilitarios, camiones y buses.
-- ----------------------------------------------------------------------------
insert into public.brand_vehicle_types (brand_id, vehicle_type_id)
select b.id, vt.id
from (values

  ('auto'::text, array[
    'volkswagen','chevrolet','ford','fiat','renault','peugeot','citroen','toyota',
    'nissan','honda','hyundai','kia','suzuki','mitsubishi','subaru','chery','jeep',
    'dodge','chrysler','seat','daihatsu','ssangyong','great_wall','haval','jac',
    'baic','byd','geely','lifan','mercedes_benz','bmw','audi','volvo','alfa_romeo',
    'mini','land_rover','jaguar','porsche','lexus','ds'
  ]),

  ('camioneta', array[
    'toyota','ford','volkswagen','chevrolet','nissan','renault','fiat','peugeot',
    'ram','mitsubishi','isuzu','jac','great_wall','foton','jeep','dodge','chery',
    'kia','hyundai','mercedes_benz','land_rover','ssangyong','haval','baic'
  ]),

  ('utilitario', array[
    'renault','peugeot','citroen','fiat','volkswagen','mercedes_benz','ford',
    'iveco','chevrolet','toyota','hyundai','kia','jinbei','foton','jac','nissan',
    'maxus','great_wall'
  ]),

  ('moto', array[
    'honda','yamaha','suzuki','kawasaki','bajaj','zanella','motomel','corven',
    'gilera','guerrero','keller','mondial','brava','siam','appia','beta','ktm',
    'royal_enfield','harley_davidson','bmw','ducati','triumph','benelli','tvs',
    'hero','voge','cfmoto','kymco','piaggio','vespa','aprilia','husqvarna','jawa',
    'yumbo','motorino'
  ]),

  ('cuatriciclo', array[
    'honda','yamaha','suzuki','kawasaki','can_am','polaris','cfmoto','gamma',
    'motomel','zanella','guerrero','kymco','tgb','arctic_cat','beta','ktm',
    'corven','mondial'
  ]),

  ('camion', array[
    'mercedes_benz','scania','volvo','iveco','ford','volkswagen','man','daf',
    'renault_trucks','hino','isuzu','agrale','foton','chevrolet','kenworth',
    'international','freightliner','sinotruk','jac','shacman','dongfeng'
  ]),

  ('bus', array[
    'mercedes_benz','scania','volvo','iveco','agrale','volkswagen','man','hino',
    'isuzu','marcopolo','metalpar','yutong','higer','king_long','foton'
  ])

) as m (type_slug, brand_slugs)
join public.vehicle_types vt on vt.slug = m.type_slug
cross join lateral unnest(m.brand_slugs) as s(brand_slug)
join public.brands b on b.slug = s.brand_slug
on conflict do nothing;

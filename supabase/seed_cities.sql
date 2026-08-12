-- ============================================================================
-- Datos iniciales — localidades sugeridas por provincia
--
-- ESTA LISTA ES PARCIAL A PROPÓSITO. Tiene las localidades principales de cada
-- provincia, no las miles que existen. Sirve para sugerir mientras el usuario
-- escribe y evitar que la misma ciudad quede cargada de cinco formas distintas.
--
-- Quien vive en una localidad que no está acá puede publicar igual: la ciudad
-- se guarda como texto libre. El catálogo ayuda, no obliga.
--
-- Para agregar una localidad: panel de Supabase > Table Editor > cities >
-- Insert row, eligiendo la provincia de la lista. No hace falta tocar código.
--
-- Se puede correr más de una vez sin duplicar nada.
-- ============================================================================

insert into public.cities (province_id, name)
select p.id, c.name
from public.provinces p
join (values

  ('caba'::text, 'Ciudad Autónoma de Buenos Aires'::text),

  -- Buenos Aires
  ('buenos_aires', 'La Plata'),
  ('buenos_aires', 'Mar del Plata'),
  ('buenos_aires', 'Bahía Blanca'),
  ('buenos_aires', 'Tandil'),
  ('buenos_aires', 'Olavarría'),
  ('buenos_aires', 'Necochea'),
  ('buenos_aires', 'Pergamino'),
  ('buenos_aires', 'Junín'),
  ('buenos_aires', 'San Nicolás de los Arroyos'),
  ('buenos_aires', 'Zárate'),
  ('buenos_aires', 'Campana'),
  ('buenos_aires', 'Luján'),
  ('buenos_aires', 'Mercedes'),
  ('buenos_aires', 'Chivilcoy'),
  ('buenos_aires', 'Azul'),
  ('buenos_aires', 'Balcarce'),
  ('buenos_aires', 'Tres Arroyos'),
  ('buenos_aires', 'Chascomús'),
  ('buenos_aires', 'Dolores'),
  ('buenos_aires', 'Pinamar'),
  ('buenos_aires', 'Villa Gesell'),
  ('buenos_aires', 'Quilmes'),
  ('buenos_aires', 'Lomas de Zamora'),
  ('buenos_aires', 'Lanús'),
  ('buenos_aires', 'Avellaneda'),
  ('buenos_aires', 'Morón'),
  ('buenos_aires', 'San Isidro'),
  ('buenos_aires', 'Tigre'),
  ('buenos_aires', 'Pilar'),
  ('buenos_aires', 'Escobar'),
  ('buenos_aires', 'Moreno'),
  ('buenos_aires', 'Merlo'),
  ('buenos_aires', 'San Justo'),
  ('buenos_aires', 'Berazategui'),
  ('buenos_aires', 'Florencio Varela'),
  ('buenos_aires', 'Adrogué'),
  ('buenos_aires', 'Vicente López'),
  ('buenos_aires', 'San Martín'),
  ('buenos_aires', 'Caseros'),
  ('buenos_aires', 'Hurlingham'),
  ('buenos_aires', 'Ituzaingó'),
  ('buenos_aires', 'Ezeiza'),
  ('buenos_aires', 'San Miguel'),
  ('buenos_aires', 'José C. Paz'),
  ('buenos_aires', 'Cañuelas'),

  -- Catamarca
  ('catamarca', 'San Fernando del Valle de Catamarca'),
  ('catamarca', 'Andalgalá'),
  ('catamarca', 'Belén'),
  ('catamarca', 'Tinogasta'),
  ('catamarca', 'Santa María'),
  ('catamarca', 'Recreo'),
  ('catamarca', 'Fiambalá'),

  -- Chaco
  ('chaco', 'Resistencia'),
  ('chaco', 'Barranqueras'),
  ('chaco', 'Presidencia Roque Sáenz Peña'),
  ('chaco', 'Villa Ángela'),
  ('chaco', 'Charata'),
  ('chaco', 'General José de San Martín'),
  ('chaco', 'Las Breñas'),
  ('chaco', 'Machagai'),
  ('chaco', 'Quitilipi'),
  ('chaco', 'Fontana'),

  -- Chubut
  ('chubut', 'Comodoro Rivadavia'),
  ('chubut', 'Trelew'),
  ('chubut', 'Puerto Madryn'),
  ('chubut', 'Rawson'),
  ('chubut', 'Esquel'),
  ('chubut', 'Sarmiento'),
  ('chubut', 'Gaiman'),
  ('chubut', 'Rada Tilly'),

  -- Córdoba
  ('cordoba', 'Córdoba'),
  ('cordoba', 'Río Cuarto'),
  ('cordoba', 'Villa María'),
  ('cordoba', 'San Francisco'),
  ('cordoba', 'Villa Carlos Paz'),
  ('cordoba', 'Río Tercero'),
  ('cordoba', 'Alta Gracia'),
  ('cordoba', 'Bell Ville'),
  ('cordoba', 'Marcos Juárez'),
  ('cordoba', 'Jesús María'),
  ('cordoba', 'Cosquín'),
  ('cordoba', 'La Falda'),
  ('cordoba', 'Villa Dolores'),
  ('cordoba', 'Río Segundo'),
  ('cordoba', 'Arroyito'),
  ('cordoba', 'Cruz del Eje'),
  ('cordoba', 'Deán Funes'),
  ('cordoba', 'Laboulaye'),
  ('cordoba', 'Oliva'),

  -- Corrientes
  ('corrientes', 'Corrientes'),
  ('corrientes', 'Goya'),
  ('corrientes', 'Mercedes'),
  ('corrientes', 'Curuzú Cuatiá'),
  ('corrientes', 'Paso de los Libres'),
  ('corrientes', 'Santo Tomé'),
  ('corrientes', 'Bella Vista'),
  ('corrientes', 'Esquina'),
  ('corrientes', 'Monte Caseros'),
  ('corrientes', 'Ituzaingó'),

  -- Entre Ríos
  ('entre_rios', 'Paraná'),
  ('entre_rios', 'Concordia'),
  ('entre_rios', 'Gualeguaychú'),
  ('entre_rios', 'Concepción del Uruguay'),
  ('entre_rios', 'Gualeguay'),
  ('entre_rios', 'Villaguay'),
  ('entre_rios', 'Victoria'),
  ('entre_rios', 'La Paz'),
  ('entre_rios', 'Chajarí'),
  ('entre_rios', 'Colón'),
  ('entre_rios', 'Federación'),
  ('entre_rios', 'Nogoyá'),
  ('entre_rios', 'San Salvador'),

  -- Formosa
  ('formosa', 'Formosa'),
  ('formosa', 'Clorinda'),
  ('formosa', 'Pirané'),
  ('formosa', 'El Colorado'),
  ('formosa', 'Las Lomitas'),
  ('formosa', 'Ingeniero Juárez'),

  -- Jujuy
  ('jujuy', 'San Salvador de Jujuy'),
  ('jujuy', 'San Pedro de Jujuy'),
  ('jujuy', 'Libertador General San Martín'),
  ('jujuy', 'Palpalá'),
  ('jujuy', 'Perico'),
  ('jujuy', 'La Quiaca'),
  ('jujuy', 'Humahuaca'),
  ('jujuy', 'Tilcara'),
  ('jujuy', 'El Carmen'),

  -- La Pampa
  ('la_pampa', 'Santa Rosa'),
  ('la_pampa', 'General Pico'),
  ('la_pampa', 'Toay'),
  ('la_pampa', 'General Acha'),
  ('la_pampa', 'Realicó'),
  ('la_pampa', 'Eduardo Castex'),
  ('la_pampa', 'Victorica'),

  -- La Rioja
  ('la_rioja', 'La Rioja'),
  ('la_rioja', 'Chilecito'),
  ('la_rioja', 'Aimogasta'),
  ('la_rioja', 'Chamical'),
  ('la_rioja', 'Chepes'),
  ('la_rioja', 'Villa Unión'),

  -- Mendoza
  ('mendoza', 'Mendoza'),
  ('mendoza', 'San Rafael'),
  ('mendoza', 'Godoy Cruz'),
  ('mendoza', 'Guaymallén'),
  ('mendoza', 'Las Heras'),
  ('mendoza', 'Maipú'),
  ('mendoza', 'Luján de Cuyo'),
  ('mendoza', 'San Martín'),
  ('mendoza', 'Rivadavia'),
  ('mendoza', 'Tunuyán'),
  ('mendoza', 'General Alvear'),
  ('mendoza', 'Malargüe'),
  ('mendoza', 'Tupungato'),
  ('mendoza', 'San Carlos'),
  ('mendoza', 'Lavalle'),

  -- Misiones
  ('misiones', 'Posadas'),
  ('misiones', 'Oberá'),
  ('misiones', 'Eldorado'),
  ('misiones', 'Puerto Iguazú'),
  ('misiones', 'Apóstoles'),
  ('misiones', 'Leandro N. Alem'),
  ('misiones', 'Jardín América'),
  ('misiones', 'Montecarlo'),
  ('misiones', 'San Vicente'),
  ('misiones', 'Puerto Rico'),

  -- Neuquén
  ('neuquen', 'Neuquén'),
  ('neuquen', 'Cutral Có'),
  ('neuquen', 'Plottier'),
  ('neuquen', 'Zapala'),
  ('neuquen', 'San Martín de los Andes'),
  ('neuquen', 'Villa La Angostura'),
  ('neuquen', 'Centenario'),
  ('neuquen', 'Junín de los Andes'),
  ('neuquen', 'Chos Malal'),
  ('neuquen', 'Rincón de los Sauces'),
  ('neuquen', 'Plaza Huincul'),

  -- Río Negro
  ('rio_negro', 'Viedma'),
  ('rio_negro', 'San Carlos de Bariloche'),
  ('rio_negro', 'General Roca'),
  ('rio_negro', 'Cipolletti'),
  ('rio_negro', 'Villa Regina'),
  ('rio_negro', 'Cinco Saltos'),
  ('rio_negro', 'Allen'),
  ('rio_negro', 'Choele Choel'),
  ('rio_negro', 'El Bolsón'),
  ('rio_negro', 'Catriel'),

  -- Salta
  ('salta', 'Salta'),
  ('salta', 'San Ramón de la Nueva Orán'),
  ('salta', 'Tartagal'),
  ('salta', 'General Güemes'),
  ('salta', 'San José de Metán'),
  ('salta', 'Rosario de la Frontera'),
  ('salta', 'Cafayate'),
  ('salta', 'Cerrillos'),
  ('salta', 'Embarcación'),
  ('salta', 'Joaquín V. González'),

  -- San Juan
  ('san_juan', 'San Juan'),
  ('san_juan', 'Chimbas'),
  ('san_juan', 'Rivadavia'),
  ('san_juan', 'Santa Lucía'),
  ('san_juan', 'Pocito'),
  ('san_juan', 'Caucete'),
  ('san_juan', 'San José de Jáchal'),
  ('san_juan', 'Albardón'),
  ('san_juan', 'Media Agua'),

  -- San Luis
  ('san_luis', 'San Luis'),
  ('san_luis', 'Villa Mercedes'),
  ('san_luis', 'Merlo'),
  ('san_luis', 'La Punta'),
  ('san_luis', 'Justo Daract'),
  ('san_luis', 'Concarán'),
  ('san_luis', 'Tilisarao'),

  -- Santa Cruz
  ('santa_cruz', 'Río Gallegos'),
  ('santa_cruz', 'Caleta Olivia'),
  ('santa_cruz', 'Pico Truncado'),
  ('santa_cruz', 'Las Heras'),
  ('santa_cruz', 'Puerto Deseado'),
  ('santa_cruz', 'El Calafate'),
  ('santa_cruz', 'Río Turbio'),
  ('santa_cruz', 'Puerto San Julián'),

  -- Santa Fe
  ('santa_fe', 'Rosario'),
  ('santa_fe', 'Santa Fe'),
  ('santa_fe', 'Rafaela'),
  ('santa_fe', 'Venado Tuerto'),
  ('santa_fe', 'Reconquista'),
  ('santa_fe', 'Villa Gobernador Gálvez'),
  ('santa_fe', 'Santo Tomé'),
  ('santa_fe', 'Esperanza'),
  ('santa_fe', 'San Lorenzo'),
  ('santa_fe', 'Cañada de Gómez'),
  ('santa_fe', 'Casilda'),
  ('santa_fe', 'Sunchales'),
  ('santa_fe', 'Firmat'),
  ('santa_fe', 'Gálvez'),
  ('santa_fe', 'Las Rosas'),
  ('santa_fe', 'Ceres'),
  ('santa_fe', 'Vera'),
  ('santa_fe', 'San Justo'),
  ('santa_fe', 'Funes'),
  ('santa_fe', 'Roldán'),
  ('santa_fe', 'Pérez'),
  ('santa_fe', 'Granadero Baigorria'),

  -- Santiago del Estero
  ('santiago_del_estero', 'Santiago del Estero'),
  ('santiago_del_estero', 'La Banda'),
  ('santiago_del_estero', 'Termas de Río Hondo'),
  ('santiago_del_estero', 'Añatuya'),
  ('santiago_del_estero', 'Frías'),
  ('santiago_del_estero', 'Fernández'),
  ('santiago_del_estero', 'Quimilí'),
  ('santiago_del_estero', 'Monte Quemado'),

  -- Tierra del Fuego
  ('tierra_del_fuego', 'Ushuaia'),
  ('tierra_del_fuego', 'Río Grande'),
  ('tierra_del_fuego', 'Tolhuin'),

  -- Tucumán
  ('tucuman', 'San Miguel de Tucumán'),
  ('tucuman', 'Yerba Buena'),
  ('tucuman', 'Tafí Viejo'),
  ('tucuman', 'Concepción'),
  ('tucuman', 'Banda del Río Salí'),
  ('tucuman', 'Aguilares'),
  ('tucuman', 'Monteros'),
  ('tucuman', 'Famaillá'),
  ('tucuman', 'Lules'),
  ('tucuman', 'Alderetes'),
  ('tucuman', 'Tafí del Valle')

) as c (province_slug, name)
  on c.province_slug = p.slug
on conflict (province_id, name) do nothing;

/**
 * Catálogo de vehículos de prueba.
 *
 * Es SOLO datos: no habla con la base ni con internet. Quien lo carga es
 * `seed-demo.ts`. Para sumar un vehículo, agregá un objeto acá y volvé a
 * correr el script — cada uno se identifica por su `key`, así que no se
 * duplica.
 *
 * Campos de cada vehículo:
 *   key         identificador estable. NO cambiarlo: de él sale el id de la
 *               publicación, y cambiarlo crea una publicación nueva en vez de
 *               actualizar la que ya estaba.
 *   type        slug de vehicle_types (auto, camioneta, utilitario, moto,
 *               cuatriciclo, camion, bus)
 *   brand       slug de la tabla brands; el nombre visible sale de ahí
 *   model       texto libre, como lo escribiría un vendedor
 *   year, km
 *   price       número, en la moneda que diga `currency`
 *   currency    'USD' o 'ARS'. El mercado argentino publica la mayoría de los
 *               usados en dólares; se dejan algunos en pesos a propósito, para
 *               que nada de la aplicación pueda asumir una sola moneda.
 *   province    slug de provinces; la ciudad la elige el script del catálogo
 *   city        opcional, para forzar una localidad puntual
 *   specs       ficha específica del tipo. Las claves y los valores tienen que
 *               existir en vehicle_type_fields — el script lo verifica antes
 *               de escribir nada.
 *   status      'published' (por defecto), 'sold', 'paused' o 'draft'
 *   seller      índice del vendedor (0..3). Ver SELLERS en seed-demo.ts.
 *   photoQuery  qué buscar en Wikimedia Commons. Si se omite, se busca
 *               "marca modelo".
 *   description texto del aviso
 */

export interface DemoVehicle {
  key: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  km: number;
  price: number;
  currency: 'ARS' | 'USD';
  province: string;
  city?: string;
  specs: Record<string, string | number | boolean>;
  status?: 'draft' | 'published' | 'paused' | 'sold';
  seller: number;
  photoQuery?: string;
  description: string;
}

/** Descripciones de base, para que no suenen todas iguales. */
const D = {
  cuidado:
    'Siempre en garaje, service al día en concesionario oficial. Papeles al día, listo para transferir.',
  unico:
    'Único dueño desde 0 km. Nunca chocado. Se acepta permuta por menor valor.',
  trabajo:
    'Usado para trabajo, mecánica impecable. Detalles menores de chapa y pintura propios del uso.',
  familia:
    'Auto de familia, poco uso. Cubiertas nuevas y service recién hecho.',
  vendo:
    'Vendo por no usar. Anda perfecto, no necesita nada. Recibo menor valor.',
};

export const DEMO_VEHICLES: DemoVehicle[] = [
  // ===== AUTOS ==============================================================
  // Toyota Corolla: seis avisos del mismo modelo en años distintos. Es el
  // grupo que va a servir de referencia principal para estimar precio.
  {
    key: 'corolla-2015', type: 'auto', brand: 'toyota', model: 'Corolla XEI 1.8',
    year: 2015, km: 158000, price: 14500, currency: 'USD', province: 'buenos_aires', seller: 0,
    specs: { fuel_type: 'nafta', transmission: 'manual', body_style: 'sedan', doors: 4, engine_displacement_l: 1.8 },
    description: D.trabajo,
  },
  {
    key: 'corolla-2017', type: 'auto', brand: 'toyota', model: 'Corolla XEI 1.8 CVT',
    year: 2017, km: 121000, price: 17200, currency: 'USD', province: 'cordoba', seller: 1,
    specs: { fuel_type: 'nafta', transmission: 'automatica', body_style: 'sedan', doors: 4, engine_displacement_l: 1.8 },
    description: D.cuidado,
  },
  {
    key: 'corolla-2019', type: 'auto', brand: 'toyota', model: 'Corolla SEG 2.0 CVT',
    year: 2019, km: 94000, price: 21500, currency: 'USD', province: 'santa_fe', seller: 2, status: 'sold',
    specs: { fuel_type: 'nafta', transmission: 'automatica', body_style: 'sedan', doors: 4, engine_displacement_l: 2.0 },
    description: D.unico,
  },
  {
    key: 'corolla-2021', type: 'auto', brand: 'toyota', model: 'Corolla XLI 2.0 CVT',
    year: 2021, km: 61000, price: 26000, currency: 'USD', province: 'caba', seller: 0,
    specs: { fuel_type: 'nafta', transmission: 'automatica', body_style: 'sedan', doors: 4, engine_displacement_l: 2.0 },
    description: D.familia,
  },
  {
    key: 'corolla-2023', type: 'auto', brand: 'toyota', model: 'Corolla SEG Hybrid',
    year: 2023, km: 32000, price: 32500, currency: 'USD', province: 'mendoza', seller: 1,
    specs: { fuel_type: 'hibrido', transmission: 'automatica', body_style: 'sedan', doors: 4, engine_displacement_l: 1.8 },
    description: D.cuidado,
  },
  // Caso deliberadamente fuera de mercado: un 2015 con kilometraje muy bajo y
  // precio de uno mucho más nuevo. Es el que tiene que hacer ruido en el
  // Sprint 3.
  {
    key: 'corolla-2015-raro', type: 'auto', brand: 'toyota', model: 'Corolla XEI 1.8',
    year: 2015, km: 38000, price: 27000, currency: 'USD', province: 'buenos_aires', seller: 2,
    specs: { fuel_type: 'nafta', transmission: 'automatica', body_style: 'sedan', doors: 4, engine_displacement_l: 1.8 },
    description:
      'Impecable, kilometraje real y certificado. Guardado en cochera los últimos años, casi sin uso. No permuto, escucho ofertas serias.',
  },

  {
    key: 'gol-2013', type: 'auto', brand: 'volkswagen', model: 'Gol Trend 1.6',
    year: 2013, km: 187000, price: 7500, currency: 'USD', province: 'entre_rios', seller: 1,
    specs: { fuel_type: 'nafta', transmission: 'manual', body_style: 'hatchback', doors: 5, engine_displacement_l: 1.6 },
    description: D.trabajo,
  },
  {
    key: 'gol-2016', type: 'auto', brand: 'volkswagen', model: 'Gol Trend 1.6 Comfortline',
    year: 2016, km: 142000, price: 9800, currency: 'USD', province: 'buenos_aires', seller: 2, status: 'sold',
    specs: { fuel_type: 'nafta', transmission: 'manual', body_style: 'hatchback', doors: 5, engine_displacement_l: 1.6 },
    description: D.vendo,
  },
  {
    key: 'gol-2018', type: 'auto', brand: 'volkswagen', model: 'Gol Trend 1.6 Trendline',
    year: 2018, km: 98000, price: 16100000, currency: 'ARS', province: 'santa_fe', seller: 0,
    specs: { fuel_type: 'gnc', transmission: 'manual', body_style: 'hatchback', doors: 5, engine_displacement_l: 1.6 },
    description:
      'Con equipo de GNC de quinta generación y oblea al día. Ideal para andar todos los días sin gastar en nafta.',
  },

  {
    key: 'cronos-2019', type: 'auto', brand: 'fiat', model: 'Cronos Drive 1.3',
    year: 2019, km: 88000, price: 12500, currency: 'USD', province: 'cordoba', seller: 2,
    specs: { fuel_type: 'nafta', transmission: 'manual', body_style: 'sedan', doors: 4, engine_displacement_l: 1.3 },
    description: D.familia,
  },
  {
    key: 'cronos-2021', type: 'auto', brand: 'fiat', model: 'Cronos Drive 1.3 GSE',
    year: 2021, km: 57000, price: 21700000, currency: 'ARS', province: 'tucuman', seller: 0,
    specs: { fuel_type: 'nafta', transmission: 'manual', body_style: 'sedan', doors: 4, engine_displacement_l: 1.3 },
    description: D.cuidado,
  },
  {
    key: 'cronos-2023', type: 'auto', brand: 'fiat', model: 'Cronos Precision 1.3 CVT',
    year: 2023, km: 29000, price: 19000, currency: 'USD', province: 'caba', seller: 1,
    specs: { fuel_type: 'nafta', transmission: 'automatica', body_style: 'sedan', doors: 4, engine_displacement_l: 1.3 },
    description: D.unico,
  },

  {
    key: 'cruze-2017', type: 'auto', brand: 'chevrolet', model: 'Cruze LT 1.4 Turbo',
    year: 2017, km: 116000, price: 15000, currency: 'USD', province: 'santa_fe', seller: 1,
    specs: { fuel_type: 'nafta', transmission: 'automatica', body_style: 'sedan', doors: 4, engine_displacement_l: 1.4 },
    description: D.cuidado,
  },
  {
    key: 'cruze-2020', type: 'auto', brand: 'chevrolet', model: 'Cruze Premier 1.4 Turbo',
    year: 2020, km: 72000, price: 21000, currency: 'USD', province: 'buenos_aires', seller: 2,
    specs: { fuel_type: 'nafta', transmission: 'automatica', body_style: 'sedan', doors: 4, engine_displacement_l: 1.4 },
    description: D.familia,
  },

  {
    key: 'sandero-2014', type: 'auto', brand: 'renault', model: 'Sandero Authentique 1.6',
    year: 2014, km: 173000, price: 8200, currency: 'USD', province: 'chaco', seller: 0,
    specs: { fuel_type: 'nafta', transmission: 'manual', body_style: 'hatchback', doors: 5, engine_displacement_l: 1.6 },
    description: D.trabajo,
  },
  {
    key: 'sandero-2018', type: 'auto', brand: 'renault', model: 'Sandero Privilege 1.6',
    year: 2018, km: 104000, price: 11000, currency: 'USD', province: 'neuquen', seller: 1,
    specs: { fuel_type: 'nafta', transmission: 'manual', body_style: 'hatchback', doors: 5, engine_displacement_l: 1.6 },
    description: D.vendo,
  },

  {
    key: 'peugeot208-2019', type: 'auto', brand: 'peugeot', model: '208 Feline 1.6',
    year: 2019, km: 83000, price: 12800, currency: 'USD', province: 'caba', seller: 2,
    specs: { fuel_type: 'nafta', transmission: 'manual', body_style: 'hatchback', doors: 5, engine_displacement_l: 1.6 },
    description: D.familia,
  },
  {
    key: 'peugeot208-2022', type: 'auto', brand: 'peugeot', model: '208 Allure 1.6 Tiptronic',
    year: 2022, km: 41000, price: 17500, currency: 'USD', province: 'cordoba', seller: 0,
    specs: { fuel_type: 'nafta', transmission: 'automatica', body_style: 'hatchback', doors: 5, engine_displacement_l: 1.6 },
    description: D.cuidado,
  },

  {
    key: 'focus-2016', type: 'auto', brand: 'ford', model: 'Focus III SE Plus 2.0',
    year: 2016, km: 134000, price: 12000, currency: 'USD', province: 'buenos_aires', seller: 1,
    specs: { fuel_type: 'nafta', transmission: 'automatica', body_style: 'hatchback', doors: 5, engine_displacement_l: 2.0 },
    description: D.vendo,
  },
  {
    key: 'civic-2018', type: 'auto', brand: 'honda', model: 'Civic EXL 2.0 CVT',
    year: 2018, km: 99000, price: 21000, currency: 'USD', province: 'santa_fe', seller: 2,
    specs: { fuel_type: 'nafta', transmission: 'automatica', body_style: 'sedan', doors: 4, engine_displacement_l: 2.0 },
    description: D.unico,
  },
  {
    key: 'golf-2015', type: 'auto', brand: 'volkswagen', model: 'Golf Highline 1.4 TSI',
    year: 2015, km: 145000, price: 14000, currency: 'USD', province: 'mendoza', seller: 0,
    specs: { fuel_type: 'nafta', transmission: 'automatica', body_style: 'hatchback', doors: 5, engine_displacement_l: 1.4 },
    description: D.cuidado,
  },
  {
    key: 'etios-2017', type: 'auto', brand: 'toyota', model: 'Etios XLS 1.5',
    year: 2017, km: 127000, price: 10500, currency: 'USD', province: 'salta', seller: 3, status: 'draft',
    specs: { fuel_type: 'nafta', transmission: 'manual', body_style: 'hatchback', doors: 5, engine_displacement_l: 1.5 },
    description: D.trabajo,
  },
  {
    key: 'etios-2020', type: 'auto', brand: 'toyota', model: 'Etios XLS 1.5 AT',
    year: 2020, km: 76000, price: 19600000, currency: 'ARS', province: 'buenos_aires', seller: 2,
    specs: { fuel_type: 'nafta', transmission: 'automatica', body_style: 'hatchback', doors: 5, engine_displacement_l: 1.5 },
    description: D.familia,
  },
  {
    key: 'onix-2021', type: 'auto', brand: 'chevrolet', model: 'Onix Plus LT 1.0 Turbo',
    year: 2021, km: 54000, price: 15500, currency: 'USD', province: 'rio_negro', seller: 0,
    specs: { fuel_type: 'nafta', transmission: 'manual', body_style: 'sedan', doors: 4, engine_displacement_l: 1.0 },
    description: D.cuidado,
  },
  {
    key: 'kwid-2022', type: 'auto', brand: 'renault', model: 'Kwid Iconic 1.0',
    year: 2022, km: 38000, price: 11500, currency: 'USD', province: 'misiones', seller: 1,
    specs: { fuel_type: 'nafta', transmission: 'manual', body_style: 'hatchback', doors: 5, engine_displacement_l: 1.0 },
    description: D.familia,
  },

  // ===== CAMIONETAS =========================================================
  {
    key: 'hilux-2016', type: 'camioneta', brand: 'toyota', model: 'Hilux SR 2.4 TDI',
    year: 2016, km: 198000, price: 24000, currency: 'USD', province: 'la_pampa', seller: 0,
    specs: { fuel_type: 'diesel', transmission: 'manual', traction: '4x4', cab_type: 'doble', payload_kg: 1000 },
    description: D.trabajo,
  },
  {
    key: 'hilux-2018', type: 'camioneta', brand: 'toyota', model: 'Hilux SRV 2.8 TDI 4x4',
    year: 2018, km: 152000, price: 29500, currency: 'USD', province: 'cordoba', seller: 1,
    specs: { fuel_type: 'diesel', transmission: 'automatica', traction: '4x4', cab_type: 'doble', payload_kg: 1000 },
    description: D.cuidado,
  },
  // Segundo caso deliberado: kilometraje altísimo y precio bajo para el año.
  {
    key: 'hilux-2018-castigada', type: 'camioneta', brand: 'toyota', model: 'Hilux SR 2.4 TDI 4x2',
    year: 2018, km: 341000, price: 18500, currency: 'USD', province: 'santiago_del_estero', seller: 2,
    specs: { fuel_type: 'diesel', transmission: 'manual', traction: '4x2', cab_type: 'doble', payload_kg: 1000 },
    description:
      'Camioneta de campo, trabajó toda su vida. Motor y caja sin abrir. Tiene el kilometraje que tiene y no lo escondo: mirá las fotos y vení a verla.',
  },
  {
    key: 'hilux-2020', type: 'camioneta', brand: 'toyota', model: 'Hilux SRX 2.8 TDI 4x4 AT',
    year: 2020, km: 118000, price: 35000, currency: 'USD', province: 'buenos_aires', seller: 3,
    specs: { fuel_type: 'diesel', transmission: 'automatica', traction: '4x4', cab_type: 'doble', payload_kg: 1000 },
    description: D.unico,
  },
  {
    key: 'hilux-2022', type: 'camioneta', brand: 'toyota', model: 'Hilux SRV 2.8 TDI 4x4 AT',
    year: 2022, km: 74000, price: 42000, currency: 'USD', province: 'santa_fe', seller: 1,
    specs: { fuel_type: 'diesel', transmission: 'automatica', traction: '4x4', cab_type: 'doble', payload_kg: 1000 },
    description: D.cuidado,
  },
  {
    key: 'hilux-2024', type: 'camioneta', brand: 'toyota', model: 'Hilux GR-Sport 2.8 TDI',
    year: 2024, km: 28000, price: 52000, currency: 'USD', province: 'caba', seller: 2,
    specs: { fuel_type: 'diesel', transmission: 'automatica', traction: '4x4', cab_type: 'doble', payload_kg: 1000 },
    description: D.unico,
  },

  {
    key: 'ranger-2017', type: 'camioneta', brand: 'ford', model: 'Ranger XLS 3.2 TDCI 4x4',
    year: 2017, km: 165000, price: 24500, currency: 'USD', province: 'entre_rios', seller: 0,
    specs: { fuel_type: 'diesel', transmission: 'manual', traction: '4x4', cab_type: 'doble', payload_kg: 1200 },
    description: D.trabajo,
  },
  {
    key: 'ranger-2019', type: 'camioneta', brand: 'ford', model: 'Ranger Limited 3.2 TDCI AT',
    year: 2019, km: 128000, price: 29500, currency: 'USD', province: 'cordoba', seller: 1,
    specs: { fuel_type: 'diesel', transmission: 'automatica', traction: '4x4', cab_type: 'doble', payload_kg: 1200 },
    description: D.cuidado,
  },
  {
    key: 'ranger-2022', type: 'camioneta', brand: 'ford', model: 'Ranger XLT 3.2 TDCI 4x4 AT',
    year: 2022, km: 69000, price: 40000, currency: 'USD', province: 'neuquen', seller: 2,
    specs: { fuel_type: 'diesel', transmission: 'automatica', traction: '4x4', cab_type: 'doble', payload_kg: 1200 },
    description: D.unico,
  },

  {
    key: 'amarok-2018', type: 'camioneta', brand: 'volkswagen', model: 'Amarok Highline 2.0 TDI 4x4',
    year: 2018, km: 147000, price: 28000, currency: 'USD', province: 'buenos_aires', seller: 0,
    specs: { fuel_type: 'diesel', transmission: 'automatica', traction: '4x4', cab_type: 'doble', payload_kg: 1150 },
    description: D.cuidado,
  },
  {
    key: 'amarok-2021', type: 'camioneta', brand: 'volkswagen', model: 'Amarok Comfortline 2.0 TDI',
    year: 2021, km: 89000, price: 53200000, currency: 'ARS', province: 'mendoza', seller: 1,
    specs: { fuel_type: 'diesel', transmission: 'automatica', traction: '4x4', cab_type: 'doble', payload_kg: 1150 },
    description: D.trabajo,
  },

  {
    key: 's10-2019', type: 'camioneta', brand: 'chevrolet', model: 'S10 LTZ 2.8 TD 4x4 AT',
    year: 2019, km: 132000, price: 28000, currency: 'USD', province: 'la_pampa', seller: 2,
    specs: { fuel_type: 'diesel', transmission: 'automatica', traction: '4x4', cab_type: 'doble', payload_kg: 1000 },
    description: D.trabajo,
  },
  {
    key: 'frontier-2020', type: 'camioneta', brand: 'nissan', model: 'Frontier XE 2.3 TD 4x2',
    year: 2020, km: 105000, price: 32000, currency: 'USD', province: 'chaco', seller: 0,
    specs: { fuel_type: 'diesel', transmission: 'manual', traction: '4x2', cab_type: 'doble', payload_kg: 1020 },
    description: D.cuidado,
  },
  {
    key: 'toro-2021', type: 'camioneta', brand: 'fiat', model: 'Toro Freedom 1.8 AT6',
    year: 2021, km: 78000, price: 23000, currency: 'USD', province: 'santa_fe', seller: 1,
    specs: { fuel_type: 'nafta', transmission: 'automatica', traction: '4x2', cab_type: 'doble', payload_kg: 650 },
    description: D.familia,
  },

  // ===== UTILITARIOS ========================================================
  {
    key: 'kangoo-2016', type: 'utilitario', brand: 'renault', model: 'Kangoo Furgón 1.6',
    year: 2016, km: 168000, price: 9500, currency: 'USD', province: 'buenos_aires', seller: 2,
    specs: { fuel_type: 'nafta', transmission: 'manual', cargo_volume_m3: 3, payload_kg: 650, sliding_doors: 1 },
    description: D.trabajo,
  },
  {
    key: 'kangoo-2019', type: 'utilitario', brand: 'renault', model: 'Kangoo II Express Confort',
    year: 2019, km: 121000, price: 12500, currency: 'USD', province: 'caba', seller: 3,
    specs: { fuel_type: 'nafta', transmission: 'manual', cargo_volume_m3: 3.5, payload_kg: 800, sliding_doors: 2 },
    description: D.cuidado,
  },
  {
    key: 'kangoo-2022', type: 'utilitario', brand: 'renault', model: 'Kangoo II Express Emotion',
    year: 2022, km: 64000, price: 16500, currency: 'USD', province: 'cordoba', seller: 1,
    specs: { fuel_type: 'nafta', transmission: 'manual', cargo_volume_m3: 3.5, payload_kg: 800, sliding_doors: 2 },
    description: D.vendo,
  },
  {
    key: 'fiorino-2018', type: 'utilitario', brand: 'fiat', model: 'Fiorino Fire 1.4',
    year: 2018, km: 139000, price: 10500, currency: 'USD', province: 'santa_fe', seller: 2,
    specs: { fuel_type: 'nafta', transmission: 'manual', cargo_volume_m3: 2.8, payload_kg: 650, sliding_doors: 1 },
    description: D.trabajo,
  },
  {
    key: 'fiorino-2021', type: 'utilitario', brand: 'fiat', model: 'Fiorino Endurance 1.4',
    year: 2021, km: 82000, price: 19600000, currency: 'ARS', province: 'tucuman', seller: 0,
    specs: { fuel_type: 'nafta', transmission: 'manual', cargo_volume_m3: 3, payload_kg: 650, sliding_doors: 1 },
    description: D.cuidado,
  },
  {
    key: 'sprinter-2017', type: 'utilitario', brand: 'mercedes_benz', model: 'Sprinter 415 Furgón',
    year: 2017, km: 214000, price: 28000, currency: 'USD', province: 'buenos_aires', seller: 1,
    specs: { fuel_type: 'diesel', transmission: 'manual', cargo_volume_m3: 11, payload_kg: 1500, sliding_doors: 1 },
    description: D.trabajo,
  },
  {
    key: 'partner-2019', type: 'utilitario', brand: 'peugeot', model: 'Partner Furgón 1.6 HDI',
    year: 2019, km: 149000, price: 11800, currency: 'USD', province: 'mendoza', seller: 2,
    specs: { fuel_type: 'diesel', transmission: 'manual', cargo_volume_m3: 3.3, payload_kg: 800, sliding_doors: 1 },
    description: D.trabajo,
  },

  // ===== MOTOS ==============================================================
  {
    key: 'cb190-2019', type: 'moto', brand: 'honda', model: 'CB 190R',
    year: 2019, km: 31000, price: 2100, currency: 'USD', province: 'buenos_aires', seller: 0,
    specs: { engine_displacement_cc: 184, moto_style: 'calle', stroke: '4t', start_type: 'electrico', cooling: 'aire' },
    description: D.vendo,
  },
  {
    key: 'cb190-2021', type: 'moto', brand: 'honda', model: 'CB 190R',
    year: 2021, km: 18000, price: 2700, currency: 'USD', province: 'cordoba', seller: 3,
    specs: { engine_displacement_cc: 184, moto_style: 'calle', stroke: '4t', start_type: 'electrico', cooling: 'aire' },
    description: D.cuidado,
  },
  {
    key: 'cb190-2023', type: 'moto', brand: 'honda', model: 'CB 190R',
    year: 2023, km: 7400, price: 3400, currency: 'USD', province: 'santa_fe', seller: 2,
    specs: { engine_displacement_cc: 184, moto_style: 'calle', stroke: '4t', start_type: 'electrico', cooling: 'aire' },
    description: D.unico,
  },
  {
    key: 'ybr125-2017', type: 'moto', brand: 'yamaha', model: 'YBR 125 ED',
    year: 2017, km: 47000, price: 1200, currency: 'USD', province: 'chaco', seller: 0,
    specs: { engine_displacement_cc: 125, moto_style: 'calle', stroke: '4t', start_type: 'ambos', cooling: 'aire' },
    description: D.trabajo,
  },
  {
    key: 'ybr125-2020', type: 'moto', brand: 'yamaha', model: 'YBR 125 Z',
    year: 2020, km: 23000, price: 2240000, currency: 'ARS', province: 'misiones', seller: 1,
    specs: { engine_displacement_cc: 125, moto_style: 'calle', stroke: '4t', start_type: 'ambos', cooling: 'aire' },
    description: D.vendo,
  },
  {
    key: 'skua-2018', type: 'moto', brand: 'motomel', model: 'Skua 150',
    year: 2018, km: 29000, price: 1100, currency: 'USD', province: 'salta', seller: 2,
    specs: { engine_displacement_cc: 150, moto_style: 'enduro', stroke: '4t', start_type: 'ambos', cooling: 'aire' },
    description: D.trabajo,
  },
  {
    key: 'skua-2021', type: 'moto', brand: 'motomel', model: 'Skua 150 Silver Edition',
    year: 2021, km: 14000, price: 1500, currency: 'USD', province: 'jujuy', seller: 0,
    specs: { engine_displacement_cc: 150, moto_style: 'enduro', stroke: '4t', start_type: 'ambos', cooling: 'aire' },
    description: D.cuidado,
  },
  {
    key: 'rouser-2020', type: 'moto', brand: 'bajaj', model: 'Rouser NS 200',
    year: 2020, km: 26000, price: 2600, currency: 'USD', province: 'caba', seller: 1,
    specs: { engine_displacement_cc: 200, moto_style: 'deportiva', stroke: '4t', start_type: 'electrico', cooling: 'liquida' },
    description: D.vendo,
  },
  {
    key: 'zb110-2019', type: 'moto', brand: 'zanella', model: 'ZB 110',
    year: 2019, km: 18000, price: 800, currency: 'USD', province: 'formosa', seller: 2,
    specs: { engine_displacement_cc: 110, moto_style: 'calle', stroke: '4t', start_type: 'patada', cooling: 'aire' },
    description: D.trabajo,
  },
  {
    key: 'ninja300-2018', type: 'moto', brand: 'kawasaki', model: 'Ninja 300',
    year: 2018, km: 21000, price: 5200, currency: 'USD', province: 'buenos_aires', seller: 0, status: 'paused',
    specs: { engine_displacement_cc: 296, moto_style: 'deportiva', stroke: '4t', start_type: 'electrico', cooling: 'liquida' },
    description: D.cuidado,
  },
  {
    key: 'vespa-2022', type: 'moto', brand: 'vespa', model: 'Primavera 150',
    year: 2022, km: 6800, price: 4300, currency: 'USD', province: 'caba', seller: 1,
    specs: { engine_displacement_cc: 150, moto_style: 'scooter', stroke: '4t', start_type: 'electrico', cooling: 'aire' },
    description: D.unico,
  },

  // ===== CUATRICICLOS =======================================================
  {
    key: 'outlander-2019', type: 'cuatriciclo', brand: 'can_am', model: 'Outlander 570 XT',
    year: 2019, km: 9800, price: 9500, currency: 'USD', province: 'cordoba', seller: 2,
    specs: { engine_displacement_cc: 570, traction: '4x4', use_type: 'utilitario', start_type: 'electrico' },
    description: D.trabajo,
  },
  {
    key: 'outlander-2022', type: 'cuatriciclo', brand: 'can_am', model: 'Outlander 570 Pro',
    year: 2022, km: 4200, price: 13500, currency: 'USD', province: 'buenos_aires', seller: 0,
    specs: { engine_displacement_cc: 570, traction: '4x4', use_type: 'utilitario', start_type: 'electrico' },
    description: D.cuidado,
  },
  {
    key: 'gamma-250-2020', type: 'cuatriciclo', brand: 'gamma', model: 'GT 250',
    year: 2020, km: 7600, price: 2900, currency: 'USD', province: 'san_luis', seller: 1,
    specs: { engine_displacement_cc: 250, traction: '2x4', use_type: 'recreativo', start_type: 'ambos' },
    description: D.vendo,
  },
  {
    key: 'trx420-2018', type: 'cuatriciclo', brand: 'honda', model: 'TRX 420 Fourtrax',
    year: 2018, km: 12400, price: 7500, currency: 'USD', province: 'la_pampa', seller: 2,
    specs: { engine_displacement_cc: 420, traction: '4x4', use_type: 'utilitario', start_type: 'electrico' },
    description: D.trabajo,
  },

  // ===== CAMIONES ===========================================================
  {
    key: 'tector-2015', type: 'camion', brand: 'iveco', model: 'Tector 170E28',
    year: 2015, km: 612000, price: 38000, currency: 'USD', province: 'santa_fe', seller: 3, status: 'paused',
    specs: { payload_kg: 9500, axles: 2, body_type: 'furgon', traction: '4x2', has_hydraulic_system: false },
    description: D.trabajo,
  },
  {
    key: 'tector-2018', type: 'camion', brand: 'iveco', model: 'Tector 170E28 Attack',
    year: 2018, km: 438000, price: 52000, currency: 'USD', province: 'buenos_aires', seller: 1,
    specs: { payload_kg: 9500, axles: 2, body_type: 'plataforma', traction: '4x2', has_hydraulic_system: true },
    description: D.cuidado,
  },
  {
    key: 'atego-2016', type: 'camion', brand: 'mercedes_benz', model: 'Atego 1725',
    year: 2016, km: 574000, price: 45000, currency: 'USD', province: 'cordoba', seller: 2,
    specs: { payload_kg: 9000, axles: 2, body_type: 'volcador', traction: '4x2', has_hydraulic_system: true },
    description: D.trabajo,
  },
  {
    key: 'atego-2019', type: 'camion', brand: 'mercedes_benz', model: 'Atego 1725/48',
    year: 2019, km: 361000, price: 62000, currency: 'USD', province: 'mendoza', seller: 0,
    specs: { payload_kg: 9000, axles: 2, body_type: 'frigorifico', traction: '4x2', has_hydraulic_system: false },
    description: D.cuidado,
  },
  {
    key: 'scania-2020', type: 'camion', brand: 'scania', model: 'R450 Highline',
    year: 2020, km: 486000, price: 95000, currency: 'USD', province: 'buenos_aires', seller: 1,
    specs: { payload_kg: 45000, axles: 3, body_type: 'tractor', traction: '6x2', has_hydraulic_system: true },
    description: D.trabajo,
  },
  {
    key: 'cargo-2014', type: 'camion', brand: 'ford', model: 'Cargo 1723',
    year: 2014, km: 698000, price: 32000, currency: 'USD', province: 'entre_rios', seller: 2,
    specs: { payload_kg: 9000, axles: 2, body_type: 'chasis', traction: '4x2', has_hydraulic_system: false },
    description: D.trabajo,
  },

  // ===== BUSES ==============================================================
  {
    key: 'o500-2015', type: 'bus', brand: 'mercedes_benz', model: 'O500 RS 1836',
    year: 2015, km: 812000, price: 85000, currency: 'USD', province: 'buenos_aires', seller: 0,
    specs: { seats: 48, bus_type: 'larga_distancia', axles: 2, has_air_conditioning: true, has_bathroom: true },
    description: D.trabajo,
  },
  {
    key: 'daily-2018', type: 'bus', brand: 'iveco', model: 'Daily 55C17 Minibús',
    year: 2018, km: 297000, price: 48000, currency: 'USD', province: 'cordoba', seller: 1,
    specs: { seats: 19, bus_type: 'minibus', axles: 2, has_air_conditioning: true, has_bathroom: false },
    description: D.cuidado,
  },
  {
    key: 'agrale-2016', type: 'bus', brand: 'agrale', model: 'MA 8.5 Escolar',
    year: 2016, km: 388000, price: 40000, currency: 'USD', province: 'santa_fe', seller: 2,
    specs: { seats: 32, bus_type: 'escolar', axles: 2, has_air_conditioning: false, has_bathroom: false },
    description: D.trabajo,
  },
  {
    key: 'marcopolo-2013', type: 'bus', brand: 'marcopolo', model: 'Paradiso 1200',
    year: 2013, km: 941000, price: 68000, currency: 'USD', province: 'tucuman', seller: 0,
    specs: { seats: 44, bus_type: 'larga_distancia', axles: 2, has_air_conditioning: true, has_bathroom: true },
    description: D.trabajo,
  },
];

-- Sprint 3 — Estimación de precio
--
-- Cómo pierde valor cada tipo de vehículo, para poder comparar entre sí avisos
-- de años y kilometrajes distintos.
--
-- POR QUÉ VA EN EL CATÁLOGO Y NO EN EL CÓDIGO
--
--   Un camión no se deprecia como una moto, y en un camión 300.000 km son
--   normales mientras que en un auto son muchos. La estimación necesita esos
--   dos números por tipo de vehículo.
--
--   La regla del proyecto (ver `app/CLAUDE.md`) es que agregar un tipo de
--   vehículo nuevo NO puede requerir tocar código ni redesplegar. Si estos
--   coeficientes vivieran en un objeto de TypeScript, cargar "motorhome" en el
--   catálogo lo dejaría con valores de auto hasta el próximo despliegue. Acá,
--   se cargan con el tipo, en la misma fila y en el mismo momento.
--
-- LOS VALORES SON PROVISORIOS, Y ESO NO ES UN DEFECTO
--
--   Salen de cómo se comporta el mercado argentino en general, no de datos
--   propios: con setenta publicaciones no hay con qué calcularlos. Cuando la
--   plataforma tenga volumen real se van a poder deducir de los propios avisos
--   — y por eso están en la base y se pueden corregir sin desplegar nada.

alter table public.vehicle_types
  add column if not exists annual_depreciation numeric(4, 3) not null default 0.080
    check (annual_depreciation >= 0 and annual_depreciation < 1);

alter table public.vehicle_types
  add column if not exists wear_per_10k_km numeric(4, 3) not null default 0.012
    check (wear_per_10k_km >= 0 and wear_per_10k_km < 1);

comment on column public.vehicle_types.annual_depreciation is
  'Qué proporción de su valor pierde por año un vehículo de este tipo (0.08 = 8% anual). '
  'La usa la estimación de precio para comparar avisos de años distintos.';

comment on column public.vehicle_types.wear_per_10k_km is
  'Qué proporción de su valor pierde por cada 10.000 km recorridos (0.012 = 1,2%). '
  'En camiones y buses es baja: el kilometraje alto es parte de su vida útil normal.';

-- Valores iniciales para los tipos que ya existen. Los que no estén acá se
-- quedan con el valor por defecto de la columna, que es el de un auto.
update public.vehicle_types set annual_depreciation = 0.080, wear_per_10k_km = 0.012 where slug = 'auto';
update public.vehicle_types set annual_depreciation = 0.070, wear_per_10k_km = 0.011 where slug = 'camioneta';
update public.vehicle_types set annual_depreciation = 0.080, wear_per_10k_km = 0.012 where slug = 'utilitario';
update public.vehicle_types set annual_depreciation = 0.110, wear_per_10k_km = 0.020 where slug = 'moto';
update public.vehicle_types set annual_depreciation = 0.100, wear_per_10k_km = 0.018 where slug = 'cuatriciclo';
update public.vehicle_types set annual_depreciation = 0.050, wear_per_10k_km = 0.004 where slug = 'camion';
update public.vehicle_types set annual_depreciation = 0.050, wear_per_10k_km = 0.004 where slug = 'bus';

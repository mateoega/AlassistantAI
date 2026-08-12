-- ============================================================================
-- 004 — Almacenamiento de fotos
--
-- Las fotos van a un bucket de Supabase Storage llamado 'vehicle-photos',
-- organizadas así:
--
--     vehicle-photos/{id_del_usuario}/{id_de_la_publicacion}/{archivo}.jpg
--
-- La primera carpeta es el id del usuario, y esa es justamente la regla de
-- seguridad: cada uno solo puede escribir dentro de SU carpeta. Aunque el
-- navegador suba las fotos directo (sin pasar por el backend), nadie puede
-- escribir ni borrar en la carpeta de otro.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-photos',
  'vehicle-photos',
  true,                                                  -- lectura pública
  10485760,                                              -- 10 MB por foto
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;


-- Lectura pública: hace falta para poder mostrar las fotos en la app.
--
-- Nota consciente: esto implica que una foto de un borrador es accesible para
-- quien conozca su URL exacta (una dirección larga e imposible de adivinar).
-- Es un compromiso aceptado para el prototipo, a cambio de no tener que firmar
-- cada imagen. Si más adelante los borradores tienen que ser realmente
-- privados, se pasa el bucket a privado y el backend genera URLs firmadas.
create policy "Las fotos de vehículos son de lectura pública"
  on storage.objects for select
  using (bucket_id = 'vehicle-photos');

create policy "Cada usuario sube fotos solo a su propia carpeta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vehicle-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Cada usuario reemplaza solo sus propias fotos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Cada usuario borra solo sus propias fotos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

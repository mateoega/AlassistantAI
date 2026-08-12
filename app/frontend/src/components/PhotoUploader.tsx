'use client';

import { useEffect, useRef, useState } from 'react';
import { PHOTOS_BUCKET, supabase } from '@/lib/supabase';
import { Button, Notice } from './ui';

const MAX_PHOTOS = 12;
const MAX_SIZE_MB = 10;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export interface UploadedPhoto {
  /** Ruta dentro del bucket. Es lo que se le manda al backend. */
  path: string;
  /** URL pública, solo para la vista previa. */
  url: string;
}

/**
 * Sube las fotos directo del navegador a Supabase Storage.
 *
 * Es una de las dos excepciones a "todo pasa por el backend" (ver bitácora):
 * pasar cada imagen por el servidor implicaría que viaje dos veces sin ganar
 * nada. La seguridad la da la regla de Storage: cada archivo va a
 * `{id del usuario}/{id de la publicación}/`, y nadie puede escribir dentro de
 * la carpeta de otro.
 */
export function PhotoUploader({
  userId,
  listingId,
  photos,
  onChange,
}: {
  userId: string;
  listingId: string;
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Limpieza de fotos abandonadas.
   *
   * Las fotos se suben apenas se eligen, antes de que la publicación exista.
   * Si alguien sube tres fotos y después cierra la pestaña sin guardar, esos
   * archivos quedaban en Storage para siempre sin que nadie supiera de ellos.
   *
   * Al abrir el formulario se borra lo que haya quedado en la carpeta de esta
   * publicación y no esté entre las fotos que se están mostrando. En una
   * publicación nueva la carpeta está vacía y no hace nada.
   */
  useEffect(() => {
    let cancelled = false;

    async function cleanUp() {
      const folder = `${userId}/${listingId}`;
      const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).list(folder);

      if (error || !data || cancelled) return;

      const inUse = new Set(photos.map((photo) => photo.path));
      const orphans = data
        .map((file) => `${folder}/${file.name}`)
        .filter((path) => !inUse.has(path));

      if (orphans.length > 0) {
        await supabase.storage.from(PHOTOS_BUCKET).remove(orphans);
      }
    }

    void cleanUp();

    return () => {
      cancelled = true;
    };
    // A propósito solo al montar: después, cada foto que se quita ya se borra
    // en el momento, y volver a correr esto pisaría las que se acaban de subir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, listingId]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const problems: string[] = [];

    if (photos.length + files.length > MAX_PHOTOS) {
      problems.push(`No se pueden cargar más de ${MAX_PHOTOS} fotos por publicación.`);
    }

    const valid = files.filter((file) => {
      if (!ACCEPTED.includes(file.type)) {
        problems.push(`"${file.name}" no es una imagen JPG, PNG ni WEBP.`);
        return false;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        problems.push(`"${file.name}" pesa más de ${MAX_SIZE_MB} MB.`);
        return false;
      }
      return true;
    });

    const allowed = valid.slice(0, MAX_PHOTOS - photos.length);

    setProblem(problems);
    setUploading(true);

    const uploaded: UploadedPhoto[] = [];

    for (const file of allowed) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${userId}/${listingId}/${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (error) {
        problems.push(`No se pudo subir "${file.name}": ${error.message}`);
        continue;
      }

      const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
      uploaded.push({ path, url: data.publicUrl });
    }

    setProblem(problems);
    setUploading(false);
    onChange([...photos, ...uploaded]);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  async function removePhoto(path: string) {
    await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
    onChange(photos.filter((photo) => photo.path !== path));
  }

  /**
   * Cambia una foto de lugar. El orden del arreglo ES el orden de las fotos:
   * la primera es la portada. No hace falta guardar nada acá — el orden viaja
   * al servidor cuando se guarda la publicación.
   */
  function move(from: number, to: number) {
    if (to < 0 || to >= photos.length) return;

    const reordered = [...photos];
    const [moved] = reordered.splice(from, 1);
    if (moved) {
      reordered.splice(to, 0, moved);
      onChange(reordered);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          multiple
          onChange={(event) => void handleFiles(event.target.files)}
          className="hidden"
          id="photo-input"
        />
        <Button
          variant="secondary"
          disabled={uploading || photos.length >= MAX_PHOTOS}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Subiendo…' : 'Agregar fotos'}
        </Button>
        <span className="text-xs text-muted">
          {photos.length} de {MAX_PHOTOS} · JPG, PNG o WEBP · hasta {MAX_SIZE_MB} MB cada una
        </span>
      </div>

      {problem.length > 0 && (
        <Notice tone="alert" title="Algunas fotos no se pudieron cargar" items={problem} />
      )}

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <li
              key={photo.path}
              className="overflow-hidden rounded-lg border border-line bg-canvas"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Foto ${index + 1} del vehículo`}
                  className="aspect-4/3 w-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-medium text-white">
                    Principal
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void removePhoto(photo.path)}
                  className="absolute right-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] text-white transition-colors hover:text-brand"
                >
                  Quitar
                </button>
              </div>

              {/* Reordenar con botones y no arrastrando: funciona igual con el
                  dedo en un celular y con el teclado, que es donde arrastrar
                  suele fallar. */}
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                  aria-label={`Mover la foto ${index + 1} hacia atrás`}
                  className="rounded px-2 py-0.5 text-sm text-muted transition-colors hover:text-brand-deep disabled:opacity-30 disabled:hover:text-muted"
                >
                  ←
                </button>

                {index === 0 ? (
                  <span className="text-[11px] text-muted">Portada</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => move(index, 0)}
                    className="text-[11px] text-brand-deep transition-colors hover:underline"
                  >
                    Hacer principal
                  </button>
                )}

                <button
                  type="button"
                  disabled={index === photos.length - 1}
                  onClick={() => move(index, index + 1)}
                  aria-label={`Mover la foto ${index + 1} hacia adelante`}
                  className="rounded px-2 py-0.5 text-sm text-muted transition-colors hover:text-brand-deep disabled:opacity-30 disabled:hover:text-muted"
                >
                  →
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {photos.length > 0 && (
        <p className="text-xs text-muted">
          La primera foto es la que se ve en el listado. Usá las flechas para cambiar el orden.
        </p>
      )}
    </div>
  );
}

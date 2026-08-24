'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { Button, Card, Field, Notice, Spinner, inputClass } from '@/components/ui';
import type { Profile } from '@/lib/types';

/**
 * Perfil del vendedor.
 *
 * Existe porque la publicación muestra el teléfono de contacto y antes no
 * había ningún lugar donde cargarlo: siempre salía vacío.
 */
export default function PerfilPage() {
  const router = useRouter();
  const { session, loading: sessionLoading, signOut } = useSession();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace('/login');
    }
  }, [sessionLoading, session, router]);

  useEffect(() => {
    if (!session) return;

    api<{ profile: Profile }>('/api/profile')
      .then(({ profile }) => {
        setDisplayName(profile.display_name ?? '');
        setPhone(profile.phone ?? '');
      })
      .catch((error: unknown) => {
        setProblem({
          title: error instanceof ApiError ? error.message : 'No se pudo cargar tu perfil.',
          items: [],
        });
      })
      .finally(() => setLoading(false));
  }, [session]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setProblem(null);
    setSaved(false);

    try {
      await api<{ profile: Profile }>('/api/profile', {
        method: 'PUT',
        body: { display_name: displayName, phone },
      });
      setSaved(true);
    } catch (error) {
      setProblem({
        title: error instanceof ApiError ? error.message : 'No se pudo guardar tu perfil.',
        items: error instanceof ApiError ? error.details : [],
      });
    } finally {
      setSaving(false);
    }
  }

  if (sessionLoading || !session || loading) {
    return <Spinner />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted">
          Estos datos son los que ven los compradores en tus publicaciones.
        </p>
      </div>

      {problem && <Notice tone="alert" title={problem.title} items={problem.items} />}
      {saved && <Notice title="Listo, tus datos quedaron guardados." />}

      <Card className="p-5">
        <form onSubmit={save} className="space-y-4">
          <Field label="Tu nombre" required hint="Es el nombre que figura en tus publicaciones.">
            <input
              className={inputClass}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={80}
              required
            />
          </Field>

          {/* Desde el Sprint 5 el contacto es por mensajes dentro de la
              plataforma, así que este número ya no sale en ningún aviso. Se
              sigue pudiendo cargar para tenerlo a mano y pasarlo en una
              conversación, pero nadie lo ve sin que uno se lo dé. */}
          <Field
            label="Teléfono de contacto"
            hint="Opcional y privado: no aparece en tus publicaciones. Las consultas te llegan a Mensajes; el teléfono es para cuando quieras pasárselo a alguien en la conversación."
          >
            <input
              type="tel"
              className={inputClass}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Ej: 11 5555 5555"
              maxLength={40}
            />
          </Field>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            <span className="truncate text-sm text-muted">{session.user?.email}</span>
          </div>
        </form>
      </Card>

      {/* Cerrar sesión vive acá y no en el encabezado: es algo que se hace una
          vez cada tanto, y en el encabezado ocupaba lugar que en un celular no
          sobra. */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-medium text-ink">Cerrar sesión</p>
          <p className="text-sm text-muted">Vas a tener que volver a entrar con tu email.</p>
        </div>
        <Button
          variant="quiet"
          onClick={async () => {
            await signOut();
            router.push('/login');
          }}
        >
          Salir
        </Button>
      </Card>
    </div>
  );
}

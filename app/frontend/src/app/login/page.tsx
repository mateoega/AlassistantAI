'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/components/SessionProvider';
import { Button, Card, Field, Notice, inputClass } from '@/components/ui';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { session, loading } = useSession();

  const [mode, setMode] = useState<Mode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace('/');
    }
  }, [loading, session, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setProblem(null);
    setMessage(null);
    setWorking(true);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() } },
      });

      setWorking(false);

      if (error) {
        setProblem(translateAuthError(error.message));
        return;
      }

      // Si Supabase tiene activada la confirmación por email, no hay sesión
      // todavía: el usuario tiene que confirmar antes de poder entrar.
      if (!data.session) {
        setMessage(
          'Te enviamos un email para confirmar la cuenta. Confirmala y volvé a iniciar sesión.',
        );
        setMode('login');
        return;
      }

      router.replace('/');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setWorking(false);

    if (error) {
      setProblem(translateAuthError(error.message));
      return;
    }

    router.replace('/');
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <p className="text-center text-2xl font-bold tracking-tight text-ink">
        <span className="text-brand-deep">AI</span>assistant
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        Publicá y encontrá vehículos de todo el rubro automotor: autos, camionetas, motos,
        cuatriciclos, camiones y buses.
      </p>

      <Card className="mt-8 p-6">
        <h1 className="text-xl font-bold tracking-tight text-ink">
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h1>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {mode === 'signup' && (
          <Field label="Tu nombre" required>
            <input
              className={inputClass}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Cómo te van a ver los compradores"
              required
            />
          </Field>
        )}

        <Field label="Email" required>
          <input
            type="email"
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>

        <Field
          label="Contraseña"
          required
          hint={mode === 'signup' ? 'Mínimo 6 caracteres.' : null}
        >
          <input
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className={inputClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </Field>

          {problem && <Notice tone="alert" title={problem} />}
          {message && <Notice title={message} />}

          <Button type="submit" disabled={working} full>
            {working ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </Button>
        </form>

        <p className="mt-5 border-t border-line pt-5 text-center text-sm text-muted">
          {mode === 'login' ? '¿Todavía no tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
          <button
            type="button"
            className="font-medium text-brand-deep hover:underline"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setProblem(null);
              setMessage(null);
            }}
          >
            {mode === 'login' ? 'Crear una' : 'Iniciar sesión'}
          </button>
        </p>

        {/* El descargo se puede leer ANTES de crear la cuenta. Uno que solo se
            alcanza estando adentro llega tarde. */}
        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/legales" className="hover:underline">
            Términos y responsabilidad
          </Link>
        </p>
      </Card>
    </div>
  );
}

/** Supabase devuelve los errores de login en inglés; acá se traducen. */
function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'El email o la contraseña no son correctos.';
  }
  if (normalized.includes('already registered') || normalized.includes('already been registered')) {
    return 'Ya existe una cuenta con ese email. Probá iniciar sesión.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Todavía no confirmaste tu email. Revisá tu casilla.';
  }
  if (normalized.includes('password') && normalized.includes('6')) {
    return 'La contraseña tiene que tener al menos 6 caracteres.';
  }
  if (normalized.includes('failed to fetch')) {
    return 'No se pudo conectar con Supabase. Revisá las claves en el archivo .env.';
  }

  return message;
}

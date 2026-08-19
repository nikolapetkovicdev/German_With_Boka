'use client';

import {FormEvent, useState} from 'react';
import {signIn} from 'next-auth/react';

type RoleChoice = 'PARENT' | 'STUDENT';

export function RegisterForm({locale}: {locale: string}) {
  const [role, setRole] = useState<RoleChoice>('PARENT');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim().toLowerCase();
    const password = String(form.get('password'));

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        email,
        password,
        firstName: String(form.get('firstName')).trim(),
        lastName: String(form.get('lastName')).trim(),
        role
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error ?? 'Registracija nije uspela.');
      setLoading(false);
      return;
    }

    const signInResult = await signIn('credentials', {email, password, redirect: false});
    setLoading(false);
    if (signInResult?.error) {
      setMessage('Nalog je napravljen. Prijavi se sa unetim podacima.');
      return;
    }
    window.location.assign(role === 'PARENT' ? `/${locale}/onboarding` : `/${locale}/dashboard`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-md border border-black/10 bg-white p-1">
        <button type="button" onClick={() => setRole('PARENT')} className={`rounded px-3 py-2 text-sm font-bold ${role === 'PARENT' ? 'bg-boka-cta text-black' : ''}`}>Roditelj</button>
        <button type="button" onClick={() => setRole('STUDENT')} className={`rounded px-3 py-2 text-sm font-bold ${role === 'STUDENT' ? 'bg-boka-cta text-black' : ''}`}>Ucenik</button>
      </div>
      <label className="block">
        <span className="text-sm font-semibold">Ime</span>
        <input name="firstName" required minLength={2} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Prezime</span>
        <input name="lastName" required minLength={2} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Email</span>
        <input name="email" type="email" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Lozinka</span>
        <input name="password" type="password" required minLength={10} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      {message ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{message}</p> : null}
      <button disabled={loading} className="w-full rounded-md bg-boka-cta px-4 py-3 font-bold text-black disabled:opacity-60">
        {loading ? 'Kreiranje...' : 'Napravi nalog'}
      </button>
      <p className="text-xs font-semibold text-black/60">Ucitelski nalog se pravi samo preko pozivnice administratora.</p>
    </form>
  );
}

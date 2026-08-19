'use client';

import {FormEvent, useState} from 'react';
import {signIn} from 'next-auth/react';

export function TeacherInviteRegisterForm({locale, token}: {locale: string; token: string}) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim().toLowerCase();
    const password = String(form.get('password'));
    const response = await fetch('/api/auth/register-teacher', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        token,
        email,
        password,
        firstName: String(form.get('firstName')).trim(),
        lastName: String(form.get('lastName')).trim()
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error ?? 'Pozivnica nije prihvacena.');
      setLoading(false);
      return;
    }

    await signIn('credentials', {email, password, redirect: false});
    setLoading(false);
    window.location.assign(`/${locale}/dashboard`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-semibold">Ime</span>
        <input name="firstName" required minLength={2} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Prezime</span>
        <input name="lastName" required minLength={2} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Email iz pozivnice</span>
        <input name="email" type="email" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Lozinka</span>
        <input name="password" type="password" required minLength={10} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      {message ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{message}</p> : null}
      <button disabled={loading} className="w-full rounded-md bg-boka-cta px-4 py-3 font-bold text-black disabled:opacity-60">
        {loading ? 'Kreiranje...' : 'Napravi uciteljski nalog'}
      </button>
    </form>
  );
}

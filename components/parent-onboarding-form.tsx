'use client';

import {FormEvent, useState} from 'react';

export function ParentOnboardingForm({locale}: {locale: string}) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function createChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/onboarding/children', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        firstName: String(form.get('firstName')).trim(),
        lastName: String(form.get('lastName')).trim(),
        dateOfBirth: String(form.get('dateOfBirth') || '') || undefined
      })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error ?? 'Dete nije dodato.');
      return;
    }
    window.location.assign(`/${locale}/dashboard`);
  }

  async function linkChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/onboarding/link-child', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({code: String(form.get('code')).trim()})
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error ?? 'Kod nije prihvacen.');
      return;
    }
    window.location.assign(`/${locale}/dashboard`);
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <form onSubmit={createChild} className="rounded-md border border-black/10 bg-white p-4">
        <h2 className="text-lg font-bold">Dodaj novo dete</h2>
        <label className="mt-4 block">
          <span className="text-sm font-semibold">Ime deteta</span>
          <input name="firstName" required minLength={2} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-semibold">Prezime deteta</span>
          <input name="lastName" required minLength={2} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-semibold">Datum rodjenja, opciono</span>
          <input name="dateOfBirth" type="date" className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
        </label>
        <button disabled={loading} className="mt-4 w-full rounded-md bg-boka-cta px-4 py-3 font-bold text-black disabled:opacity-60">Dodaj dete</button>
      </form>

      <form onSubmit={linkChild} className="rounded-md border border-black/10 bg-white p-4">
        <h2 className="text-lg font-bold">Povezi postojece dete</h2>
        <label className="mt-4 block">
          <span className="text-sm font-semibold">Kod za povezivanje</span>
          <input name="code" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3 uppercase" placeholder="GWB-XXXXXXXX" />
        </label>
        <button disabled={loading} className="mt-4 w-full rounded-md border border-black/20 px-4 py-3 font-bold disabled:opacity-60">Povezi dete</button>
      </form>
      {message ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 lg:col-span-2">{message}</p> : null}
    </div>
  );
}

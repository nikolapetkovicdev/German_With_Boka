'use client';

import {FormEvent, useState} from 'react';

type Props = {
  locale: string;
  defaults: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    recipientName: string;
    recipientAddress: string;
    rsdAccountNumber: string;
    foreignInstructions: string;
    singleLessonPrice: string;
    packagePrice: string;
    currency: string;
  };
};

export function TeacherSetupForm({locale, defaults}: Props) {
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch('/api/me/setup', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(payload)});
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? 'Doslo je do greske.');
      return;
    }
    window.location.href = `/${locale}/dashboard`;
  }

  return (
    <form onSubmit={submit} className="card mt-6 space-y-5 p-5">
      {error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold">Ime</span>
          <input name="firstName" defaultValue={defaults.firstName} required minLength={2} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Prezime</span>
          <input name="lastName" defaultValue={defaults.lastName} required minLength={2} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Email za nalog</span>
          <input name="email" type="email" defaultValue={defaults.email} required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Telefon</span>
          <input name="phone" defaultValue={defaults.phone} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
        </label>
      </div>

      <div className="rounded-md border border-black/10 p-4">
        <h2 className="text-lg font-bold">Cena i instrukcije za uplatu</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold">Valuta</span>
            <select name="currency" defaultValue={defaults.currency} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3">
              {['RSD', 'EUR', 'USD', 'CHF'].map((currency) => <option key={currency}>{currency}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold">Cena jednog termina od 45 min</span>
            <input name="singleLessonPrice" inputMode="decimal" defaultValue={defaults.singleLessonPrice} required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-bold">Cena paketa, opciono</span>
            <input name="packagePrice" inputMode="decimal" defaultValue={defaults.packagePrice} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-bold">Naziv primaoca</span>
            <input name="recipientName" defaultValue={defaults.recipientName} required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-bold">Adresa primaoca</span>
            <input name="recipientAddress" defaultValue={defaults.recipientAddress} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-bold">RSD racun</span>
            <input name="rsdAccountNumber" defaultValue={defaults.rsdAccountNumber} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-bold">Instrukcije za devizne uplate</span>
          <textarea name="foreignInstructions" defaultValue={defaults.foreignInstructions} rows={4} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
        </label>
      </div>
      <button className="rounded-md bg-boka-cta px-5 py-3 font-bold text-black">Sacuvaj podesavanja</button>
    </form>
  );
}

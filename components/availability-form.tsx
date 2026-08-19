'use client';

import {FormEvent, useState} from 'react';

export function AvailabilityForm() {
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/slots', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        date: String(form.get('date')),
        startHour: Number(form.get('startHour')),
        endHour: Number(form.get('endHour'))
      })
    });
    const data = await response.json();
    setMessage(response.ok ? `Kreirano termina: ${data.created}` : data.error);
  }
  return (
    <form onSubmit={submit} className="card mt-6 grid gap-4 p-5 sm:grid-cols-3">
      <label className="block">
        <span className="text-sm font-bold">Datum</span>
        <input name="date" type="date" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <label className="block">
        <span className="text-sm font-bold">Od</span>
        <input name="startHour" type="number" min={0} max={23} defaultValue={9} required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <label className="block">
        <span className="text-sm font-bold">Do</span>
        <input name="endHour" type="number" min={1} max={24} defaultValue={17} required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <button className="rounded-md bg-boka-cta px-5 py-3 font-bold text-black sm:col-span-3">Generiši termine od 60 minuta</button>
      {message ? <p className="font-semibold sm:col-span-3">{message}</p> : null}
    </form>
  );
}

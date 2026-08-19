'use client';

import {useState} from 'react';

export function StudentLinkCodePanel({studentId}: {studentId: string}) {
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [message, setMessage] = useState('');

  async function createCode() {
    setMessage('');
    const response = await fetch(`/api/students/${studentId}/link-code`, {method: 'POST'});
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error ?? 'Kod nije napravljen.');
      return;
    }
    const result = await response.json();
    setCode(result.code);
    setExpiresAt(new Intl.DateTimeFormat('sr-RS', {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(result.expiresAt)));
  }

  return (
    <section className="card mt-6 p-5">
      <h2 className="text-xl font-bold">Povezivanje roditelja</h2>
      <p className="mt-2 text-sm font-semibold text-black/65">Napravi kod i daj ga roditelju. Roditelj kod unosi u svom nalogu.</p>
      <button onClick={createCode} className="mt-4 rounded-md bg-boka-cta px-4 py-3 font-bold text-black">Napravi kod</button>
      {code ? (
        <div className="mt-4 rounded-md border border-black/10 bg-white p-3">
          <p className="text-sm font-bold">Kod</p>
          <p className="mt-1 text-2xl font-bold">{code}</p>
          <p className="mt-1 text-xs font-semibold text-black/60">Vazi do: {expiresAt}</p>
        </div>
      ) : null}
      {message ? <p className="mt-3 text-sm font-bold text-red-700">{message}</p> : null}
    </section>
  );
}

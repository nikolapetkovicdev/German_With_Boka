'use client';

import {FormEvent, useState} from 'react';

type PaymentRow = {id: string; student: string; amount: string; currency: string; status: string};
type BankRow = {id: string; currency: string; recipientName: string; singleLessonPrice: string; packagePrice: string};

export function AdminPanel({payments, bank, locale}: {payments: PaymentRow[]; bank: BankRow[]; locale: string}) {
  const [message, setMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  async function action(id: string, type: 'confirm' | 'reject') {
    const response = await fetch(`/api/payments/${id}/${type}`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: type === 'reject' ? JSON.stringify({reason: 'Rucno odbijeno u admin panelu'}) : undefined
    });
    setMessage(response.ok ? 'Sacuvano' : 'Greska');
    if (response.ok) window.location.reload();
  }

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setInviteLink('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/admin/teacher-invites', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({email: String(form.get('email')).trim().toLowerCase()})
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error ?? 'Pozivnica nije napravljena.');
      return;
    }
    const invite = await response.json();
    setInviteLink(`${window.location.origin}/${locale}/invite/teacher/${invite.token}`);
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="text-xl font-bold">Uplate na proveri</h2>
        <div className="mt-4 space-y-3">
          {payments.map((payment) => (
            <div key={payment.id} className="rounded-md border border-black/10 p-3">
              <div className="font-bold">{payment.student}</div>
              <div className="text-sm font-semibold">{payment.amount} {payment.currency} - {payment.status}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => action(payment.id, 'confirm')} className="rounded-md bg-boka-cta px-3 py-2 text-sm font-bold">Potvrdi uplatu</button>
                <button onClick={() => action(payment.id, 'reject')} className="rounded-md border border-black/20 px-3 py-2 text-sm font-bold">Odbij</button>
                <a href={`/api/payments/${payment.id}/receipt`} className="rounded-md border border-black/20 px-3 py-2 text-sm font-bold">Potvrda PDF</a>
              </div>
            </div>
          ))}
          {!payments.length ? <p className="text-sm font-semibold text-black/60">Nema uplata na proveri.</p> : null}
          {message ? <p className="font-semibold">{message}</p> : null}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-xl font-bold">Bankovne instrukcije i cene</h2>
        <div className="mt-4 space-y-3">
          {bank.map((item) => (
            <div key={item.id} className="rounded-md border border-black/10 p-3 text-sm">
              <div className="font-bold">{item.currency}</div>
              <div>{item.recipientName}</div>
              <div>Cas: {item.singleLessonPrice} | Paket: {item.packagePrice}</div>
            </div>
          ))}
          {!bank.length ? <p className="text-sm font-semibold text-black/60">Samo administrator menja bankovne instrukcije.</p> : null}
        </div>
      </section>

      <section className="card p-5 lg:col-span-2">
        <h2 className="text-xl font-bold">Pozovi ucitelja</h2>
        <form onSubmit={createInvite} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label>
            <span className="text-sm font-semibold">Email ucitelja</span>
            <input name="email" type="email" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <button className="self-end rounded-md bg-boka-cta px-4 py-3 font-bold text-black">Napravi pozivnicu</button>
        </form>
        {inviteLink ? (
          <div className="mt-4 rounded-md border border-black/10 bg-white p-3">
            <p className="text-sm font-bold">Link za ucitelja</p>
            <input readOnly value={inviteLink} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3 text-sm" />
          </div>
        ) : null}
      </section>
    </div>
  );
}

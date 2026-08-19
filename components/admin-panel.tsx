'use client';

import {useState} from 'react';

type PaymentRow = {id: string; student: string; amount: string; currency: string; status: string};
type BankRow = {id: string; currency: string; recipientName: string; singleLessonPrice: string; packagePrice: string};

export function AdminPanel({payments, bank}: {payments: PaymentRow[]; bank: BankRow[]}) {
  const [message, setMessage] = useState('');
  async function action(id: string, type: 'confirm' | 'reject') {
    const response = await fetch(`/api/payments/${id}/${type}`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: type === 'reject' ? JSON.stringify({reason: 'Rucno odbijeno u MVP admin panelu'}) : undefined
    });
    setMessage(response.ok ? 'Sačuvano' : 'Greška');
    if (response.ok) window.location.reload();
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
              <div className="mt-3 flex gap-2">
                <button onClick={() => action(payment.id, 'confirm')} className="rounded-md bg-boka-cta px-3 py-2 text-sm font-bold">Potvrdi uplatu</button>
                <button onClick={() => action(payment.id, 'reject')} className="rounded-md border border-black/20 px-3 py-2 text-sm font-bold">Odbij</button>
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
              <div>Čas: {item.singleLessonPrice} | Paket: {item.packagePrice}</div>
            </div>
          ))}
          {!bank.length ? <p className="text-sm font-semibold text-black/60">Samo administrator menja bankovne instrukcije.</p> : null}
        </div>
      </section>
    </div>
  );
}

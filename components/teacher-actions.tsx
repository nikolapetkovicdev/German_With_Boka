'use client';

import {useState} from 'react';

type PaymentActionRow = {
  id: string;
  student: string;
  amount: string;
  currency: string;
  status: string;
};

type BookingActionRow = {
  id: string;
  student: string;
  startsAt: string;
  status: string;
};

export function TeacherPaymentActions({payments}: {payments: PaymentActionRow[]}) {
  const [message, setMessage] = useState('');

  async function paymentAction(id: string, type: 'confirm' | 'reject') {
    const reason = type === 'reject' ? window.prompt('Razlog odbijanja uplate', 'Uplata nije pronadjena') : null;
    if (type === 'reject' && !reason) return;
    if (!window.confirm(type === 'confirm' ? 'Potvrditi uplatu?' : 'Odbiti uplatu?')) return;

    const response = await fetch(`/api/payments/${id}/${type}`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: type === 'reject' ? JSON.stringify({reason}) : undefined
    });
    setMessage(response.ok ? 'Sacuvano.' : 'Akcija nije uspela.');
    if (response.ok) window.location.reload();
  }

  return (
    <div className="mt-4 space-y-3">
      {payments.map((payment) => (
        <div key={payment.id} className="rounded-md border border-black/10 p-3 text-sm">
          <div className="font-bold">{payment.student}</div>
          <div>{payment.amount} {payment.currency}</div>
          <span className="status mt-2">{payment.status}</span>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button onClick={() => paymentAction(payment.id, 'confirm')} className="rounded-md bg-boka-cta px-3 py-2 text-sm font-bold text-black">Potvrdi uplatu</button>
            <button onClick={() => paymentAction(payment.id, 'reject')} className="rounded-md border border-black/20 px-3 py-2 text-sm font-bold">Odbij uplatu</button>
            <a href={`/api/payments/${payment.id}/receipt`} className="rounded-md border border-black/20 px-3 py-2 text-center text-sm font-bold">Potvrda PDF</a>
          </div>
        </div>
      ))}
      {!payments.length ? <p className="text-sm font-semibold text-black/60">Nema uplata na proveri.</p> : null}
      {message ? <p className="text-sm font-bold">{message}</p> : null}
    </div>
  );
}

export function TeacherBookingActions({bookings}: {bookings: BookingActionRow[]}) {
  const [message, setMessage] = useState('');

  async function bookingAction(id: string, type: 'cancel' | 'postpone' | 'complete' | 'no-show') {
    const needsReason = type === 'cancel' || type === 'postpone' || type === 'no-show';
    const reason = needsReason ? window.prompt('Unesi razlog', defaultReason(type)) : null;
    if (needsReason && !reason) return;
    if (!window.confirm(actionLabel(type))) return;

    const response = await fetch(`/api/bookings/${id}/${type}`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: needsReason ? JSON.stringify({reason}) : JSON.stringify({actualMinutes: 45})
    });
    setMessage(response.ok ? 'Sacuvano.' : 'Akcija nije uspela.');
    if (response.ok) window.location.reload();
  }

  return (
    <div className="mt-4 space-y-3">
      {bookings.map((booking) => (
        <article key={booking.id} className="rounded-md border border-black/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{booking.student}</strong>
            <span className="status">{booking.status}</span>
          </div>
          <p className="mt-2 text-sm font-medium text-black/70">{booking.startsAt}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <button onClick={() => bookingAction(booking.id, 'postpone')} className="rounded-md border border-black/20 px-3 py-2 text-sm font-bold">Odlozi</button>
            <button onClick={() => bookingAction(booking.id, 'cancel')} className="rounded-md border border-black/20 px-3 py-2 text-sm font-bold">Odbij/otkazi</button>
            <button onClick={() => bookingAction(booking.id, 'complete')} className="rounded-md bg-boka-cta px-3 py-2 text-sm font-bold text-black">Odrzan</button>
            <button onClick={() => bookingAction(booking.id, 'no-show')} className="rounded-md border border-black/20 px-3 py-2 text-sm font-bold">Nedolazak</button>
          </div>
        </article>
      ))}
      {!bookings.length ? <p className="text-sm font-semibold text-black/60">Nema casova za akciju.</p> : null}
      {message ? <p className="text-sm font-bold">{message}</p> : null}
    </div>
  );
}

function defaultReason(type: string) {
  if (type === 'postpone') return 'Cas se odlaze i bice naknadno zakazan';
  if (type === 'no-show') return 'Ucenik se nije pojavio';
  return 'Cas je otkazan';
}

function actionLabel(type: string) {
  if (type === 'postpone') return 'Odloziti cas?';
  if (type === 'complete') return 'Oznaciti cas kao odrzan?';
  if (type === 'no-show') return 'Oznaciti nedolazak?';
  return 'Otkazati cas?';
}

'use client';

import {FormEvent, useEffect, useState} from 'react';
import {PaymentKind} from '@prisma/client';
import {useTranslations} from 'next-intl';

type Student = {id: string; firstName: string; lastName: string};
type Slot = {id: string; startsAt: string};
type BookingResponse = {booking: {id: string}; payment: {reference: string; amount: string; currency: string; purpose: string}};

export function BookingFlow({locale}: {locale: string}) {
  const t = useTranslations();
  const [students, setStudents] = useState<Student[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<BookingResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetch('/api/students').then((r) => r.json()), fetch('/api/slots').then((r) => r.json())])
      .then(([studentData, slotData]) => {
        setStudents(studentData);
        setSlots(slotData);
      })
      .catch(() => setError(t('common.error')))
      .finally(() => setLoading(false));
  }, [t]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = {
      studentId: String(form.get('studentId')),
      timeSlotId: String(form.get('timeSlotId')),
      currency: String(form.get('currency')),
      kind: String(form.get('kind')),
      topic: String(form.get('topic')),
      additionalInfo: String(form.get('additionalInfo') || '')
    };
    const response = await fetch('/api/bookings', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(payload)});
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || t('common.error'));
      return;
    }
    setResult(data);
  }

  async function markPaid() {
    if (!result) return;
    const response = await fetch(`/api/bookings/${result.booking.id}/paid`, {method: 'POST'});
    if (!response.ok) setError(t('common.error'));
    else window.location.href = `/${locale}/dashboard`;
  }

  if (loading) return <p className="mt-6 font-semibold">{t('common.loading')}</p>;
  if (result) {
    return (
      <section className="card mt-6 p-5">
        <h2 className="text-xl font-bold">{t('booking.success')}</h2>
        <dl className="mt-4 grid gap-3 text-sm font-semibold">
          <div><dt className="text-black/60">Poziv na broj</dt><dd>{result.payment.reference}</dd></div>
          <div><dt className="text-black/60">Iznos</dt><dd>{result.payment.amount} {result.payment.currency}</dd></div>
          <div><dt className="text-black/60">Svrha</dt><dd>{result.payment.purpose}</dd></div>
        </dl>
        <button onClick={markPaid} className="mt-5 rounded-md bg-boka-cta px-5 py-3 font-bold text-black">{t('booking.paid')}</button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="card mt-6 space-y-5 p-5">
      {error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p> : null}
      <label className="block">
        <span className="text-sm font-bold">{t('booking.student')}</span>
        <select name="studentId" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3">
          {students.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-bold">{t('booking.slot')}</span>
        <select name="timeSlotId" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3">
          {slots.map((slot) => <option key={slot.id} value={slot.id}>{new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(slot.startsAt))}</option>)}
        </select>
      </label>
      {!slots.length ? <p className="text-sm font-semibold">{t('booking.empty')}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold">{t('booking.currency')}</span>
          <select name="currency" className="mt-2 w-full rounded-md border border-black/20 px-3 py-3">
            {['RSD', 'EUR', 'USD', 'CHF'].map((currency) => <option key={currency}>{currency}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-bold">{t('booking.kind')}</span>
          <select name="kind" className="mt-2 w-full rounded-md border border-black/20 px-3 py-3">
            <option value={PaymentKind.SINGLE_LESSON}>{t('booking.single')}</option>
            <option value={PaymentKind.PACKAGE_4}>{t('booking.package')}</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-bold">{t('booking.topic')}</span>
        <input name="topic" required minLength={2} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <label className="block">
        <span className="text-sm font-bold">{t('booking.details')}</span>
        <textarea name="additionalInfo" rows={4} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <button disabled={!slots.length} className="w-full rounded-md bg-boka-cta px-5 py-3 font-bold text-black disabled:opacity-60">{t('booking.reserve')}</button>
    </form>
  );
}

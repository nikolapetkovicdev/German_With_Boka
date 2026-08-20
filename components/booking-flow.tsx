'use client';

import {FormEvent, useEffect, useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';

type Student = {id: string; firstName: string; lastName: string};
type Teacher = {id: string; name: string};
type Slot = {id: string; startsAt: string; teacherId: string};
type Price = {singleLessonPrice: string; currency: string};
type PlanResponse = {
  plan: {id: string; termCount: number};
  bookings: {id: string; startsAt: string}[];
  payment: {
    id: string;
    reference: string;
    amount: string;
    currency: string;
    purpose: string;
    instruction?: {
      recipientName: string;
      recipientAddress: string;
      account?: string | null;
      foreignInstructions?: string | null;
      model?: string | null;
      ipsQrPayload?: string;
    };
  };
};

export function BookingFlow({locale}: {locale: string}) {
  const t = useTranslations();
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [studentId, setStudentId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [currency, setCurrency] = useState('RSD');
  const [month, setMonth] = useState(currentMonthValue());
  const [price, setPrice] = useState<Price | null>(null);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [error, setError] = useState('');
  const [proofMessage, setProofMessage] = useState('');

  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}), [locale]);
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {hour: '2-digit', minute: '2-digit'}), [locale]);

  useEffect(() => {
    Promise.all([fetch('/api/students').then((r) => r.json()), fetch('/api/teachers').then((r) => r.json())])
      .then(([studentData, teacherData]) => {
        setStudents(studentData);
        setTeachers(teacherData);
        setStudentId(studentData[0]?.id ?? '');
        setTeacherId(teacherData[0]?.id ?? '');
      })
      .catch(() => setError(t('common.error')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    if (!teacherId) return;
    const {from, to} = monthRange(month);
    setSlotsLoading(true);
    setError('');
    fetch(`/api/slots?teacherId=${encodeURIComponent(teacherId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((r) => r.json().then((body) => ({ok: r.ok, body})))
      .then(({ok, body}) => {
        if (!ok) throw new Error(body.error);
        setSlots(body);
        setSelectedSlotIds((current) => current.filter((id) => body.some((slot: Slot) => slot.id === id)));
      })
      .catch(() => setError(t('common.error')))
      .finally(() => setSlotsLoading(false));
  }, [teacherId, month, t]);

  useEffect(() => {
    if (!teacherId) return;
    fetch(`/api/teachers/${teacherId}/price?currency=${currency}`)
      .then((r) => r.json().then((body) => ({ok: r.ok, body})))
      .then(({ok, body}) => setPrice(ok ? body : null))
      .catch(() => setPrice(null));
  }, [teacherId, currency]);

  const slotsByDay = useMemo(() => {
    const grouped = new Map<string, Slot[]>();
    for (const slot of slots) {
      const key = dateKey(new Date(slot.startsAt));
      grouped.set(key, [...(grouped.get(key) ?? []), slot]);
    }
    for (const daySlots of grouped.values()) daySlots.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return grouped;
  }, [slots]);

  const days = useMemo(() => calendarDays(month), [month]);
  const selectedSlots = useMemo(
    () =>
      selectedSlotIds
        .map((id) => slots.find((slot) => slot.id === id))
        .filter(Boolean)
        .sort((a, b) => new Date(a!.startsAt).getTime() - new Date(b!.startsAt).getTime()) as Slot[],
    [selectedSlotIds, slots]
  );
  const totalTerms = selectedSlots.length;
  const pricePerTerm = price ? Number(price.singleLessonPrice) : null;
  const totalAmount = pricePerTerm === null ? null : pricePerTerm * totalTerms;

  function toggleSlot(slot: Slot) {
    setSelectedSlotIds((current) => (current.includes(slot.id) ? current.filter((id) => id !== slot.id) : [...current, slot.id]));
  }

  function toggleDouble(slot: Slot) {
    const nextSlot = findNextTerm(slot, slotsByDay.get(dateKey(new Date(slot.startsAt))) ?? []);
    if (!nextSlot) {
      setError(t('booking.noDoubleSlot'));
      return;
    }
    setError('');
    const ids = [slot.id, nextSlot.id];
    setSelectedSlotIds((current) => (ids.every((id) => current.includes(id)) ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!selectedSlotIds.length) {
      setError(t('booking.selectAtLeastOne'));
      return;
    }
    const form = new FormData(event.currentTarget);
    const payload = {
      studentId,
      timeSlotIds: selectedSlotIds,
      currency,
      topic: String(form.get('topic')),
      additionalInfo: String(form.get('additionalInfo') || '')
    };
    const response = await fetch('/api/bookings/batch', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(payload)});
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || t('common.error'));
      return;
    }
    setResult(data);
  }

  async function markPaid() {
    if (!result) return;
    const response = await fetch(`/api/payments/${result.payment.id}/submitted`, {method: 'POST'});
    if (!response.ok) setError(t('common.error'));
    else window.location.href = `/${locale}/dashboard`;
  }

  async function uploadProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result) return;
    setProofMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/payments/${result.payment.id}/proof`, {method: 'POST', body: form});
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setProofMessage(body.error ?? t('common.error'));
      return;
    }
    setProofMessage(t('booking.proofAdded'));
  }

  if (loading) return <p className="mt-6 font-semibold">{t('common.loading')}</p>;
  if (result) {
    return (
      <section className="card mt-6 p-5">
        <h2 className="text-xl font-bold">{t('booking.planCreated')}</h2>
        <p className="mt-2 text-sm font-semibold text-black/70">{t('booking.planCreatedHint')}</p>
        <div className="mt-4 rounded-md border border-black/10 bg-boka-bg p-4">
          <p className="text-sm font-bold text-black/60">{t('booking.termCalculator')}</p>
          <p className="mt-1 text-3xl font-bold">{result.plan.termCount} x 45 min</p>
          <p className="mt-1 text-sm font-semibold">{result.payment.amount} {result.payment.currency}</p>
        </div>
        <dl className="mt-4 grid gap-3 text-sm font-semibold">
          <div><dt className="text-black/60">{t('booking.recipient')}</dt><dd>{result.payment.instruction?.recipientName ?? t('common.empty')}</dd></div>
          <div><dt className="text-black/60">{t('booking.recipientAddress')}</dt><dd>{result.payment.instruction?.recipientAddress ?? t('common.empty')}</dd></div>
          {result.payment.instruction?.account ? <div><dt className="text-black/60">{t('booking.account')}</dt><dd>{result.payment.instruction.account}</dd></div> : null}
          {result.payment.instruction?.model ? <div><dt className="text-black/60">{t('booking.model')}</dt><dd>{result.payment.instruction.model}</dd></div> : null}
          <div><dt className="text-black/60">{t('booking.reference')}</dt><dd>{result.payment.reference}</dd></div>
          <div><dt className="text-black/60">{t('booking.amount')}</dt><dd>{result.payment.amount} {result.payment.currency}</dd></div>
          <div><dt className="text-black/60">{t('booking.purpose')}</dt><dd>{result.payment.purpose}</dd></div>
          {result.payment.instruction?.foreignInstructions ? <div><dt className="text-black/60">{t('booking.foreignInstructions')}</dt><dd className="whitespace-pre-wrap">{result.payment.instruction.foreignInstructions}</dd></div> : null}
          {result.payment.instruction?.ipsQrPayload ? <div><dt className="text-black/60">IPS QR</dt><dd className="break-all">{result.payment.instruction.ipsQrPayload}</dd></div> : null}
        </dl>
        <div className="mt-4 rounded-md border border-black/10 p-4">
          <h3 className="font-bold">{t('booking.selectedTerms')}</h3>
          <div className="mt-3 grid gap-2 text-sm font-semibold">
            {result.bookings.map((booking) => <p key={booking.id}>{formatter.format(new Date(booking.startsAt))}</p>)}
          </div>
        </div>
        <form onSubmit={uploadProof} className="mt-5 rounded-md border border-black/10 bg-white p-4">
          <label className="block">
            <span className="text-sm font-bold">{t('booking.optionalProof')}</span>
            <input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <button className="mt-3 rounded-md border border-black/20 px-4 py-2 text-sm font-bold">{t('booking.addProof')}</button>
          {proofMessage ? <p className="mt-2 text-sm font-bold">{proofMessage}</p> : null}
        </form>
        <button onClick={markPaid} className="mt-5 rounded-md bg-boka-cta px-5 py-3 font-bold text-black">{t('booking.paid')}</button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="card mt-6 space-y-5 p-5">
      {error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold">{t('booking.student')}</span>
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)} required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3">
            {students.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-bold">{t('booking.teacher')}</span>
          <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)} required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3">
            {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-bold">{t('booking.month')}</span>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
        </label>
        <label className="block">
          <span className="text-sm font-bold">{t('booking.currency')}</span>
          <select value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3">
            {['RSD', 'EUR', 'USD', 'CHF'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{t('booking.freeTerms')}</h2>
            {slotsLoading ? <span className="text-sm font-bold text-black/60">{t('common.loading')}</span> : null}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {days.map((day) => {
              const daySlots = slotsByDay.get(dateKey(day)) ?? [];
              return (
                <details key={dateKey(day)} className="rounded-md border border-black/10 bg-white p-3 open:border-boka-cta">
                  <summary className="cursor-pointer list-none">
                    <span className="block text-sm font-bold">{new Intl.DateTimeFormat(locale, {weekday: 'short', day: 'numeric'}).format(day)}</span>
                    <span className="mt-1 block text-xs font-semibold text-black/60">{daySlots.length ? t('booking.availableCount', {count: daySlots.length}) : t('booking.noTerms')}</span>
                  </summary>
                  <div className="mt-3 grid gap-2">
                    {daySlots.map((slot) => {
                      const active = selectedSlotIds.includes(slot.id);
                      const nextTerm = findNextTerm(slot, daySlots);
                      return (
                        <div key={slot.id} className="rounded-md border border-black/10 p-2">
                          <p className="text-sm font-bold">{timeFormatter.format(new Date(slot.startsAt))}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => toggleSlot(slot)} className={`rounded-md px-2 py-2 text-xs font-bold ${active ? 'bg-boka-cta text-black' : 'border border-black/15 bg-white'}`}>
                              45 min
                            </button>
                            <button type="button" onClick={() => toggleDouble(slot)} disabled={!nextTerm} className="rounded-md border border-black/15 bg-white px-2 py-2 text-xs font-bold disabled:opacity-40">
                              90 min
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
          {!slots.length ? <p className="mt-4 text-sm font-semibold">{t('booking.empty')}</p> : null}
        </section>

        <aside className="rounded-md border border-black/10 bg-boka-bg p-4">
          <h2 className="text-lg font-bold">{t('booking.termCalculator')}</h2>
          <p className="mt-3 text-sm font-bold text-black/60">{t('booking.selectedTerms')}</p>
          <p className="mt-1 text-4xl font-bold">{totalTerms}</p>
          <p className="mt-1 text-sm font-semibold">{t('booking.termFormula')}</p>
          <div className="mt-4 rounded-md bg-white p-3 text-sm font-semibold">
            <div className="flex justify-between gap-3"><span>{t('booking.pricePerTerm')}</span><strong>{pricePerTerm === null ? '-' : `${pricePerTerm.toLocaleString(locale)} ${currency}`}</strong></div>
            <div className="mt-2 flex justify-between gap-3"><span>{t('booking.total')}</span><strong>{totalAmount === null ? '-' : `${totalAmount.toLocaleString(locale)} ${currency}`}</strong></div>
          </div>
          <div className="mt-4 max-h-60 space-y-2 overflow-auto text-sm font-semibold">
            {selectedSlots.map((slot) => (
              <button key={slot.id} type="button" onClick={() => toggleSlot(slot)} className="block w-full rounded-md border border-black/10 bg-white p-2 text-left">
                {formatter.format(new Date(slot.startsAt))}
              </button>
            ))}
            {!selectedSlots.length ? <p className="text-black/60">{t('booking.noSelectedTerms')}</p> : null}
          </div>
        </aside>
      </div>

      <label className="block">
        <span className="text-sm font-bold">{t('booking.topic')}</span>
        <input name="topic" required minLength={2} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <label className="block">
        <span className="text-sm font-bold">{t('booking.details')}</span>
        <textarea name="additionalInfo" rows={4} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <button disabled={!selectedSlotIds.length || !teacherId || !studentId} className="w-full rounded-md bg-boka-cta px-5 py-3 font-bold text-black disabled:opacity-60">{t('booking.reservePlan')}</button>
    </form>
  );
}

function currentMonthValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(value: string) {
  const [year, month] = value.split('-').map(Number);
  const from = new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString();
  const to = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
  return {from, to};
}

function calendarDays(value: string) {
  const [year, month] = value.split('-').map(Number);
  const count = new Date(year, month, 0).getDate();
  return Array.from({length: count}, (_item, index) => new Date(year, month - 1, index + 1));
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function findNextTerm(slot: Slot, daySlots: Slot[]) {
  const startsAt = new Date(slot.startsAt).getTime();
  return daySlots.find((candidate) => new Date(candidate.startsAt).getTime() === startsAt + 60 * 60 * 1000);
}

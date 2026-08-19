'use client';

import {FormEvent, useState} from 'react';

type PaymentRow = {id: string; student: string; amount: string; currency: string; status: string; proofs: {id: string; originalName: string}[]};
type BankRow = {id: string; currency: string; recipientName: string; singleLessonPrice: string; packagePrice: string};
type TeacherOption = {id: string; name: string};
type TeacherBankRow = {id: string; teacher: string; currency: string; recipientName: string; account: string; singleLessonPrice: string; packagePrice: string};

export function AdminPanel({
  payments,
  bank,
  locale,
  teachers,
  teacherBank
}: {
  payments: PaymentRow[];
  bank: BankRow[];
  locale: string;
  teachers: TeacherOption[];
  teacherBank: TeacherBankRow[];
}) {
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

  async function saveTeacherBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/teacher/bank-instructions', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        teacherId: String(form.get('teacherId') || '') || undefined,
        currency: String(form.get('currency')),
        enabled: true,
        recipientName: String(form.get('recipientName')).trim(),
        recipientAddress: String(form.get('recipientAddress')).trim(),
        rsdAccountNumber: String(form.get('rsdAccountNumber')).trim() || null,
        foreignInstructions: String(form.get('foreignInstructions')).trim() || null,
        paymentModel: String(form.get('paymentModel')).trim() || null,
        referenceRule: String(form.get('referenceRule')).trim(),
        paymentPurpose: String(form.get('paymentPurpose')).trim(),
        singleLessonPrice: String(form.get('singleLessonPrice')).trim(),
        packagePrice: String(form.get('packagePrice')).trim()
      })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error ?? 'Racun nije sacuvan.');
      return;
    }
    setMessage('Racun ucitelja je sacuvan.');
    window.location.reload();
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
              {payment.proofs.length ? (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-bold text-black/60">Dokazi uplate</p>
                  {payment.proofs.map((proof) => (
                    <a key={proof.id} href={`/api/payment-proofs/${proof.id}`} className="block text-sm font-bold underline">{proof.originalName}</a>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs font-semibold text-black/60">Nema dodatog dokaza uplate.</p>
              )}
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
        <h2 className="text-xl font-bold">Racun ucitelja</h2>
        <form onSubmit={saveTeacherBank} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">Ucitelj</span>
            <select name="teacherId" required={teachers.length > 1} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3">
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Valuta</span>
            <select name="currency" className="mt-2 w-full rounded-md border border-black/20 px-3 py-3">
              {['RSD', 'EUR', 'USD', 'CHF'].map((currency) => <option key={currency}>{currency}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Naziv primaoca</span>
            <input name="recipientName" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Adresa primaoca</span>
            <input name="recipientAddress" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">RSD racun</span>
            <input name="rsdAccountNumber" className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Model</span>
            <input name="paymentModel" placeholder="npr. 97" className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Pravilo poziva na broj</span>
            <input name="referenceRule" defaultValue="Automatski GWB poziv na broj" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Svrha uplate</span>
            <input name="paymentPurpose" defaultValue="Online cas nemackog jezika" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Cena casa</span>
            <input name="singleLessonPrice" inputMode="decimal" defaultValue="2500.00" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Cena paketa</span>
            <input name="packagePrice" inputMode="decimal" defaultValue="9000.00" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-semibold">Devizne instrukcije</span>
            <textarea name="foreignInstructions" rows={3} className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
          </label>
          <button className="rounded-md bg-boka-cta px-4 py-3 font-bold text-black md:col-span-2">Sacuvaj racun ucitelja</button>
        </form>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {teacherBank.map((item) => (
            <div key={item.id} className="rounded-md border border-black/10 p-3 text-sm">
              <div className="font-bold">{item.teacher} - {item.currency}</div>
              <div>{item.recipientName}</div>
              <div>{item.account || 'Bez RSD racuna'}</div>
              <div>Cas: {item.singleLessonPrice} | Paket: {item.packagePrice}</div>
            </div>
          ))}
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

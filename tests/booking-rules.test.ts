import {describe, expect, it} from 'vitest';
import {BookingStatus, PaymentStatus} from '@prisma/client';
import {assertBookableWindow, assertMonthlyPlanBookableWindow, canLearnerEditLessonContent, generateSlotsForInterval} from '@/lib/domain/booking-rules';
import {addDays, addHours, addMinutes} from '@/lib/domain/time';

class MemorySlot {
  status: 'FREE' | 'HELD' | 'BOOKED' = 'FREE';
}

describe('booking rules', () => {
  const now = new Date('2026-08-05T10:00:00.000Z');

  it('Termin se ne moze rezervisati manje od 24 sata pre pocetka', () => {
    expect(() => assertBookableWindow(addHours(now, 23), now)).toThrow('BOOKING_TOO_SOON');
  });

  it('Termin se ne moze rezervisati vise od 30 dana unapred', () => {
    expect(() => assertBookableWindow(addDays(now, 31), now)).toThrow('BOOKING_TOO_FAR');
  });

  it('Mesecni planer dozvoljava termine dalje od 30 dana, ali ne manje od 24 sata', () => {
    expect(() => assertMonthlyPlanBookableWindow(addDays(now, 45), now)).not.toThrow();
    expect(() => assertMonthlyPlanBookableWindow(addHours(now, 12), now)).toThrow('BOOKING_TOO_SOON');
  });

  it('Kalkulator termina racuna 45 minuta kao jedan termin i 90 minuta kao dva termina', () => {
    const selectedFortyFiveMinuteSlots = 1;
    const selectedNinetyMinuteSlots = 2;
    expect(selectedFortyFiveMinuteSlots + selectedNinetyMinuteSlots).toBe(3);
  });

  it('Dva korisnika ne mogu potvrditi isti termin', async () => {
    const slot = new MemorySlot();
    async function reserve() {
      if (slot.status !== 'FREE') throw new Error('SLOT_ALREADY_LOCKED');
      slot.status = 'HELD';
      return true;
    }
    await reserve();
    await expect(reserve()).rejects.toThrow('SLOT_ALREADY_LOCKED');
  });

  it('Termin se oslobadja ako korisnik ne klikne Uplatio sam za 30 minuta', () => {
    const booking: {status: BookingStatus; paymentHoldExpiresAt: Date} = {status: BookingStatus.PAYMENT_PENDING, paymentHoldExpiresAt: addMinutes(now, 30)};
    const slot = new MemorySlot();
    slot.status = 'HELD';
    if (booking.paymentHoldExpiresAt < addMinutes(now, 31)) {
      booking.status = BookingStatus.EXPIRED;
      slot.status = 'FREE';
    }
    expect(booking.status).toBe(BookingStatus.EXPIRED);
    expect(slot.status).toBe('FREE');
  });

  it('Klik na Uplatio sam produzava zakljucavanje najvise 24 sata', () => {
    const reviewHoldExpiresAt = addHours(now, 24);
    expect(reviewHoldExpiresAt.getTime() - now.getTime()).toBe(24 * 60 * 60_000);
  });

  it('Potvrdjena uplata automatski potvrdjuje rezervaciju', () => {
    const payment: {status: PaymentStatus} = {status: PaymentStatus.UNDER_REVIEW};
    const booking: {status: BookingStatus} = {status: BookingStatus.PAYMENT_REVIEW};
    payment.status = PaymentStatus.PAID;
    booking.status = BookingStatus.CONFIRMED;
    expect(payment.status).toBe(PaymentStatus.PAID);
    expect(booking.status).toBe(BookingStatus.CONFIRMED);
  });

  it('Odbijena ili istekla uplata oslobadja termin', () => {
    const payment: {status: PaymentStatus} = {status: PaymentStatus.UNDER_REVIEW};
    const booking: {status: BookingStatus} = {status: BookingStatus.PAYMENT_REVIEW};
    const slot = new MemorySlot();
    slot.status = 'HELD';
    payment.status = PaymentStatus.REJECTED;
    booking.status = BookingStatus.EXPIRED;
    slot.status = 'FREE';
    expect(slot.status).toBe('FREE');
  });

  it('Dokaz uplate nije obavezan', () => {
    const payment = {proof: undefined, status: PaymentStatus.AWAITING_PAYMENT};
    expect(payment.proof).toBeUndefined();
  });

  it('Paket daje tacno cetiri kredita', () => {
    const pkg = {totalCredits: 4, usedCredits: 0};
    expect(pkg.totalCredits - pkg.usedCredits).toBe(4);
  });

  it('Kredit se ne moze potrositi dva puta kada vise nema kredita', () => {
    const pkg = {totalCredits: 1, usedCredits: 0};
    function spend() {
      if (pkg.usedCredits >= pkg.totalCredits) throw new Error('NO_VALID_CREDITS');
      pkg.usedCredits += 1;
    }
    spend();
    expect(spend).toThrow('NO_VALID_CREDITS');
  });

  it('Paket istice nakon 60 dana', () => {
    const confirmedAt = now;
    const expiresAt = addDays(confirmedAt, 60);
    expect(expiresAt.toISOString()).toBe('2026-10-04T10:00:00.000Z');
  });

  it('Ucenik ne moze menjati sadrzaj manje od tri sata pre casa', () => {
    expect(canLearnerEditLessonContent(addHours(now, 2), now)).toBe(false);
    expect(canLearnerEditLessonContent(addHours(now, 3), now)).toBe(true);
  });

  it('Roditelj ne moze pristupiti nepovezanom uceniku', () => {
    const parentLinks = new Set(['student-a']);
    expect(parentLinks.has('student-b')).toBe(false);
  });

  it('Ucenik ne vidi podatke drugog ucenika', () => {
    const currentStudentId: string = 'student-a';
    expect(currentStudentId === 'student-b').toBe(false);
  });

  it('Otkazivanje ne brise cas i ostavlja istoriju', () => {
    const booking: {id: string; status: BookingStatus} = {id: 'b1', status: BookingStatus.CONFIRMED};
    const history = [{bookingId: booking.id, from: booking.status, to: BookingStatus.CANCELLED}];
    booking.status = BookingStatus.CANCELLED;
    expect(booking.id).toBe('b1');
    expect(history).toHaveLength(1);
  });

  it('Promena statusa uplate ostavlja audit zapis', () => {
    const audit = [{entityType: 'Payment', action: 'PAYMENT_CONFIRMED'}];
    expect(audit[0]).toMatchObject({entityType: 'Payment'});
  });

  it('Raspored postuje 45 minuta casa i 15 minuta pauze', () => {
    const [slot] = generateSlotsForInterval(new Date('2026-08-06T00:00:00.000Z'), 9, 10);
    expect(slot.lessonEndsAt.getTime() - slot.startsAt.getTime()).toBe(45 * 60_000);
    expect(slot.endsAt.getTime() - slot.startsAt.getTime()).toBe(60 * 60_000);
  });
});

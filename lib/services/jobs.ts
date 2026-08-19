import {BookingStatus, PaymentStatus, SlotStatus, CreditAction} from '@prisma/client';
import {prisma} from '@/lib/prisma';

export async function expireUnsubmittedPaymentHolds(now = new Date()) {
  const bookings = await prisma.booking.findMany({
    where: {status: BookingStatus.PAYMENT_PENDING, paymentHoldExpiresAt: {lt: now}},
    include: {payments: true}
  });
  for (const booking of bookings) {
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({where: {id: booking.id}, data: {status: BookingStatus.EXPIRED}});
      await tx.timeSlot.update({where: {id: booking.timeSlotId}, data: {status: SlotStatus.FREE}});
      await tx.bookingStatusHistory.create({data: {bookingId: booking.id, fromStatus: BookingStatus.PAYMENT_PENDING, toStatus: BookingStatus.EXPIRED, reason: 'Payment hold expired'}});
      for (const payment of booking.payments) {
        await tx.payment.update({where: {id: payment.id}, data: {status: PaymentStatus.EXPIRED}});
        await tx.paymentStatusHistory.create({data: {paymentId: payment.id, fromStatus: payment.status, toStatus: PaymentStatus.EXPIRED, reason: 'Payment hold expired'}});
      }
    });
  }
  return bookings.length;
}

export async function expirePaymentReviews(now = new Date()) {
  const bookings = await prisma.booking.findMany({
    where: {status: BookingStatus.PAYMENT_REVIEW, reviewHoldExpiresAt: {lt: now}},
    include: {payments: true}
  });
  for (const booking of bookings) {
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({where: {id: booking.id}, data: {status: BookingStatus.EXPIRED}});
      await tx.timeSlot.update({where: {id: booking.timeSlotId}, data: {status: SlotStatus.FREE}});
      await tx.bookingStatusHistory.create({data: {bookingId: booking.id, fromStatus: BookingStatus.PAYMENT_REVIEW, toStatus: BookingStatus.EXPIRED, reason: 'Payment review expired'}});
      for (const payment of booking.payments) {
        await tx.payment.update({where: {id: payment.id}, data: {status: PaymentStatus.EXPIRED}});
        await tx.paymentStatusHistory.create({data: {paymentId: payment.id, fromStatus: payment.status, toStatus: PaymentStatus.EXPIRED, reason: 'Payment review expired'}});
      }
    });
  }
  return bookings.length;
}

export async function expireLessonPackages(now = new Date()) {
  const packages = await prisma.lessonPackage.findMany({where: {expiresAt: {lt: now}, usedCredits: {lt: 4}}});
  for (const pkg of packages) {
    const remaining = pkg.totalCredits - pkg.usedCredits;
    await prisma.$transaction(async (tx) => {
      await tx.lessonPackage.update({where: {id: pkg.id}, data: {usedCredits: pkg.totalCredits}});
      await tx.creditLedger.create({data: {packageId: pkg.id, studentId: pkg.studentId, action: CreditAction.EXPIRE, amount: -remaining, reason: 'Paket istekao'}});
    });
  }
  return packages.length;
}

export async function sendDueReminders() {
  return 0;
}

export async function sendTeacherMorningSummaries() {
  return 0;
}

export async function runAllJobs() {
  const [holds, reviews, packages, reminders, summaries] = await Promise.all([
    expireUnsubmittedPaymentHolds(),
    expirePaymentReviews(),
    expireLessonPackages(),
    sendDueReminders(),
    sendTeacherMorningSummaries()
  ]);
  return {holds, reviews, packages, reminders, summaries};
}

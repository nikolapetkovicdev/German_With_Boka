import {Booking, Payment, Role} from '@prisma/client';
import {Actor, assertCanAccessStudent} from '@/lib/security/rbac';
import {prisma} from '@/lib/prisma';

type BookingWithTeacher = Pick<Booking, 'studentId' | 'teacherId'>;
type PaymentWithStudent = Pick<Payment, 'studentId'>;

export async function assertCanManageBooking(actor: Actor, booking: BookingWithTeacher) {
  if (actor.role === Role.ADMIN) return;
  if (actor.role === Role.TEACHER) {
    const teacher = await prisma.teacher.findUnique({where: {userId: actor.id}, select: {id: true}});
    if (teacher?.id === booking.teacherId) return;
  }
  throw new Error('FORBIDDEN');
}

export async function assertCanReviewPayment(actor: Actor, payment: PaymentWithStudent) {
  if (actor.role === Role.ADMIN) return;
  if (actor.role === Role.TEACHER) {
    await assertCanAccessStudent(actor, payment.studentId);
    return;
  }
  throw new Error('FORBIDDEN');
}

export async function assertCanDownloadReceipt(actor: Actor, payment: PaymentWithStudent) {
  if (actor.role === Role.ADMIN || actor.role === Role.TEACHER) {
    await assertCanReviewPayment(actor, payment);
    return;
  }
  await assertCanAccessStudent(actor, payment.studentId);
}

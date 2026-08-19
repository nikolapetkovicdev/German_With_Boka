import {BookingStatus, Role} from '@prisma/client';
import {prisma} from '@/lib/prisma';

export type Actor = {
  id: string;
  role: Role;
};

export function assertRole(actor: Actor | null | undefined, roles: Role[]) {
  if (!actor) throw new Error('UNAUTHENTICATED');
  if (!roles.includes(actor.role)) throw new Error('FORBIDDEN');
}

export async function assertCanAccessStudent(actor: Actor, studentId: string) {
  if (actor.role === Role.ADMIN) return;
  if (actor.role === Role.TEACHER) {
    const teacher = await prisma.teacher.findUnique({where: {userId: actor.id}});
    if (!teacher) throw new Error('FORBIDDEN');
    const student = await prisma.student.findFirst({where: {id: studentId, teacherId: teacher.id}, select: {id: true}});
    if (student) return;
  }
  if (actor.role === Role.PARENT) {
    const link = await prisma.parentStudent.findUnique({
      where: {parentId_studentId: {parentId: actor.id, studentId}},
      select: {id: true}
    });
    if (link) return;
  }
  if (actor.role === Role.STUDENT) {
    const student = await prisma.student.findFirst({where: {id: studentId, userId: actor.id}, select: {id: true}});
    if (student) return;
  }
  throw new Error('FORBIDDEN');
}

export async function canSeeBooking(actor: Actor, bookingId: string) {
  const booking = await prisma.booking.findUnique({where: {id: bookingId}, select: {studentId: true, teacher: {select: {userId: true}}}});
  if (!booking) return false;
  if (actor.role === Role.ADMIN) return true;
  if (actor.role === Role.TEACHER) return booking.teacher.userId === actor.id;
  try {
    await assertCanAccessStudent(actor, booking.studentId);
    return true;
  } catch {
    return false;
  }
}

export const activeBookingStatuses: BookingStatus[] = [
  BookingStatus.PAYMENT_PENDING,
  BookingStatus.PAYMENT_REVIEW,
  BookingStatus.CONFIRMED,
  BookingStatus.RESCHEDULED,
  BookingStatus.COMPLETED,
  BookingStatus.NO_SHOW
];

import {BookingStatus, Currency, PaymentKind, PaymentStatus, Role, SlotStatus, CreditAction} from '@prisma/client';
import {Prisma} from '@prisma/client';
import {BOOKING_HOLD_MINUTES, PACKAGE_CREDITS, PACKAGE_VALID_DAYS, PAYMENT_REVIEW_HOURS} from '@/lib/config';
import {prisma} from '@/lib/prisma';
import {Actor, assertCanAccessStudent, assertRole} from '@/lib/security/rbac';
import {assertCanManageBooking, assertCanReviewPayment} from '@/lib/security/permissions';
import {assertBookableWindow, assertMonthlyPlanBookableWindow} from '@/lib/domain/booking-rules';
import {addDays, addHours, addMinutes} from '@/lib/domain/time';
import {notificationProvider} from '@/lib/providers/notification-provider';
import {paymentProvider} from '@/lib/providers/payment-provider';
import {fileStorageProvider} from '@/lib/providers/file-storage-provider';
import {emailProvider} from '@/lib/providers/email-provider';

export async function listVisibleStudents(actor: Actor) {
  if (actor.role === Role.ADMIN) return prisma.student.findMany({include: {parents: {include: {parent: {include: {profile: true}}}}}, orderBy: {createdAt: 'desc'}});
  if (actor.role === Role.TEACHER) {
    const teacher = await prisma.teacher.findUnique({where: {userId: actor.id}});
    return teacher ? prisma.student.findMany({where: {teacherId: teacher.id}, orderBy: {createdAt: 'desc'}}) : [];
  }
  if (actor.role === Role.PARENT) {
    const links = await prisma.parentStudent.findMany({where: {parentId: actor.id}, include: {student: true}});
    return links.map((link) => link.student);
  }
  return prisma.student.findMany({where: {userId: actor.id}});
}

export async function listFreeSlots(actor: Actor, input?: {from?: Date; to?: Date; teacherId?: string}) {
  assertRole(actor, [Role.ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT]);
  const from = input?.from ?? addHours(new Date(), 24);
  const to = input?.to ?? addDays(new Date(), 90);
  return prisma.timeSlot.findMany({
    where: {
      status: SlotStatus.FREE,
      startsAt: {gte: from, lte: to},
      ...(input?.teacherId ? {teacherId: input.teacherId} : {})
    },
    include: {teacher: {include: {user: {include: {profile: true}}}}},
    orderBy: {startsAt: 'asc'},
    take: 500
  });
}

export async function createBookingWithPayment(input: {
  actor: Actor;
  studentId: string;
  timeSlotId: string;
  currency: Currency;
  kind: PaymentKind;
  topic: string;
  lessons?: string;
  questions?: string;
  additionalInfo?: string;
}) {
  await assertCanAccessStudent(input.actor, input.studentId);
  const slot = await prisma.timeSlot.findUnique({where: {id: input.timeSlotId}, include: {teacher: true}});
  if (!slot || slot.status !== SlotStatus.FREE) throw new Error('SLOT_NOT_AVAILABLE');
  assertBookableWindow(slot.startsAt);

  const instruction =
    (await prisma.teacherBankInstruction.findUnique({where: {teacherId_currency: {teacherId: slot.teacherId, currency: input.currency}}})) ??
    (await prisma.bankAccountInstruction.findUnique({where: {currency: input.currency}}));
  if (!instruction?.enabled) throw new Error('CURRENCY_NOT_ENABLED');
  const amount = input.kind === PaymentKind.PACKAGE_4 ? instruction.packagePrice : instruction.singleLessonPrice;
  const reference = `GWB-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.timeSlot.updateMany({where: {id: slot.id, status: SlotStatus.FREE}, data: {status: SlotStatus.HELD}});
    if (locked.count !== 1) throw new Error('SLOT_ALREADY_LOCKED');
    const booking = await tx.booking.create({
      data: {
        timeSlotId: slot.id,
        startsAt: slot.startsAt,
        teacherId: slot.teacherId,
        studentId: input.studentId,
        bookedById: input.actor.id,
        status: BookingStatus.PAYMENT_PENDING,
        paymentHoldExpiresAt: addMinutes(now, BOOKING_HOLD_MINUTES),
        content: {
          create: {
            studentId: input.studentId,
            topic: input.topic,
            lessons: input.lessons,
            questions: input.questions,
            additionalInfo: input.additionalInfo
          }
        }
      }
    });
    const payment = await tx.payment.create({
      data: {
        bookingId: booking.id,
        studentId: input.studentId,
        payerId: input.actor.id,
        kind: input.kind,
        status: PaymentStatus.AWAITING_PAYMENT,
        amount,
        currency: input.currency,
        reference,
        purpose: input.kind === PaymentKind.PACKAGE_4 ? 'Paket od 4 online casa nemackog jezika' : instruction.paymentPurpose,
        expiresAt: addMinutes(now, BOOKING_HOLD_MINUTES)
      }
    });
    await tx.bookingStatusHistory.create({data: {bookingId: booking.id, toStatus: BookingStatus.PAYMENT_PENDING, changedById: input.actor.id}});
    await tx.paymentStatusHistory.create({data: {paymentId: payment.id, toStatus: PaymentStatus.AWAITING_PAYMENT, changedById: input.actor.id}});
    await tx.auditLog.create({data: {actorId: input.actor.id, entityType: 'Booking', entityId: booking.id, action: 'BOOKING_HOLD_CREATED'}});
    return {
      booking,
      payment: {
        ...payment,
        instruction: paymentProvider.buildInstruction({
          recipientName: instruction.recipientName,
          recipientAddress: instruction.recipientAddress,
          amount: payment.amount.toString(),
          currency: payment.currency,
          account: instruction.rsdAccountNumber,
          foreignInstructions: instruction.foreignInstructions,
          model: instruction.paymentModel,
          reference: payment.reference,
          purpose: payment.purpose
        })
      }
    };
  });
  await sendBookingSummaryNotification(result.booking.id);
  return result;
}

export async function createMonthlyBookingPlan(input: {
  actor: Actor;
  studentId: string;
  timeSlotIds: string[];
  currency: Currency;
  topic: string;
  additionalInfo?: string;
}) {
  await assertCanAccessStudent(input.actor, input.studentId);
  const uniqueSlotIds = [...new Set(input.timeSlotIds)].filter(Boolean);
  if (!uniqueSlotIds.length) throw new Error('NO_SLOTS_SELECTED');
  if (uniqueSlotIds.length > 80) throw new Error('TOO_MANY_SLOTS_SELECTED');

  const slots = await prisma.timeSlot.findMany({
    where: {id: {in: uniqueSlotIds}},
    include: {teacher: {include: {user: {include: {profile: true}}}}}
  });
  if (slots.length !== uniqueSlotIds.length) throw new Error('SLOT_NOT_AVAILABLE');
  if (slots.some((slot) => slot.status !== SlotStatus.FREE)) throw new Error('SLOT_NOT_AVAILABLE');
  const teacherId = slots[0].teacherId;
  if (slots.some((slot) => slot.teacherId !== teacherId)) throw new Error('SLOTS_MUST_HAVE_SAME_TEACHER');
  for (const slot of slots) assertMonthlyPlanBookableWindow(slot.startsAt);

  const sortedSlots = slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const instruction =
    (await prisma.teacherBankInstruction.findUnique({where: {teacherId_currency: {teacherId, currency: input.currency}}})) ??
    (await prisma.bankAccountInstruction.findUnique({where: {currency: input.currency}}));
  if (!instruction?.enabled) throw new Error('CURRENCY_NOT_ENABLED');
  const termCount = sortedSlots.length;
  const amount = new Prisma.Decimal(instruction.singleLessonPrice).mul(termCount);
  const reference = `GWB-PLAN-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const purpose = `Mesecni plan ${termCount} termina online casa nemackog jezika`;

  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.timeSlot.updateMany({where: {id: {in: uniqueSlotIds}, status: SlotStatus.FREE}, data: {status: SlotStatus.BOOKED}});
    if (locked.count !== uniqueSlotIds.length) throw new Error('SLOT_ALREADY_LOCKED');
    const plan = await tx.bookingPlan.create({
      data: {
        studentId: input.studentId,
        teacherId,
        bookedById: input.actor.id,
        status: PaymentStatus.AWAITING_PAYMENT,
        termCount,
        amount,
        currency: input.currency,
        reference,
        purpose
      }
    });
    const bookings = [];
    for (const slot of sortedSlots) {
      const booking = await tx.booking.create({
        data: {
          planId: plan.id,
          timeSlotId: slot.id,
          startsAt: slot.startsAt,
          teacherId,
          studentId: input.studentId,
          bookedById: input.actor.id,
          status: BookingStatus.CONFIRMED,
          confirmedAt: new Date(),
          content: {
            create: {
              studentId: input.studentId,
              topic: input.topic,
              additionalInfo: input.additionalInfo
            }
          }
        }
      });
      await tx.bookingStatusHistory.create({data: {bookingId: booking.id, toStatus: BookingStatus.CONFIRMED, changedById: input.actor.id, reason: 'Mesecni planer termina'}});
      bookings.push(booking);
    }
    const payment = await tx.payment.create({
      data: {
        planId: plan.id,
        studentId: input.studentId,
        payerId: input.actor.id,
        kind: PaymentKind.SINGLE_LESSON,
        status: PaymentStatus.AWAITING_PAYMENT,
        amount,
        currency: input.currency,
        reference,
        purpose
      }
    });
    await tx.paymentStatusHistory.create({data: {paymentId: payment.id, toStatus: PaymentStatus.AWAITING_PAYMENT, changedById: input.actor.id, reason: 'Mesecni planer termina'}});
    await tx.auditLog.create({data: {actorId: input.actor.id, entityType: 'BookingPlan', entityId: plan.id, action: 'BOOKING_PLAN_CREATED', metadata: {termCount}}});
    return {
      plan,
      bookings,
      payment: {
        ...payment,
        instruction: paymentProvider.buildInstruction({
          recipientName: instruction.recipientName,
          recipientAddress: instruction.recipientAddress,
          amount: payment.amount.toString(),
          currency: payment.currency,
          account: instruction.rsdAccountNumber,
          foreignInstructions: instruction.foreignInstructions,
          model: instruction.paymentModel,
          reference: payment.reference,
          purpose: payment.purpose
        })
      }
    };
  }, {isolationLevel: Prisma.TransactionIsolationLevel.Serializable});

  await sendBookingPlanSummaryNotification(result.plan.id);
  return result;
}

async function sendBookingSummaryNotification(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: {id: bookingId},
      include: {
        student: {include: {parents: {include: {parent: {include: {profile: true}}}}}},
        teacher: {include: {user: {include: {profile: true}}}},
        payments: true,
        content: true
      }
    });
    if (!booking) return;
    const payment = booking.payments[0];
    const teacherName = booking.teacher.user.profile ? `${booking.teacher.user.profile.firstName} ${booking.teacher.user.profile.lastName}` : booking.teacher.displayName;
    const parentNames = booking.student.parents
      .map((link) => (link.parent.profile ? `${link.parent.profile.firstName} ${link.parent.profile.lastName}` : link.parent.email))
      .join(', ');
    const startsAt = new Intl.DateTimeFormat('sr-RS', {dateStyle: 'medium', timeStyle: 'short', timeZone: booking.teacher.timeZone}).format(booking.startsAt);
    const subject = `Novi termin je rezervisan - ${booking.student.firstName} ${booking.student.lastName}`;
    const lines = [
      `Zdravo ${teacherName},`,
      '',
      'Rezervisan je novi termin.',
      '',
      `Ucenik: ${booking.student.firstName} ${booking.student.lastName}`,
      parentNames ? `Roditelj: ${parentNames}` : null,
      `Termin: ${startsAt}`,
      `Trajanje: 45 minuta`,
      booking.content?.topic ? `Tema: ${booking.content.topic}` : null,
      payment ? `Iznos: ${payment.amount.toString()} ${payment.currency}` : null,
      payment ? `Poziv na broj: ${payment.reference}` : null,
      `Status: ${booking.status}`,
      '',
      'Ovo je automatska notifikacija iz German with Boka aplikacije.'
    ].filter(Boolean) as string[];
    const text = lines.join('\n');
    const to = process.env.TEACHER_NOTIFICATION_EMAIL || booking.teacher.user.email;

    await notificationProvider.send(booking.teacher.userId, 'Novi termin je rezervisan', text, booking.teacher.user.profile?.locale ?? 'sr', true);
    const email = await emailProvider.send({
      to,
      subject,
      text,
      html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${escapeHtml(text)}</pre>`
    });
    await prisma.auditLog.create({
      data: {
        actorId: booking.bookedById,
        entityType: 'Booking',
        entityId: booking.id,
        action: email.sent ? 'BOOKING_EMAIL_SENT' : 'BOOKING_EMAIL_MOCKED',
        metadata: {to, mode: email.mode, providerId: email.providerId, error: email.error}
      }
    });
  } catch (error) {
    await prisma.auditLog.create({
      data: {
        entityType: 'Booking',
        entityId: bookingId,
        action: 'BOOKING_EMAIL_FAILED',
        reason: error instanceof Error ? error.message : 'Unknown email error'
      }
    });
  }
}

async function sendBookingPlanSummaryNotification(planId: string) {
  try {
    const plan = await prisma.bookingPlan.findUnique({
      where: {id: planId},
      include: {
        student: {include: {parents: {include: {parent: {include: {profile: true}}}}}},
        teacher: {include: {user: {include: {profile: true}}}},
        bookedBy: {include: {profile: true}},
        bookings: {orderBy: {startsAt: 'asc'}},
        payments: true
      }
    });
    if (!plan) return;
    const teacherName = plan.teacher.user.profile ? `${plan.teacher.user.profile.firstName} ${plan.teacher.user.profile.lastName}` : plan.teacher.displayName;
    const parentNames = plan.student.parents
      .map((link) => (link.parent.profile ? `${link.parent.profile.firstName} ${link.parent.profile.lastName}` : link.parent.email))
      .join(', ');
    const formatter = new Intl.DateTimeFormat('sr-RS', {dateStyle: 'medium', timeStyle: 'short', timeZone: plan.teacher.timeZone});
    const slots = plan.bookings.map((booking) => `- ${formatter.format(booking.startsAt)} (45 min, 1 termin)`);
    const subject = `Novi mesecni termini - ${plan.student.firstName} ${plan.student.lastName}`;
    const text = [
      `Zdravo ${teacherName},`,
      '',
      'Rezervisani su novi termini kroz mesecni planer.',
      '',
      `Ucenik: ${plan.student.firstName} ${plan.student.lastName}`,
      parentNames ? `Roditelj: ${parentNames}` : null,
      `Ukupno termina: ${plan.termCount}`,
      `Cena ukupno: ${plan.amount.toString()} ${plan.currency}`,
      `Poziv na broj: ${plan.reference}`,
      '',
      'Termini:',
      ...slots,
      '',
      'Ovo je automatska notifikacija iz German with Boka aplikacije.'
    ].filter(Boolean).join('\n');
    const to = process.env.TEACHER_NOTIFICATION_EMAIL || plan.teacher.user.email;

    await notificationProvider.send(plan.teacher.userId, 'Novi mesecni termini su rezervisani', text, plan.teacher.user.profile?.locale ?? 'sr', true);
    const email = await emailProvider.send({
      to,
      subject,
      text,
      html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${escapeHtml(text)}</pre>`
    });
    await prisma.auditLog.create({
      data: {
        actorId: plan.bookedById,
        entityType: 'BookingPlan',
        entityId: plan.id,
        action: email.sent ? 'BOOKING_PLAN_EMAIL_SENT' : 'BOOKING_PLAN_EMAIL_MOCKED',
        metadata: {to, mode: email.mode, providerId: email.providerId, error: email.error}
      }
    });
  } catch (error) {
    await prisma.auditLog.create({
      data: {
        entityType: 'BookingPlan',
        entityId: planId,
        action: 'BOOKING_PLAN_EMAIL_FAILED',
        reason: error instanceof Error ? error.message : 'Unknown email error'
      }
    });
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function markPaymentSubmitted(actor: Actor, bookingId: string) {
  const booking = await prisma.booking.findUnique({where: {id: bookingId}, include: {payments: true}});
  if (!booking) throw new Error('BOOKING_NOT_FOUND');
  await assertCanAccessStudent(actor, booking.studentId);
  if (booking.status !== BookingStatus.PAYMENT_PENDING || !booking.paymentHoldExpiresAt || booking.paymentHoldExpiresAt < new Date()) {
    throw new Error('PAYMENT_HOLD_EXPIRED');
  }
  const payment = booking.payments[0];
  return prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: {id: booking.id},
      data: {status: BookingStatus.PAYMENT_REVIEW, reviewHoldExpiresAt: addHours(new Date(), PAYMENT_REVIEW_HOURS)}
    });
    await tx.payment.update({
      where: {id: payment.id},
      data: {status: PaymentStatus.UNDER_REVIEW, proofSubmittedAt: new Date(), expiresAt: addHours(new Date(), PAYMENT_REVIEW_HOURS)}
    });
    await tx.bookingStatusHistory.create({data: {bookingId: booking.id, fromStatus: BookingStatus.PAYMENT_PENDING, toStatus: BookingStatus.PAYMENT_REVIEW, changedById: actor.id}});
    await tx.paymentStatusHistory.create({data: {paymentId: payment.id, fromStatus: payment.status, toStatus: PaymentStatus.UNDER_REVIEW, changedById: actor.id}});
    await tx.auditLog.create({data: {actorId: actor.id, entityType: 'Payment', entityId: payment.id, action: 'PAYMENT_MARKED_SUBMITTED'}});
    return {ok: true};
  });
}

export async function markPaymentSubmittedByPayment(actor: Actor, paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: {id: paymentId},
    include: {booking: true, plan: {include: {bookings: true}}}
  });
  if (!payment) throw new Error('PAYMENT_NOT_FOUND');
  await assertCanAccessStudent(actor, payment.studentId);
  if (payment.status !== PaymentStatus.AWAITING_PAYMENT) throw new Error('PAYMENT_SUBMISSION_NOT_ALLOWED');
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: {id: payment.id},
      data: {status: PaymentStatus.UNDER_REVIEW, proofSubmittedAt: now, expiresAt: addHours(now, PAYMENT_REVIEW_HOURS)}
    });
    await tx.paymentStatusHistory.create({
      data: {paymentId: payment.id, fromStatus: payment.status, toStatus: PaymentStatus.UNDER_REVIEW, changedById: actor.id}
    });
    if (payment.booking) {
      if (payment.booking.status !== BookingStatus.PAYMENT_PENDING || !payment.booking.paymentHoldExpiresAt || payment.booking.paymentHoldExpiresAt < now) {
        throw new Error('PAYMENT_HOLD_EXPIRED');
      }
      await tx.booking.update({
        where: {id: payment.booking.id},
        data: {status: BookingStatus.PAYMENT_REVIEW, reviewHoldExpiresAt: addHours(now, PAYMENT_REVIEW_HOURS)}
      });
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: payment.booking.id,
          fromStatus: payment.booking.status,
          toStatus: BookingStatus.PAYMENT_REVIEW,
          changedById: actor.id
        }
      });
    }
    if (payment.plan) {
      await tx.bookingPlan.update({where: {id: payment.plan.id}, data: {status: PaymentStatus.UNDER_REVIEW, proofSubmittedAt: now}});
      for (const booking of payment.plan.bookings) {
        await tx.booking.update({
          where: {id: booking.id},
          data: {status: BookingStatus.PAYMENT_REVIEW, reviewHoldExpiresAt: addHours(now, PAYMENT_REVIEW_HOURS)}
        });
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: booking.status,
            toStatus: BookingStatus.PAYMENT_REVIEW,
            changedById: actor.id,
            reason: 'Mesecna uplata oznacena'
          }
        });
      }
    }
    await tx.auditLog.create({data: {actorId: actor.id, entityType: 'Payment', entityId: payment.id, action: 'PAYMENT_MARKED_SUBMITTED'}});
    return {ok: true};
  });
}

export async function uploadPaymentProof(actor: Actor, paymentId: string, file: File) {
  const payment = await prisma.payment.findUnique({where: {id: paymentId}});
  if (!payment) throw new Error('PAYMENT_NOT_FOUND');
  await assertCanAccessStudent(actor, payment.studentId);
  if (
    payment.status !== PaymentStatus.AWAITING_PAYMENT &&
    payment.status !== PaymentStatus.UNDER_REVIEW &&
    payment.status !== PaymentStatus.PROOF_SUBMITTED
  ) {
    throw new Error('PAYMENT_PROOF_NOT_ALLOWED');
  }
  const stored = await fileStorageProvider.savePrivateFile(file);
  const proof = await prisma.paymentProof.create({
    data: {
      paymentId: payment.id,
      uploadedById: actor.id,
      originalName: file.name || 'payment-proof',
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      byteSize: stored.byteSize
    },
    select: {id: true, originalName: true, mimeType: true, byteSize: true, createdAt: true}
  });
  await prisma.auditLog.create({data: {actorId: actor.id, entityType: 'Payment', entityId: payment.id, action: 'PAYMENT_PROOF_UPLOADED'}});
  return proof;
}

export async function loadPaymentProof(actor: Actor, proofId: string) {
  const proof = await prisma.paymentProof.findUnique({where: {id: proofId}, include: {payment: true}});
  if (!proof) throw new Error('PAYMENT_PROOF_NOT_FOUND');
  if (actor.role === Role.ADMIN || actor.role === Role.TEACHER) {
    await assertCanReviewPayment(actor, proof.payment);
  } else {
    await assertCanAccessStudent(actor, proof.payment.studentId);
  }
  const loaded = await fileStorageProvider.readPrivateFile(proof.storageKey, proof.mimeType);
  return {proof, ...loaded};
}

export async function confirmPayment(actor: Actor, paymentId: string) {
  assertRole(actor, [Role.ADMIN, Role.TEACHER]);
  const payment = await prisma.payment.findUnique({where: {id: paymentId}, include: {booking: true, plan: {include: {bookings: true}}}});
  if (!payment) throw new Error('PAYMENT_NOT_FOUND');
  await assertCanReviewPayment(actor, payment);
  return prisma.$transaction(async (tx) => {
    await tx.payment.update({where: {id: payment.id}, data: {status: PaymentStatus.PAID, paidAt: new Date()}});
    await tx.paymentStatusHistory.create({data: {paymentId: payment.id, fromStatus: payment.status, toStatus: PaymentStatus.PAID, changedById: actor.id}});
    if (payment.booking) {
      await tx.booking.update({where: {id: payment.booking.id}, data: {status: BookingStatus.CONFIRMED, confirmedAt: new Date()}});
      await tx.timeSlot.update({where: {id: payment.booking.timeSlotId}, data: {status: SlotStatus.BOOKED}});
      await tx.bookingStatusHistory.create({data: {bookingId: payment.booking.id, fromStatus: payment.booking.status, toStatus: BookingStatus.CONFIRMED, changedById: actor.id}});
    }
    if (payment.plan) {
      await tx.bookingPlan.update({where: {id: payment.plan.id}, data: {status: PaymentStatus.PAID, paidAt: new Date()}});
      for (const booking of payment.plan.bookings) {
        await tx.booking.update({where: {id: booking.id}, data: {status: BookingStatus.CONFIRMED, confirmedAt: new Date()}});
        await tx.timeSlot.update({where: {id: booking.timeSlotId}, data: {status: SlotStatus.BOOKED}});
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: booking.status,
            toStatus: BookingStatus.CONFIRMED,
            changedById: actor.id,
            reason: 'Potvrdjena mesecna uplata'
          }
        });
      }
    }
    if (payment.kind === PaymentKind.PACKAGE_4) {
      const pkg = await tx.lessonPackage.create({
        data: {studentId: payment.studentId, paymentId: payment.id, totalCredits: PACKAGE_CREDITS, usedCredits: 0, expiresAt: addDays(new Date(), PACKAGE_VALID_DAYS)}
      });
      await tx.creditLedger.create({data: {packageId: pkg.id, studentId: payment.studentId, action: CreditAction.GRANT, amount: PACKAGE_CREDITS, reason: 'Potvrdjena uplata paketa', createdById: actor.id}});
    }
    await tx.auditLog.create({data: {actorId: actor.id, entityType: 'Payment', entityId: payment.id, action: 'PAYMENT_CONFIRMED'}});
    return {ok: true};
  });
}

export async function rejectPayment(actor: Actor, paymentId: string, reason: string) {
  assertRole(actor, [Role.ADMIN, Role.TEACHER]);
  const payment = await prisma.payment.findUnique({where: {id: paymentId}, include: {booking: true, plan: {include: {bookings: true}}}});
  if (!payment) throw new Error('PAYMENT_NOT_FOUND');
  await assertCanReviewPayment(actor, payment);
  return prisma.$transaction(async (tx) => {
    await tx.payment.update({where: {id: payment.id}, data: {status: PaymentStatus.REJECTED}});
    await tx.paymentStatusHistory.create({data: {paymentId: payment.id, fromStatus: payment.status, toStatus: PaymentStatus.REJECTED, changedById: actor.id, reason}});
    if (payment.booking) {
      await tx.booking.update({where: {id: payment.booking.id}, data: {status: BookingStatus.EXPIRED}});
      await tx.timeSlot.update({where: {id: payment.booking.timeSlotId}, data: {status: SlotStatus.FREE}});
      await tx.bookingStatusHistory.create({data: {bookingId: payment.booking.id, fromStatus: payment.booking.status, toStatus: BookingStatus.EXPIRED, changedById: actor.id, reason}});
    }
    if (payment.plan) {
      await tx.bookingPlan.update({where: {id: payment.plan.id}, data: {status: PaymentStatus.REJECTED}});
      for (const booking of payment.plan.bookings) {
        await tx.booking.update({where: {id: booking.id}, data: {status: BookingStatus.EXPIRED}});
        await tx.timeSlot.update({where: {id: booking.timeSlotId}, data: {status: SlotStatus.FREE}});
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: booking.status,
            toStatus: BookingStatus.EXPIRED,
            changedById: actor.id,
            reason
          }
        });
      }
    }
    await tx.auditLog.create({data: {actorId: actor.id, entityType: 'Payment', entityId: payment.id, action: 'PAYMENT_REJECTED', reason}});
    return {ok: true};
  });
}

export async function cancelBooking(actor: Actor, bookingId: string, reason: string) {
  const booking = await prisma.booking.findUnique({where: {id: bookingId}, include: {payments: true, student: {include: {parents: true, user: true}}, teacher: true}});
  if (!booking) throw new Error('BOOKING_NOT_FOUND');
  if (actor.role === Role.ADMIN || actor.role === Role.TEACHER) {
    await assertCanManageBooking(actor, booking);
  } else {
    await assertCanAccessStudent(actor, booking.studentId);
  }
  return prisma.$transaction(async (tx) => {
    await tx.booking.update({where: {id: booking.id}, data: {status: BookingStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason}});
    await tx.timeSlot.update({where: {id: booking.timeSlotId}, data: {status: SlotStatus.FREE}});
    await tx.bookingStatusHistory.create({data: {bookingId: booking.id, fromStatus: booking.status, toStatus: BookingStatus.CANCELLED, changedById: actor.id, reason}});
    for (const payment of booking.payments.filter((p) => p.status === PaymentStatus.PAID)) {
      await tx.payment.update({where: {id: payment.id}, data: {status: PaymentStatus.REFUND_PENDING}});
      await tx.refund.create({data: {paymentId: payment.id, bookingId: booking.id, reason, amount: payment.amount, currency: payment.currency}});
    }
    await tx.auditLog.create({data: {actorId: actor.id, entityType: 'Booking', entityId: booking.id, action: 'BOOKING_CANCELLED', reason}});
    return {ok: true};
  });
}

export async function postponeBooking(actor: Actor, bookingId: string, reason: string) {
  assertRole(actor, [Role.ADMIN, Role.TEACHER]);
  const booking = await prisma.booking.findUnique({where: {id: bookingId}, include: {payments: true}});
  if (!booking) throw new Error('BOOKING_NOT_FOUND');
  await assertCanManageBooking(actor, booking);
  if (booking.status !== BookingStatus.PAYMENT_REVIEW && booking.status !== BookingStatus.CONFIRMED) throw new Error('BOOKING_CANNOT_BE_POSTPONED');
  return prisma.$transaction(async (tx) => {
    await tx.booking.update({where: {id: booking.id}, data: {status: BookingStatus.RESCHEDULED, cancelReason: reason}});
    await tx.timeSlot.update({where: {id: booking.timeSlotId}, data: {status: SlotStatus.FREE}});
    await tx.bookingStatusHistory.create({data: {bookingId: booking.id, fromStatus: booking.status, toStatus: BookingStatus.RESCHEDULED, changedById: actor.id, reason}});
    await tx.auditLog.create({data: {actorId: actor.id, entityType: 'Booking', entityId: booking.id, action: 'BOOKING_POSTPONED', reason}});
    return {ok: true};
  });
}

export async function completeBooking(actor: Actor, bookingId: string, actualMinutes?: number) {
  assertRole(actor, [Role.ADMIN, Role.TEACHER]);
  const booking = await prisma.booking.findUnique({where: {id: bookingId}});
  if (!booking) throw new Error('BOOKING_NOT_FOUND');
  await assertCanManageBooking(actor, booking);
  if (booking.status !== BookingStatus.CONFIRMED) throw new Error('BOOKING_NOT_CONFIRMED');
  return prisma.$transaction(async (tx) => {
    await tx.booking.update({where: {id: booking.id}, data: {status: BookingStatus.COMPLETED}});
    await tx.teacherLessonNote.upsert({
      where: {bookingId: booking.id},
      create: {bookingId: booking.id, attendance: 'PRESENT', actualMinutes: actualMinutes ?? 45},
      update: {attendance: 'PRESENT', actualMinutes: actualMinutes ?? 45}
    });
    await tx.bookingStatusHistory.create({data: {bookingId: booking.id, fromStatus: booking.status, toStatus: BookingStatus.COMPLETED, changedById: actor.id}});
    await tx.auditLog.create({data: {actorId: actor.id, entityType: 'Booking', entityId: booking.id, action: 'BOOKING_COMPLETED'}});
    return {ok: true};
  });
}

export async function markNoShow(actor: Actor, bookingId: string, reason: string) {
  assertRole(actor, [Role.ADMIN, Role.TEACHER]);
  const booking = await prisma.booking.findUnique({where: {id: bookingId}});
  if (!booking) throw new Error('BOOKING_NOT_FOUND');
  await assertCanManageBooking(actor, booking);
  if (booking.status !== BookingStatus.CONFIRMED) throw new Error('BOOKING_NOT_CONFIRMED');
  return prisma.$transaction(async (tx) => {
    await tx.booking.update({where: {id: booking.id}, data: {status: BookingStatus.NO_SHOW}});
    await tx.teacherLessonNote.upsert({
      where: {bookingId: booking.id},
      create: {bookingId: booking.id, attendance: 'ABSENT', privateNote: reason},
      update: {attendance: 'ABSENT', privateNote: reason}
    });
    await tx.bookingStatusHistory.create({data: {bookingId: booking.id, fromStatus: booking.status, toStatus: BookingStatus.NO_SHOW, changedById: actor.id, reason}});
    await tx.auditLog.create({data: {actorId: actor.id, entityType: 'Booking', entityId: booking.id, action: 'BOOKING_NO_SHOW', reason}});
    return {ok: true};
  });
}

export async function spendCredit(actor: Actor, studentId: string, bookingId: string) {
  await assertCanAccessStudent(actor, studentId);
  return prisma.$transaction(async (tx) => {
    const pkg = await tx.lessonPackage.findFirst({
      where: {studentId, expiresAt: {gt: new Date()}, usedCredits: {lt: PACKAGE_CREDITS}},
      orderBy: {expiresAt: 'asc'}
    });
    if (!pkg) throw new Error('NO_VALID_CREDITS');
    await tx.lessonPackage.update({where: {id: pkg.id}, data: {usedCredits: {increment: 1}}});
    await tx.creditLedger.create({data: {packageId: pkg.id, studentId, bookingId, action: CreditAction.SPEND, amount: -1, reason: 'Zakazan cas kreditom', createdById: actor.id}});
    await tx.auditLog.create({data: {actorId: actor.id, entityType: 'LessonPackage', entityId: pkg.id, action: 'CREDIT_SPENT'}});
    return {ok: true};
  }, {isolationLevel: Prisma.TransactionIsolationLevel.Serializable});
}

export async function notifyBookingUsers(bookingId: string, title: string, body: string) {
  const booking = await prisma.booking.findUnique({where: {id: bookingId}, include: {student: {include: {parents: true, user: {include: {profile: true}}}}, teacher: {include: {user: {include: {profile: true}}}}}});
  if (!booking) return;
  const targets = new Set<string>([booking.teacher.userId]);
  if (booking.student.userId) targets.add(booking.student.userId);
  booking.student.parents.forEach((link) => targets.add(link.parentId));
  await Promise.all([...targets].map((userId) => notificationProvider.send(userId, title, body, 'sr', true)));
}

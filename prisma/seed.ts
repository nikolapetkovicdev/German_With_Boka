import {PrismaClient, Role, Currency, SlotStatus, BookingStatus, PaymentKind, PaymentStatus, CreditAction} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const TZ = 'Europe/Belgrade';
const password = 'DemoPassword123!';

function dayUtc(offsetDays: number, hour = 9, minute = 0) {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays, hour, minute, 0));
  return date;
}

async function createUser(email: string, role: Role, firstName: string, lastName: string) {
  return prisma.user.upsert({
    where: {email},
    update: {},
    create: {
      email,
      role,
      passwordHash: await bcrypt.hash(password, 12),
      profile: {create: {firstName, lastName, locale: 'sr'}},
      notificationPrefs: {create: {reminderMinutes: [1440, 60], optionalNotifications: true}}
    },
    include: {profile: true}
  });
}

async function main() {
  const admin = await createUser('admin@germanwithboka.local', Role.ADMIN, 'Boka', 'Admin');
  const teacherUser = await createUser('teacher@germanwithboka.local', Role.TEACHER, 'Bojana', 'Nikolic');
  const parent = await createUser('parent@germanwithboka.local', Role.PARENT, 'Marko', 'Petrovic');
  const studentUser = await createUser('student@germanwithboka.local', Role.STUDENT, 'Lena', 'Jovanovic');

  const teacher = await prisma.teacher.upsert({
    where: {userId: teacherUser.id},
    update: {},
    create: {userId: teacherUser.id, displayName: 'German with Boka', timeZone: TZ, morningSummary: '08:00'}
  });

  const childOne = await prisma.student.upsert({
    where: {id: 'seed-child-one'},
    update: {},
    create: {id: 'seed-child-one', teacherId: teacher.id, firstName: 'Mila', lastName: 'Petrovic'}
  });
  const childTwo = await prisma.student.upsert({
    where: {id: 'seed-child-two'},
    update: {},
    create: {id: 'seed-child-two', teacherId: teacher.id, firstName: 'Nikola', lastName: 'Petrovic'}
  });
  const soloStudent = await prisma.student.upsert({
    where: {id: 'seed-solo-student'},
    update: {},
    create: {id: 'seed-solo-student', teacherId: teacher.id, userId: studentUser.id, firstName: 'Lena', lastName: 'Jovanovic'}
  });

  await prisma.parentStudent.upsert({
    where: {parentId_studentId: {parentId: parent.id, studentId: childOne.id}},
    update: {},
    create: {parentId: parent.id, studentId: childOne.id}
  });
  await prisma.parentStudent.upsert({
    where: {parentId_studentId: {parentId: parent.id, studentId: childTwo.id}},
    update: {},
    create: {parentId: parent.id, studentId: childTwo.id}
  });

  for (const currency of Object.values(Currency)) {
    await prisma.bankAccountInstruction.upsert({
      where: {currency},
      update: {},
      create: {
        currency,
        enabled: true,
        recipientName: 'German with Boka - demo',
        recipientAddress: 'Podesiti stvarnu adresu pre produkcije',
        rsdAccountNumber: currency === Currency.RSD ? '000-0000000000000-00' : null,
        foreignInstructions: currency === Currency.RSD ? null : 'Demo devizne instrukcije - zameniti stvarnim podacima.',
        paymentModel: currency === Currency.RSD ? '97' : null,
        referenceRule: 'GWB-{YYYYMMDD}-{SEQ}',
        paymentPurpose: 'Online cas nemackog jezika',
        singleLessonPrice: currency === Currency.RSD ? '2500.00' : '25.00',
        packagePrice: currency === Currency.RSD ? '9000.00' : '90.00'
      }
    });
  }

  await prisma.appSetting.upsert({
    where: {key: 'business'},
    update: {value: {timeZone: TZ, lessonMinutes: 45, breakMinutes: 15, bookingHoldMinutes: 30}},
    create: {key: 'business', value: {timeZone: TZ, lessonMinutes: 45, breakMinutes: 15, bookingHoldMinutes: 30}}
  });

  for (let d = 1; d <= 30; d += 1) {
    const weekday = dayUtc(d).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    for (const hour of [9, 10, 11, 14, 15, 16]) {
      const startsAt = dayUtc(d, hour);
      const lessonEndsAt = new Date(startsAt.getTime() + 45 * 60_000);
      const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
      await prisma.timeSlot.upsert({
        where: {teacherId_startsAt: {teacherId: teacher.id, startsAt}},
        update: {},
        create: {teacherId: teacher.id, startsAt, lessonEndsAt, endsAt, status: SlotStatus.FREE}
      });
    }
  }

  const confirmedSlot = await prisma.timeSlot.findFirstOrThrow({where: {teacherId: teacher.id, status: SlotStatus.FREE, startsAt: {gt: dayUtc(2)}}});
  await prisma.timeSlot.update({where: {id: confirmedSlot.id}, data: {status: SlotStatus.BOOKED}});
  const confirmedBooking = await prisma.booking.create({
    data: {
      timeSlotId: confirmedSlot.id,
      startsAt: confirmedSlot.startsAt,
      teacherId: teacher.id,
      studentId: childOne.id,
      bookedById: parent.id,
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date(),
      content: {create: {studentId: childOne.id, topic: 'Konverzacija', lessons: 'Perfekt i svakodnevne fraze'}}
    }
  });
  await prisma.bookingStatusHistory.create({data: {bookingId: confirmedBooking.id, toStatus: BookingStatus.CONFIRMED, changedById: admin.id}});

  const reviewSlot = await prisma.timeSlot.findFirstOrThrow({where: {teacherId: teacher.id, status: SlotStatus.FREE, startsAt: {gt: dayUtc(3)}}});
  await prisma.timeSlot.update({where: {id: reviewSlot.id}, data: {status: SlotStatus.HELD}});
  const reviewBooking = await prisma.booking.create({
    data: {
      timeSlotId: reviewSlot.id,
      startsAt: reviewSlot.startsAt,
      teacherId: teacher.id,
      studentId: childTwo.id,
      bookedById: parent.id,
      status: BookingStatus.PAYMENT_REVIEW,
      reviewHoldExpiresAt: new Date(Date.now() + 24 * 60 * 60_000),
      content: {create: {studentId: childTwo.id, topic: 'Priprema za kontrolni'}}
    }
  });
  const reviewPayment = await prisma.payment.create({
    data: {
      bookingId: reviewBooking.id,
      studentId: childTwo.id,
      payerId: parent.id,
      kind: PaymentKind.SINGLE_LESSON,
      status: PaymentStatus.UNDER_REVIEW,
      amount: '2500.00',
      currency: Currency.RSD,
      reference: `GWB-${Date.now()}-REVIEW`,
      purpose: 'Online cas nemackog jezika',
      proofSubmittedAt: new Date()
    }
  });
  await prisma.paymentStatusHistory.create({data: {paymentId: reviewPayment.id, toStatus: PaymentStatus.UNDER_REVIEW, changedById: parent.id}});

  const packagePayment = await prisma.payment.create({
    data: {
      studentId: soloStudent.id,
      payerId: studentUser.id,
      kind: PaymentKind.PACKAGE_4,
      status: PaymentStatus.PAID,
      amount: '9000.00',
      currency: Currency.RSD,
      reference: `GWB-${Date.now()}-PKG`,
      purpose: 'Paket od 4 online casa nemackog jezika',
      paidAt: new Date()
    }
  });
  const lessonPackage = await prisma.lessonPackage.create({
    data: {
      studentId: soloStudent.id,
      paymentId: packagePayment.id,
      totalCredits: 4,
      usedCredits: 1,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60_000)
    }
  });
  await prisma.creditLedger.create({
    data: {packageId: lessonPackage.id, studentId: soloStudent.id, action: CreditAction.GRANT, amount: 4, reason: 'Seed paket', createdById: admin.id}
  });
  await prisma.creditLedger.create({
    data: {packageId: lessonPackage.id, studentId: soloStudent.id, action: CreditAction.SPEND, amount: -1, reason: 'Seed potrosen kredit', createdById: admin.id}
  });

  const pastSlot = await prisma.timeSlot.create({
    data: {
      teacherId: teacher.id,
      startsAt: dayUtc(-7, 10),
      lessonEndsAt: new Date(dayUtc(-7, 10).getTime() + 45 * 60_000),
      endsAt: new Date(dayUtc(-7, 10).getTime() + 60 * 60_000),
      status: SlotStatus.BOOKED
    }
  });
  const completed = await prisma.booking.create({
    data: {
      timeSlotId: pastSlot.id,
      startsAt: pastSlot.startsAt,
      teacherId: teacher.id,
      studentId: childOne.id,
      bookedById: parent.id,
      status: BookingStatus.COMPLETED,
      confirmedAt: dayUtc(-8),
      notes: {create: {covered: 'Modalni glagoli', actualMinutes: 45, attendance: 'PRESENT'}},
      content: {create: {studentId: childOne.id, topic: 'Modalni glagoli'}}
    }
  });
  await prisma.bookingStatusHistory.create({data: {bookingId: completed.id, toStatus: BookingStatus.COMPLETED, changedById: teacherUser.id}});

  console.log(`Seed complete. Demo password for all users: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

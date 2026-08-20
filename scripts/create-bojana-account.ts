import {Currency, Role} from '@prisma/client';
import bcrypt from 'bcryptjs';
import {prisma} from '@/lib/prisma';

const email = process.env.BOJANA_EMAIL ?? 'veselinovic.bojana@yahoo.de';
const password = process.env.BOJANA_PASSWORD;

if (!password) {
  throw new Error('Set BOJANA_PASSWORD before running this script.');
}
const bojanaPassword: string = password;

async function main() {
  const passwordHash = await bcrypt.hash(bojanaPassword, 12);
  const user = await prisma.user.upsert({
    where: {email},
    update: {role: Role.ADMIN, passwordHash, isActive: true},
    create: {
      email,
      role: Role.ADMIN,
      passwordHash,
      isActive: true,
      profile: {create: {firstName: 'Bojana', lastName: 'Veselinovic', locale: 'sr'}},
      notificationPrefs: {create: {reminderMinutes: [1440, 60], optionalNotifications: true}}
    },
    include: {profile: true}
  });
  await prisma.profile.upsert({
    where: {userId: user.id},
    create: {userId: user.id, firstName: 'Bojana', lastName: 'Veselinovic', locale: 'sr'},
    update: {firstName: 'Bojana', lastName: 'Veselinovic', locale: 'sr'}
  });
  const teacher = await prisma.teacher.upsert({
    where: {userId: user.id},
    update: {displayName: 'Bojana Veselinovic', timeZone: 'Europe/Belgrade'},
    create: {userId: user.id, displayName: 'Bojana Veselinovic', timeZone: 'Europe/Belgrade', morningSummary: '08:00'}
  });
  await prisma.teacherBankInstruction.upsert({
    where: {teacherId_currency: {teacherId: teacher.id, currency: Currency.RSD}},
    update: {},
    create: {
      teacherId: teacher.id,
      currency: Currency.RSD,
      enabled: true,
      recipientName: 'Bojana Veselinovic',
      recipientAddress: '',
      paymentModel: '97',
      referenceRule: 'GWB + jedinstveni poziv na broj',
      paymentPurpose: 'Online cas nemackog jezika',
      singleLessonPrice: '1500.00',
      packagePrice: '6000.00'
    }
  });
  await prisma.auditLog.create({
    data: {actorId: user.id, entityType: 'User', entityId: user.id, action: 'BOJANA_ACCOUNT_CREATED'}
  });
  console.log(`Bojana account is ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

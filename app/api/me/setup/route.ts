import {Currency, Role} from '@prisma/client';
import {Prisma} from '@prisma/client';
import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';
import {assertRole} from '@/lib/security/rbac';

const schema = z.object({
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  phone: z.string().max(40).optional(),
  email: z.string().email(),
  currency: z.nativeEnum(Currency).default(Currency.RSD),
  singleLessonPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  packagePrice: z.preprocess((value) => (value === '' ? undefined : value), z.string().regex(/^\d+(\.\d{1,2})?$/).optional()),
  recipientName: z.string().min(2).max(160),
  recipientAddress: z.string().max(240).optional(),
  rsdAccountNumber: z.string().max(80).optional(),
  foreignInstructions: z.string().max(2000).optional()
});

export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    assertRole(actor, [Role.ADMIN, Role.TEACHER]);
    const parsed = schema.parse(await request.json());
    const singleLessonPrice = new Prisma.Decimal(parsed.singleLessonPrice);
    const packagePrice = parsed.packagePrice ? new Prisma.Decimal(parsed.packagePrice) : singleLessonPrice.mul(4);
    const displayName = `${parsed.firstName} ${parsed.lastName}`;

    const result = await prisma.$transaction(async (tx) => {
      const existingEmail = await tx.user.findFirst({where: {email: parsed.email, id: {not: actor.id}}, select: {id: true}});
      if (existingEmail) throw new Error('EMAIL_ALREADY_USED');
      await tx.user.update({where: {id: actor.id}, data: {email: parsed.email}});
      await tx.profile.upsert({
        where: {userId: actor.id},
        create: {userId: actor.id, firstName: parsed.firstName, lastName: parsed.lastName, phone: parsed.phone},
        update: {firstName: parsed.firstName, lastName: parsed.lastName, phone: parsed.phone}
      });
      const teacher = await tx.teacher.upsert({
        where: {userId: actor.id},
        create: {userId: actor.id, displayName, timeZone: 'Europe/Belgrade'},
        update: {displayName}
      });
      const instruction = await tx.teacherBankInstruction.upsert({
        where: {teacherId_currency: {teacherId: teacher.id, currency: parsed.currency}},
        create: {
          teacherId: teacher.id,
          currency: parsed.currency,
          enabled: true,
          recipientName: parsed.recipientName,
          recipientAddress: parsed.recipientAddress ?? '',
          rsdAccountNumber: parsed.rsdAccountNumber,
          foreignInstructions: parsed.foreignInstructions,
          paymentModel: '97',
          referenceRule: 'GWB + jedinstveni poziv na broj',
          paymentPurpose: 'Online cas nemackog jezika',
          singleLessonPrice,
          packagePrice
        },
        update: {
          enabled: true,
          recipientName: parsed.recipientName,
          recipientAddress: parsed.recipientAddress ?? '',
          rsdAccountNumber: parsed.rsdAccountNumber,
          foreignInstructions: parsed.foreignInstructions,
          singleLessonPrice,
          packagePrice
        }
      });
      await tx.auditLog.create({data: {actorId: actor.id, entityType: 'Teacher', entityId: teacher.id, action: 'TEACHER_SETUP_UPDATED'}});
      return {teacher, instruction};
    });

    return jsonOk({ok: true, teacherId: result.teacher.id});
  } catch (error) {
    return jsonError(error);
  }
}

import {Currency, Role} from '@prisma/client';
import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';
import {assertRole} from '@/lib/security/rbac';

const schema = z.object({
  teacherId: z.string().optional(),
  currency: z.nativeEnum(Currency),
  enabled: z.boolean().default(true),
  recipientName: z.string().min(2).max(200),
  recipientAddress: z.string().min(2).max(300),
  rsdAccountNumber: z.string().max(80).optional().nullable(),
  foreignInstructions: z.string().max(1500).optional().nullable(),
  paymentModel: z.string().max(20).optional().nullable(),
  referenceRule: z.string().min(2).max(200),
  paymentPurpose: z.string().min(2).max(300),
  singleLessonPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  packagePrice: z.string().regex(/^\d+(\.\d{1,2})?$/)
});

export async function GET() {
  try {
    const actor = await requireActor();
    assertRole(actor, [Role.ADMIN, Role.TEACHER]);
    const teacher = actor.role === Role.TEACHER ? await prisma.teacher.findUnique({where: {userId: actor.id}, select: {id: true}}) : null;
    return jsonOk(
      await prisma.teacherBankInstruction.findMany({
        where: actor.role === Role.TEACHER ? {teacherId: teacher?.id ?? '__none__'} : {},
        include: {teacher: {include: {user: {include: {profile: true}}}}},
        orderBy: [{teacherId: 'asc'}, {currency: 'asc'}]
      })
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    assertRole(actor, [Role.ADMIN, Role.TEACHER]);
    const parsed = schema.parse(await request.json());
    const ownTeacher = actor.role === Role.TEACHER ? await prisma.teacher.findUniqueOrThrow({where: {userId: actor.id}, select: {id: true}}) : null;
    const teacherId = actor.role === Role.ADMIN ? parsed.teacherId : ownTeacher?.id;
    if (!teacherId) throw new Error('TEACHER_REQUIRED');

    const item = await prisma.teacherBankInstruction.upsert({
      where: {teacherId_currency: {teacherId, currency: parsed.currency}},
      create: {
        teacherId,
        currency: parsed.currency,
        enabled: parsed.enabled,
        recipientName: parsed.recipientName,
        recipientAddress: parsed.recipientAddress,
        rsdAccountNumber: parsed.rsdAccountNumber,
        foreignInstructions: parsed.foreignInstructions,
        paymentModel: parsed.paymentModel,
        referenceRule: parsed.referenceRule,
        paymentPurpose: parsed.paymentPurpose,
        singleLessonPrice: parsed.singleLessonPrice,
        packagePrice: parsed.packagePrice
      },
      update: {
        enabled: parsed.enabled,
        recipientName: parsed.recipientName,
        recipientAddress: parsed.recipientAddress,
        rsdAccountNumber: parsed.rsdAccountNumber,
        foreignInstructions: parsed.foreignInstructions,
        paymentModel: parsed.paymentModel,
        referenceRule: parsed.referenceRule,
        paymentPurpose: parsed.paymentPurpose,
        singleLessonPrice: parsed.singleLessonPrice,
        packagePrice: parsed.packagePrice
      }
    });
    await prisma.auditLog.create({data: {actorId: actor.id, entityType: 'TeacherBankInstruction', entityId: item.id, action: 'TEACHER_BANK_INSTRUCTION_SAVED'}});
    return jsonOk(item);
  } catch (error) {
    return jsonError(error);
  }
}

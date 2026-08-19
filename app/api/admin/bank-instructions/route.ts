import {Currency, Role} from '@prisma/client';
import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {assertRole} from '@/lib/security/rbac';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

const schema = z.object({
  currency: z.nativeEnum(Currency),
  recipientName: z.string().min(2),
  recipientAddress: z.string().min(2),
  rsdAccountNumber: z.string().optional().nullable(),
  foreignInstructions: z.string().optional().nullable(),
  singleLessonPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  packagePrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  paymentPurpose: z.string().min(2),
  referenceRule: z.string().min(2)
});

export async function GET() {
  try {
    const actor = await requireActor();
    assertRole(actor, [Role.ADMIN]);
    return jsonOk(await prisma.bankAccountInstruction.findMany({orderBy: {currency: 'asc'}}));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireActor();
    assertRole(actor, [Role.ADMIN]);
    const parsed = schema.parse(await request.json());
    const updated = await prisma.bankAccountInstruction.update({where: {currency: parsed.currency}, data: parsed});
    await prisma.auditLog.create({data: {actorId: actor.id, entityType: 'BankAccountInstruction', entityId: updated.id, action: 'BANK_INSTRUCTION_UPDATED'}});
    return jsonOk(updated);
  } catch (error) {
    return jsonError(error);
  }
}

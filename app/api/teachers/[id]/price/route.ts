import {Currency} from '@prisma/client';
import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

const querySchema = z.object({
  currency: z.nativeEnum(Currency).default(Currency.RSD)
});

export async function GET(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    await requireActor();
    const {id} = await params;
    const url = new URL(request.url);
    const {currency} = querySchema.parse({currency: url.searchParams.get('currency') ?? Currency.RSD});
    const instruction =
      (await prisma.teacherBankInstruction.findUnique({where: {teacherId_currency: {teacherId: id, currency}}})) ??
      (await prisma.bankAccountInstruction.findUnique({where: {currency}}));
    if (!instruction?.enabled) throw new Error('CURRENCY_NOT_ENABLED');
    return jsonOk({
      currency,
      singleLessonPrice: instruction.singleLessonPrice.toString(),
      packagePrice: instruction.packagePrice.toString()
    });
  } catch (error) {
    return jsonError(error);
  }
}

import {Currency, PaymentKind} from '@prisma/client';
import {z} from 'zod';
import {createBookingWithPayment} from '@/lib/services/booking-service';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

const schema = z.object({
  studentId: z.string().min(1),
  timeSlotId: z.string().min(1),
  currency: z.nativeEnum(Currency),
  kind: z.nativeEnum(PaymentKind).default(PaymentKind.SINGLE_LESSON),
  topic: z.string().min(2).max(500),
  lessons: z.string().max(1000).optional(),
  questions: z.string().max(1000).optional(),
  additionalInfo: z.string().max(1000).optional()
});

export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    const parsed = schema.parse(await request.json());
    return jsonOk(await createBookingWithPayment({...parsed, actor}), 201);
  } catch (error) {
    return jsonError(error);
  }
}

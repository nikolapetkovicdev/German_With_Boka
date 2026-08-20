import {Currency} from '@prisma/client';
import {z} from 'zod';
import {createMonthlyBookingPlan} from '@/lib/services/booking-service';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

const schema = z.object({
  studentId: z.string().min(1),
  timeSlotIds: z.array(z.string().min(1)).min(1).max(80),
  currency: z.nativeEnum(Currency),
  topic: z.string().min(2).max(500),
  additionalInfo: z.string().max(1000).optional()
});

export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    const parsed = schema.parse(await request.json());
    return jsonOk(await createMonthlyBookingPlan({...parsed, actor}), 201);
  } catch (error) {
    return jsonError(error);
  }
}

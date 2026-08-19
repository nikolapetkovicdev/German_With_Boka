import {z} from 'zod';
import {postponeBooking} from '@/lib/services/booking-service';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

const schema = z.object({reason: z.string().min(3).max(500)});

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const {reason} = schema.parse(await request.json());
    return jsonOk(await postponeBooking(await requireActor(), id, reason));
  } catch (error) {
    return jsonError(error);
  }
}

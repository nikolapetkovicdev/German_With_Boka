import {z} from 'zod';
import {completeBooking} from '@/lib/services/booking-service';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

const schema = z.object({actualMinutes: z.number().int().min(1).max(180).optional()}).optional();

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const body = request.headers.get('content-length') === '0' ? undefined : await request.json().catch(() => undefined);
    const parsed = schema.parse(body);
    return jsonOk(await completeBooking(await requireActor(), id, parsed?.actualMinutes));
  } catch (error) {
    return jsonError(error);
  }
}

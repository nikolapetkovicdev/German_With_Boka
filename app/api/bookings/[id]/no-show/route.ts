import {z} from 'zod';
import {markNoShow} from '@/lib/services/booking-service';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

const schema = z.object({reason: z.string().min(3).max(500).default('Nedolazak evidentiran od strane nastavnika')});

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const body = await request.json().catch(() => ({}));
    const {reason} = schema.parse(body);
    return jsonOk(await markNoShow(await requireActor(), id, reason));
  } catch (error) {
    return jsonError(error);
  }
}

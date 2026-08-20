import {markPaymentSubmittedByPayment} from '@/lib/services/booking-service';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

export async function POST(_request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    return jsonOk(await markPaymentSubmittedByPayment(await requireActor(), id));
  } catch (error) {
    return jsonError(error);
  }
}

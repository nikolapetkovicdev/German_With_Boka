import {uploadPaymentProof} from '@/lib/services/booking-service';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) throw new Error('PAYMENT_PROOF_REQUIRED');
    return jsonOk(await uploadPaymentProof(await requireActor(), id, file), 201);
  } catch (error) {
    return jsonError(error);
  }
}

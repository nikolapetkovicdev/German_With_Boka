import {NextResponse} from 'next/server';
import {loadPaymentProof} from '@/lib/services/booking-service';
import {jsonError} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const {proof, bytes, mimeType} = await loadPaymentProof(await requireActor(), id);
    return new NextResponse(bytes, {
      headers: {
        'content-type': mimeType,
        'content-disposition': `attachment; filename="${proof.originalName.replaceAll('"', '')}"`
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}

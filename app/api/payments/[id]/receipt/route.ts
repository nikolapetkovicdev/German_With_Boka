import {NextResponse} from 'next/server';
import {paymentReceiptPdf} from '@/lib/services/export-service';
import {jsonError} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

export async function GET(_: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    return new NextResponse(await paymentReceiptPdf(await requireActor(), id), {
      headers: {'content-type': 'application/pdf', 'content-disposition': `attachment; filename="payment-${id}.pdf"`}
    });
  } catch (error) {
    return jsonError(error);
  }
}

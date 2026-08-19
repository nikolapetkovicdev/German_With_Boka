import {NextResponse} from 'next/server';
import {bookingsToCsv, bookingsToPdf, bookingsToXlsx, visibleBookingsForExport} from '@/lib/services/export-service';
import {jsonError} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

export async function GET(request: Request) {
  try {
    const actor = await requireActor();
    const format = new URL(request.url).searchParams.get('format') || 'csv';
    const bookings = await visibleBookingsForExport(actor);
    if (format === 'xlsx') {
      return new NextResponse(await bookingsToXlsx(bookings), {
        headers: {'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content-disposition': 'attachment; filename="lessons.xlsx"'}
      });
    }
    if (format === 'pdf') {
      return new NextResponse(bookingsToPdf(bookings), {
        headers: {'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="lessons.pdf"'}
      });
    }
    return new NextResponse(bookingsToCsv(bookings), {
      headers: {'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="lessons.csv"'}
    });
  } catch (error) {
    return jsonError(error);
  }
}

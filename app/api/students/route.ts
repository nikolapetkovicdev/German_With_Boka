import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';
import {listVisibleStudents} from '@/lib/services/booking-service';

export async function GET() {
  try {
    return jsonOk(await listVisibleStudents(await requireActor()));
  } catch (error) {
    return jsonError(error);
  }
}

import {createStudentLinkCode} from '@/lib/services/account-service';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

export async function POST(_request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    return jsonOk(await createStudentLinkCode(await requireActor(), id), 201);
  } catch (error) {
    return jsonError(error);
  }
}

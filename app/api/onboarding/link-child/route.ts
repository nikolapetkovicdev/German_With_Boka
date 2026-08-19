import {z} from 'zod';
import {linkParentToStudentByCode} from '@/lib/services/account-service';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

const schema = z.object({code: z.string().min(6).max(40)});

export async function POST(request: Request) {
  try {
    const {code} = schema.parse(await request.json());
    return jsonOk(await linkParentToStudentByCode(await requireActor(), code));
  } catch (error) {
    return jsonError(error);
  }
}

import {z} from 'zod';
import {createTeacherInvite} from '@/lib/services/account-service';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

const schema = z.object({email: z.string().email()});

export async function POST(request: Request) {
  try {
    const {email} = schema.parse(await request.json());
    return jsonOk(await createTeacherInvite(await requireActor(), email), 201);
  } catch (error) {
    return jsonError(error);
  }
}

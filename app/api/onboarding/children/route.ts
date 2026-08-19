import {z} from 'zod';
import {createParentChild} from '@/lib/services/account-service';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

const schema = z.object({
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  dateOfBirth: z.string().date().optional()
});

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    const child = await createParentChild(await requireActor(), {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      dateOfBirth: parsed.dateOfBirth ? new Date(parsed.dateOfBirth) : undefined
    });
    return jsonOk(child, 201);
  } catch (error) {
    return jsonError(error);
  }
}

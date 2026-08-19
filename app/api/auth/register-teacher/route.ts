import {z} from 'zod';
import {acceptTeacherInvite} from '@/lib/services/account-service';
import {rateLimit} from '@/lib/security/rate-limit';
import {jsonError, jsonOk} from '@/lib/server/http';

const schema = z.object({
  token: z.string().min(20),
  email: z.string().email(),
  password: z.string().min(10),
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80)
});

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    if (!rateLimit(`register-teacher:${parsed.email}`, 3, 60 * 60_000).ok) throw new Error('RATE_LIMITED');
    return jsonOk(await acceptTeacherInvite(parsed), 201);
  } catch (error) {
    return jsonError(error);
  }
}

import {z} from 'zod';
import {rateLimit} from '@/lib/security/rate-limit';
import {jsonError, jsonOk} from '@/lib/server/http';
import {registerParent, registerStudent} from '@/lib/services/account-service';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum(['PARENT', 'STUDENT']).default('PARENT')
});

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    if (!rateLimit(`register:${parsed.email}`, 3, 60 * 60_000).ok) throw new Error('RATE_LIMITED');
    const user = parsed.role === 'STUDENT' ? await registerStudent(parsed) : await registerParent(parsed);
    return jsonOk(user, 201);
  } catch (error) {
    return jsonError(error);
  }
}

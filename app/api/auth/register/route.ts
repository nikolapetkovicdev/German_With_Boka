import {Role} from '@prisma/client';
import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {hashPassword} from '@/lib/security/password';
import {rateLimit} from '@/lib/security/rate-limit';
import {jsonError, jsonOk} from '@/lib/server/http';

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
    const user = await prisma.user.create({
      data: {
        email: parsed.email.toLowerCase(),
        passwordHash: await hashPassword(parsed.password),
        role: parsed.role as Role,
        profile: {create: {firstName: parsed.firstName, lastName: parsed.lastName, locale: 'sr'}},
        notificationPrefs: {create: {}}
      },
      select: {id: true, email: true}
    });
    return jsonOk(user, 201);
  } catch (error) {
    return jsonError(error);
  }
}

import {createHash, randomBytes} from 'crypto';
import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {addHours} from '@/lib/domain/time';
import {jsonError, jsonOk} from '@/lib/server/http';

const schema = z.object({email: z.string().email()});

export async function POST(request: Request) {
  try {
    const {email} = schema.parse(await request.json());
    const token = randomBytes(24).toString('hex');
    const resetTokenHash = createHash('sha256').update(token).digest('hex');
    await prisma.user.updateMany({
      where: {email: email.toLowerCase()},
      data: {resetTokenHash, resetTokenExpiresAt: addHours(new Date(), 1)}
    });
    return jsonOk({ok: true, devResetToken: process.env.NODE_ENV === 'production' ? undefined : token});
  } catch (error) {
    return jsonError(error);
  }
}

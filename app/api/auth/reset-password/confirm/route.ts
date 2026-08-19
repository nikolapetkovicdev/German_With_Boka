import {createHash} from 'crypto';
import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {hashPassword} from '@/lib/security/password';
import {jsonError, jsonOk} from '@/lib/server/http';

const schema = z.object({token: z.string().min(20), newPassword: z.string().min(10)});

export async function POST(request: Request) {
  try {
    const {token, newPassword} = schema.parse(await request.json());
    const resetTokenHash = createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({where: {resetTokenHash, resetTokenExpiresAt: {gt: new Date()}}});
    if (!user) throw new Error('INVALID_RESET_TOKEN');
    await prisma.user.update({where: {id: user.id}, data: {passwordHash: await hashPassword(newPassword), resetTokenHash: null, resetTokenExpiresAt: null}});
    return jsonOk({ok: true});
  } catch (error) {
    return jsonError(error);
  }
}

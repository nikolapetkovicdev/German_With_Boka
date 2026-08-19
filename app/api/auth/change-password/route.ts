import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {hashPassword, verifyPassword} from '@/lib/security/password';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

const schema = z.object({currentPassword: z.string().min(8), newPassword: z.string().min(10)});

export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    const parsed = schema.parse(await request.json());
    const user = await prisma.user.findUniqueOrThrow({where: {id: actor.id}});
    if (!(await verifyPassword(parsed.currentPassword, user.passwordHash))) throw new Error('INVALID_PASSWORD');
    await prisma.user.update({where: {id: actor.id}, data: {passwordHash: await hashPassword(parsed.newPassword)}});
    await prisma.auditLog.create({data: {actorId: actor.id, entityType: 'User', entityId: actor.id, action: 'PASSWORD_CHANGED'}});
    return jsonOk({ok: true});
  } catch (error) {
    return jsonError(error);
  }
}

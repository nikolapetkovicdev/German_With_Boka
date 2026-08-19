import {getServerSession} from 'next-auth';
import {Role} from '@prisma/client';
import {authOptions} from '@/lib/auth';

export async function getActor() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {id: session.user.id, role: session.user.role as Role};
}

export async function requireActor() {
  const actor = await getActor();
  if (!actor) throw new Error('UNAUTHENTICATED');
  return actor;
}

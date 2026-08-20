import {prisma} from '@/lib/prisma';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';

export async function GET() {
  try {
    await requireActor();
    const teachers = await prisma.teacher.findMany({
      where: {user: {isActive: true}},
      include: {user: {include: {profile: true}}},
      orderBy: {createdAt: 'asc'}
    });
    return jsonOk(
      teachers.map((teacher) => ({
        id: teacher.id,
        name: teacher.user.profile ? `${teacher.user.profile.firstName} ${teacher.user.profile.lastName}` : teacher.displayName
      }))
    );
  } catch (error) {
    return jsonError(error);
  }
}

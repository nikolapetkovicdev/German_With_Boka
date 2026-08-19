import {Role, SlotStatus} from '@prisma/client';
import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {generateSlotsForInterval} from '@/lib/domain/booking-rules';
import {jsonError, jsonOk} from '@/lib/server/http';
import {requireActor} from '@/lib/server/session';
import {assertRole} from '@/lib/security/rbac';
import {listFreeSlots} from '@/lib/services/booking-service';

const createSchema = z.object({
  date: z.string().date(),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24)
});

export async function GET() {
  try {
    return jsonOk(await listFreeSlots(await requireActor()));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    assertRole(actor, [Role.ADMIN, Role.TEACHER]);
    const parsed = createSchema.parse(await request.json());
    const teacher = actor.role === Role.TEACHER ? await prisma.teacher.findUniqueOrThrow({where: {userId: actor.id}}) : await prisma.teacher.findFirstOrThrow();
    const day = new Date(`${parsed.date}T00:00:00.000Z`);
    const slots = generateSlotsForInterval(day, parsed.startHour, parsed.endHour);
    for (const slot of slots) {
      await prisma.timeSlot.upsert({
        where: {teacherId_startsAt: {teacherId: teacher.id, startsAt: slot.startsAt}},
        update: {lessonEndsAt: slot.lessonEndsAt, endsAt: slot.endsAt, status: SlotStatus.FREE},
        create: {teacherId: teacher.id, ...slot, status: SlotStatus.FREE}
      });
    }
    return jsonOk({created: slots.length}, 201);
  } catch (error) {
    return jsonError(error);
  }
}

import {addDays, addHours} from '@/lib/domain/time';
import {MAX_BOOKING_DAYS, MIN_BOOKING_HOURS, LESSON_CONTENT_LOCK_HOURS, SLOT_MINUTES} from '@/lib/config';

export function assertBookableWindow(startsAt: Date, now = new Date()) {
  if (startsAt.getTime() < addHours(now, MIN_BOOKING_HOURS).getTime()) {
    throw new Error('BOOKING_TOO_SOON');
  }
  if (startsAt.getTime() > addDays(now, MAX_BOOKING_DAYS).getTime()) {
    throw new Error('BOOKING_TOO_FAR');
  }
}

export function canLearnerEditLessonContent(startsAt: Date, now = new Date()) {
  return startsAt.getTime() >= addHours(now, LESSON_CONTENT_LOCK_HOURS).getTime();
}

export function generateSlotsForInterval(day: Date, startHour: number, endHour: number) {
  const slots: {startsAt: Date; lessonEndsAt: Date; endsAt: Date}[] = [];
  const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), startHour, 0, 0));
  const end = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), endHour, 0, 0));
  for (let cursor = start; cursor.getTime() + SLOT_MINUTES * 60_000 <= end.getTime(); cursor = new Date(cursor.getTime() + SLOT_MINUTES * 60_000)) {
    slots.push({
      startsAt: cursor,
      lessonEndsAt: new Date(cursor.getTime() + 45 * 60_000),
      endsAt: new Date(cursor.getTime() + SLOT_MINUTES * 60_000)
    });
  }
  return slots;
}

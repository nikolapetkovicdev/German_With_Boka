import {readFileSync, mkdirSync, writeFileSync} from 'fs';
import {join} from 'path';
import bcrypt from 'bcryptjs';

const migration = readFileSync('prisma/migrations/20260805123500_init/migration.sql', 'utf8');
const passwordHash = bcrypt.hashSync('DemoPassword123!', 12).replaceAll("'", "''");

const seed = `
-- Seed data for German with Boka MVP.
-- Demo password for all accounts: DemoPassword123!

INSERT INTO "User" ("id", "email", "passwordHash", "role", "isActive", "createdAt", "updatedAt") VALUES
('user-admin', 'admin@germanwithboka.local', '${passwordHash}', 'ADMIN', true, now(), now()),
('user-teacher', 'teacher@germanwithboka.local', '${passwordHash}', 'TEACHER', true, now(), now()),
('user-parent', 'parent@germanwithboka.local', '${passwordHash}', 'PARENT', true, now(), now()),
('user-student', 'student@germanwithboka.local', '${passwordHash}', 'STUDENT', true, now(), now())
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "Profile" ("id", "userId", "firstName", "lastName", "locale", "createdAt", "updatedAt") VALUES
('profile-admin', 'user-admin', 'Boka', 'Admin', 'sr', now(), now()),
('profile-teacher', 'user-teacher', 'Bojana', 'Nikolic', 'sr', now(), now()),
('profile-parent', 'user-parent', 'Marko', 'Petrovic', 'sr', now(), now()),
('profile-student', 'user-student', 'Lena', 'Jovanovic', 'sr', now(), now())
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "NotificationPreference" ("id", "userId", "reminderMinutes", "optionalNotifications", "createdAt", "updatedAt") VALUES
('pref-admin', 'user-admin', ARRAY[1440,60], true, now(), now()),
('pref-teacher', 'user-teacher', ARRAY[1440,60], true, now(), now()),
('pref-parent', 'user-parent', ARRAY[1440,60], true, now(), now()),
('pref-student', 'user-student', ARRAY[1440,60], true, now(), now())
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "Teacher" ("id", "userId", "displayName", "timeZone", "morningSummary", "createdAt", "updatedAt") VALUES
('teacher-main', 'user-teacher', 'German with Boka', 'Europe/Belgrade', '08:00', now(), now())
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "Student" ("id", "userId", "teacherId", "firstName", "lastName", "createdAt", "updatedAt") VALUES
('student-child-one', NULL, 'teacher-main', 'Mila', 'Petrovic', now(), now()),
('student-child-two', NULL, 'teacher-main', 'Nikola', 'Petrovic', now(), now()),
('student-solo', 'user-student', 'teacher-main', 'Lena', 'Jovanovic', now(), now())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ParentStudent" ("id", "parentId", "studentId", "createdAt") VALUES
('parent-link-one', 'user-parent', 'student-child-one', now()),
('parent-link-two', 'user-parent', 'student-child-two', now())
ON CONFLICT ("parentId", "studentId") DO NOTHING;

INSERT INTO "BankAccountInstruction" (
  "id", "currency", "enabled", "recipientName", "recipientAddress", "rsdAccountNumber",
  "foreignInstructions", "paymentModel", "referenceRule", "paymentPurpose",
  "singleLessonPrice", "packagePrice", "createdAt", "updatedAt"
) VALUES
('bank-rsd', 'RSD', true, 'German with Boka - demo', 'Podesiti stvarnu adresu pre produkcije', '000-0000000000000-00', NULL, '97', 'GWB-{YYYYMMDD}-{SEQ}', 'Online cas nemackog jezika', 2500.00, 9000.00, now(), now()),
('bank-eur', 'EUR', true, 'German with Boka - demo', 'Podesiti stvarnu adresu pre produkcije', NULL, 'Demo devizne instrukcije - zameniti stvarnim podacima.', NULL, 'GWB-{YYYYMMDD}-{SEQ}', 'Online cas nemackog jezika', 25.00, 90.00, now(), now()),
('bank-usd', 'USD', true, 'German with Boka - demo', 'Podesiti stvarnu adresu pre produkcije', NULL, 'Demo devizne instrukcije - zameniti stvarnim podacima.', NULL, 'GWB-{YYYYMMDD}-{SEQ}', 'Online cas nemackog jezika', 25.00, 90.00, now(), now()),
('bank-chf', 'CHF', true, 'German with Boka - demo', 'Podesiti stvarnu adresu pre produkcije', NULL, 'Demo devizne instrukcije - zameniti stvarnim podacima.', NULL, 'GWB-{YYYYMMDD}-{SEQ}', 'Online cas nemackog jezika', 25.00, 90.00, now(), now())
ON CONFLICT ("currency") DO NOTHING;

INSERT INTO "AppSetting" ("key", "value", "updatedAt") VALUES
('business', '{"timeZone":"Europe/Belgrade","lessonMinutes":45,"breakMinutes":15,"bookingHoldMinutes":30}'::jsonb, now())
ON CONFLICT ("key") DO NOTHING;

WITH days AS (
  SELECT generate_series((current_date + interval '1 day')::date, (current_date + interval '30 days')::date, interval '1 day')::date AS day
),
hours AS (
  SELECT unnest(ARRAY[9,10,11,14,15,16]) AS hour
),
slots AS (
  SELECT
    'slot-' || to_char(day, 'YYYYMMDD') || '-' || hour AS id,
    ('teacher-main') AS "teacherId",
    (day + make_interval(hours => hour))::timestamp AS "startsAt",
    (day + make_interval(hours => hour, mins => 45))::timestamp AS "lessonEndsAt",
    (day + make_interval(hours => hour + 1))::timestamp AS "endsAt"
  FROM days CROSS JOIN hours
  WHERE EXTRACT(ISODOW FROM day) BETWEEN 1 AND 5
)
INSERT INTO "TimeSlot" ("id", "teacherId", "startsAt", "lessonEndsAt", "endsAt", "status", "createdAt", "updatedAt")
SELECT id, "teacherId", "startsAt", "lessonEndsAt", "endsAt", 'FREE', now(), now()
FROM slots
ON CONFLICT ("teacherId", "startsAt") DO NOTHING;

WITH first_slot AS (
  SELECT "id", "startsAt" FROM "TimeSlot"
  WHERE "teacherId" = 'teacher-main' AND "status" = 'FREE' AND "startsAt" > now() + interval '2 days'
  ORDER BY "startsAt"
  LIMIT 1
),
updated_slot AS (
  UPDATE "TimeSlot" SET "status" = 'BOOKED', "updatedAt" = now()
  WHERE "id" = (SELECT "id" FROM first_slot)
  RETURNING "id", "startsAt"
),
booking AS (
  INSERT INTO "Booking" ("id", "timeSlotId", "teacherId", "studentId", "bookedById", "startsAt", "status", "confirmedAt", "createdAt", "updatedAt")
  SELECT 'booking-confirmed', "id", 'teacher-main', 'student-child-one', 'user-parent', "startsAt", 'CONFIRMED', now(), now(), now()
  FROM updated_slot
  ON CONFLICT ("id") DO NOTHING
  RETURNING "id"
)
INSERT INTO "LessonContent" ("id", "bookingId", "studentId", "topic", "lessons", "createdAt", "updatedAt")
SELECT 'content-confirmed', 'booking-confirmed', 'student-child-one', 'Konverzacija', 'Perfekt i svakodnevne fraze', now(), now()
WHERE EXISTS (SELECT 1 FROM booking)
ON CONFLICT ("bookingId") DO NOTHING;

WITH review_slot AS (
  SELECT "id", "startsAt" FROM "TimeSlot"
  WHERE "teacherId" = 'teacher-main' AND "status" = 'FREE' AND "startsAt" > now() + interval '3 days'
  ORDER BY "startsAt"
  LIMIT 1
),
updated_review_slot AS (
  UPDATE "TimeSlot" SET "status" = 'HELD', "updatedAt" = now()
  WHERE "id" = (SELECT "id" FROM review_slot)
  RETURNING "id", "startsAt"
),
review_booking AS (
  INSERT INTO "Booking" ("id", "timeSlotId", "teacherId", "studentId", "bookedById", "startsAt", "status", "reviewHoldExpiresAt", "createdAt", "updatedAt")
  SELECT 'booking-review', "id", 'teacher-main', 'student-child-two', 'user-parent', "startsAt", 'PAYMENT_REVIEW', now() + interval '24 hours', now(), now()
  FROM updated_review_slot
  ON CONFLICT ("id") DO NOTHING
  RETURNING "id"
)
INSERT INTO "Payment" ("id", "bookingId", "studentId", "payerId", "kind", "status", "amount", "currency", "reference", "purpose", "proofSubmittedAt", "createdAt", "updatedAt")
SELECT 'payment-review', 'booking-review', 'student-child-two', 'user-parent', 'SINGLE_LESSON', 'UNDER_REVIEW', 2500.00, 'RSD', 'GWB-SEED-REVIEW', 'Online cas nemackog jezika', now(), now(), now()
WHERE EXISTS (SELECT 1 FROM review_booking)
ON CONFLICT ("reference") DO NOTHING;

INSERT INTO "Payment" ("id", "studentId", "payerId", "kind", "status", "amount", "currency", "reference", "purpose", "paidAt", "createdAt", "updatedAt") VALUES
('payment-package', 'student-solo', 'user-student', 'PACKAGE_4', 'PAID', 9000.00, 'RSD', 'GWB-SEED-PACKAGE', 'Paket od 4 online casa nemackog jezika', now(), now(), now())
ON CONFLICT ("reference") DO NOTHING;

INSERT INTO "LessonPackage" ("id", "studentId", "paymentId", "totalCredits", "usedCredits", "expiresAt", "createdAt") VALUES
('package-active', 'student-solo', 'payment-package', 4, 1, now() + interval '60 days', now())
ON CONFLICT ("paymentId") DO NOTHING;

INSERT INTO "CreditLedger" ("id", "packageId", "studentId", "action", "amount", "reason", "createdById", "createdAt") VALUES
('credit-grant', 'package-active', 'student-solo', 'GRANT', 4, 'Seed paket', 'user-admin', now()),
('credit-spend', 'package-active', 'student-solo', 'SPEND', -1, 'Seed potrosen kredit', 'user-admin', now())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "AuditLog" ("id", "actorId", "entityType", "entityId", "action", "reason", "createdAt") VALUES
('audit-seed', 'user-admin', 'System', 'seed', 'SEED_CREATED', 'Supabase SQL seed', now())
ON CONFLICT ("id") DO NOTHING;
`;

mkdirSync('outputs', {recursive: true});
writeFileSync(join('outputs', 'supabase-setup.sql'), `${migration}\n\n${seed}`, 'utf8');
console.log('Generated outputs/supabase-setup.sql');

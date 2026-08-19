-- Bank instructions per teacher. Existing global instructions are copied to every existing teacher.
CREATE TABLE "TeacherBankInstruction" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "currency" "Currency" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "recipientName" TEXT NOT NULL,
  "recipientAddress" TEXT NOT NULL,
  "rsdAccountNumber" TEXT,
  "foreignInstructions" TEXT,
  "paymentModel" TEXT,
  "referenceRule" TEXT NOT NULL,
  "paymentPurpose" TEXT NOT NULL,
  "singleLessonPrice" DECIMAL(10,2) NOT NULL,
  "packagePrice" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeacherBankInstruction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherBankInstruction_teacherId_currency_key" ON "TeacherBankInstruction"("teacherId", "currency");
CREATE INDEX "TeacherBankInstruction_teacherId_enabled_idx" ON "TeacherBankInstruction"("teacherId", "enabled");

ALTER TABLE "TeacherBankInstruction"
  ADD CONSTRAINT "TeacherBankInstruction_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TeacherBankInstruction" (
  "id",
  "teacherId",
  "currency",
  "enabled",
  "recipientName",
  "recipientAddress",
  "rsdAccountNumber",
  "foreignInstructions",
  "paymentModel",
  "referenceRule",
  "paymentPurpose",
  "singleLessonPrice",
  "packagePrice",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('tbi_', md5(t."id" || bai."currency"::text)),
  t."id",
  bai."currency",
  bai."enabled",
  bai."recipientName",
  bai."recipientAddress",
  bai."rsdAccountNumber",
  bai."foreignInstructions",
  bai."paymentModel",
  bai."referenceRule",
  bai."paymentPurpose",
  bai."singleLessonPrice",
  bai."packagePrice",
  now(),
  now()
FROM "Teacher" t
CROSS JOIN "BankAccountInstruction" bai
ON CONFLICT ("teacherId", "currency") DO NOTHING;

-- Account onboarding: parent-child link codes and teacher invitations.
CREATE TABLE "StudentLinkCode" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudentLinkCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherInvite" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeacherInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentLinkCode_code_key" ON "StudentLinkCode"("code");
CREATE INDEX "StudentLinkCode_studentId_expiresAt_idx" ON "StudentLinkCode"("studentId", "expiresAt");

CREATE UNIQUE INDEX "TeacherInvite_token_key" ON "TeacherInvite"("token");
CREATE INDEX "TeacherInvite_email_idx" ON "TeacherInvite"("email");
CREATE INDEX "TeacherInvite_expiresAt_idx" ON "TeacherInvite"("expiresAt");

ALTER TABLE "StudentLinkCode"
  ADD CONSTRAINT "StudentLinkCode_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeacherInvite"
  ADD CONSTRAINT "TeacherInvite_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

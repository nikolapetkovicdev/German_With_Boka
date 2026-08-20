-- Monthly booking plans group multiple 45-minute bookings into one calculator/payment summary.
CREATE TABLE "BookingPlan" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "bookedById" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
  "termCount" INTEGER NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" "Currency" NOT NULL,
  "reference" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "proofSubmittedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BookingPlan_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Booking" ADD COLUMN "planId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "planId" TEXT;

CREATE UNIQUE INDEX "BookingPlan_reference_key" ON "BookingPlan"("reference");
CREATE INDEX "BookingPlan_studentId_createdAt_idx" ON "BookingPlan"("studentId", "createdAt");
CREATE INDEX "BookingPlan_teacherId_status_createdAt_idx" ON "BookingPlan"("teacherId", "status", "createdAt");
CREATE INDEX "BookingPlan_bookedById_createdAt_idx" ON "BookingPlan"("bookedById", "createdAt");
CREATE INDEX "Booking_planId_idx" ON "Booking"("planId");
CREATE INDEX "Payment_planId_idx" ON "Payment"("planId");

ALTER TABLE "BookingPlan"
  ADD CONSTRAINT "BookingPlan_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingPlan"
  ADD CONSTRAINT "BookingPlan_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingPlan"
  ADD CONSTRAINT "BookingPlan_bookedById_fkey"
  FOREIGN KEY ("bookedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "BookingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "BookingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

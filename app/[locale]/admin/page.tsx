import {redirect} from 'next/navigation';
import {PaymentStatus, Role} from '@prisma/client';
import {prisma} from '@/lib/prisma';
import {getActor} from '@/lib/server/session';
import {AdminPanel} from '@/components/admin-panel';

export default async function AdminPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const actor = await getActor();
  if (!actor) redirect(`/${locale}/login`);
  if (actor.role !== Role.ADMIN && actor.role !== Role.TEACHER) redirect(`/${locale}/dashboard`);
  const teacher = actor.role === Role.TEACHER ? await prisma.teacher.findUnique({where: {userId: actor.id}, select: {id: true}}) : null;
  const teacherRecords = await prisma.teacher.findMany({
    where: actor.role === Role.TEACHER ? {id: teacher?.id ?? '__none__'} : {},
    include: {user: {include: {profile: true}}},
    orderBy: {createdAt: 'asc'}
  });
  const students = actor.role === Role.TEACHER ? await prisma.student.findMany({where: {teacherId: teacher?.id ?? '__none__'}, select: {id: true}}) : [];
  const payments = await prisma.payment.findMany({
    where: {
      status: {in: [PaymentStatus.UNDER_REVIEW, PaymentStatus.PROOF_SUBMITTED]},
      ...(actor.role === Role.TEACHER ? {studentId: {in: students.map((student) => student.id)}} : {})
    },
    include: {student: true, proofs: true},
    orderBy: {createdAt: 'desc'}
  });
  const teacherBank = await prisma.teacherBankInstruction.findMany({
    where: actor.role === Role.TEACHER ? {teacherId: teacher?.id ?? '__none__'} : {},
    include: {teacher: {include: {user: {include: {profile: true}}}}},
    orderBy: [{teacherId: 'asc'}, {currency: 'asc'}]
  });
  const bank = actor.role === Role.ADMIN ? await prisma.bankAccountInstruction.findMany({orderBy: {currency: 'asc'}}) : [];
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-3xl font-bold">Admin</h1>
      <AdminPanel
        locale={locale}
        payments={payments.map((payment) => ({id: payment.id, student: `${payment.student.firstName} ${payment.student.lastName}`, amount: payment.amount.toString(), currency: payment.currency, status: payment.status, proofs: payment.proofs.map((proof) => ({id: proof.id, originalName: proof.originalName}))}))}
        bank={bank.map((item) => ({id: item.id, currency: item.currency, recipientName: item.recipientName, singleLessonPrice: item.singleLessonPrice.toString(), packagePrice: item.packagePrice.toString()}))}
        teachers={teacherRecords.map((item) => ({id: item.id, name: item.user.profile ? `${item.user.profile.firstName} ${item.user.profile.lastName}` : item.displayName}))}
        teacherBank={teacherBank.map((item) => ({
          id: item.id,
          teacher: item.teacher.user.profile ? `${item.teacher.user.profile.firstName} ${item.teacher.user.profile.lastName}` : item.teacher.displayName,
          currency: item.currency,
          recipientName: item.recipientName,
          account: item.rsdAccountNumber ?? '',
          singleLessonPrice: item.singleLessonPrice.toString(),
          packagePrice: item.packagePrice.toString()
        }))}
      />
    </main>
  );
}

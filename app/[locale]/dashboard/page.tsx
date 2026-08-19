import Link from 'next/link';
import {redirect} from 'next/navigation';
import {BookingStatus, PaymentStatus, Role} from '@prisma/client';
import {getTranslations} from 'next-intl/server';
import {prisma} from '@/lib/prisma';
import {getActor} from '@/lib/server/session';
import {listVisibleStudents} from '@/lib/services/booking-service';
import {TeacherBookingActions, TeacherPaymentActions} from '@/components/teacher-actions';
import {StudentLinkCodePanel} from '@/components/student-link-code-panel';

export default async function DashboardPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const actor = await getActor();
  if (!actor) redirect(`/${locale}/login`);
  const t = await getTranslations({locale});
  const students = await listVisibleStudents(actor);
  if (actor.role === Role.PARENT && students.length === 0) redirect(`/${locale}/onboarding`);
  const studentIds = students.map((student) => student.id);
  const teacher = actor.role === Role.TEACHER ? await prisma.teacher.findUnique({where: {userId: actor.id}, select: {id: true}}) : null;
  const bookingWhere =
    actor.role === Role.ADMIN
      ? {}
      : actor.role === Role.TEACHER
        ? {teacherId: teacher?.id ?? '__none__'}
        : {studentId: {in: studentIds}};
  const paymentWhere =
    actor.role === Role.ADMIN
      ? {status: {in: [PaymentStatus.UNDER_REVIEW, PaymentStatus.PROOF_SUBMITTED]}}
      : {studentId: {in: studentIds}, status: {in: actor.role === Role.TEACHER ? [PaymentStatus.UNDER_REVIEW, PaymentStatus.PROOF_SUBMITTED] : [PaymentStatus.UNDER_REVIEW, PaymentStatus.AWAITING_PAYMENT]}};
  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    include: {student: true, timeSlot: true, payments: true, content: true},
    orderBy: {startsAt: 'asc'},
    take: 12
  });
  const paymentsReview = await prisma.payment.findMany({
    where: paymentWhere,
    include: {student: true, booking: true},
    orderBy: {createdAt: 'desc'},
    take: 8
  });
  const packages = await prisma.lessonPackage.findMany({where: {studentId: {in: studentIds}}, include: {student: true}, take: 8});
  const notifications = await prisma.notification.findMany({where: {userId: actor.id}, orderBy: {createdAt: 'desc'}, take: 6});
  const refunds = actor.role === Role.ADMIN || actor.role === Role.TEACHER ? await prisma.refund.count({where: {status: PaymentStatus.REFUND_PENDING}}) : 0;
  const usersCount = actor.role === Role.ADMIN ? await prisma.user.count() : 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.welcome')}</h1>
          <p className="mt-1 text-sm font-semibold text-black/65">{actor.role}</p>
        </div>
        <Link href={`/${locale}/book`} className="rounded-md bg-boka-cta px-5 py-3 text-center font-bold text-black">
          {t('nav.book')}
        </Link>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricCard title={t('dashboard.upcoming')} value={bookings.filter((b) => b.startsAt > new Date() && b.status !== BookingStatus.CANCELLED).length} />
        <MetricCard title={t('dashboard.paymentsReview')} value={paymentsReview.length} />
        <MetricCard title={actor.role === Role.ADMIN ? t('dashboard.users') : t('dashboard.credits')} value={actor.role === Role.ADMIN ? usersCount : packages.reduce((sum, pkg) => sum + (pkg.totalCredits - pkg.usedCredits), 0)} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="card p-5">
          <h2 className="text-xl font-bold">{actor.role === Role.TEACHER ? t('dashboard.today') : t('dashboard.upcoming')}</h2>
          {actor.role === Role.ADMIN || actor.role === Role.TEACHER ? (
            <TeacherBookingActions
              bookings={bookings
                .filter((booking) => booking.status === BookingStatus.PAYMENT_REVIEW || booking.status === BookingStatus.CONFIRMED)
                .map((booking) => ({
                  id: booking.id,
                  student: `${booking.student.firstName} ${booking.student.lastName}`,
                  startsAt: new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}).format(booking.startsAt),
                  status: t(`status.${booking.status}`)
                }))}
            />
          ) : (
            <div className="mt-4 space-y-3">
              {bookings.length ? (
                bookings.map((booking) => (
                  <article key={booking.id} className="rounded-md border border-black/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{booking.student.firstName} {booking.student.lastName}</strong>
                      <span className="status">{t(`status.${booking.status}`)}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-black/70">{new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}).format(booking.startsAt)}</p>
                    <p className="mt-1 text-sm">{booking.content?.topic}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm font-semibold text-black/60">{t('common.empty')}</p>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="text-xl font-bold">{t('dashboard.paymentsReview')}</h2>
            {actor.role === Role.ADMIN || actor.role === Role.TEACHER ? (
              <TeacherPaymentActions
                payments={paymentsReview.map((payment) => ({
                  id: payment.id,
                  student: `${payment.student.firstName} ${payment.student.lastName}`,
                  amount: payment.amount.toString(),
                  currency: payment.currency,
                  status: payment.status
                }))}
              />
            ) : (
              <div className="mt-4 space-y-3">
                {paymentsReview.map((payment) => (
                  <div key={payment.id} className="rounded-md border border-black/10 p-3 text-sm">
                    <div className="font-bold">{payment.student.firstName} {payment.student.lastName}</div>
                    <div>{payment.amount.toString()} {payment.currency}</div>
                    <span className="status mt-2">{payment.status}</span>
                  </div>
                ))}
                {!paymentsReview.length ? <p className="text-sm font-semibold text-black/60">{t('common.empty')}</p> : null}
              </div>
            )}
          </div>
          {actor.role === Role.ADMIN || actor.role === Role.TEACHER ? (
            <div className="card p-5">
              <h2 className="text-xl font-bold">{t('dashboard.refunds')}</h2>
              <p className="mt-3 text-3xl font-bold">{refunds}</p>
            </div>
          ) : null}
          <div className="card p-5">
            <h2 className="text-xl font-bold">{t('dashboard.notifications')}</h2>
            <div className="mt-4 space-y-2">
              {notifications.map((item) => <p key={item.id} className="text-sm font-semibold">{item.title}</p>)}
              {!notifications.length ? <p className="text-sm font-semibold text-black/60">{t('common.empty')}</p> : null}
            </div>
          </div>
        </aside>
      </section>

      {actor.role === Role.STUDENT && students[0] ? <StudentLinkCodePanel studentId={students[0].id} /> : null}
    </main>
  );
}

function MetricCard({title, value}: {title: string; value: number}) {
  return (
    <div className="card p-5">
      <p className="text-sm font-bold text-black/60">{title}</p>
      <p className="mt-2 text-4xl font-bold">{value}</p>
    </div>
  );
}

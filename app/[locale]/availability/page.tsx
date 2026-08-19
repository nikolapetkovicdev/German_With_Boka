import {redirect} from 'next/navigation';
import {Role} from '@prisma/client';
import {getActor} from '@/lib/server/session';
import {AvailabilityForm} from '@/components/availability-form';

export default async function AvailabilityPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const actor = await getActor();
  if (!actor) redirect(`/${locale}/login`);
  if (actor.role !== Role.ADMIN && actor.role !== Role.TEACHER) redirect(`/${locale}/dashboard`);
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-bold">Raspoloživost</h1>
      <AvailabilityForm />
    </main>
  );
}

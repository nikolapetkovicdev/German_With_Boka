import {redirect} from 'next/navigation';
import {Role} from '@prisma/client';
import {ParentOnboardingForm} from '@/components/parent-onboarding-form';
import {getActor} from '@/lib/server/session';

export default async function OnboardingPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const actor = await getActor();
  if (!actor) redirect(`/${locale}/login`);
  if (actor.role !== Role.PARENT) redirect(`/${locale}/dashboard`);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <section className="card p-6">
        <h1 className="text-2xl font-bold">Povezi dete</h1>
        <p className="mt-2 text-sm font-semibold text-black/65">Roditelj vidi samo decu koju sam doda ili poveze preko koda.</p>
        <ParentOnboardingForm locale={locale} />
      </section>
    </main>
  );
}

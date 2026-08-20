import {redirect} from 'next/navigation';
import {Role} from '@prisma/client';
import {prisma} from '@/lib/prisma';
import {getActor} from '@/lib/server/session';
import {TeacherSetupForm} from '@/components/teacher-setup-form';

export default async function SetupPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const actor = await getActor();
  if (!actor) redirect(`/${locale}/login`);
  if (actor.role !== Role.ADMIN && actor.role !== Role.TEACHER) redirect(`/${locale}/dashboard`);

  const user = await prisma.user.findUnique({
    where: {id: actor.id},
    include: {
      profile: true,
      teacher: {include: {bankInstructions: {where: {currency: 'RSD'}, take: 1}}}
    }
  });
  const instruction = user?.teacher?.bankInstructions[0];

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-3xl font-bold">Podesavanje profila ucitelja</h1>
      <p className="mt-2 text-sm font-semibold text-black/65">Unesi osnovne podatke, cenu termina i instrukcije za uplatu. Ove podatke roditelji i ucenici vide u toku zakazivanja.</p>
      <TeacherSetupForm
        locale={locale}
        defaults={{
          firstName: user?.profile?.firstName ?? '',
          lastName: user?.profile?.lastName ?? '',
          phone: user?.profile?.phone ?? '',
          email: user?.email ?? '',
          recipientName: instruction?.recipientName ?? `${user?.profile?.firstName ?? ''} ${user?.profile?.lastName ?? ''}`.trim(),
          recipientAddress: instruction?.recipientAddress ?? '',
          rsdAccountNumber: instruction?.rsdAccountNumber ?? '',
          foreignInstructions: instruction?.foreignInstructions ?? '',
          singleLessonPrice: instruction?.singleLessonPrice.toString() ?? '1500',
          packagePrice: instruction?.packagePrice.toString() ?? '6000',
          currency: instruction?.currency ?? 'RSD'
        }}
      />
    </main>
  );
}

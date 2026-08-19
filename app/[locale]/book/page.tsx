import {redirect} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {getActor} from '@/lib/server/session';
import {BookingFlow} from '@/components/booking-flow';

export default async function BookPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const actor = await getActor();
  if (!actor) redirect(`/${locale}/login`);
  const t = await getTranslations({locale});
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-3xl font-bold">{t('booking.title')}</h1>
      <BookingFlow locale={locale} />
    </main>
  );
}

import {getTranslations} from 'next-intl/server';
import {LoginForm} from '@/components/login-form';

export default async function LoginPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const t = await getTranslations({locale});
  return (
    <main className="mx-auto grid min-h-[calc(100vh-70px)] max-w-6xl place-items-center px-4 py-10">
      <section className="card w-full max-w-md p-6">
        <h1 className="text-2xl font-bold">{t('auth.login')}</h1>
        <p className="mt-2 text-sm font-medium text-black/70">Demo: admin@germanwithboka.local / DemoPassword123!</p>
        <LoginForm locale={locale} />
      </section>
    </main>
  );
}

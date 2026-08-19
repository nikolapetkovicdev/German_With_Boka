import Link from 'next/link';
import {RegisterForm} from '@/components/register-form';

export default async function RegisterPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  return (
    <main className="mx-auto grid min-h-[calc(100vh-70px)] max-w-6xl place-items-center px-4 py-10">
      <section className="card w-full max-w-md p-6">
        <h1 className="text-2xl font-bold">Napravi nalog</h1>
        <p className="mt-2 text-sm font-medium text-black/70">Roditelj moze da doda dete odmah posle registracije. Ucenik dobija svoj profil.</p>
        <RegisterForm locale={locale} />
        <Link href={`/${locale}/login`} className="mt-4 block text-center text-sm font-bold underline">Vec imam nalog</Link>
      </section>
    </main>
  );
}

import {TeacherInviteRegisterForm} from '@/components/teacher-invite-register-form';

export default async function TeacherInvitePage({params}: {params: Promise<{locale: string; token: string}>}) {
  const {locale, token} = await params;
  return (
    <main className="mx-auto grid min-h-[calc(100vh-70px)] max-w-6xl place-items-center px-4 py-10">
      <section className="card w-full max-w-md p-6">
        <h1 className="text-2xl font-bold">Pozivnica za ucitelja</h1>
        <p className="mt-2 text-sm font-medium text-black/70">Nalog ucitelja moze da se napravi samo ako je administrator poslao vazecu pozivnicu.</p>
        <TeacherInviteRegisterForm locale={locale} token={token} />
      </section>
    </main>
  );
}

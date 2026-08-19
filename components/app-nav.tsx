'use client';

import Link from 'next/link';
import {useState} from 'react';
import {signOut, useSession} from 'next-auth/react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';

export function AppNav({locale}: {locale: string}) {
  const t = useTranslations();
  const {data: session} = useSession();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const nextLocale = locale === 'sr' ? 'en' : 'sr';
  const languageHref = pathname.replace(`/${locale}`, `/${nextLocale}`);
  const isTeacherOrAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'TEACHER';
  const bookClass = isTeacherOrAdmin
    ? 'rounded-md border border-black/15 px-3 py-2 text-black hover:bg-boka-bg'
    : 'rounded-md bg-boka-cta px-3 py-2 text-black';
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-white">
      <nav className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/${locale}/dashboard`} className="text-base font-bold sm:text-lg">
            {t('brand')}
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-label="Otvori meni"
            onClick={() => setOpen((value) => !value)}
            className="rounded-md border border-black/15 px-3 py-2 text-lg font-bold md:hidden"
          >
            ☰
          </button>
          <div className="hidden items-center gap-2 text-sm font-semibold md:flex">
            <NavLinks locale={locale} languageHref={languageHref} nextLocale={nextLocale} bookClass={bookClass} isTeacherOrAdmin={isTeacherOrAdmin} />
          </div>
        </div>
        {open ? (
          <div className="mt-3 grid gap-2 border-t border-black/10 pt-3 text-sm font-semibold md:hidden">
            <NavLinks locale={locale} languageHref={languageHref} nextLocale={nextLocale} bookClass={bookClass} isTeacherOrAdmin={isTeacherOrAdmin} onNavigate={() => setOpen(false)} />
          </div>
        ) : null}
      </nav>
    </header>
  );
}

function NavLinks({
  locale,
  languageHref,
  nextLocale,
  bookClass,
  isTeacherOrAdmin,
  onNavigate
}: {
  locale: string;
  languageHref: string;
  nextLocale: string;
  bookClass: string;
  isTeacherOrAdmin: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations();
  const {data: session} = useSession();
  const linkClass = 'rounded-md px-3 py-2 hover:bg-boka-bg';

  return (
    <>
      {session?.user ? (
        <>
          <Link onClick={onNavigate} className={linkClass} href={`/${locale}/dashboard`}>
            {t('nav.dashboard')}
          </Link>
          <Link onClick={onNavigate} className={bookClass} href={`/${locale}/book`}>
            {t('nav.book')}
          </Link>
          {isTeacherOrAdmin ? (
            <>
              <Link onClick={onNavigate} className={linkClass} href={`/${locale}/availability`}>
                {t('nav.availability')}
              </Link>
              <Link onClick={onNavigate} className={linkClass} href={`/${locale}/admin`}>
                {t('nav.admin')}
              </Link>
            </>
          ) : null}
          <button className={`${linkClass} text-left`} onClick={() => signOut({callbackUrl: `/${locale}/login`})}>
            {t('nav.logout')}
          </button>
        </>
      ) : (
        <Link onClick={onNavigate} className="rounded-md bg-boka-cta px-3 py-2 text-black" href={`/${locale}/login`}>
          {t('auth.login')}
        </Link>
      )}
      <Link onClick={onNavigate} href={languageHref} className="rounded-md border border-black/15 px-3 py-2">
        {nextLocale.toUpperCase()}
      </Link>
    </>
  );
}

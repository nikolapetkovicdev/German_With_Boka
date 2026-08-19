'use client';

import Link from 'next/link';
import {signOut, useSession} from 'next-auth/react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';

export function AppNav({locale}: {locale: string}) {
  const t = useTranslations();
  const {data: session} = useSession();
  const pathname = usePathname();
  const nextLocale = locale === 'sr' ? 'en' : 'sr';
  const languageHref = pathname.replace(`/${locale}`, `/${nextLocale}`);
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href={`/${locale}/dashboard`} className="text-base font-bold sm:text-lg">
          {t('brand')}
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {session?.user ? (
            <>
              <Link className="rounded-md px-3 py-2 hover:bg-boka-bg" href={`/${locale}/dashboard`}>
                {t('nav.dashboard')}
              </Link>
              <Link className="rounded-md bg-boka-cta px-3 py-2 text-black" href={`/${locale}/book`}>
                {t('nav.book')}
              </Link>
              {session.user.role === 'ADMIN' || session.user.role === 'TEACHER' ? (
                <>
                  <Link className="rounded-md px-3 py-2 hover:bg-boka-bg" href={`/${locale}/availability`}>
                    {t('nav.availability')}
                  </Link>
                  <Link className="rounded-md px-3 py-2 hover:bg-boka-bg" href={`/${locale}/admin`}>
                    {t('nav.admin')}
                  </Link>
                </>
              ) : null}
              <button className="rounded-md px-3 py-2 hover:bg-boka-bg" onClick={() => signOut({callbackUrl: `/${locale}/login`})}>
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <Link className="rounded-md bg-boka-cta px-3 py-2 text-black" href={`/${locale}/login`}>
              {t('auth.login')}
            </Link>
          )}
          <Link href={languageHref} className="rounded-md border border-black/15 px-3 py-2">
            {nextLocale.toUpperCase()}
          </Link>
        </div>
      </nav>
    </header>
  );
}

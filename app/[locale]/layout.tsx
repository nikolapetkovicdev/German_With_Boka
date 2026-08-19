import {NextIntlClientProvider} from 'next-intl';
import {SessionProviderShell} from '@/components/session-provider-shell';
import {AppNav} from '@/components/app-nav';

export default async function LocaleLayout({children, params}: {children: React.ReactNode; params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <SessionProviderShell>
            <AppNav locale={locale} />
            {children}
          </SessionProviderShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

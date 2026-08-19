import {getRequestConfig} from 'next-intl/server';
import {hasLocale} from 'next-intl';

export const locales = ['sr', 'en'] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = 'sr';

export default getRequestConfig(async ({requestLocale}) => {
  const requested = await requestLocale;
  const locale = hasLocale(locales, requested) ? requested : defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});

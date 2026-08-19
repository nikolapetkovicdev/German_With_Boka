'use client';

import {FormEvent, useState} from 'react';
import {signIn} from 'next-auth/react';
import {useTranslations} from 'next-intl';

export function LoginForm({locale}: {locale: string}) {
  const t = useTranslations();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const result = await signIn('credentials', {
      email: String(form.get('email')),
      password: String(form.get('password')),
      redirect: false
    });
    setLoading(false);
    if (result?.error) {
      setError(`Login error: ${result.error}`);
      return;
    }
    window.location.href = `/${locale}/dashboard`;
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-sm font-semibold">{t('auth.email')}</span>
        <input name="email" type="email" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">{t('auth.password')}</span>
        <input name="password" type="password" required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      {error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p> : null}
      <button disabled={loading} className="w-full rounded-md bg-boka-cta px-4 py-3 font-bold text-black disabled:opacity-60">
        {loading ? t('common.loading') : t('auth.submit')}
      </button>
    </form>
  );
}

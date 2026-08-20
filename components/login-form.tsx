'use client';

import {FormEvent, useState} from 'react';
import {signIn} from 'next-auth/react';
import {useTranslations} from 'next-intl';

export function LoginForm({locale}: {locale: string}) {
  const t = useTranslations();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const callbackUrl = `/${locale}/dashboard`;

  async function login(email: string, password: string) {
    const result = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl
    });

    if (!result) {
      setError('Login request failed: no response from authentication service.');
      return;
    }

    if (result.error) {
      setError(`Login error: ${result.error}`);
      return;
    }

    window.location.assign(callbackUrl);
  }

  async function demoLogin(email: string) {
    setLoading(true);
    setError('');
    try {
      await login(email, 'DemoPassword123!');
    } catch (error) {
      setError(`Login request failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);

    try {
      await login(String(form.get('email')), String(form.get('password')));
    } catch (error) {
      setError(`Login request failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-sm font-semibold">{t('auth.email')}</span>
        <input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">{t('auth.password')}</span>
        <input name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mt-2 w-full rounded-md border border-black/20 px-3 py-3" />
      </label>
      {error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p> : null}
      <button disabled={loading} className="w-full rounded-md bg-boka-cta px-4 py-3 font-bold text-black disabled:opacity-60">
        {loading ? t('common.loading') : t('auth.submit')}
      </button>
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button type="button" disabled={loading} onClick={() => setEmail('veselinovic.bojana@yahoo.de')} className="col-span-2 rounded-md border border-black/20 px-3 py-2 text-sm font-bold">Bojana admin/ucitelj</button>
        <button type="button" disabled={loading} onClick={() => demoLogin('admin@germanwithboka.local')} className="rounded-md border border-black/20 px-3 py-2 text-sm font-bold">Demo admin</button>
        <button type="button" disabled={loading} onClick={() => demoLogin('teacher@germanwithboka.local')} className="rounded-md border border-black/20 px-3 py-2 text-sm font-bold">Demo ucitelj</button>
        <button type="button" disabled={loading} onClick={() => demoLogin('parent@germanwithboka.local')} className="rounded-md border border-black/20 px-3 py-2 text-sm font-bold">Demo roditelj</button>
        <button type="button" disabled={loading} onClick={() => demoLogin('student@germanwithboka.local')} className="rounded-md border border-black/20 px-3 py-2 text-sm font-bold">Demo ucenik</button>
      </div>
    </form>
  );
}

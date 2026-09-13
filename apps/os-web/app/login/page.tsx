import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { t } from '@/lib/i18n/es';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-16">
      <div className="mb-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white shadow-[var(--isalwa-shadow-resting)]">
          <span className="font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
            I
          </span>
        </div>
        <p className="isalwa-kicker mt-6">{t('login.kicker')}</p>
        <h1 className="isalwa-page-title mt-4">{t('login.title')}</h1>
        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-[var(--isalwa-slate)]">
          {t('login.description')}
        </p>
      </div>

      <Suspense fallback={<p className="text-center text-sm text-[var(--isalwa-slate)]">{t('login.loading')}</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { PASSWORD_RESET_COPY } from '@/lib/auth/password-reset';

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-16">
      <div className="mb-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white shadow-[var(--isalwa-shadow-resting)]">
          <span className="font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
            I
          </span>
        </div>
        <p className="isalwa-kicker mt-6">{PASSWORD_RESET_COPY.forgotKicker}</p>
        <h1 className="isalwa-page-title mt-4">{PASSWORD_RESET_COPY.forgotTitle}</h1>
        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-[var(--isalwa-slate)]">
          {PASSWORD_RESET_COPY.forgotDescription}
        </p>
      </div>
      <ForgotPasswordForm />
    </main>
  );
}

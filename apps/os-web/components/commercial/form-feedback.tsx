'use client';

import Link from 'next/link';

const SESSION_EXPIRED = /sesión venció/i;

type FormFeedbackProps = {
  error?: string | null;
  success?: string | null;
};

const errorClass =
  'rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-tint-red-border)] bg-[var(--isalwa-tint-red)] px-4 py-3 text-sm text-[var(--isalwa-tint-red-ink)]';

const successClass =
  'rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-tint-green-border)] bg-[var(--isalwa-tint-green)] px-4 py-3 text-sm text-[var(--isalwa-tint-green-ink)]';

export function FormFeedback({ error, success }: FormFeedbackProps) {
  if (!error && !success) return null;
  if (error) {
    const sessionExpired = SESSION_EXPIRED.test(error);
    return (
      <p className={errorClass} role="alert">
        {error}
        {sessionExpired ? (
          <>
            {' '}
            No se guardó nada.{' '}
            <Link href="/login" className="font-medium text-[var(--isalwa-glaze)] underline">
              Iniciar sesión
            </Link>
          </>
        ) : null}
      </p>
    );
  }
  return (
    <p className={successClass} role="status">
      {success}
    </p>
  );
}

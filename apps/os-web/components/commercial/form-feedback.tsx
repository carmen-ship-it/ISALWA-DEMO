'use client';

import Link from 'next/link';

const SESSION_EXPIRED = /sesión venció/i;

type FormFeedbackProps = {
  error?: string | null;
  success?: string | null;
};

const hairline =
  'rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] px-4 py-3 text-sm text-[var(--isalwa-kiln)]';

export function FormFeedback({ error, success }: FormFeedbackProps) {
  if (!error && !success) return null;
  if (error) {
    const sessionExpired = SESSION_EXPIRED.test(error);
    return (
      <p className={hairline} role="alert">
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
    <p className="text-sm text-[var(--isalwa-kiln)]" role="status">
      {success}
    </p>
  );
}

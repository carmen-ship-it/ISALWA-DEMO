'use client';

type FormFeedbackProps = {
  error?: string | null;
  success?: string | null;
};

export function FormFeedback({ error, success }: FormFeedbackProps) {
  if (!error && !success) return null;
  if (error) {
    return (
      <p className="rounded-[var(--isalwa-radius-control)] border border-[color-mix(in_srgb,var(--isalwa-danger)_25%,var(--isalwa-mist))] bg-[color-mix(in_srgb,var(--isalwa-danger)_6%,white)] px-4 py-3 text-sm text-[var(--isalwa-kiln)]" role="alert">
        {error}
      </p>
    );
  }
  return (
    <p className="rounded-[var(--isalwa-radius-control)] border border-[color-mix(in_srgb,var(--isalwa-success)_25%,var(--isalwa-mist))] bg-[color-mix(in_srgb,var(--isalwa-success)_6%,white)] px-4 py-3 text-sm text-[var(--isalwa-kiln)]" role="status">
      {success}
    </p>
  );
}

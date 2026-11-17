/**
 * Single unobtrusive notice for evaluation hosts. Not the role-preview banner.
 * Visible only when NEXT_PUBLIC_OS_EVALUATION_NOTICE=1 (or runtime profile evaluation).
 */

export const EVALUATION_ENVIRONMENT_NOTICE =
  'Entorno de evaluación · Los datos utilizados para esta revisión no son operación comercial real.';

export function shouldShowEvaluationEnvironmentNotice(): boolean {
  if (process.env.NEXT_PUBLIC_OS_EVALUATION_NOTICE === '1') return true;
  if (process.env.NEXT_PUBLIC_OS_EVALUATION_NOTICE === '0') return false;
  const profile =
    process.env.NEXT_PUBLIC_OS_RUNTIME_PROFILE?.trim() || process.env.OS_RUNTIME_PROFILE?.trim();
  return profile === 'evaluation';
}

export function EvaluationEnvironmentNotice() {
  if (!shouldShowEvaluationEnvironmentNotice()) return null;

  return (
    <div
      role="status"
      data-shell-evaluation-environment-notice
      className="border-b border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_92%,var(--isalwa-glaze))] px-4 py-1.5 lg:px-8"
    >
      <p className="mx-auto max-w-[90rem] text-xs leading-relaxed text-[var(--isalwa-slate)]">
        {EVALUATION_ENVIRONMENT_NOTICE}
      </p>
    </div>
  );
}

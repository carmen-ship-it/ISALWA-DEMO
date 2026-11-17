import { redirect } from 'next/navigation';
import { PageContainer, EmptyState, StatusPill } from '@isalwa/ui';
import { EndSessionButton } from '@/components/auth/end-session-button';
import { getServerWebSession } from '@/lib/auth/actions';
import { isWalkthroughOnlyEvaluation } from '@/lib/evaluation/walkthrough-config';

/**
 * Neutral denial for authenticated users who are not on the evaluator allowlist.
 * Does not reveal allowlist contents or other identities.
 */
export default async function EvaluacionDenegadoPage() {
  if (!isWalkthroughOnlyEvaluation()) {
    redirect('/login');
  }

  const session = await getServerWebSession();
  if (!session) {
    redirect('/login?next=/evaluacion');
  }

  return (
    <PageContainer label="Sin acceso" className="flex min-h-screen items-center justify-center px-4">
      <div role="status" className="w-full max-w-lg" data-evaluation-access-denied="">
        <EmptyState
          title="No tiene acceso a esta evaluación"
          description="Esta evaluación está limitada a personas autorizadas por ISALWA. Si cree que debería participar, comuníquese con quien le compartió el enlace."
          action={
            <div className="flex flex-col items-start gap-4">
              <StatusPill tone="warning">Sin acceso</StatusPill>
              <EndSessionButton label="Volver al inicio de sesión" />
            </div>
          }
        />
      </div>
    </PageContainer>
  );
}

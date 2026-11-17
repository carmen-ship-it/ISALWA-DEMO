import { redirect } from 'next/navigation';
import { PageContainer } from '@isalwa/ui';
import { EndSessionButton } from '@/components/auth/end-session-button';
import { OwnerStoryMode } from '@/components/journey/owner-story-mode';
import { JourneyProvider } from '@/components/journey/journey-provider';
import { resolveWalkthroughAccess } from '@/lib/evaluation/walkthrough-access';
import {
  EVALUATION_WALKTHROUGH_NOTICE,
  EVALUATION_WALKTHROUGH_TITLE,
} from '@/lib/evaluation/walkthrough-config';

/**
 * Protected walkthrough-only evaluation. Reuses the canonical Journey source.
 * Does not call the Nest API or load customer/commercial data.
 */
export default async function EvaluacionPage({
  searchParams,
}: {
  searchParams?: Promise<{ motivo?: string }>;
}) {
  const access = await resolveWalkthroughAccess();
  if (access.status === 'unauthenticated') {
    redirect('/login?next=/evaluacion');
  }
  if (access.status === 'denied' || access.status === 'misconfigured') {
    redirect('/evaluacion/denegado');
  }

  const params = searchParams ? await searchParams : undefined;
  const redirectedFromOps = params?.motivo === 'recorrido';

  return (
    <PageContainer label={EVALUATION_WALKTHROUGH_TITLE} className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#2C8C88] uppercase">
            ISALWA · Evaluación
          </p>
          <h1 className="mt-1 font-[family-name:var(--isalwa-font-display)] text-2xl text-[var(--isalwa-kiln)] italic sm:text-3xl">
            {EVALUATION_WALKTHROUGH_TITLE}
          </h1>
        </div>
        <EndSessionButton label="Cerrar sesión" variant="secondary" />
      </header>

      {redirectedFromOps ? (
        <p
          className="mb-4 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] px-3 py-2 text-sm text-[var(--isalwa-kiln)]"
          role="status"
          data-evaluation-ops-redirect=""
        >
          Esta evaluación es un recorrido guiado. Las pantallas operativas se abrirán cuando la API
          de evaluación esté alojada y verificada.
        </p>
      ) : null}

      <p
        className="mb-6 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] px-3 py-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]"
        data-evaluation-walkthrough-notice=""
      >
        {EVALUATION_WALKTHROUGH_NOTICE}
      </p>

      <JourneyProvider canOpenJourney={true}>
        <OwnerStoryMode presentation="evaluation-page" />
      </JourneyProvider>
    </PageContainer>
  );
}

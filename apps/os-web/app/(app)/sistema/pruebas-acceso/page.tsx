import {
  Button,
  EmptyPanel,
  PageContainer,
  PageSection,
  SectionHeader,
  StatusPill,
} from '@isalwa/ui';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/page-header';
import { AccessDeniedState } from '@/components/states/app-states';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';
import { startQaView, readActiveQaView } from '@/lib/qa/actions';
import { buildAccessMatrix } from '@/lib/qa/access-matrix';
import { qaControlSurfaceAllowed } from '@/lib/qa/authorization';
import { loadSynthPersonas } from '@/lib/qa/personas';
import { isQaControlEnabled } from '@/lib/qa/runtime';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PruebasAccesoPage() {
  if (!isQaControlEnabled()) notFound();

  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const grantedScopes = await loadActorRoleKeys(client);
  if (!qaControlSurfaceAllowed(grantedScopes)) {
    return (
      <PageContainer label="Pruebas de acceso" className="flex min-h-[50vh] items-center justify-center">
        <AccessDeniedState />
      </PageContainer>
    );
  }

  const personas = loadSynthPersonas();
  const activeView = await readActiveQaView();

  return (
    <PageContainer label="Pruebas de acceso">
      <PageHeader
        kicker="Sistema · Staging"
        title="Pruebas de acceso"
        description="Catálogo de personas SYNTH y vista previa de permisos efectivos. Sin contraseñas en pantalla."
        action={<StatusPill tone="success">qa.access</StatusPill>}
      />

      <div className="mt-8 space-y-8">
        {activeView?.persona ? (
          <PageSection card className="p-6 md:p-7">
            <SectionHeader title="Vista activa" />
            <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
              Viendo como <strong>{activeView.persona.label}</strong>. Use el banner superior para terminar.
            </p>
          </PageSection>
        ) : null}

        <PageSection card className="p-6 md:p-8">
          <SectionHeader kicker="Personas SYNTH" title="Ver como" />
          <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
            Seleccione una persona de aceptación. Solo miembros del tenant SYNTH Wave 2.
          </p>
          <ul className="mt-6 divide-y divide-[var(--isalwa-mist)]">
            {personas.map((persona) => {
              const matrix = buildAccessMatrix(persona.grantedScopes);
              const canStart = Boolean(persona.memberId);
              return (
                <li key={persona.id} className="py-6 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--isalwa-kiln)]">{persona.label}</p>
                      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{persona.email}</p>
                      <p className="isalwa-kicker mt-2">
                        Origen: {persona.source === 'receipt' ? 'recibo local' : 'mapa planificado V1'}
                      </p>
                      {!canStart ? (
                        <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                          Ejecute el fixture Wave 2 en staging para obtener memberId en el recibo local.
                        </p>
                      ) : null}
                    </div>
                    <form action={startQaView} className="shrink-0">
                      <input type="hidden" name="targetMemberId" value={persona.memberId ?? ''} />
                      <Button type="submit" size="sm" disabled={!canStart}>
                        Ver como
                      </Button>
                    </form>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[32rem] text-left text-sm">
                      <thead>
                        <tr className="isalwa-kicker border-b border-[var(--isalwa-mist)]">
                          <th className="py-2 pr-4 font-medium">Comprobación</th>
                          <th className="py-2 pr-4 font-medium">Resultado</th>
                          <th className="py-2 font-medium">Evaluador</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matrix.map((row) => (
                          <tr key={`${persona.id}-${row.id}`} className="border-b border-[var(--isalwa-mist)]/60">
                            <td className="py-2.5 pr-4 text-[var(--isalwa-kiln)]">{row.label}</td>
                            <td className="py-2.5 pr-4">
                              <StatusPill tone={row.allowed ? 'success' : 'neutral'}>
                                {row.allowed ? 'Permitido' : 'Denegado'}
                              </StatusPill>
                            </td>
                            <td className="py-2.5 font-mono text-xs text-[var(--isalwa-slate)]">
                              {row.evaluator}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </li>
              );
            })}
          </ul>
          {personas.length === 0 ? (
            <EmptyPanel title="Sin personas" description="No hay entradas planificadas." />
          ) : null}
        </PageSection>
      </div>
    </PageContainer>
  );
}

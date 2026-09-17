import Link from 'next/link';
import { ListRow, PageContainer, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { PageHeader } from '@/components/shell/page-header';
import { AccessDeniedState } from '@/components/states/app-states';
import { createOsApiClient, type OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { getOsApiBaseUrl, getOsAuthMode, isSupabaseConfigured } from '@/lib/auth/config';
import { resolveAiHostedVisibility } from '@/components/ai/hosted-state';
import { resolveMapProviderStatus } from '@/lib/map/provider-status';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';
import { isQaControlEnabled } from '@/lib/qa/runtime';
import {
  SYSTEM_ADMIN_MEANING,
  mayOpenSystemControls,
} from '@/lib/roles/system-controls';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type HealthTone = 'success' | 'warning' | 'neutral';

type ProviderHealthRow = {
  id: string;
  label: string;
  state: string;
  detail: string;
  tone: HealthTone;
};

function providerKind(provider: string): 'mock' | 'live' | 'unset' {
  const value = provider.trim().toLowerCase();
  if (!value || value === 'mock') return 'mock';
  return 'live';
}

async function loadProviderHealth(client: OsApiClient): Promise<ProviderHealthRow[]> {
  const mapStatus = resolveMapProviderStatus();
  const rows: ProviderHealthRow[] = [];

  rows.push({
    id: 'app',
    label: 'Aplicación',
    state: 'Funcionando',
    detail: 'Su sesión está autorizada en la organización de esta pantalla.',
    tone: 'success',
  });

  let apiState = 'No verificado';
  let apiDetail = 'No pudimos confirmar la respuesta del servicio de datos.';
  let apiTone: HealthTone = 'warning';
  try {
    const health = await client.health();
    if (health.status === 'ok') {
      apiState = 'Funcionando';
      apiDetail = 'El servicio de datos respondió a la comprobación de disponibilidad.';
      apiTone = 'success';
    }
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'forbidden') {
      apiState = 'No verificado';
      apiDetail = 'Su sesión no expone esta comprobación; no se infiere estado del servicio.';
      apiTone = 'neutral';
    }
  }
  rows.push({ id: 'api', label: 'API', state: apiState, detail: apiDetail, tone: apiTone });

    let dbState = 'No verificado';
  let dbDetail = 'La comprobación de base de datos no está disponible desde esta pantalla.';
  let dbTone: HealthTone = 'neutral';
  try {
    const response = await fetch(`${getOsApiBaseUrl()}/health/ready`, { cache: 'no-store' });
    const body = (await response.json()) as {
      status?: string;
      checks?: Array<{ name: string; ok: boolean; detail?: string }>;
    };
    const database = body.checks?.find((check) => check.name === 'database');
    if (database) {
      if (database.ok) {
        dbState = 'Funcionando';
        dbDetail = 'La comprobación de preparación reportó la base de datos accesible.';
        dbTone = 'success';
      } else {
        dbState = 'Atención requerida';
        dbDetail = 'La comprobación de preparación no pudo usar la base de datos.';
        dbTone = 'warning';
      }
    } else if (body.status === 'ready') {
      dbState = 'Funcionando';
      dbDetail = 'La comprobación de preparación finalizó en estado listo.';
      dbTone = 'success';
    }
  } catch {
    dbDetail = 'No pudimos consultar la preparación del servicio de datos.';
  }
  rows.push({ id: 'database', label: 'Base de datos', state: dbState, detail: dbDetail, tone: dbTone });

  const authMode = getOsAuthMode();
  const authRow: ProviderHealthRow =
    authMode === 'dev'
      ? {
          id: 'auth',
          label: 'Autenticación',
          state: 'Modo desarrollo',
          detail: 'La sesión usa el modo de desarrollo local; no evalúa un proveedor de acceso en producción.',
          tone: 'neutral',
        }
      : isSupabaseConfigured()
        ? {
            id: 'auth',
            label: 'Autenticación',
            state: 'Funcionando',
            detail: 'Las variables de acceso del proveedor están presentes; no se muestran secretos aquí.',
            tone: 'success',
          }
        : {
            id: 'auth',
            label: 'Autenticación',
            state: 'No configurado',
            detail: 'Faltan variables de configuración del proveedor de acceso.',
            tone: 'warning',
          };
  rows.push(authRow);

  rows.push({
    id: 'map',
    label: 'Mapa',
    state: mapStatus.kind === 'live' ? 'Funcionando' : 'Falta configurar',
    detail: mapStatus.tokenPresent
      ? mapStatus.detail
      : mapStatus.detail,
    tone: mapStatus.kind === 'live' ? 'success' : 'neutral',
  });

  const aiHosted = resolveAiHostedVisibility();
  rows.push({
    id: 'ai',
    label: 'IA',
    state: aiHosted.show
      ? aiHosted.citationsLive
        ? 'Funcionando'
        : 'Piloto (mock)'
      : aiHosted.blocker === 'PROVIDER_BLOCKED'
        ? 'Falta configurar'
        : 'Desactivada',
    detail: aiHosted.show
      ? aiHosted.citationsLive
        ? 'La asistencia de IA está habilitada con proveedor en vivo.'
        : 'La asistencia de IA está en piloto sin llamada al proveedor en vivo.'
      : aiHosted.blocker === 'PROVIDER_BLOCKED'
        ? 'Falta la credencial del proveedor de IA en este entorno.'
        : 'La asistencia de IA permanece apagada hasta habilitarla de forma explícita.',
    tone: aiHosted.show ? 'success' : aiHosted.blocker === 'PROVIDER_BLOCKED' ? 'warning' : 'neutral',
  });

  const emailKind = providerKind(process.env.EMAIL_PROVIDER ?? '');
  rows.push({
    id: 'email',
    label: 'Email',
    state: emailKind === 'live' ? 'Funcionando' : 'No conectado',
    detail:
      emailKind === 'live'
        ? 'Hay un proveedor de correo declarado en configuración; no se envían credenciales desde esta pantalla.'
        : 'El correo transaccional no está conectado en este entorno.',
    tone: emailKind === 'live' ? 'neutral' : 'neutral',
  });

  const messagingKind = providerKind(process.env.MESSAGING_PROVIDER ?? '');
  rows.push({
    id: 'whatsapp',
    label: 'WhatsApp',
    state: messagingKind === 'live' ? 'Funcionando' : 'No conectado',
    detail:
      messagingKind === 'live'
        ? 'Hay un proveedor de mensajería declarado; el canal WhatsApp no se evalúa desde secretos aquí.'
        : 'WhatsApp y envíos automáticos siguen sin conectar en este entorno.',
    tone: 'neutral',
  });

  rows.push({
    id: 'monitoring',
    label: 'Monitoreo',
    state: 'No configurado',
    detail: 'No hay un tablero de monitoreo operativo dentro de ISALWA; use las herramientas de infraestructura.',
    tone: 'neutral',
  });

  rows.push({
    id: 'backups',
    label: 'Backups',
    state: 'No verificado',
    detail: 'El estado de respaldos no se expone en la aplicación; consulte runbooks de operaciones.',
    tone: 'neutral',
  });

  return rows;
}

function toneForPill(tone: HealthTone): 'success' | 'warning' | 'neutral' {
  return tone;
}

/**
 * Technical system controls for system.admin only.
 * Fail-closed. Does not open people.admin Equipo / Accesos / Capacidades.
 */
export default async function SistemaPage() {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);
  const grantedScopes = await loadActorRoleKeys(client);
  const allowed = mayOpenSystemControls(grantedScopes);

  if (!allowed) {
    return (
      <PageContainer label="Controles del sistema" className="flex min-h-[50vh] items-center justify-center">
        <AccessDeniedState />
      </PageContainer>
    );
  }

  const providerHealth = await loadProviderHealth(client);
  const qaEnabled = isQaControlEnabled();

  return (
    <PageContainer label="Controles del sistema">
      <PageHeader
        kicker="Sistema"
        title="Controles del sistema"
        description="Capa técnica de la empresa. Separada de la lectura de negocio y de la administración de personas."
        action={<StatusPill tone="success">Autorizado</StatusPill>}
      />

      <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
        <PageSection
          card
          className="border-[color-mix(in_srgb,var(--isalwa-glaze)_12%,var(--isalwa-mist))] p-6 shadow-[var(--isalwa-shadow-resting)] md:p-8"
        >
          <SectionHeader kicker="Salud" title="Integraciones y servicios" />
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
            Estados en lenguaje humano, derivados solo de comprobaciones disponibles. No se muestran
            secretos ni credenciales.
          </p>
          <ul className="mt-6 space-y-2">
            {providerHealth.map((row) => (
              <ListRow key={row.id} as="li" className="min-w-0 px-1 py-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--isalwa-ink)]">{row.label}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-[var(--isalwa-slate)]">{row.detail}</p>
                  </div>
                  <StatusPill tone={toneForPill(row.tone)} className="shrink-0 self-start">
                    {row.state}
                  </StatusPill>
                </div>
              </ListRow>
            ))}
          </ul>
          {qaEnabled ? (
            <p className="mt-6 text-sm leading-relaxed text-[var(--isalwa-slate)]">
              <Link
                href="/sistema/pruebas-acceso"
                className="font-medium text-[var(--isalwa-glaze)] underline-offset-2 hover:underline"
              >
                Pruebas de acceso (QA)
              </Link>
              {' — '}
              matriz de acceso para aceptación en staging.
            </p>
          ) : null}
        </PageSection>

        <div className="space-y-6">
          <PageSection
            card
            className="border-[color-mix(in_srgb,var(--isalwa-glaze)_12%,var(--isalwa-mist))] p-6 shadow-[var(--isalwa-shadow-resting)] md:p-8"
          >
            <SectionHeader kicker="Alcance" title="Qué autoriza system.admin" />
            <ul className="mt-2 max-w-2xl space-y-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
              <li>
                Autoridad técnica explícita ({SYSTEM_ADMIN_MEANING.scope}), acotada a la organización de la
                sesión.
              </li>
              <li>Salud de integraciones se resume aquí con evidencia disponible; no reescribe historial.</li>
              <li>
                No implica administración de personas (people.admin). Equipo, accesos e invitaciones
                siguen en Administración solo con esa autoridad.
              </li>
            </ul>
          </PageSection>

          <div className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_70%,white)] p-6 shadow-[var(--isalwa-shadow-soft)] md:p-7">
            <p className="isalwa-section-label">Disponible hoy</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
              Este panel confirma que su sesión tiene controles técnicos autorizados y resume la salud
              visible del entorno. Las herramientas operativas adicionales se habilitan aquí cuando
              existan; no se muestran botones a destinos que aún no puede usar.
            </p>
          </div>
          <PageSection card className="p-6 md:p-7">
            <SectionHeader title="Separación" />
            <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
              Personas y accesos viven en Administración. Aquí solo la capa técnica — sin inventar
              consoles vacías.
            </p>
          </PageSection>
        </div>
      </div>
    </PageContainer>
  );
}

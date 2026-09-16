import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  V1_PLANNED_ASSIGNMENTS,
  type V1PlannedFunctionId,
} from '@isalwa/os-contracts';
import {
  QA_REAL_ORGANIZATION_ID,
  QA_SYNTH_ORGANIZATION_ID,
} from '@/lib/qa/constants';

export type SynthPersonaSource = 'receipt' | 'planned' | 'staging';

export type SynthPersona = {
  id: string;
  functionId: V1PlannedFunctionId | 'issue-reporter' | 'issue-manager' | 'issue-work';
  label: string;
  description: string;
  email: string;
  memberId: string | null;
  grantedScopes: readonly string[];
  source: SynthPersonaSource;
};

export type StagingPersonaLookupRow = {
  email: string;
  memberId: string;
  organizationId?: string;
  grantedScopes: readonly string[];
};

/**
 * Gap (intentional): Wave 2 fixtures / V1 planned map do not include a People Admin
 * SYNTH persona. Do not invent `people.admin` for Ver Como.
 */
export const PEOPLE_ADMIN_SYNTH_PERSONA_GAP =
  'No hay persona People Admin SYNTH en el catálogo Wave 2 (people.admin excluido del mapa V1).';

/** Matches Wave 2 fixture ROLE_EMAILS (business personas only). */
export const WAVE2_PERSONA_EMAIL: Record<V1PlannedFunctionId, string> = {
  'asesor-comercial': 'w2.asesor@isalwa.demo',
  'jefe-comercial': 'w2.jefe@isalwa.demo',
  'gerente-general': 'w2.gerente@isalwa.demo',
  'encargado-produccion': 'w2.produccion@isalwa.demo',
  'encargado-almacen': 'w2.almacen@isalwa.demo',
  'encargada-compras': 'w2.compras@isalwa.demo',
  contabilidad: 'w2.contabilidad@isalwa.demo',
  'auxiliar-coordinacion': 'w2.coordinacion@isalwa.demo',
  'isalwa-manager': 'w2.owner@isalwa.demo',
};

type Wave2ReceiptRole = {
  functionId: V1PlannedFunctionId;
  functionLabel: string;
  email: string;
  memberId: string;
  capabilities: string[];
};

type Wave2Receipt = {
  organizationId?: string;
  roles?: Wave2ReceiptRole[];
};

type WaveBReceipt = {
  organizationId?: string;
  issueReporter?: { email: string; memberId: string; scopes?: string[] };
  issueManager?: { email: string; memberId: string; scopes?: string[] };
  issueWork?: { email: string; memberId: string; scopes?: string[] };
};

function expandPath(path: string): string {
  if (path.startsWith('~/')) return join(homedir(), path.slice(2));
  return path;
}

function readJsonFile<T>(path: string): T | null {
  const resolved = expandPath(path);
  if (!existsSync(resolved)) return null;
  try {
    return JSON.parse(readFileSync(resolved, 'utf8')) as T;
  } catch {
    return null;
  }
}

function plannedPersonas(): SynthPersona[] {
  return V1_PLANNED_ASSIGNMENTS.map((row) => ({
    id: row.functionId,
    functionId: row.functionId,
    label: row.functionLabel,
    description: row.intendedProfileId,
    email: WAVE2_PERSONA_EMAIL[row.functionId],
    memberId: null,
    grantedScopes: [...row.intendedCapabilities],
    source: 'planned' as const,
  }));
}

function mergeWave2Receipt(personas: SynthPersona[]): SynthPersona[] {
  const receipt = readJsonFile<Wave2Receipt>(
    join(homedir(), '.isalwa-secrets/isalwa-os-staging-wave2-role-fixtures.json'),
  );
  if (!receipt?.roles?.length || receipt.organizationId !== QA_SYNTH_ORGANIZATION_ID) {
    return personas;
  }
  const byFunction = new Map(receipt.roles.map((r) => [r.functionId, r]));
  return personas.map((p) => {
    if (p.functionId === 'issue-reporter' || p.functionId === 'issue-manager' || p.functionId === 'issue-work') {
      return p;
    }
    const row = byFunction.get(p.functionId as V1PlannedFunctionId);
    if (!row) return p;
    return {
      ...p,
      memberId: row.memberId,
      grantedScopes: row.capabilities.length ? row.capabilities : p.grantedScopes,
      source: 'receipt' as const,
    };
  });
}

function waveBIssuePersonas(): SynthPersona[] {
  const receipt = readJsonFile<WaveBReceipt>(
    join(homedir(), '.isalwa-secrets/isalwa-os-staging-wave-b-issue-memory.json'),
  );
  if (!receipt || receipt.organizationId !== QA_SYNTH_ORGANIZATION_ID) return [];

  const extras: SynthPersona[] = [];
  const specs = [
    {
      key: 'issue-reporter' as const,
      label: 'Reportador de incidencias (SYNTH)',
      data: receipt.issueReporter,
      scopes: receipt.issueReporter?.scopes ?? ['member_active'],
    },
    {
      key: 'issue-manager' as const,
      label: 'Gestor de incidencias (SYNTH)',
      data: receipt.issueManager,
      scopes: receipt.issueManager?.scopes ?? ['member_active', 'issue.manage'],
    },
    {
      key: 'issue-work' as const,
      label: 'Operador de trabajo vinculado (SYNTH)',
      data: receipt.issueWork,
      scopes: receipt.issueWork?.scopes ?? ['member_active'],
    },
  ];

  for (const spec of specs) {
    if (!spec.data?.memberId || !spec.data.email) continue;
    extras.push({
      id: spec.key,
      functionId: spec.key,
      label: spec.label,
      description: 'Actor Wave B issue memory (SYNTH)',
      email: spec.data.email,
      memberId: spec.data.memberId,
      grantedScopes: spec.scopes,
      source: 'receipt',
    });
  }
  return extras;
}

/**
 * Local/dev path: planned V1 map + optional ~/.isalwa-secrets receipts.
 * Hosted Render has no homedir receipt — use resolveSynthPersonas with OS API.
 */
export function loadSynthPersonas(): SynthPersona[] {
  const base = mergeWave2Receipt(plannedPersonas());
  return [...base, ...waveBIssuePersonas()];
}

/**
 * Fill null memberIds from staging truth (fixture email → SYNTH member).
 * Local receipt wins when already present. Fail-closed for REAL org rows.
 */
export function mergeStagingPersonaLookups(
  personas: SynthPersona[],
  stagingRows: readonly StagingPersonaLookupRow[],
): SynthPersona[] {
  const byEmail = new Map<string, StagingPersonaLookupRow>();
  for (const row of stagingRows) {
    const email = row.email.trim().toLowerCase();
    const memberId = row.memberId.trim();
    if (!email || !memberId) continue;
    if (row.organizationId === QA_REAL_ORGANIZATION_ID) continue;
    if (row.organizationId && row.organizationId !== QA_SYNTH_ORGANIZATION_ID) continue;
    byEmail.set(email, row);
  }
  return personas.map((p) => {
    if (p.memberId) return p;
    const row = byEmail.get(p.email.trim().toLowerCase());
    if (!row) return p;
    return {
      ...p,
      memberId: row.memberId.trim(),
      grantedScopes: row.grantedScopes.length ? [...row.grantedScopes] : p.grantedScopes,
      source: 'staging' as const,
    };
  });
}

export type StagingPersonaLookup = () => Promise<readonly StagingPersonaLookupRow[]>;

/**
 * Prefer local receipt; when absent, resolve SYNTH memberIds via staging lookup.
 * Fail-soft on lookup errors: leave planned-only (Ver como stays disabled).
 */
export async function resolveSynthPersonas(
  lookup?: StagingPersonaLookup,
): Promise<SynthPersona[]> {
  const base = loadSynthPersonas();
  const needsStaging = base.some((p) => !p.memberId);
  if (!needsStaging || !lookup) return base;
  try {
    const rows = await lookup();
    return mergeStagingPersonaLookups(base, rows);
  } catch {
    return base;
  }
}

export function findSynthPersonaByMemberId(
  memberId: string,
  personas: readonly SynthPersona[] = loadSynthPersonas(),
): SynthPersona | null {
  const trimmed = memberId.trim();
  if (!trimmed) return null;
  return personas.find((p) => p.memberId === trimmed) ?? null;
}

export function isAllowedQaTargetMemberId(
  memberId: string,
  personas: readonly SynthPersona[] = loadSynthPersonas(),
): boolean {
  return findSynthPersonaByMemberId(memberId, personas) !== null;
}

export function personaSourceLabel(source: SynthPersonaSource): string {
  if (source === 'receipt') return 'recibo local';
  if (source === 'staging') return 'verdad staging';
  return 'mapa planificado V1';
}

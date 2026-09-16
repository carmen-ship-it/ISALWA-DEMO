import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  V1_PLANNED_ASSIGNMENTS,
  type V1PlannedFunctionId,
} from '@isalwa/os-contracts';
import { QA_SYNTH_ORGANIZATION_ID } from '@/lib/qa/constants';

export type SynthPersona = {
  id: string;
  functionId: V1PlannedFunctionId | 'issue-reporter' | 'issue-manager' | 'issue-work';
  label: string;
  description: string;
  email: string;
  memberId: string | null;
  grantedScopes: readonly string[];
  source: 'receipt' | 'planned';
};

/** Matches Wave 2 fixture ROLE_EMAILS (business personas only). */
const WAVE2_PERSONA_EMAIL: Record<V1PlannedFunctionId, string> = {
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

export function loadSynthPersonas(): SynthPersona[] {
  const base = mergeWave2Receipt(plannedPersonas());
  return [...base, ...waveBIssuePersonas()];
}

export function findSynthPersonaByMemberId(memberId: string): SynthPersona | null {
  const trimmed = memberId.trim();
  if (!trimmed) return null;
  return loadSynthPersonas().find((p) => p.memberId === trimmed) ?? null;
}

export function isAllowedQaTargetMemberId(memberId: string): boolean {
  return findSynthPersonaByMemberId(memberId) !== null;
}

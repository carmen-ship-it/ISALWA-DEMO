import {
  REQUIRED_SOURCE_CATEGORIES,
  type CoordinationSourceCategory,
} from './copy';
import type {
  CoordinationInjectedSources,
  CoordinationTrustedContext,
  InjectedSource,
  PriorDecisionsSource,
  SourceProof,
  SourceProofStatus,
} from './types';

const SOURCE_KEYS = {
  'date-risk': 'dateRisk',
  production: 'production',
  purchase: 'purchase',
  release: 'release',
  'finished-goods': 'finishedGoods',
  allocation: 'allocation',
  'warehouse-exit': 'warehouseExit',
  delivery: 'delivery',
  'customer-informed': 'customerInformed',
  'prior-decisions': 'priorDecisions',
} as const satisfies Record<CoordinationSourceCategory, keyof CoordinationInjectedSources>;

export function sameTenantRows<T>(rows: readonly T[], organizationId: string, orgOf: (row: T) => string | null): T[] {
  return rows.filter((row) => orgOf(row) === organizationId);
}

export function isConnectedStatus(status: SourceProofStatus): boolean {
  return status === 'AVAILABLE' || status === 'NO_FACT';
}

function unproven(category: CoordinationSourceCategory, reason: string): SourceProof {
  return {
    category,
    status: 'UNPROVEN',
    connected: false,
    factCount: null,
    countedAsZero: false,
    actionableCount: 0,
    reason,
  };
}

export function readInjected<T>(
  source: InjectedSource<T> | null | undefined,
): { status: 'AVAILABLE' | 'NO_FACT'; facts: readonly T[] } | { status: 'ERROR' | 'UNPROVEN'; reason: string } {
  if (!source) return { status: 'UNPROVEN', reason: 'uninjected' };
  if (source.status === 'NO_FACT') return { status: 'NO_FACT', facts: [] };
  if (source.status === 'AVAILABLE') return { status: 'AVAILABLE', facts: source.facts ?? [] };
  if (source.status === 'ERROR') return { status: 'ERROR', reason: source.reason?.trim() || 'error' };
  return { status: 'UNPROVEN', reason: source.reason?.trim() || 'unproven' };
}

export function priorDecisionsInjection(
  context: CoordinationTrustedContext,
): PriorDecisionsSource | null | undefined {
  return context.sources?.priorDecisions;
}

/**
 * A reader is never called. Record and coordinator scopes and title do not authorize one.
 * Injected rows the caller already holds stay usable. An omitted or denied reader is UNPROVEN.
 */
export function resolvePriorDecisionsSource(context: CoordinationTrustedContext): SourceProof {
  const category: CoordinationSourceCategory = 'prior-decisions';
  const injected = context.sources?.priorDecisions;
  const readerPresent = context.priorDecisionsReader != null;

  if (injected?.status === 'DENIED') {
    return unproven(category, 'no_coordination_read_capability');
  }

  if (!injected) {
    return unproven(
      category,
      readerPresent ? 'no_coordination_read_capability' : 'uninjected',
    );
  }

  const resolved = readInjected(injected);
  if (!('facts' in resolved)) {
    return {
      category,
      status: resolved.status,
      connected: false,
      factCount: null,
      countedAsZero: false,
      actionableCount: 0,
      reason: resolved.reason,
    };
  }

  const facts = resolved.facts;
  if (resolved.status === 'NO_FACT' || facts.length === 0) {
    return {
      category,
      status: 'NO_FACT',
      connected: true,
      factCount: 0,
      countedAsZero: true,
      actionableCount: 0,
      reason: null,
    };
  }

  return {
    category,
    status: 'AVAILABLE',
    connected: true,
    factCount: facts.length,
    countedAsZero: false,
    actionableCount: 0,
    reason: null,
  };
}

export function resolveSourceProof<T>(
  category: CoordinationSourceCategory,
  source: InjectedSource<T> | null | undefined,
): { proof: SourceProof; facts: readonly T[] } {
  const resolved = readInjected(source);
  if (!('facts' in resolved)) {
    return {
      proof: {
        category,
        status: resolved.status,
        connected: false,
        factCount: null,
        countedAsZero: false,
        actionableCount: 0,
        reason: resolved.reason,
      },
      facts: [],
    };
  }

  const facts = resolved.facts;
  if (resolved.status === 'NO_FACT' || facts.length === 0) {
    return {
      proof: {
        category,
        status: 'NO_FACT',
        connected: true,
        factCount: 0,
        countedAsZero: true,
        actionableCount: 0,
        reason: null,
      },
      facts: [],
    };
  }

  return {
    proof: {
      category,
      status: 'AVAILABLE',
      connected: true,
      factCount: facts.length,
      countedAsZero: false,
      actionableCount: 0,
      reason: null,
    },
    facts,
  };
}

export function sourceInput(
  sources: CoordinationInjectedSources | null | undefined,
  category: CoordinationSourceCategory,
): InjectedSource<unknown> | null | undefined {
  if (!sources) return undefined;
  return sources[SOURCE_KEYS[category]] as InjectedSource<unknown> | null | undefined;
}

export function coverageComplete(proofs: Record<CoordinationSourceCategory, SourceProof>): boolean {
  return REQUIRED_SOURCE_CATEGORIES.every((category) => proofs[category].connected);
}

export function withActionableCount(proof: SourceProof, actionableCount: number): SourceProof {
  return { ...proof, actionableCount };
}

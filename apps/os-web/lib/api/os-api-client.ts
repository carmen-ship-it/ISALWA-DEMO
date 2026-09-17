import { createId } from '@isalwa/ts-utils';
import { getOsApiBaseUrl } from '@/lib/auth/config';
import { devSessionHeaders, type DevSession } from '@/lib/auth/dev-session';
import { isRetrySafeMethod, OsApiError, parseOsApiError } from './os-api-errors';
import type {
  ApprovalDetailResponse,
  ApprovalListResponse,
  AttentionListResponse,
  WorkDetailResponse,
  WorkListResponse,
} from '@/lib/work/types';
import type { PartyDetailResponse, PartyLocationsResponse, PartySearchResponse } from '@/lib/party/types';
import type {
  CapabilityStateResponse,
  MemberDetailResponse,
  MemberListResponse,
  MemberAccessHistoryResponse,
  TerminationImpactResponse,
} from '@/lib/workforce/types';
import type { CommercialCommandResult } from '@/lib/commercial/command-types';
import type { WorkforceCommandResult } from '@/lib/workforce/command-types';
import type {
  CommercialCommandName,
  LocationCommandName,
  PartyCommandName,
  WorkCommandName,
  WorkforceCommandName,
} from '@isalwa/os-contracts';
import type { WorkCommandResult } from '@/lib/work/command-types';
import type { AuthenticatedSessionView } from '@/lib/auth/session-identity';
import type {
  OpportunityDetailResponse,
  OpportunityListResponse,
  OrderDetailResponse,
  OrderListResponse,
  PartyTimelineResponse,
  QuoteDetailResponse,
  QuoteListResponse,
} from '@/lib/commercial/types';
import type {
  CommitmentCommandName,
  IssueCommandName,
  ProductFeedbackCommandName,
} from '@isalwa/os-contracts';
import type {
  IssueListResponse,
  IssueDetailResponse,
  IssueCommandResult,
} from '@/lib/issue/types';
import type { CommitmentState } from '@isalwa/os-contracts';
import type { AiAssistResponse } from '@/lib/ai/types';
import type { AuditListResponse, MemoryChangesResponse } from '@/lib/audit/types';

export type CommitmentSummary = {
  id: string;
  organizationId: string;
  partyId: string | null;
  ownerMemberId: string;
  text: string;
  dueAt: string | null;
  origin: string;
  relatedSubjectType: string | null;
  relatedSubjectId: string | null;
  lifecycle: string;
  state: CommitmentState;
  createdByMemberId: string;
  createdAt: string;
  fulfilledAt: string | null;
  fulfilledByMemberId: string | null;
  cancelledAt: string | null;
};

export type OsAuthContext = (
  | { mode: 'supabase'; accessToken: string; organizationId?: string }
  | { mode: 'dev'; session: DevSession }
) & { qaViewCookie?: string };

export type OsApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** Retry transient GET failures once (default true for GET). */
  retry?: boolean;
};

function buildUrl(path: string, query?: OsApiRequestOptions['query']): string {
  const base = getOsApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function authHeaders(auth: OsAuthContext): Record<string, string> {
  const extra: Record<string, string> = {};
  if (auth.qaViewCookie) {
    extra['x-os-qa-view'] = auth.qaViewCookie;
  }
  if (auth.mode === 'supabase') {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${auth.accessToken}`,
      ...extra,
    };
    if (auth.organizationId) {
      headers['x-os-organization-id'] = auth.organizationId;
    }
    return headers;
  }
  return { ...devSessionHeaders(auth.session), ...extra };
}

async function fetchWithRetry(
  input: RequestInfo,
  init: RequestInit,
  retry: boolean,
): Promise<Response> {
  const method = init.method ?? 'GET';
  const canRetry = retry && isRetrySafeMethod(method);

  let response = await fetch(input, init);
  if (canRetry && (response.status >= 500 || response.status === 429)) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    response = await fetch(input, init);
  }
  return response;
}

export function createOsApiClient(auth: OsAuthContext) {
  async function request<T>(path: string, options: OsApiRequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const correlationId = createId();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'x-correlation-id': correlationId,
      ...authHeaders(auth),
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.idempotencyKey) {
      headers['idempotency-key'] = options.idempotencyKey;
    }

    const response = await fetchWithRetry(
      buildUrl(path, options.query),
      {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
        cache: 'no-store',
      },
      options.retry ?? method === 'GET',
    );

    if (!response.ok) {
      throw await parseOsApiError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async function requestBinary(
    path: string,
    options: OsApiRequestOptions = {},
  ): Promise<{ bytes: ArrayBuffer; contentType: string; filename: string | null }> {
    const method = options.method ?? 'GET';
    const correlationId = createId();
    const headers: Record<string, string> = {
      Accept: 'application/pdf, application/json',
      'x-correlation-id': correlationId,
      ...authHeaders(auth),
    };

    const response = await fetchWithRetry(
      buildUrl(path, options.query),
      {
        method,
        headers,
        signal: options.signal,
        cache: 'no-store',
      },
      options.retry ?? method === 'GET',
    );

    if (!response.ok) {
      throw await parseOsApiError(response);
    }

    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    const disposition = response.headers.get('content-disposition') ?? '';
    const filenameMatch = /filename="([^"]+)"/i.exec(disposition);
    return {
      bytes: await response.arrayBuffer(),
      contentType,
      filename: filenameMatch?.[1] ?? null,
    };
  }

  return {
    get: <T>(path: string, query?: OsApiRequestOptions['query']) =>
      request<T>(path, { method: 'GET', query }),
    post: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
      request<T>(path, { method: 'POST', body, idempotencyKey, retry: false }),
    executeCommand: <T extends CommercialCommandName>(
      commandName: T,
      payload: Record<string, unknown>,
      idempotencyKey?: string,
    ) =>
      request<CommercialCommandResult>(`/commands/${commandName}`, {
        method: 'POST',
        body: payload,
        idempotencyKey,
        retry: false,
      }),
    executeWorkCommand: <T extends WorkCommandName>(
      commandName: T,
      payload: Record<string, unknown>,
      idempotencyKey?: string,
    ) =>
      request<WorkCommandResult>(`/commands/${commandName}`, {
        method: 'POST',
        body: payload,
        idempotencyKey,
        retry: false,
      }),
    executeWorkforceCommand: <T extends WorkforceCommandName>(
      commandName: T,
      payload: Record<string, unknown>,
      idempotencyKey?: string,
    ) =>
      request<WorkforceCommandResult>(`/commands/${commandName}`, {
        method: 'POST',
        body: payload,
        idempotencyKey,
        retry: false,
      }),
    health: () => request<{ status: string; service: string }>('/health'),
    getAuthenticatedSession: () => request<AuthenticatedSessionView>('/session/me'),
    getTrustedAuthorization: () =>
      request<Record<string, unknown>>('/session/authorization'),
    listAttention: (query?: Record<string, string | number | boolean>) =>
      request<AttentionListResponse>('/attention', { method: 'GET', query }),
    listWorkItems: (query?: Record<string, string | number | boolean>) =>
      request<WorkListResponse>('/work-items', { method: 'GET', query }),
    getWorkItem: (workItemId: string) =>
      request<WorkDetailResponse>(`/work-items/${encodeURIComponent(workItemId)}`),
    listApprovals: (query?: Record<string, string | number | boolean>) =>
      request<ApprovalListResponse>('/approvals', { method: 'GET', query }),
    getApproval: (approvalRequestId: string) =>
      request<ApprovalDetailResponse>(`/approvals/${encodeURIComponent(approvalRequestId)}`),
    listActiveMemberOptions: (query?: Record<string, string | number | boolean>) =>
      request<{ items: Array<{ memberId: string; displayName: string }>; hasMore?: boolean }>(
        '/members/active-options',
        { method: 'GET', query },
      ),
    searchActiveMembers: (query: {
      q: string;
      limit?: number;
      excludeMemberId?: string;
    }) =>
      request<{ items: Array<{ memberId: string; displayName: string }>; hasMore?: boolean }>(
        '/members/active-options',
        {
          method: 'GET',
          query: {
            q: query.q,
            limit: query.limit ?? 20,
            ...(query.excludeMemberId ? { excludeMemberId: query.excludeMemberId } : {}),
          },
        },
      ),
    listSubjectApprovals: (subjectType: string, subjectId: string) =>
      request<{ items: Array<Record<string, unknown>> }>('/approvals/subject', {
        method: 'GET',
        query: { subjectType, subjectId },
      }),
    getMember: (memberId: string) =>
      request<MemberDetailResponse>(`/members/${encodeURIComponent(memberId)}`),
    getTerminationImpact: (memberId: string) =>
      request<TerminationImpactResponse>(
        `/members/${encodeURIComponent(memberId)}/termination-impact`,
      ),
    getMemberAccessHistory: (memberId: string) =>
      request<MemberAccessHistoryResponse>(
        `/members/${encodeURIComponent(memberId)}/access-history`,
      ),
    listMembers: (query?: Record<string, string | number | boolean>) =>
      request<MemberListResponse>('/members', { method: 'GET', query }),
    getCapabilityState: () =>
      request<CapabilityStateResponse>('/capabilities', { method: 'GET' }),
    searchParties: (query?: Record<string, string | number | boolean>) =>
      request<PartySearchResponse>('/parties', { method: 'GET', query }),
    getParty: (partyId: string) =>
      request<PartyDetailResponse>(`/parties/${encodeURIComponent(partyId)}`),
    listPartyLocations: (partyId: string) =>
      request<PartyLocationsResponse>(`/parties/${encodeURIComponent(partyId)}/locations`),
    executePartyCommand: (
      commandName: PartyCommandName,
      payload: Record<string, unknown>,
      idempotencyKey?: string,
    ) =>
      request<CommercialCommandResult>(`/commands/${commandName}`, {
        method: 'POST',
        body: payload,
        idempotencyKey,
        retry: false,
      }),
    executeLocationCommand: (
      commandName: LocationCommandName,
      payload: Record<string, unknown>,
      idempotencyKey?: string,
    ) =>
      request<CommercialCommandResult>(`/commands/${commandName}`, {
        method: 'POST',
        body: payload,
        idempotencyKey,
        retry: false,
      }),
    listOpportunities: (query?: Record<string, string | number | boolean>) =>
      request<OpportunityListResponse>('/opportunities', { method: 'GET', query }),
    getOpportunity: (opportunityId: string) =>
      request<OpportunityDetailResponse>(`/opportunities/${encodeURIComponent(opportunityId)}`),
    listQuotes: (query?: Record<string, string | number | boolean>) =>
      request<QuoteListResponse>('/quotes', { method: 'GET', query }),
    getQuote: (quoteId: string) =>
      request<QuoteDetailResponse>(`/quotes/${encodeURIComponent(quoteId)}`),
    getQuotePdf: async (quoteId: string, opts?: { inline?: boolean }) => {
      const binary = await requestBinary(`/quotes/${encodeURIComponent(quoteId)}/pdf`, {
        method: 'GET',
        query: opts?.inline ? { disposition: 'inline' } : undefined,
      });
      return {
        bytes: binary.bytes,
        contentType: binary.contentType || 'application/pdf',
        filename: binary.filename ?? `Cotizacion-${quoteId}.pdf`,
      };
    },
    getDeliveryNotePdf: async (deliveryNoteId: string) => {
      const binary = await requestBinary(`/delivery-notes/${encodeURIComponent(deliveryNoteId)}/pdf`, {
        method: 'GET',
      });
      return {
        bytes: binary.bytes,
        contentType: binary.contentType || 'application/pdf',
        filename: binary.filename ?? `Nota-Entrega-${deliveryNoteId}.pdf`,
      };
    },
    listOrders: (query?: Record<string, string | number | boolean>) =>
      request<OrderListResponse>('/orders', { method: 'GET', query }),
    getOrder: (orderId: string) =>
      request<OrderDetailResponse>(`/orders/${encodeURIComponent(orderId)}`),
    listCustomerConversations: (query?: { partyId?: string }) =>
      request<{ items: import('@isalwa/os-contracts').ManualCustomerConversation[] }>(
        '/customer-conversations',
        {
          method: 'GET',
          query: query?.partyId ? { partyId: query.partyId } : undefined,
        },
      ),
    createCustomerConversation: (record: import('@isalwa/os-contracts').ManualCustomerConversation) =>
      request<{ item: import('@isalwa/os-contracts').ManualCustomerConversation }>(
        '/customer-conversations',
        { method: 'POST', body: record, retry: false },
      ),
    listWarehouseExits: (query?: Record<string, string | number | boolean>) =>
      request<{
        sourceState: string;
        code: string | null;
        count: number;
        items: unknown[];
      }>('/fulfillment/warehouse-exits', { method: 'GET', query }),
    listDeliveries: (query?: Record<string, string | number | boolean>) =>
      request<{
        sourceState: string;
        code: string | null;
        count: number;
        items: unknown[];
      }>('/fulfillment/deliveries', { method: 'GET', query }),
    listDeliveryOperationalOrders: () =>
      request<{
        items: Array<{
          orderId: string;
          orderNumber: string;
          partyId: string;
          customerName: string;
          status: string;
          lines: Array<{
            orderLineId: string;
            description: string;
            quantity: number;
            unitLabel: string | null;
            productRef: string | null;
          }>;
        }>;
      }>('/delivery-ops/orders', { method: 'GET' }),
    getDeliveryOperationalDocuments: (orderId: string) =>
      request<{
        notes: Array<{
          id: string;
          internalDocumentRef: string;
          status: 'issued' | 'reversed';
          recipient: string;
          deliveredBy: string;
          receivedBy: string | null;
          observations: string | null;
          bornAt: string;
          lines: Array<{
            orderLineId: string;
            description: string;
            quantity: number;
            unitLabel: string | null;
            productRef: string | null;
          }>;
        }>;
        timeline: Array<{
          id: string;
          eventType: string;
          occurredAt: string;
          label: string;
          detail: string;
        }>;
      }>(`/delivery-ops/orders/${encodeURIComponent(orderId)}/documents`, { method: 'GET' }),
    listDeliveryNotesForOrder: (orderId: string) =>
      request<{
        notes: Array<{
          id: string;
          internalDocumentRef?: string;
          status: 'issued' | 'reversed';
          recipient: string;
          deliveredBy: string;
          receivedBy: string | null;
          observations: string | null;
          bornAt: string;
          lines: Array<{
            orderLineId?: string;
            description: string;
            quantity: number;
            unitLabel: string | null;
            productRef?: string | null;
          }>;
        }>;
        timeline: Array<{
          id: string;
          eventType: string;
          occurredAt: string;
          label?: string;
          detail?: string;
          payload?: Record<string, unknown>;
        }>;
      }>('/delivery-notes', { method: 'GET', query: { orderId } }),
    listPartyTimeline: (partyId: string, query?: Record<string, string | number | boolean>) =>
      request<PartyTimelineResponse>(
        `/parties/${encodeURIComponent(partyId)}/timeline`,
        { method: 'GET', query },
      ),
    probeAdminAccess: async (): Promise<boolean> => {
      try {
        await request<MemberListResponse>('/members', { method: 'GET', query: { limit: 1 } });
        return true;
      } catch (err) {
        if (err instanceof OsApiError && (err.kind === 'forbidden' || err.kind === 'unauthorized')) {
          return false;
        }
        throw err;
      }
    },
    // ─────────────────────────────────────────────────────────────────────────
    // Issue domain
    // ─────────────────────────────────────────────────────────────────────────
    listIssues: (query?: Record<string, string | number | boolean>) =>
      request<IssueListResponse>('/issues', { method: 'GET', query }),
    getIssue: (issueId: string) =>
      request<IssueDetailResponse>(`/issues/${encodeURIComponent(issueId)}`),
    executeIssueCommand: <T extends IssueCommandName>(
      commandName: T,
      payload: Record<string, unknown>,
      idempotencyKey?: string,
    ) =>
      request<IssueCommandResult>(`/commands/${commandName}`, {
        method: 'POST',
        body: payload,
        idempotencyKey,
        retry: false,
      }),
    // ─────────────────────────────────────────────────────────────────────────
    // Product feedback
    // ─────────────────────────────────────────────────────────────────────────
    submitProductFeedback: <T extends ProductFeedbackCommandName>(
      commandName: T,
      payload: Record<string, unknown>,
      idempotencyKey?: string,
    ) =>
      request<{ ok: boolean; data: Record<string, unknown> }>(`/commands/${commandName}`, {
        method: 'POST',
        body: payload,
        idempotencyKey,
        retry: false,
      }),
    // ─────────────────────────────────────────────────────────────────────────
    // Commitments
    // ─────────────────────────────────────────────────────────────────────────
    listCommitments: (query?: Record<string, string | number | boolean>) =>
      request<{ items: CommitmentSummary[] }>('/commitments', { method: 'GET', query }),
    getCommitment: (commitmentId: string) =>
      request<CommitmentSummary>(`/commitments/${encodeURIComponent(commitmentId)}`),
    executeCommitmentCommand: <T extends CommitmentCommandName>(
      commandName: T,
      payload: Record<string, unknown>,
      idempotencyKey?: string,
    ) =>
      request<{ ok: boolean; data: { commitmentId?: string } }>(`/commands/${commandName}`, {
        method: 'POST',
        body: payload,
        idempotencyKey,
        retry: false,
      }),
    listAudit: (query?: Record<string, string | number | boolean>) =>
      request<AuditListResponse>('/audit', { method: 'GET', query }),
    listMemoryChanges: (query?: Record<string, string | number | boolean>) =>
      request<MemoryChangesResponse>('/memory/changes', { method: 'GET', query }),
    getQaEffectiveAccess: (memberId: string) =>
      request<{ memberId: string; organizationId: string; grantedScopes: string[] }>(
        '/qa/effective-access',
        { method: 'GET', query: { memberId } },
      ),
    listQaSynthPersonas: () =>
      request<{
        organizationId: string;
        items: Array<{
          email: string;
          memberId: string;
          organizationId: string;
          grantedScopes: string[];
        }>;
        gaps?: { peopleAdminPersona?: string };
      }>('/qa/synth-personas', { method: 'GET' }),
    requestAiAssist: (body: {
      feature: string;
      subjectType: string;
      subjectId: string;
      /** Phrasing only — server never uses this to broaden evidence selectors. */
      question?: string;
    }) =>
      request<AiAssistResponse>('/ai/assist', {
        method: 'POST',
        body,
        retry: false,
      }),
  };
}

export type OsApiClient = ReturnType<typeof createOsApiClient>;

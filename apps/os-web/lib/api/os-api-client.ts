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

export type OsAuthContext =
  | { mode: 'supabase'; accessToken: string; organizationId?: string }
  | { mode: 'dev'; session: DevSession };

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
  if (auth.mode === 'supabase') {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${auth.accessToken}`,
    };
    if (auth.organizationId) {
      headers['x-os-organization-id'] = auth.organizationId;
    }
    return headers;
  }
  return devSessionHeaders(auth.session);
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
    listActiveMemberOptions: () =>
      request<{ items: Array<{ memberId: string; displayName: string }> }>('/members/active-options'),
    listSubjectApprovals: (subjectType: string, subjectId: string) =>
      request<{ items: Array<Record<string, unknown>> }>('/approvals/subject', {
        method: 'GET',
        query: { subjectType, subjectId },
      }),
    getMember: (memberId: string) =>
      request<MemberDetailResponse>(`/members/${encodeURIComponent(memberId)}`),
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
        filename: binary.filename ?? `cotizacion-${quoteId}.pdf`,
      };
    },
    listOrders: (query?: Record<string, string | number | boolean>) =>
      request<OrderListResponse>('/orders', { method: 'GET', query }),
    getOrder: (orderId: string) =>
      request<OrderDetailResponse>(`/orders/${encodeURIComponent(orderId)}`),
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
  };
}

export type OsApiClient = ReturnType<typeof createOsApiClient>;

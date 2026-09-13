import { OsApiErrorSchema, type OsErrorCode } from '@isalwa/os-contracts';

export type OsApiFailureKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'locked'
  | 'conflict'
  | 'unavailable'
  | 'unknown';

export class OsApiError extends Error {
  readonly kind: OsApiFailureKind;
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: Record<string, unknown>;

  constructor(params: {
    kind: OsApiFailureKind;
    status: number;
    code: string;
    message: string;
    requestId?: string;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = 'OsApiError';
    this.kind = params.kind;
    this.status = params.status;
    this.code = params.code;
    this.requestId = params.requestId;
    this.details = params.details;
  }
}

const CODE_KIND: Partial<Record<OsErrorCode, OsApiFailureKind>> = {
  AUTH_REQUIRED: 'unauthorized',
  ACCESS_REVOKED: 'forbidden',
  TENANT_FORBIDDEN: 'forbidden',
  PERMISSION_DENIED: 'forbidden',
  GOVERNANCE_REQUIRED: 'forbidden',
  CAPABILITY_LOCKED: 'locked',
  VALIDATION_FAILED: 'validation',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  IDEMPOTENCY_REPLAY: 'conflict',
};

function kindFromStatus(status: number, code?: string): OsApiFailureKind {
  if (code && code in CODE_KIND) {
    return CODE_KIND[code as OsErrorCode] ?? 'unknown';
  }
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 400 || status === 422) return 'validation';
  if (status >= 500) return 'unavailable';
  return 'unknown';
}

function spanishMessage(kind: OsApiFailureKind, code?: string): string {
  switch (kind) {
    case 'unauthorized':
      return 'Su sesión venció o no está autenticado. Vuelva a iniciar sesión.';
    case 'forbidden':
      if (code === 'ACCESS_REVOKED') {
        return 'Su cuenta está desactivada. Contacte a administración.';
      }
      return 'No tiene acceso a esta información.';
    case 'not_found':
      return 'No se encontró la información solicitada.';
    case 'validation':
      return 'Revise los datos ingresados e intente de nuevo.';
    case 'locked':
      return 'Esta función aún no está habilitada para su empresa.';
    case 'conflict':
      return 'La acción no pudo completarse por un conflicto. Actualice e intente de nuevo.';
    case 'unavailable':
      return 'El servicio no está disponible temporalmente. Intente más tarde.';
    default:
      return 'Ocurrió un error. Intente de nuevo.';
  }
}

export async function parseOsApiError(response: Response): Promise<OsApiError> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const parsedEnvelope = OsApiErrorSchema.safeParse(payload);
  if (parsedEnvelope.success) {
    const { code, message, requestId, details } = parsedEnvelope.data.error;
    const kind = kindFromStatus(response.status, code);
    return new OsApiError({
      kind,
      status: response.status,
      code,
      message: message || spanishMessage(kind, code),
      requestId,
      details,
    });
  }

  const code =
    typeof payload === 'object' &&
    payload !== null &&
    'code' in payload &&
    typeof (payload as { code: unknown }).code === 'string'
      ? (payload as { code: string }).code
      : 'UNKNOWN';

  const kind = kindFromStatus(response.status, code);
  return new OsApiError({
    kind,
    status: response.status,
    code,
    message: spanishMessage(kind, code),
  });
}

export function isRetrySafeMethod(method: string): boolean {
  return method.toUpperCase() === 'GET' || method.toUpperCase() === 'HEAD';
}

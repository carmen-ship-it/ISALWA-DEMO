export const INVITE_COMPLETION_COPY = {
  expired: 'Esta invitación ya no es válida. Solicite una nueva invitación.',
  alreadyCompleted: 'Este acceso ya fue activado. Inicie sesión.',
  wrongAccount: 'Esta invitación corresponde a otra cuenta.',
  notInvited: 'No encontramos una invitación válida para esta cuenta.',
  ready: 'Su acceso a ISALWA está listo.',
  openLink: 'Abra el enlace de la invitación que recibió por correo.',
  unavailable: 'No pudimos completar el acceso. Intente de nuevo.',
  passwordSet: 'No se pudo configurar la contraseña. Intente con otra.',
} as const;

export type InviteCompletionView =
  | 'ready'
  | 'already_completed'
  | 'expired'
  | 'wrong_account'
  | 'not_invited'
  | 'unauthenticated'
  | 'unavailable';

const KNOWN_CODES = new Set([
  'activated',
  'already_completed',
  'not_invited',
  'wrong_account',
  'ambiguous',
  'suspended',
  'terminated',
  'rebind_denied',
  'unauthenticated',
  'email_unverified',
  'INTERNAL_ERROR',
]);

export function mapInviteCallbackFailure(input: {
  error?: string | null;
  errorCode?: string | null;
}): 'expired' | null {
  const code = (input.errorCode ?? '').toLowerCase();
  const error = (input.error ?? '').toLowerCase();
  if (
    code === 'otp_expired' ||
    code === 'flow_state_expired' ||
    error === 'access_denied' && code.includes('expir') ||
    error.includes('expired')
  ) {
    return 'expired';
  }
  return null;
}

export function inviteCompletionView(code: string): InviteCompletionView {
  switch (code) {
    case 'activated':
      return 'ready';
    case 'already_completed':
      return 'already_completed';
    case 'wrong_account':
    case 'rebind_denied':
      return 'wrong_account';
    case 'not_invited':
      return 'not_invited';
    case 'ambiguous':
    case 'suspended':
    case 'terminated':
    case 'email_unverified':
      return 'expired';
    case 'unauthenticated':
      return 'unauthenticated';
    default:
      return 'unavailable';
  }
}

export function inviteCompletionMessage(view: InviteCompletionView): string {
  switch (view) {
    case 'ready':
      return INVITE_COMPLETION_COPY.ready;
    case 'already_completed':
      return INVITE_COMPLETION_COPY.alreadyCompleted;
    case 'expired':
      return INVITE_COMPLETION_COPY.expired;
    case 'wrong_account':
      return INVITE_COMPLETION_COPY.wrongAccount;
    case 'not_invited':
      return INVITE_COMPLETION_COPY.notInvited;
    case 'unauthenticated':
      return INVITE_COMPLETION_COPY.openLink;
    default:
      return INVITE_COMPLETION_COPY.unavailable;
  }
}

export function readInviteCompletionCode(body: unknown): string {
  if (!body || typeof body !== 'object') return 'INTERNAL_ERROR';
  const code = (body as { code?: unknown }).code;
  if (typeof code !== 'string' || !KNOWN_CODES.has(code)) return 'INTERNAL_ERROR';
  return code;
}

/**
 * Self-service password reset helpers (Supabase Auth).
 * Fail-closed: never reveal whether an email exists; never surface provider secrets.
 */

export const PASSWORD_RESET_MIN_LENGTH = 8;

export const PASSWORD_RESET_COPY = {
  forgotKicker: 'Acceso seguro',
  forgotTitle: 'Recuperar contraseña',
  forgotDescription: 'Le enviaremos un enlace a su correo para elegir una nueva contraseña.',
  forgotEmail: 'Correo',
  forgotSubmit: 'Enviar enlace',
  forgotPending: 'Enviando…',
  forgotSuccess:
    'Si ese correo tiene acceso, recibirá un enlace para restablecer la contraseña. Revise su bandeja y carpeta de spam.',
  forgotUnavailable: 'No se pudo solicitar el restablecimiento. Intente de nuevo.',
  forgotMisconfigured: 'El restablecimiento de contraseña no está disponible en este momento.',
  forgotBackToLogin: 'Volver a iniciar sesión',
  resetKicker: 'Acceso seguro',
  resetTitle: 'Nueva contraseña',
  resetDescription: 'Elija una contraseña nueva para su cuenta de ISALWA.',
  resetPassword: 'Nueva contraseña',
  resetConfirm: 'Confirmar contraseña',
  resetSubmit: 'Guardar contraseña',
  resetPending: 'Guardando…',
  resetWorking: 'Verificando enlace…',
  resetSuccess: 'Su contraseña fue actualizada. Inicie sesión con la nueva contraseña.',
  resetOpenLink: 'Abra el enlace de restablecimiento que recibió por correo.',
  resetExpired: 'Este enlace ya no es válido. Solicite uno nuevo.',
  resetMismatch: 'Las contraseñas no coinciden.',
  resetTooShort: 'La contraseña debe tener al menos 8 caracteres.',
  resetSetFailed: 'No se pudo guardar la contraseña. Intente con otra.',
  resetUnavailable: 'No pudimos completar el restablecimiento. Intente de nuevo.',
  resetBackToLogin: 'Ir a iniciar sesión',
  resetRequestAgain: 'Solicitar un nuevo enlace',
  loginForgotLink: '¿Olvidó su contraseña?',
} as const;

export type PasswordResetCallbackView = 'ready' | 'expired' | 'unauthenticated' | 'unavailable';

export function mapPasswordResetCallbackFailure(input: {
  error?: string | null;
  errorCode?: string | null;
}): 'expired' | null {
  const code = (input.errorCode ?? '').toLowerCase();
  const error = (input.error ?? '').toLowerCase();
  if (
    code === 'otp_expired' ||
    code === 'flow_state_expired' ||
    (error === 'access_denied' && code.includes('expir')) ||
    error.includes('expired')
  ) {
    return 'expired';
  }
  return null;
}

export function isValidResetEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 320) return false;
  // Conservative shape check — provider validates delivery.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < PASSWORD_RESET_MIN_LENGTH) {
    return PASSWORD_RESET_COPY.resetTooShort;
  }
  if (password !== confirm) {
    return PASSWORD_RESET_COPY.resetMismatch;
  }
  return null;
}

/** Hosts allowed as password-reset redirect origins (fail-closed). */
const ALLOWED_RESET_HOSTS = new Set([
  'localhost:3200',
  '127.0.0.1:3200',
  'os-web-staging.onrender.com',
]);

/**
 * Builds the absolute redirect URL for Supabase recovery emails.
 * Prefer NEXT_PUBLIC_OS_WEB_ORIGIN; otherwise validate Host from the request.
 */
export function buildPasswordResetRedirectUrl(input: {
  configuredOrigin?: string | null;
  host?: string | null;
  proto?: string | null;
}): string | null {
  const configured = input.configuredOrigin?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      if (url.username || url.password) return null;
      return `${url.origin}/auth/reset-password`;
    } catch {
      return null;
    }
  }

  const host = (input.host ?? '').trim().toLowerCase();
  if (!host || !ALLOWED_RESET_HOSTS.has(host)) return null;
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const proto = isLocal ? (input.proto === 'https' ? 'https' : 'http') : 'https';
  return `${proto}://${host}/auth/reset-password`;
}

export function passwordResetCallbackMessage(view: PasswordResetCallbackView): string {
  switch (view) {
    case 'expired':
      return PASSWORD_RESET_COPY.resetExpired;
    case 'unauthenticated':
      return PASSWORD_RESET_COPY.resetOpenLink;
    case 'ready':
      return PASSWORD_RESET_COPY.resetSuccess;
    default:
      return PASSWORD_RESET_COPY.resetUnavailable;
  }
}

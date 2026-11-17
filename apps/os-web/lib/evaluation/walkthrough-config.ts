/**
 * Server-side evaluation walkthrough configuration.
 * Security decisions use OS_RUNTIME_PROFILE only (never NEXT_PUBLIC_*).
 * Allowlist secrets live in evaluator-allowlist.ts (server-only).
 */

export const EVALUATION_POST_LOGIN = '/evaluacion' as const;

export const EVALUATION_WALKTHROUGH_TITLE = 'Evaluación guiada de ISALWA' as const;

export const EVALUATION_WALKTHROUGH_INTRO =
  'Este recorrido muestra el sistema comercial completo que ISALWA está diseñando. Permite revisar lo que ya está construido, cómo funcionarán las siguientes etapas y las decisiones que todavía necesita confirmar ISALWA.' as const;

export const EVALUATION_WALKTHROUGH_NOTICE =
  'Esta versión es una evaluación guiada. No crea ni modifica clientes, cotizaciones, pedidos, pagos ni conversaciones; tampoco envía mensajes.' as const;

/** Shown instead of operational route CTAs while API hosting is not verified. */
export const EVALUATION_OPERATIONAL_BUILT_NOTICE =
  'Esta capacidad está construida en la versión operativa local. En esta evaluación se presenta como recorrido hasta que la API de evaluación esté alojada y verificada.' as const;

export const EVALUATION_OPERATIONAL_REDIRECT_HINT =
  'Esta evaluación es un recorrido guiado. Las pantallas operativas se abrirán cuando la API de evaluación esté alojada y verificada.' as const;

/**
 * Runtime profile required for the protected evaluation release.
 * Uses server-only OS_RUNTIME_PROFILE — never NEXT_PUBLIC_OS_RUNTIME_PROFILE.
 */
export function isEvaluationRuntimeProfile(): boolean {
  return process.env.OS_RUNTIME_PROFILE?.trim() === 'evaluation';
}

/**
 * Walkthrough-only evaluation host: no operational desks, no Nest API from Recorrido.
 * Enabled when the runtime profile is evaluation (this Vercel evaluation product).
 */
export function isWalkthroughOnlyEvaluation(): boolean {
  if (!isEvaluationRuntimeProfile()) return false;
  const flag = process.env.OS_EVALUATION_WALKTHROUGH_ONLY?.trim();
  // Default ON for evaluation profile; set OS_EVALUATION_WALKTHROUGH_ONLY=0 to opt out.
  if (flag === '0' || flag === 'false') return false;
  return true;
}

export function evaluationPostLoginPath(): string {
  return isWalkthroughOnlyEvaluation() ? EVALUATION_POST_LOGIN : '/inicio';
}

/** Paths allowed without redirect while walkthrough-only is active. */
export function isWalkthroughAllowedPath(pathname: string): boolean {
  if (pathname === '/evaluacion' || pathname.startsWith('/evaluacion/')) return true;
  if (pathname === '/login' || pathname.startsWith('/login/')) return true;
  if (pathname.startsWith('/auth/')) return true;
  return false;
}

/**
 * Narrow framework/static exclusions for middleware passthrough.
 * Deliberately does NOT treat every dotted path as static (e.g. /clientes.json stays gated).
 */
export function isFrameworkOrStaticAssetPath(pathname: string): boolean {
  if (pathname.startsWith('/_next/')) return true;
  if (pathname === '/favicon.ico') return true;
  if (pathname === '/robots.txt') return true;
  if (pathname === '/sitemap.xml') return true;
  return false;
}

/** Auth routes that may receive POST (login, password, invite, sign-out). */
export function isAuthMutationPath(pathname: string): boolean {
  if (pathname === '/login' || pathname.startsWith('/login/')) return true;
  if (pathname === '/auth/forgot-password' || pathname.startsWith('/auth/forgot-password/')) return true;
  if (pathname === '/auth/reset-password' || pathname.startsWith('/auth/reset-password/')) return true;
  if (pathname === '/auth/complete-invite' || pathname.startsWith('/auth/complete-invite/')) return true;
  if (pathname === '/auth/sign-out' || pathname.startsWith('/auth/sign-out/')) return true;
  if (pathname === '/auth/callback' || pathname.startsWith('/auth/callback/')) return true;
  return false;
}

export function isEvaluationSurfacePath(pathname: string): boolean {
  return pathname === '/evaluacion' || pathname.startsWith('/evaluacion/');
}

export function isSafeHttpMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m === 'GET' || m === 'HEAD';
}

export function isMutatingHttpMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}

/** Operational product paths that must not load in walkthrough-only mode. */
export function isOperationalProductPath(pathname: string): boolean {
  if (isWalkthroughAllowedPath(pathname)) return false;
  if (isFrameworkOrStaticAssetPath(pathname)) return false;
  // Block product API proxies in walkthrough-only (no customer/commercial data).
  if (pathname.startsWith('/api/')) return true;
  return true;
}

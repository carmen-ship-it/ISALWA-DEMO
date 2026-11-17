/**
 * Pure walkthrough access decisions for middleware (testable without Next runtime).
 */

import {
  EVALUATION_POST_LOGIN,
  isAuthMutationPath,
  isEvaluationSurfacePath,
  isFrameworkOrStaticAssetPath,
  isMutatingHttpMethod,
  isOperationalProductPath,
  isSafeHttpMethod,
} from '@/lib/evaluation/walkthrough-config';

export type WalkthroughBoundaryInput = {
  pathname: string;
  method: string;
  authenticated: boolean;
  /** Authenticated email when known; allowlist match is decided by caller. */
  evaluatorAllowed: boolean;
};

export type WalkthroughBoundaryDecision =
  | { kind: 'passthrough' }
  | { kind: 'next' }
  | { kind: 'method_not_allowed' }
  | { kind: 'redirect'; location: string }
  | { kind: 'login_redirect'; /** Evaluation mode omits ?next= entirely. */ includeNext: false };

/**
 * Evaluation walkthrough boundary. Caller supplies evaluatorAllowed after
 * server-only allowlist check (never log or return the allowlist).
 */
export function decideWalkthroughBoundary(
  input: WalkthroughBoundaryInput,
): WalkthroughBoundaryDecision {
  const { pathname, method, authenticated, evaluatorAllowed } = input;

  if (isFrameworkOrStaticAssetPath(pathname)) {
    return { kind: 'passthrough' };
  }

  // Method boundary first — no redirects for unsafe evaluation/ops writes.
  if (isEvaluationSurfacePath(pathname) && !isSafeHttpMethod(method)) {
    return { kind: 'method_not_allowed' };
  }
  if (
    isOperationalProductPath(pathname) &&
    isMutatingHttpMethod(method) &&
    !isAuthMutationPath(pathname)
  ) {
    return { kind: 'method_not_allowed' };
  }

  const isPublicAuth =
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/auth/');

  if (isPublicAuth) {
    if (authenticated && pathname === '/login') {
      if (evaluatorAllowed) {
        return { kind: 'redirect', location: EVALUATION_POST_LOGIN };
      }
      return { kind: 'redirect', location: '/evaluacion/denegado' };
    }
    return { kind: 'next' };
  }

  if (!authenticated) {
    return { kind: 'login_redirect', includeNext: false };
  }

  if (pathname === '/evaluacion/denegado') {
    if (!isSafeHttpMethod(method)) return { kind: 'method_not_allowed' };
    return { kind: 'next' };
  }

  if (!evaluatorAllowed) {
    if (!isSafeHttpMethod(method)) return { kind: 'method_not_allowed' };
    return { kind: 'redirect', location: '/evaluacion/denegado' };
  }

  if (isEvaluationSurfacePath(pathname)) {
    if (!isSafeHttpMethod(method)) return { kind: 'method_not_allowed' };
    return { kind: 'next' };
  }

  if (isOperationalProductPath(pathname)) {
    if (!isSafeHttpMethod(method)) return { kind: 'method_not_allowed' };
    return { kind: 'redirect', location: `${EVALUATION_POST_LOGIN}?motivo=recorrido` };
  }

  return { kind: 'next' };
}

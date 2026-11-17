import { type NextRequest, NextResponse } from 'next/server';
import { DEFAULT_POST_LOGIN, OS_DEV_SESSION_COOKIE, PUBLIC_PATHS } from '@/lib/auth/constants';
import { getOsAuthMode, isSupabaseConfigured } from '@/lib/auth/config';
import { decodeDevSession } from '@/lib/auth/dev-session';
import { updateSupabaseSession } from '@/lib/auth/supabase/middleware';
import { isEmailOnEvaluatorAllowlist } from '@/lib/evaluation/evaluator-allowlist';
import {
  EVALUATION_POST_LOGIN,
  evaluationPostLoginPath,
  isOperationalProductPath,
  isWalkthroughOnlyEvaluation,
} from '@/lib/evaluation/walkthrough-config';
import { expireRetiredDataModeCookies } from '@/lib/navigation/retired-data-mode';

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function applyPrivateNoStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

async function hasSession(request: NextRequest): Promise<{
  ok: boolean;
  response: NextResponse;
  email?: string | null;
}> {
  if (getOsAuthMode() === 'supabase' && isSupabaseConfigured()) {
    const { response, user } = await updateSupabaseSession(request);
    return { ok: Boolean(user), response, email: user?.email ?? null };
  }

  const devSession = decodeDevSession(request.cookies.get(OS_DEV_SESSION_COOKIE)?.value);
  return {
    ok: Boolean(devSession),
    response: NextResponse.next({ request: { headers: request.headers } }),
    email: null,
  };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const walkthroughOnly = isWalkthroughOnlyEvaluation();
  const { ok, response, email } = await hasSession(request);
  const postLogin = evaluationPostLoginPath();

  if (isPublicPath(pathname)) {
    if (ok && pathname === '/login') {
      if (walkthroughOnly) {
        if (email && isEmailOnEvaluatorAllowlist(email)) {
          return applyPrivateNoStore(NextResponse.redirect(new URL(EVALUATION_POST_LOGIN, request.url)));
        }
        return applyPrivateNoStore(
          NextResponse.redirect(new URL('/evaluacion/denegado', request.url)),
        );
      }
      return NextResponse.redirect(new URL(DEFAULT_POST_LOGIN, request.url));
    }
    return response;
  }

  if (!ok) {
    const loginUrl = new URL('/login', request.url);
    if (loginUrl.pathname === pathname) {
      return response;
    }
    loginUrl.searchParams.set('next', pathname);
    return applyPrivateNoStore(NextResponse.redirect(loginUrl));
  }

  if (walkthroughOnly) {
    const allowed = Boolean(email && isEmailOnEvaluatorAllowlist(email));

    if (pathname === '/evaluacion/denegado') {
      return applyPrivateNoStore(response);
    }

    if (!allowed) {
      return applyPrivateNoStore(
        NextResponse.redirect(new URL('/evaluacion/denegado', request.url)),
      );
    }

    if (pathname === EVALUATION_POST_LOGIN || pathname.startsWith(`${EVALUATION_POST_LOGIN}/`)) {
      expireRetiredDataModeCookies(request.cookies, response.cookies);
      return applyPrivateNoStore(response);
    }

    if (isOperationalProductPath(pathname)) {
      const target = new URL(EVALUATION_POST_LOGIN, request.url);
      target.searchParams.set('motivo', 'recorrido');
      return applyPrivateNoStore(NextResponse.redirect(target));
    }
  }

  expireRetiredDataModeCookies(request.cookies, response.cookies);

  // Prefer evaluation home after login when walkthrough-only (defensive).
  if (walkthroughOnly && pathname === DEFAULT_POST_LOGIN && postLogin !== DEFAULT_POST_LOGIN) {
    return applyPrivateNoStore(NextResponse.redirect(new URL(postLogin, request.url)));
  }

  return applyPrivateNoStore(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

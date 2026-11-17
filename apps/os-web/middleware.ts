import { type NextRequest, NextResponse } from 'next/server';
import { DEFAULT_POST_LOGIN, OS_DEV_SESSION_COOKIE, PUBLIC_PATHS } from '@/lib/auth/constants';
import { getOsAuthMode, isSupabaseConfigured } from '@/lib/auth/config';
import { decodeDevSession } from '@/lib/auth/dev-session';
import { updateSupabaseSession } from '@/lib/auth/supabase/middleware';
import { isEmailOnEvaluatorAllowlist } from '@/lib/evaluation/evaluator-allowlist';
import { decideWalkthroughBoundary } from '@/lib/evaluation/walkthrough-boundary';
import {
  evaluationPostLoginPath,
  isFrameworkOrStaticAssetPath,
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

function methodNotAllowed(): NextResponse {
  return new NextResponse(null, {
    status: 405,
    headers: {
      Allow: 'GET, HEAD',
      'Cache-Control': 'private, no-store',
    },
  });
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
  const method = request.method;

  if (isFrameworkOrStaticAssetPath(pathname)) {
    return NextResponse.next();
  }

  const walkthroughOnly = isWalkthroughOnlyEvaluation();
  const { ok, response, email } = await hasSession(request);
  const postLogin = evaluationPostLoginPath();

  if (walkthroughOnly) {
    const decision = decideWalkthroughBoundary({
      pathname,
      method,
      authenticated: ok,
      evaluatorAllowed: Boolean(email && isEmailOnEvaluatorAllowlist(email)),
    });

    switch (decision.kind) {
      case 'passthrough':
        return NextResponse.next();
      case 'method_not_allowed':
        return methodNotAllowed();
      case 'login_redirect': {
        const loginUrl = new URL('/login', request.url);
        // Never attach ?next= in evaluation mode.
        return applyPrivateNoStore(NextResponse.redirect(loginUrl));
      }
      case 'redirect': {
        expireRetiredDataModeCookies(request.cookies, response.cookies);
        return applyPrivateNoStore(NextResponse.redirect(new URL(decision.location, request.url)));
      }
      case 'next': {
        expireRetiredDataModeCookies(request.cookies, response.cookies);
        return applyPrivateNoStore(response);
      }
      default:
        return applyPrivateNoStore(response);
    }
  }

  if (isPublicPath(pathname) || pathname.startsWith('/auth/')) {
    if (ok && pathname === '/login') {
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

  expireRetiredDataModeCookies(request.cookies, response.cookies);

  if (pathname === DEFAULT_POST_LOGIN && postLogin !== DEFAULT_POST_LOGIN) {
    return applyPrivateNoStore(NextResponse.redirect(new URL(postLogin, request.url)));
  }

  return applyPrivateNoStore(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

import { type NextRequest, NextResponse } from 'next/server';
import { DEFAULT_POST_LOGIN, OS_DEV_SESSION_COOKIE, PUBLIC_PATHS } from '@/lib/auth/constants';
import { getOsAuthMode, isSupabaseConfigured } from '@/lib/auth/config';
import { decodeDevSession } from '@/lib/auth/dev-session';
import { updateSupabaseSession } from '@/lib/auth/supabase/middleware';
import { DEMO_DATA_MODE_COOKIE } from '@/lib/demo/owner-demo-identity';
import { OWNER_EFFECTIVE_COMPANY_COOKIE } from '@/lib/demo/owner-company-context';
import { DATA_MODE_REQUEST_HEADER, explicitDataMode } from '@/lib/demo/preserve-data-mode';

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function applyPrivateNoStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

async function hasSession(request: NextRequest): Promise<{ ok: boolean; response: NextResponse }> {
  if (getOsAuthMode() === 'supabase' && isSupabaseConfigured()) {
    const { response, user } = await updateSupabaseSession(request);
    return { ok: Boolean(user), response };
  }

  const devSession = decodeDevSession(request.cookies.get(OS_DEV_SESSION_COOKIE)?.value);
  return {
    ok: Boolean(devSession),
    response: NextResponse.next({ request: { headers: request.headers } }),
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

  // Pin explicit ?datos= onto this request before the session response is built,
  // so the first RSC paint uses the URL company instead of the previous cookie.
  const datos = explicitDataMode(request.nextUrl.searchParams.get('datos'));
  if (datos) {
    request.cookies.set(DEMO_DATA_MODE_COOKIE, datos);
    request.cookies.set(OWNER_EFFECTIVE_COMPANY_COOKIE, datos === 'demo' ? 'synth' : 'real');
    request.headers.set(DATA_MODE_REQUEST_HEADER, datos);
  }

  const { ok, response } = await hasSession(request);

  if (isPublicPath(pathname)) {
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

  if (datos) {
    response.cookies.set(DEMO_DATA_MODE_COOKIE, datos, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });
    response.cookies.set(OWNER_EFFECTIVE_COMPANY_COOKIE, datos === 'demo' ? 'synth' : 'real', {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });
  }

  return applyPrivateNoStore(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

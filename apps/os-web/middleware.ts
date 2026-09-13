import { type NextRequest, NextResponse } from 'next/server';
import { DEFAULT_POST_LOGIN, OS_DEV_SESSION_COOKIE, PUBLIC_PATHS } from '@/lib/auth/constants';
import { getOsAuthMode, isSupabaseConfigured } from '@/lib/auth/config';
import { decodeDevSession } from '@/lib/auth/dev-session';
import { updateSupabaseSession } from '@/lib/auth/supabase/middleware';

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
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

  const { ok, response } = await hasSession(request);

  if (isPublicPath(pathname)) {
    if (ok && pathname === '/login') {
      return NextResponse.redirect(new URL(DEFAULT_POST_LOGIN, request.url));
    }
    return response;
  }

  if (!ok) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

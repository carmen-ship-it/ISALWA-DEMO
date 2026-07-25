import { type NextRequest, NextResponse } from "next/server";
import {
  CONSULTANT_ONLY_PATHS,
  PILOT_SESSION_COOKIE,
  PUBLIC_PATHS,
} from "@/lib/auth/constants";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { canAccessWorkspace, postLoginPath } from "@/lib/auth/permissions";
import {
  buildSessionFromEmail,
  readPilotSessionCookie,
} from "@/lib/auth/session";
import { updateSupabaseSession } from "@/lib/auth/supabase/middleware";
import type { ArchitectSession } from "@/types/auth";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isConsultantOnly(pathname: string): boolean {
  return CONSULTANT_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function workspaceIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/workspace\/([^/]+)/);
  return match?.[1] ?? null;
}

function workspaceIdFromSearch(request: NextRequest): string | null {
  return request.nextUrl.searchParams.get("workspaceId");
}

async function resolveSession(
  request: NextRequest,
): Promise<{ session: ArchitectSession | null; response: NextResponse }> {
  if (isSupabaseConfigured()) {
    const { response, user } = await updateSupabaseSession(request);
    if (!user?.email) return { session: null, response };
    const session = buildSessionFromEmail(user.email, "supabase", user.id);
    return { session, response };
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  const session = readPilotSessionCookie(
    request.cookies.get(PILOT_SESSION_COOKIE)?.value,
  );
  return { session, response };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const { session, response } = await resolveSession(request);

  if (isPublicPath(pathname)) {
    if (session && pathname === "/login") {
      return NextResponse.redirect(
        new URL(postLoginPath(session), request.url),
      );
    }
    return response;
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.role === "client") {
    if (pathname === "/" || pathname === "/companies") {
      return NextResponse.redirect(
        new URL(postLoginPath(session), request.url),
      );
    }
    if (isConsultantOnly(pathname)) {
      return NextResponse.redirect(
        new URL(postLoginPath(session), request.url),
      );
    }
  }

  const workspaceId =
    workspaceIdFromPath(pathname) ?? workspaceIdFromSearch(request);
  if (workspaceId && !canAccessWorkspace(session, workspaceId)) {
    return NextResponse.redirect(new URL(postLoginPath(session), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

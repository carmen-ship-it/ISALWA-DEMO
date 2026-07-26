import type { NextResponse } from "next/server";

/**
 * Keep HTML / document responses uncached so clients always load the latest
 * deployment's entry HTML (which points at freshly hashed `/_next/static` assets).
 *
 * Hashed static assets remain long-lived immutable via next.config headers.
 */
export function applyFreshDocumentHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate",
  );
  // Prefer platform-specific directives so edge caches also skip HTML.
  response.headers.set("CDN-Cache-Control", "private, no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "private, no-store");
  return response;
}

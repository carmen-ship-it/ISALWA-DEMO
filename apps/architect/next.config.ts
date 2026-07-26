import type { NextConfig } from "next";

/**
 * Standalone Next.js config for ISALWA Architect.
 * No shared monorepo UI packages. Safe to deploy as its own Vercel project.
 *
 * Caching policy:
 * - HTML / app documents: never cached (middleware + headers) so deploys show
 *   up on a normal refresh without hard-reload.
 * - `/_next/static/*`: immutable long-cache (content-hashed filenames).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Document routes (not static assets). Middleware also sets these.
        source: "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate",
          },
          {
            key: "CDN-Cache-Control",
            value: "private, no-store",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "private, no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

/**
 * Standalone Next.js config for ISALWA Architect.
 * No shared monorepo UI packages. Safe to deploy as its own Vercel project.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;

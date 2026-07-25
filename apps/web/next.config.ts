import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const previewBasePath = process.env.NEXT_BASE_PATH?.trim() || undefined;
const previewDistDir = process.env.NEXT_DIST_DIR?.trim() || undefined;

const nextConfig: NextConfig = {
  ...(previewBasePath ? { basePath: previewBasePath, assetPrefix: previewBasePath } : {}),
  ...(previewDistDir ? { distDir: previewDistDir } : {}),
  transpilePackages: ['@isalwa/ui', '@isalwa/contracts', '@isalwa/providers'],
  // Avoid picking a parent folder lockfile (e.g. /home/ubuntu/projects/package-lock.json)
  outputFileTracingRoot: monorepoRoot,
  experimental: {
    optimizePackageImports: ['@isalwa/ui'],
  },
};

export default nextConfig;

import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const nextConfig: NextConfig = {
  transpilePackages: ['@isalwa/ui', '@isalwa/contracts'],
  // Avoid picking a parent folder lockfile (e.g. /home/ubuntu/projects/package-lock.json)
  outputFileTracingRoot: monorepoRoot,
  experimental: {
    optimizePackageImports: ['@isalwa/ui'],
  },
};

export default nextConfig;

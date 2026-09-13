import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const nextConfig: NextConfig = {
  transpilePackages: ['@isalwa/ui', '@isalwa/os-contracts'],
  outputFileTracingRoot: monorepoRoot,
  experimental: {
    optimizePackageImports: ['@isalwa/ui', 'lucide-react'],
  },
};

export default nextConfig;

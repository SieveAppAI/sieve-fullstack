import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@sieve/shared', '@sieve/db'],
};

export default nextConfig;

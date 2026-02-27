export { createClient, createServiceClient } from './client';
export { createSupabaseBrowser } from './browser';
export type { Database, Json } from './types';

// Server-only exports — import directly from '@sieve/db/server' or '@sieve/db/middleware'
// to avoid bundling 'next/headers' in client code.
// export { createSupabaseServer } from './server';
// export { createSupabaseMiddleware } from './middleware';

import { describe, it, expect } from 'vitest';
import { cronGet } from './setup';

const cronPaths = [
  '/api/cron/check-changes',
  '/api/cron/ecfr-sync',
  '/api/cron/full-rescrape',
  '/api/cron/openfda-sync',
  '/api/cron/reembed',
  '/api/cron/seed',
  '/api/cron/usda-fdc-sync',
];

describe('Cron endpoints — auth tests', () => {
  for (const path of cronPaths) {
    const name = path.split('/').pop();

    it(`${name}: returns 401 without Bearer token`, async () => {
      const res = await cronGet(path);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it(`${name}: returns 401 with wrong Bearer token`, async () => {
      const res = await cronGet(path, 'wrong-secret');
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });
  }
});

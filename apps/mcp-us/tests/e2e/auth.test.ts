import { describe, it, expect } from 'vitest';
import { unauthGet, unauthPost } from './setup';

const authenticatedGetEndpoints = [
  '/api/v1/search-regulations?query=test',
  '/api/v1/labelling-requirements?product_category=food',
  '/api/v1/import-requirements?product_category=food',
  '/api/v1/regulation-update?since=2025-01-01',
  '/api/v1/ingestion-status',
];

const authenticatedPostEndpoints = [
  '/api/v1/check-ingredient',
  '/api/v1/validate-claims',
  '/api/v1/trigger-scrape',
  '/api/v1/trigger-openfda',
  '/api/v1/trigger-ecfr',
  '/api/v1/trigger-usda-fdc',
  '/api/v1/upload-excel',
];

describe('Auth — 401 without API key', () => {
  for (const path of authenticatedGetEndpoints) {
    it(`GET ${path.split('?')[0]} returns 401`, async () => {
      const res = await unauthGet(path);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });
  }

  for (const path of authenticatedPostEndpoints) {
    it(`POST ${path} returns 401`, async () => {
      const res = await unauthPost(path);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });
  }
});

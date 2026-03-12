import { describe, it, expect } from 'vitest';
import { jurisdictions, unauthGet, unauthPost } from './setup';

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
];

describe.each(jurisdictions)('auth — $name ($code)', (jurisdiction) => {
  describe('GET endpoints return 401 without API key', () => {
    it.each(authenticatedGetEndpoints)('%s', async (path) => {
      const res = await unauthGet(jurisdiction, path);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('POST endpoints return 401 without API key', () => {
    it.each(authenticatedPostEndpoints)('%s', async (path) => {
      const res = await unauthPost(jurisdiction, path);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });
  });
});

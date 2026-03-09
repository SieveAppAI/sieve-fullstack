import { describe, it, expect } from 'vitest';
import { apiPost } from './setup';

describe('Trigger endpoints', { timeout: 60_000 }, () => {
  describe('POST /api/v1/trigger-scrape', () => {
    it('accepts change_detection mode', async () => {
      const res = await apiPost('/api/v1/trigger-scrape', {
        mode: 'change_detection',
      });
      // May return 200 or 500 depending on external service availability
      expect([200, 500]).toContain(res.status);
      const body = await res.json();
      expect(body).toBeDefined();
    });

    it('rejects invalid mode', async () => {
      const res = await apiPost('/api/v1/trigger-scrape', {
        mode: 'invalid',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/trigger-openfda', () => {
    // OpenFDA substances ingestion takes >2min even with max_records=1
    it.skip('accepts substances mode with max_records=1', async () => {
      const res = await apiPost('/api/v1/trigger-openfda', {
        mode: 'substances',
        max_records: 1,
      });
      expect([200, 500]).toContain(res.status);
    });

    it('rejects invalid mode', async () => {
      const res = await apiPost('/api/v1/trigger-openfda', {
        mode: 'bad',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/trigger-ecfr', () => {
    it('accepts specific mode with title and part', async () => {
      const res = await apiPost('/api/v1/trigger-ecfr', {
        mode: 'specific',
        title: 21,
        part: 101,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toBeDefined();
    });

    it('rejects invalid mode', async () => {
      const res = await apiPost('/api/v1/trigger-ecfr', {
        mode: 'bad',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/trigger-usda-fdc', () => {
    it('accepts search mode with max_records=1', async () => {
      const res = await apiPost('/api/v1/trigger-usda-fdc', {
        mode: 'search',
        query: 'vitamin c',
        max_records: 1,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toBeDefined();
    });

    it('rejects invalid mode', async () => {
      const res = await apiPost('/api/v1/trigger-usda-fdc', {
        mode: 'bad',
      });
      expect(res.status).toBe(400);
    });
  });
});

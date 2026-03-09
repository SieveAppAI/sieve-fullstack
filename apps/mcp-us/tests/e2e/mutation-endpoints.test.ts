import { describe, it, expect } from 'vitest';
import { apiPost } from './setup';

describe('Mutation endpoints', () => {
  describe('POST /api/v1/check-ingredient', () => {
    it('returns status for a known ingredient', async () => {
      const res = await apiPost('/api/v1/check-ingredient', {
        ingredient: 'Red 40',
        product_category: 'food',
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ingredient).toBeDefined();
      expect(body.status).toBeDefined();
      expect(
        ['permitted', 'restricted', 'banned', 'permitted_with_limits', 'unknown'].includes(
          body.status
        )
      ).toBe(true);
    });

    it('returns unknown for a nonexistent ingredient', async () => {
      const res = await apiPost('/api/v1/check-ingredient', {
        ingredient: 'xyznonexistent999',
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('unknown');
    });

    it('returns 400 without ingredient field', async () => {
      const res = await apiPost('/api/v1/check-ingredient', {});
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it('returns status for Lead', async () => {
      const res = await apiPost('/api/v1/check-ingredient', {
        ingredient: 'Lead',
        product_category: 'all',
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBeDefined();
      expect(['restricted', 'banned'].includes(body.status)).toBe(true);
    });
  });

  describe('POST /api/v1/validate-claims', () => {
    it('validates a single claim', async () => {
      const res = await apiPost('/api/v1/validate-claims', {
        claims: ['sugar free'],
        product_category: 'food',
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results).toBeDefined();
      expect(Array.isArray(body.results)).toBe(true);
      expect(body.results.length).toBe(1);
      expect(body.results[0].claim).toBe('sugar free');
    });

    it('validates multiple claims', async () => {
      const res = await apiPost('/api/v1/validate-claims', {
        claims: ['sugar free', 'fat free', 'organic'],
        product_category: 'food',
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results.length).toBe(3);
    });

    it('returns 400 without claims field', async () => {
      const res = await apiPost('/api/v1/validate-claims', {
        product_category: 'food',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 without product_category', async () => {
      const res = await apiPost('/api/v1/validate-claims', {
        claims: ['sugar free'],
      });
      expect(res.status).toBe(400);
    });
  });
});

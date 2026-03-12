import { describe, it, expect } from 'vitest';
import { jurisdictions, apiPost } from './setup';
import { getClaimsForCategory } from './fixtures';

describe.each(jurisdictions)('validate-claims — $name ($code)', (jurisdiction) => {
  it('validates a single claim for food', async () => {
    const res = await apiPost(jurisdiction, '/api/v1/validate-claims', {
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
    const res = await apiPost(jurisdiction, '/api/v1/validate-claims', {
      claims: ['sugar free', 'organic', 'natural'],
      product_category: 'food',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.length).toBe(3);
  });

  it('result count matches input count', async () => {
    const claims = ['claim1', 'claim2', 'claim3', 'claim4'];
    const res = await apiPost(jurisdiction, '/api/v1/validate-claims', {
      claims,
      product_category: 'food',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.length).toBe(claims.length);
  });

  it('returns 400 without claims field', async () => {
    const res = await apiPost(jurisdiction, '/api/v1/validate-claims', {
      product_category: 'food',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 without product_category', async () => {
    const res = await apiPost(jurisdiction, '/api/v1/validate-claims', {
      claims: ['sugar free'],
    });
    expect(res.status).toBe(400);
  });

  describe.each(jurisdiction.categories)('category: %s', (category) => {
    it('returns results array', async () => {
      const claims = getClaimsForCategory(category);
      const res = await apiPost(jurisdiction, '/api/v1/validate-claims', {
        claims,
        product_category: category,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.results)).toBe(true);
      expect(body.results.length).toBe(claims.length);
    });
  });
});

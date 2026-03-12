import { describe, it, expect } from 'vitest';
import { jurisdictions, apiGet } from './setup';

describe.each(jurisdictions)('labelling-requirements — $name ($code)', (jurisdiction) => {
  describe.each(jurisdiction.categories)('category: %s', (category) => {
    it('returns 200 with elements array', async () => {
      const res = await apiGet(
        jurisdiction,
        `/api/v1/labelling-requirements?product_category=${category}`
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.elements).toBeDefined();
      expect(Array.isArray(body.elements)).toBe(true);
    });
  });

  it('returns 400 without product_category', async () => {
    const res = await apiGet(jurisdiction, '/api/v1/labelling-requirements');
    expect(res.status).toBe(400);
  });
});

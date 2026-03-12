import { describe, it, expect } from 'vitest';
import { jurisdictions, apiPost } from './setup';
import { VALID_STATUSES, INGREDIENT_ASSERTIONS } from './fixtures';

describe.each(jurisdictions)('check-ingredient — $name ($code)', (jurisdiction) => {
  it('returns valid status shape for known ingredient', async () => {
    const res = await apiPost(jurisdiction, '/api/v1/check-ingredient', {
      ingredient: 'Caffeine',
      product_category: 'food',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ingredient).toBeDefined();
    expect(body.status).toBeDefined();
    expect(VALID_STATUSES).toContain(body.status);
  });

  it('returns unknown for nonexistent ingredient', async () => {
    const res = await apiPost(jurisdiction, '/api/v1/check-ingredient', {
      ingredient: 'xyznonexistent999',
      product_category: 'food',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('unknown');
  });

  it('returns 400 without ingredient field', async () => {
    const res = await apiPost(jurisdiction, '/api/v1/check-ingredient', {});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('accepts optional cas_number', async () => {
    const res = await apiPost(jurisdiction, '/api/v1/check-ingredient', {
      ingredient: 'Caffeine',
      product_category: 'food',
      cas_number: '58-08-2',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBeDefined();
    expect(VALID_STATUSES).toContain(body.status);
  });

  describe.each(jurisdiction.categories)('category: %s', (category) => {
    it('returns valid response', async () => {
      const res = await apiPost(jurisdiction, '/api/v1/check-ingredient', {
        ingredient: 'Vitamin C',
        product_category: category,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBeDefined();
      expect(VALID_STATUSES).toContain(body.status);
    });
  });

  const assertions = INGREDIENT_ASSERTIONS[jurisdiction.code] ?? [];
  if (assertions.length > 0) {
    describe('critical assertions', () => {
      it.each(assertions)(
        '$ingredient + $category → one of $expectedStatuses',
        async ({ ingredient, category, expectedStatuses }) => {
          const res = await apiPost(jurisdiction, '/api/v1/check-ingredient', {
            ingredient,
            product_category: category,
          });
          expect(res.status).toBe(200);
          const body = await res.json();
          expect(expectedStatuses).toContain(body.status);
        }
      );
    });
  }
});

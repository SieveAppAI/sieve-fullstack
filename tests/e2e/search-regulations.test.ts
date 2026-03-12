import { describe, it, expect } from 'vitest';
import { jurisdictions, apiGet } from './setup';

describe.each(jurisdictions)('search-regulations — $name ($code)', (jurisdiction) => {
  it('returns results for "food safety" query', async () => {
    const res = await apiGet(
      jurisdiction,
      '/api/v1/search-regulations?query=food+safety&limit=5'
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toBeDefined();
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.results[0]).toHaveProperty('chunk_text');
  });

  it('returns 200 for nonsense query', async () => {
    const res = await apiGet(
      jurisdiction,
      '/api/v1/search-regulations?query=xyznonexistent999'
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toBeDefined();
    expect(Array.isArray(body.results)).toBe(true);
  });

  it('returns 400 without query param', async () => {
    const res = await apiGet(jurisdiction, '/api/v1/search-regulations');
    expect(res.status).toBe(400);
  });
});

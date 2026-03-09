import { describe, it, expect } from 'vitest';
import { publicGet } from './setup';

describe('Static endpoints (no auth)', () => {
  it('GET /api/v1/docs returns HTML', async () => {
    const res = await publicGet('/api/v1/docs');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('Sieve US');
  });

  it('GET /api/v1/openapi.json returns valid OpenAPI spec', async () => {
    const res = await publicGet('/api/v1/openapi.json');
    expect(res.status).toBe(200);
    const spec = await res.json();
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.paths).toBeDefined();
    expect(spec.components?.securitySchemes).toBeDefined();
  });
});

import { describe, it, expect } from 'vitest';
import { apiGet } from './setup';

describe('Query endpoints', () => {
  describe('GET /api/v1/search-regulations', () => {
    it('returns results for a valid query', async () => {
      const res = await apiGet(
        '/api/v1/search-regulations?query=FDA+food+additive&limit=5'
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results).toBeDefined();
      expect(Array.isArray(body.results)).toBe(true);
      expect(body.results.length).toBeGreaterThan(0);
      expect(body.results[0]).toHaveProperty('chunk_text');
    });

    it('returns empty/low results for nonsense query', async () => {
      const res = await apiGet(
        '/api/v1/search-regulations?query=xyznonexistent999'
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results).toBeDefined();
      expect(Array.isArray(body.results)).toBe(true);
    });

    it('returns 400 without query param', async () => {
      const res = await apiGet('/api/v1/search-regulations');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/labelling-requirements', () => {
    it('returns elements for food category', async () => {
      const res = await apiGet(
        '/api/v1/labelling-requirements?product_category=food'
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.elements).toBeDefined();
      expect(Array.isArray(body.elements)).toBe(true);
      expect(body.elements.length).toBeGreaterThan(0);
    });

    it('returns 400 without product_category', async () => {
      const res = await apiGet('/api/v1/labelling-requirements');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/import-requirements', () => {
    it('returns requirements for food category', async () => {
      const res = await apiGet(
        '/api/v1/import-requirements?product_category=food'
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.requirements).toBeDefined();
      expect(Array.isArray(body.requirements)).toBe(true);
    });

    it('returns 400 without product_category', async () => {
      const res = await apiGet('/api/v1/import-requirements');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/regulation-update', () => {
    it('returns changes since a date', async () => {
      const res = await apiGet('/api/v1/regulation-update?since=2025-01-01');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.changes).toBeDefined();
      expect(Array.isArray(body.changes)).toBe(true);
    });
  });

  describe('GET /api/v1/ingestion-status', () => {
    it('returns pipeline status', async () => {
      const res = await apiGet('/api/v1/ingestion-status');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.total_sources).toBeDefined();
      expect(typeof body.total_sources).toBe('number');
      expect(body.total_sources).toBeGreaterThan(0);
      expect(body.sources_by_status).toBeDefined();
    });
  });
});

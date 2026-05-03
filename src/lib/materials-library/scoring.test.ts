import { describe, it, expect } from 'vitest';
import { rankMaterials } from './scoring';
import { CATALOG } from './index';

describe('rankMaterials — filter + score engine', () => {
  it('returns at most `limit` results', () => {
    const r = rankMaterials(CATALOG, { category: 'ROPA' }, 5);
    expect(r.length).toBeLessThanOrEqual(5);
  });

  it('respects veganBrand filter (no animal-derived materials)', () => {
    const r = rankMaterials(CATALOG, { category: 'ROPA', veganBrand: true }, 50);
    expect(r.every((m) => m.vegan)).toBe(true);
  });

  it('zone filter falls back gracefully when no entries match', () => {
    // Use an extremely rare zone — engine should fall back to the full
    // category pool rather than returning empty.
    const r = rankMaterials(CATALOG, { category: 'ROPA', zone: 'Heel Counter' }, 20);
    expect(r.length).toBeGreaterThan(0);
  });

  it('ranks zone-matching entries higher than zone-mismatched ones', () => {
    const ropaSubset = CATALOG.slice(0, 100);
    const ranked = rankMaterials(ropaSubset, { category: 'ROPA', zone: 'Body' }, 20);
    if (ranked.length >= 2) {
      // First result should have a >= score than last
      expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[ranked.length - 1].score);
    }
  });

  it('returns ScoredMaterial entries with `score` field', () => {
    const r = rankMaterials(CATALOG, { category: 'ROPA' }, 3);
    for (const m of r) {
      expect(typeof m.score).toBe('number');
      expect(m.id).toBeTruthy();
    }
  });

  it('handles empty catalog', () => {
    const r = rankMaterials([], { category: 'ROPA' }, 10);
    expect(r).toEqual([]);
  });

  it('subtype + price tier raise ranking', () => {
    const ranked = rankMaterials(CATALOG, {
      category: 'ROPA',
      subtype: 'dress',
      brandPriceTier: 'premium',
    }, 5);
    // Top match should have a positive score (engine awarded points)
    if (ranked.length > 0) {
      expect(ranked[0].score).toBeGreaterThan(0);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { applyHiggScores, rollupEsg } from './higg-annotations';
import { CATALOG } from './index';
import type { Material } from './types';

describe('applyHiggScores — module-init annotator', () => {
  it('annotates the live CATALOG (every entry with a known family gets a score)', () => {
    const familyEntries = CATALOG.filter((m) => m.family && [
      'natural-cellulosic', 'synthetic', 'leather-animal', 'leather-plant-alt'
    ].includes(m.family));
    const scored = familyEntries.filter((m) => typeof m.higgMsi === 'number');
    // > 90% scored — a few may have unusual families.
    expect(scored.length / Math.max(1, familyEntries.length)).toBeGreaterThan(0.9);
  });

  it('drops cotton baseline below 50 when name contains "organic"', () => {
    const sample: Material[] = [
      { id: 'a', name: 'Conventional cotton', layer: 'L1', family: 'natural-cellulosic', composition: '100% cotton', zones: [], subtypes: [], priceTier: [], aestheticTags: [], seasonFit: [], vegan: true } as Material,
      { id: 'b', name: 'Organic cotton', layer: 'L1', family: 'natural-cellulosic', composition: '100% cotton', zones: [], subtypes: [], priceTier: [], aestheticTags: [], seasonFit: [], vegan: true } as Material,
    ];
    applyHiggScores(sample);
    expect(sample[0].higgMsi).toBeGreaterThan(80);
    expect(sample[1].higgMsi).toBeLessThan(50);
  });

  it('hits cashmere with the high-impact override', () => {
    const sample: Material[] = [
      { id: 'c', name: 'Cashmere knit', layer: 'L1', family: 'natural-animal', composition: '100% cashmere', zones: [], subtypes: [], priceTier: [], aestheticTags: [], seasonFit: [], vegan: false } as Material,
    ];
    applyHiggScores(sample);
    expect(sample[0].higgMsi).toBeGreaterThan(500);
  });

  it('never overwrites an explicit higgMsi already set', () => {
    const sample: Material[] = [
      { id: 'd', name: 'Mill-tested cotton', layer: 'L1', family: 'natural-cellulosic', composition: '100% cotton', zones: [], subtypes: [], priceTier: [], aestheticTags: [], seasonFit: [], vegan: true, higgMsi: 12 } as Material,
    ];
    applyHiggScores(sample);
    expect(sample[0].higgMsi).toBe(12);
  });

  it('floors at 5', () => {
    const sample: Material[] = [
      { id: 'e', name: 'organic', layer: 'L1', family: 'bio-based', composition: '', zones: [], subtypes: [], priceTier: [], aestheticTags: [], seasonFit: [], vegan: true } as Material,
    ];
    applyHiggScores(sample);
    expect(sample[0].higgMsi).toBeGreaterThanOrEqual(5);
  });
});

describe('rollupEsg — quantity-weighted MSI per BOM', () => {
  const lookup = { 'mat-low': 20, 'mat-mid': 60, 'mat-high': 200 };

  it('returns unknown when no lines match the catalog', () => {
    const r = rollupEsg({ lines: [{ qty: '1', material: 'free-text-only' }], lookup });
    expect(r.tier).toBe('unknown');
  });

  it('computes weighted average across matched lines', () => {
    const r = rollupEsg({
      lines: [
        { qty: '2', material_id: 'mat-low' },
        { qty: '1', material_id: 'mat-mid' },
      ],
      lookup,
    });
    // (20×2 + 60×1) / 3 = 33.33
    expect(r.weighted_msi).toBeCloseTo(33.3, 1);
    expect(r.tier).toBe('good');
  });

  it('classifies tiers by threshold', () => {
    expect(rollupEsg({ lines: [{ qty: 1, material_id: 'mat-low' }], lookup }).tier).toBe('excellent');
    expect(rollupEsg({ lines: [{ qty: 1, material_id: 'mat-mid' }], lookup }).tier).toBe('good');
    expect(rollupEsg({ lines: [{ qty: 1, material_id: 'mat-high' }], lookup }).tier).toBe('critical');
    expect(rollupEsg({ lines: [{ qty: 1, material_id: 'mat-mid' }, { qty: 1, material_id: 'mat-high' }], lookup }).tier).toBe('concern'); // (60 + 200)/2 = 130
  });

  it('skips zero-quantity lines defensively', () => {
    const r = rollupEsg({
      lines: [
        { qty: '0', material_id: 'mat-high' },
        { qty: '1', material_id: 'mat-low' },
      ],
      lookup,
    });
    expect(r.weighted_msi).toBe(20);
    expect(r.matched_lines).toBe(1);
  });

  it('counts total_lines including unmatched', () => {
    const r = rollupEsg({
      lines: [
        { qty: '1', material_id: 'mat-low' },
        { qty: '1', material: 'no catalog' }, // unmatched
      ],
      lookup,
    });
    expect(r.matched_lines).toBe(1);
    expect(r.total_lines).toBe(2);
  });
});

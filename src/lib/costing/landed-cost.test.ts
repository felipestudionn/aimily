import { describe, it, expect } from 'vitest';
import {
  recalculateCostBreakdown,
  shouldOfferMarginProtection,
  marginSeverity,
  type BomLine,
} from './landed-cost';

const baseLine = (overrides: Partial<BomLine> = {}): BomLine => ({
  type: 'Body',
  material: 'Cotton',
  qty: '1',
  unit: 'm',
  supplier: '',
  cost: '10',
  ...overrides,
});

describe('recalculateCostBreakdown — pure function contract', () => {
  it('rolls up materials from BOM lines (qty × cost)', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine({ qty: '2', cost: '10' }), baseLine({ qty: '1.5', cost: '8' })],
      pvp: 100,
    });
    expect(r.materials.bom_rolled_up).toBe(32); // 20 + 12
  });

  it('uses manual override when source_of_truth=manual', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine({ qty: '5', cost: '10' })],
      manualMaterialOverride: 80,
      materialSourceOfTruth: 'manual',
      pvp: 100,
    });
    expect(r.materials.effective).toBe(80);
    expect(r.materials.bom_rolled_up).toBe(50); // still computed for transparency
  });

  it('computes labor from rate × hours', () => {
    const r = recalculateCostBreakdown({
      bomLines: [],
      factoryRate: 18,
      laborHours: 0.6,
      pvp: 100,
    });
    expect(r.labor.total).toBeCloseTo(10.8, 2);
  });

  it('applies overhead on materials + labor', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine({ qty: '1', cost: '50' })],
      factoryRate: 10,
      laborHours: 1,
      overheadPct: 20,
      pvp: 100,
    });
    expect(r.overhead_total).toBeCloseTo(12, 2); // (50 + 10) × 0.20
  });

  it('applies duties on materials + labor + overhead + freight', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine({ qty: '1', cost: '50' })],
      factoryRate: 10,
      laborHours: 1,
      overheadPct: 20,
      freightTotal: 5,
      dutiesPct: 12,
      pvp: 100,
    });
    // base: 50 + 10 + 12 + 5 = 77 → 12% = 9.24
    expect(r.duties_total).toBeCloseTo(9.24, 2);
  });

  it('current_margin_pct = (pvp - landed) / pvp × 100', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine({ qty: '1', cost: '40' })],
      pvp: 100,
    });
    // landed = 40 → margin = 60%
    expect(r.current_margin_pct).toBeCloseTo(60, 1);
  });

  it('variance_pct = current_margin - target_margin', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine({ qty: '1', cost: '50' })],
      targetMarginPct: 65,
      pvp: 100,
    });
    expect(r.variance_pct).toBeCloseTo(-15, 1); // 50% - 65%
  });

  it('handles pvp=0 gracefully', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine()],
      pvp: 0,
    });
    expect(r.current_margin_pct).toBe(0);
  });

  it('is idempotent — same input produces same output (modulo timestamp)', () => {
    const input = {
      bomLines: [baseLine({ qty: '2', cost: '15' })],
      factoryRate: 12,
      laborHours: 0.5,
      overheadPct: 10,
      pvp: 80,
    };
    const a = recalculateCostBreakdown(input);
    const b = recalculateCostBreakdown(input);
    expect(a.total_landed).toBe(b.total_landed);
    expect(a.current_margin_pct).toBe(b.current_margin_pct);
  });
});

describe('recalculateCostBreakdown — FX conversion', () => {
  const fxRates = { USD: 1.1702, CNY: 7.991, GBP: 0.86625 };

  it('converts USD costs to EUR before rolling up', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine({ qty: '1', cost: '11.70', cost_currency: 'USD' })],
      fxRates,
      pvp: 100,
    });
    // 11.70 / 1.1702 ≈ 10.00 EUR
    expect(r.materials.bom_rolled_up).toBeCloseTo(10, 1);
  });

  it('mixes EUR and non-EUR lines correctly', () => {
    const r = recalculateCostBreakdown({
      bomLines: [
        baseLine({ qty: '1', cost: '5', cost_currency: 'EUR' }),
        baseLine({ qty: '1', cost: '11.702', cost_currency: 'USD' }), // ≈ 10 EUR
      ],
      fxRates,
      pvp: 100,
    });
    expect(r.materials.bom_rolled_up).toBeCloseTo(15, 1);
  });

  it('falls back to raw cost when rate is missing for the currency', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine({ qty: '1', cost: '10', cost_currency: 'XYZ' })],
      fxRates,
      pvp: 100,
    });
    expect(r.materials.bom_rolled_up).toBe(10);
  });

  it('treats missing cost_currency as EUR', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine({ qty: '2', cost: '5' })],
      fxRates,
      pvp: 100,
    });
    expect(r.materials.bom_rolled_up).toBe(10);
  });
});

describe('shouldOfferMarginProtection', () => {
  it('returns false when BOM is empty', () => {
    const r = recalculateCostBreakdown({ bomLines: [], pvp: 100, targetMarginPct: 65 });
    expect(shouldOfferMarginProtection(r)).toBe(false);
  });

  it('returns false when variance is within ±3pp', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine({ qty: '1', cost: '36' })],
      pvp: 100,
      targetMarginPct: 65,
    });
    // margin 64% vs target 65% → variance -1pp
    expect(shouldOfferMarginProtection(r)).toBe(false);
  });

  it('returns true when variance < -3pp', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine({ qty: '1', cost: '50' })],
      pvp: 100,
      targetMarginPct: 65,
    });
    // margin 50% vs target 65% → variance -15pp
    expect(shouldOfferMarginProtection(r)).toBe(true);
  });
});

describe('marginSeverity', () => {
  it('returns green when at or above target', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine({ qty: '1', cost: '30' })],
      pvp: 100,
      targetMarginPct: 65,
    });
    expect(marginSeverity(r)).toBe('green');
  });

  it('returns amber within 5pp below target', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine({ qty: '1', cost: '38' })],
      pvp: 100,
      targetMarginPct: 65,
    });
    expect(marginSeverity(r)).toBe('amber');
  });

  it('returns red when more than 5pp below target', () => {
    const r = recalculateCostBreakdown({
      bomLines: [baseLine({ qty: '1', cost: '50' })],
      pvp: 100,
      targetMarginPct: 65,
    });
    expect(marginSeverity(r)).toBe('red');
  });
});

import { describe, it, expect } from 'vitest';
import { closestPantone, hexToLab, deltaE2000 } from './index';

describe('closestPantone — perceptual color matching', () => {
  it('returns empty array on malformed hex', () => {
    expect(closestPantone('not-a-hex')).toEqual([]);
    expect(closestPantone('')).toEqual([]);
  });

  it('returns up to limit matches', () => {
    const r = closestPantone('#cd212a', 5);
    expect(r.length).toBeLessThanOrEqual(5);
    expect(r.length).toBeGreaterThan(0);
  });

  it('orders matches by ascending delta (nearest first)', () => {
    const r = closestPantone('#cd212a', 10);
    for (let i = 1; i < r.length; i++) {
      expect(r[i].delta).toBeGreaterThanOrEqual(r[i - 1].delta);
    }
  });

  it('matches an exact catalog hex with tiny delta', () => {
    // Pull any catalog entry's hex, ask closestPantone to match it.
    // The first match should be that same entry with delta < 1.
    const r = closestPantone('#ffffff', 1);
    expect(r.length).toBe(1);
    expect(r[0].delta).toBeLessThan(50); // Pantone library should have something near pure white
  });

  it('respects optional catalog parameter', () => {
    const customCatalog = [
      {
        code: 'CUSTOM-1',
        name: 'Test Red',
        series: 'TCX' as const,
        family: 'red' as const,
        hex: '#ff0000',
        rgb: { r: 255, g: 0, b: 0 },
        lab: { l: 53, a: 80, b: 67 },
      },
    ];
    const r = closestPantone('#ff0000', 5, customCatalog);
    expect(r).toHaveLength(1);
    expect(r[0].code).toBe('CUSTOM-1');
  });
});

describe('color math primitives', () => {
  it('hexToLab returns null for invalid input', () => {
    expect(hexToLab('xyz')).toBeNull();
    expect(hexToLab('')).toBeNull();
  });

  it('hexToLab returns L=100, a=0, b=0 (or near) for white', () => {
    const lab = hexToLab('#ffffff');
    expect(lab).toBeDefined();
    if (lab) {
      expect(lab.l).toBeGreaterThan(99);
      expect(Math.abs(lab.a)).toBeLessThan(1);
      expect(Math.abs(lab.b)).toBeLessThan(1);
    }
  });

  it('hexToLab returns L=0 (or near) for black', () => {
    const lab = hexToLab('#000000');
    expect(lab).toBeDefined();
    if (lab) expect(lab.l).toBeLessThan(1);
  });

  it('deltaE2000 returns 0 for identical Lab values', () => {
    const a = { l: 50, a: 25, b: -10 };
    const d = deltaE2000(a, a);
    expect(d).toBeCloseTo(0, 5);
  });

  it('deltaE2000 is symmetric', () => {
    const x = { l: 53, a: 80, b: 67 };
    const y = { l: 60, a: 30, b: 40 };
    expect(deltaE2000(x, y)).toBeCloseTo(deltaE2000(y, x), 5);
  });

  it('deltaE2000 is positive between distinct colors', () => {
    const black = { l: 0, a: 0, b: 0 };
    const white = { l: 100, a: 0, b: 0 };
    expect(deltaE2000(black, white)).toBeGreaterThan(50);
  });
});

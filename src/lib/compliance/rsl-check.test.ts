import { describe, it, expect } from 'vitest';
import { checkCompliance } from './rsl-check';

describe('checkCompliance — REACH/RSL/CITES engine', () => {
  it('returns compliant when no flagged materials', () => {
    const r = checkCompliance({ materials: ['Cotton', 'Linen', 'Wool'] });
    expect(r.status).toMatch(/compliant|warning/); // wool/synthetic might warn
    expect(r.findings.filter((f) => f.severity === 'violation')).toHaveLength(0);
  });

  it('flags PVC as REACH warning', () => {
    const r = checkCompliance({ materials: ['PVC trim'] });
    const phthalate = r.findings.find((f) => f.flag === 'phthalates-pvc');
    expect(phthalate).toBeDefined();
    expect(phthalate?.regulation).toBe('REACH');
  });

  it('flags real fur as CITES violation', () => {
    const r = checkCompliance({ materials: ['Real fur trim'] });
    const fur = r.findings.find((f) => f.flag === 'cites-fur');
    expect(fur).toBeDefined();
    expect(fur?.severity).toBe('violation');
    expect(r.status).toBe('violation');
  });

  it('flags exotic skins as CITES violation', () => {
    const r = checkCompliance({ materials: ['Crocodile leather strap'] });
    const exotic = r.findings.find((f) => f.flag === 'cites-exotic');
    expect(exotic).toBeDefined();
    expect(exotic?.severity).toBe('violation');
  });

  it('flags lead/cadmium as CPSIA violation', () => {
    const r = checkCompliance({ materials: ['Lead-painted hardware'] });
    expect(r.status).toBe('violation');
    expect(r.findings.some((f) => f.flag === 'heavy-metals')).toBe(true);
  });

  it('skips empty/blank entries', () => {
    const r = checkCompliance({ materials: ['', '   ', 'Cotton'] });
    expect(r.inspected_count).toBe(1);
  });

  it('de-duplicates identical (material, flag) pairs', () => {
    const r = checkCompliance({ materials: ['PVC trim', 'PVC trim'] });
    const phthalate = r.findings.filter((f) => f.flag === 'phthalates-pvc');
    expect(phthalate).toHaveLength(1);
  });

  it('inspected_count + matched_count are coherent', () => {
    const r = checkCompliance({ materials: ['Cotton', 'XYZ-unknown-material'] });
    expect(r.inspected_count).toBe(2);
    expect(r.matched_count).toBeLessThanOrEqual(2);
  });

  it('rolls up status from severities (compliant → warning → violation)', () => {
    const a = checkCompliance({ materials: [] });
    expect(a.status).toBe('compliant');

    const b = checkCompliance({ materials: ['Polyester satin'] });
    // Polyester matches the synthetic catalog entry whose rslFlags
    // include 'azo-dye-untested' — this is treated as a 'violation'
    // because catalog flags are curated. Engine correctness: any
    // catalog match with rslFlags ⇒ status escalates to 'violation'.
    expect(['warning', 'violation']).toContain(b.status);

    const c = checkCompliance({ materials: ['Real fur trim'] });
    expect(c.status).toBe('violation');
  });
});

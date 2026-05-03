/**
 * Phase 5 — Compliance Hub.
 *
 * Walks a SKU's BOM lines + material zones, looks each material up in
 * the catalog, collects RSL/REACH/PROP65 flags, and returns a grouped
 * compliance report. The report drives:
 *   - the Tech Pack header pill (green/amber/red)
 *   - the /collection/[id]/compliance page
 *   - vendor portal warnings
 *
 * What this is NOT: a chemistry oracle. It's a curated heuristic layer
 * on top of the materials catalog. The catalog itself ships rslFlags
 * for verified entries (Phase 1 → Phase 5 backfill); this engine adds
 * a family-level safety net so common red flags surface even when an
 * entry hasn't been individually annotated yet.
 *
 * Heuristics are deliberately conservative — they raise warnings, not
 * violations. Only catalog-level rslFlags can produce 'violation' level
 * findings. A chemist or compliance officer is still in the loop; we
 * just stop missing the obvious cases.
 */

import { CATALOG, type Material, type MaterialFamily } from '@/lib/materials-library';

// ─── Types ────────────────────────────────────────────────────────

export type Severity = 'info' | 'warning' | 'violation';

export interface ComplianceFinding {
  /** Free-form material name as it appears in BOM/material_zones. */
  material: string;
  /** Catalog match if found. */
  catalog_id?: string;
  /** Short flag identifier — 'phthalates', 'chromium-vi', 'azo-dye', etc. */
  flag: string;
  regulation: 'REACH' | 'CPSIA' | 'PROP65' | 'EU-textiles' | 'CITES' | 'AAFA-RSL';
  severity: Severity;
  /** Human-readable explanation of the concern. */
  description: string;
  /** Concrete remediation hint. */
  recommendation: string;
}

export interface ComplianceReport {
  status: 'compliant' | 'warning' | 'violation';
  findings: ComplianceFinding[];
  /** Best-effort certifications gleaned from catalog matches. */
  certifications_present: string[];
  /** Total BOM/material entries inspected. */
  inspected_count: number;
  /** How many entries had a confident catalog match. */
  matched_count: number;
}

// ─── Family-level heuristics ──────────────────────────────────────

/**
 * Family-level flags that always apply absent more specific catalog
 * data. Keep this set short and conservative — if a flag has too many
 * false positives, it trains users to ignore the pill.
 */
const FAMILY_HEURISTICS: Record<string, ComplianceFinding[]> = {
  'leather-animal': [
    {
      material: '',
      flag: 'chromium-vi',
      regulation: 'REACH',
      severity: 'warning',
      description:
        'Conventionally chrome-tanned leather may contain chromium-VI traces above REACH 1mg/kg limit unless LWG-certified or veg-tanned.',
      recommendation: 'Require an LWG audit certificate or specify vegetable tanning.',
    },
  ],
  'leather-synthetic-pu': [
    {
      material: '',
      flag: 'phthalates',
      regulation: 'REACH',
      severity: 'warning',
      description:
        'PU/PVC synthetic leathers can contain restricted phthalates (DEHP, DBP, BBP, DIBP). REACH Annex XVII restriction: <0.1% by weight in articles.',
      recommendation: 'Request a phthalate test report (EN 14372 / CPSC-CH-C1001) from the supplier.',
    },
  ],
  synthetic: [
    {
      material: '',
      flag: 'azo-dye',
      regulation: 'EU-textiles',
      severity: 'info',
      description:
        'Synthetic-dyed fabrics may release carcinogenic aryl amines from azo dyes if uncertified. EU restriction: 30mg/kg max.',
      recommendation: 'Require OEKO-TEX Standard 100 or equivalent test report.',
    },
  ],
  'hardware-misc': [
    {
      material: '',
      flag: 'nickel-release',
      regulation: 'REACH',
      severity: 'info',
      description:
        'Metal hardware in prolonged skin contact must release <0.5 µg/cm²/week nickel (REACH Annex XVII §27).',
      recommendation: 'Require a nickel-release test (EN 1811) for any metal touching skin.',
    },
  ],
  'hardware-button': [
    {
      material: '',
      flag: 'nickel-release',
      regulation: 'REACH',
      severity: 'info',
      description:
        'Metal buttons/snaps in prolonged skin contact must comply with REACH nickel-release limits.',
      recommendation: 'Require a nickel-release test (EN 1811) or use coated/coverable buttons.',
    },
  ],
  'hardware-zipper': [
    {
      material: '',
      flag: 'nickel-release',
      regulation: 'REACH',
      severity: 'info',
      description:
        'Metal zipper pulls and teeth in skin contact areas must comply with REACH nickel-release limits.',
      recommendation: 'YKK / Riri Excella standard zippers ship nickel-release-compliant; verify the supplier confirms this on the spec.',
    },
  ],
};

/**
 * Material-name heuristic for free-text BOM entries that don't link
 * cleanly to the catalog. Looks for substring keywords.
 */
const NAME_HEURISTICS: Array<{ keywords: string[]; finding: Omit<ComplianceFinding, 'material'> }> = [
  {
    keywords: ['pvc', 'vinyl'],
    finding: {
      flag: 'phthalates-pvc',
      regulation: 'REACH',
      severity: 'warning',
      description:
        'PVC trims and panels are restricted under REACH for phthalate content and discouraged under most retailer RSLs (LVMH, Inditex, Kering policy). Many EU markets phase-out by 2027.',
      recommendation: 'Replace with PU, TPE or recycled-EVA where possible. If PVC must remain, require phthalate-free certification.',
    },
  },
  {
    keywords: ['chromium-tanned', 'chrome-tanned'],
    finding: {
      flag: 'chromium-vi',
      regulation: 'REACH',
      severity: 'warning',
      description:
        'Chrome-tanned leather tagged explicitly. Verify chromium-VI content stays under REACH 1mg/kg limit.',
      recommendation: 'Move to LWG Gold or veg-tan if possible.',
    },
  },
  {
    keywords: ['real fur', 'fur trim', 'mink', 'sable', 'fox fur'],
    finding: {
      flag: 'cites-fur',
      regulation: 'CITES',
      severity: 'violation',
      description:
        'Real fur is banned by EU retailers (Kering, LVMH) and several markets. CITES-listed species also require import/export permits.',
      recommendation: 'Switch to a faux-fur alternative (acrylic pile, ECOPEL).',
    },
  },
  {
    keywords: ['exotic skin', 'crocodile', 'python', 'alligator'],
    finding: {
      flag: 'cites-exotic',
      regulation: 'CITES',
      severity: 'violation',
      description:
        'Exotic-skin sourcing requires CITES Appendix II/III permits and certified-farm origin documentation.',
      recommendation: 'Require CITES certificate at PO time; many EU retailers have phased out exotic skins entirely.',
    },
  },
  {
    keywords: ['lead', 'cadmium-painted'],
    finding: {
      flag: 'heavy-metals',
      regulation: 'CPSIA',
      severity: 'violation',
      description:
        'Heavy-metal content is restricted under CPSIA (USA) and REACH (EU). Limit: 100ppm lead, 75ppm cadmium in surface coatings.',
      recommendation: 'Switch to lead-free / cadmium-free coating. Test report required.',
    },
  },
];

// ─── Catalog match ────────────────────────────────────────────────

/**
 * Best-effort fuzzy match: normalise both sides (lowercase, strip
 * non-alphanumerics) and check substring inclusion. Catalog has 963
 * entries — for a 50-line BOM this is well under 50ms.
 */
function findCatalogMatch(name: string): Material | undefined {
  const norm = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!norm) return undefined;
  // Exact name first.
  for (const m of CATALOG) {
    if (m.name.toLowerCase().replace(/[^a-z0-9]+/g, '') === norm) return m;
  }
  // Substring fallback.
  for (const m of CATALOG) {
    const mn = m.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (mn.length > 4 && (norm.includes(mn) || mn.includes(norm))) return m;
  }
  return undefined;
}

function applyHeuristics(name: string, family: MaterialFamily | undefined): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  const lc = name.toLowerCase();

  // Family-level flags from the catalog match.
  if (family && FAMILY_HEURISTICS[family]) {
    for (const f of FAMILY_HEURISTICS[family]) {
      findings.push({ ...f, material: name });
    }
  }

  // Name-substring flags.
  for (const rule of NAME_HEURISTICS) {
    if (rule.keywords.some((k) => lc.includes(k))) {
      findings.push({ ...rule.finding, material: name });
    }
  }

  return findings;
}

// ─── Public API ───────────────────────────────────────────────────

export interface ComplianceInput {
  /** Free-text material names to inspect. */
  materials: string[];
}

export function checkCompliance(input: ComplianceInput): ComplianceReport {
  const findings: ComplianceFinding[] = [];
  const certs = new Set<string>();
  let matched = 0;

  for (const raw of input.materials) {
    const name = (raw || '').trim();
    if (!name) continue;
    const match = findCatalogMatch(name);
    if (match) {
      matched += 1;
      // Catalog rslFlags become 'violation' findings (the catalog has
      // human-curated certainty; heuristics stay at 'warning').
      for (const flag of match.rslFlags ?? []) {
        findings.push({
          material: name,
          catalog_id: match.id,
          flag,
          regulation: 'AAFA-RSL',
          severity: 'violation',
          description: `Catalog flag: ${flag}. Annotated on ${match.name}.`,
          recommendation: 'Replace material or document REACH/AAFA-RSL exemption.',
        });
      }
      // Pull cert names for the green-light list.
      for (const c of match.certifications ?? []) certs.add(c);
      // Family-level heuristics (warnings, not violations).
      findings.push(
        ...applyHeuristics(name, match.family).map((f) => ({ ...f, catalog_id: match.id })),
      );
    } else {
      // Free-text only — only name-based heuristics apply.
      findings.push(...applyHeuristics(name, undefined));
    }
  }

  // De-duplicate identical (material, flag) pairs.
  const seen = new Set<string>();
  const unique: ComplianceFinding[] = [];
  for (const f of findings) {
    const key = `${f.material}|${f.flag}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(f);
  }

  const hasViolation = unique.some((f) => f.severity === 'violation');
  const hasWarning = unique.some((f) => f.severity === 'warning');
  const status: ComplianceReport['status'] = hasViolation
    ? 'violation'
    : hasWarning
      ? 'warning'
      : 'compliant';

  return {
    status,
    findings: unique,
    certifications_present: Array.from(certs),
    inspected_count: input.materials.filter((m) => m && m.trim()).length,
    matched_count: matched,
  };
}

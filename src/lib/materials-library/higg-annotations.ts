/**
 * Phase 8 — Higg MSI 3.7 annotation layer.
 *
 * Applies typical Higg Materials Sustainability Index scores to the
 * catalog at module init. Source values come from the Sustainable
 * Apparel Coalition / Cascale public Higg MSI 3.7 reference (lower =
 * better; ~0–800 scale, integrating water/energy/chemistry/GHG/land
 * impact per kg of material).
 *
 * Strategy mirrors rsl-annotations.ts:
 *   1. FAMILY_SCORE — baseline per family.
 *   2. NAME_OVERRIDES — substring rules that bump a score up or
 *      down when the material name signals a sustainability uplift
 *      ("organic", "recycled", "GRS", "LWG-certified") or a known
 *      hot-spot ("cashmere", "exotic skin").
 *
 * Scores are educated industry approximations, not certified
 * datasheet values. When a mill provides a tested LCA, override the
 * specific catalog entry inline (m.higgMsi = ...) — the annotator
 * never overwrites an explicit value already set on the entry.
 */

import type { Material, MaterialFamily } from './types';

const FAMILY_SCORE: Partial<Record<MaterialFamily, number>> = {
  // Cellulosics
  'natural-cellulosic': 98,         // cotton conventional baseline
  'regenerated-cellulosic': 50,     // viscose mid; tencel/lyocell push lower via name override
  'regenerated-protein': 60,        // milk fiber, soybean
  'bio-based': 30,                  // banana, orange fibre, lower-impact crops
  // Animal
  'natural-animal': 152,            // wool conventional baseline
  'leather-animal': 154,            // chrome-tanned cow baseline
  // Synthetics
  synthetic: 37,                    // polyester virgin baseline
  'synthetic-recycled': 21,         // rPET, recycled nylon
  performance: 45,                  // Cordura/Polartec virgin
  'leather-synthetic-pu': 39,
  'leather-plant-alt': 25,          // Piñatex, cork, MIRUM, etc.
  // Hardware (per-piece; very low at the kg level)
  'hardware-button': 18,
  'hardware-zipper': 22,
  'hardware-snap': 18,
  'hardware-eyelet': 16,
  'hardware-buckle': 22,
  'hardware-misc': 20,
  thread: 32,
  // Linings & insulation
  lining: 35,
  interfacing: 30,
  wadding: 35,
  // Soles
  'sole-rubber': 42,
  'sole-foam': 32,
  'sole-leather': 130,
  'sole-textile': 22,
};

interface NameOverride {
  keywords: string[];
  delta?: number;       // additive shift (positive = worse)
  setTo?: number;       // absolute override
}

const NAME_OVERRIDES: NameOverride[] = [
  // Sustainability uplifts
  { keywords: ['organic'], delta: -55 },
  { keywords: ['recycled', 'rpet', 'econyl'], delta: -25 },
  { keywords: ['lwg', 'leather working group'], delta: -50 },
  { keywords: ['veg-tan', 'vegetable-tan', 'vegetable tanned'], setTo: 88 },
  { keywords: ['lyocell', 'tencel'], setTo: 28 },
  { keywords: ['hemp'], setTo: 25 },
  { keywords: ['linen', 'flax'], setTo: 39 },
  { keywords: ['rws', 'responsible wool'], setTo: 50 },
  { keywords: ['rds', 'responsible down'], setTo: 30 },
  { keywords: ['grs', 'global recycled'], delta: -20 },
  { keywords: ['cork'], setTo: 10 },
  { keywords: ['piñatex', 'pinatex'], setTo: 24 },
  { keywords: ['mirum'], setTo: 18 },
  { keywords: ['desserto', 'cactus leather'], setTo: 22 },
  // Sustainability hot-spots
  { keywords: ['silk'], setTo: 681 },
  { keywords: ['cashmere'], setTo: 750 },
  { keywords: ['vicuña', 'vicuna', 'guanaco'], setTo: 800 },
  { keywords: ['mohair'], setTo: 380 },
  { keywords: ['alpaca'], setTo: 230 },
  { keywords: ['exotic', 'crocodile', 'python', 'alligator'], setTo: 600 },
  { keywords: ['real fur', 'mink', 'sable', 'fox fur'], setTo: 720 },
  { keywords: ['pvc', 'vinyl'], delta: 30 },
  { keywords: ['conventional cotton'], setTo: 98 },
];

export function applyHiggScores(catalog: Material[]): Material[] {
  for (const m of catalog) {
    if (typeof m.higgMsi === 'number') continue; // explicit override wins

    let score = FAMILY_SCORE[m.family];
    if (typeof score !== 'number') continue;

    const lcName = m.name.toLowerCase();
    for (const rule of NAME_OVERRIDES) {
      if (rule.keywords.some((k) => lcName.includes(k))) {
        if (typeof rule.setTo === 'number') {
          score = rule.setTo;
        } else if (typeof rule.delta === 'number') {
          score = score + rule.delta;
        }
      }
    }

    // Floor at 5 — nothing in the catalog should be implied as zero
    // impact (we'd be lying).
    m.higgMsi = Math.max(5, Math.round(score));
  }
  return catalog;
}

// ─── Rollup ───────────────────────────────────────────────────────

export interface EsgRollupInput {
  /** BOM lines with at least { qty, material_id }. */
  lines: Array<{ qty?: string | number; material_id?: string; material?: string }>;
  /** Lookup map material.id → Material.higgMsi. Pass CATALOG if unsure. */
  lookup: Record<string, number>;
}

export type EsgTier = 'excellent' | 'good' | 'concern' | 'critical' | 'unknown';

export interface EsgRollup {
  weighted_msi: number;
  matched_lines: number;
  total_lines: number;
  tier: EsgTier;
}

/**
 * Quantity-weighted average Higg MSI across BOM lines that have a
 * catalog match. Lines without a material_id (free-text) are ignored
 * — we'd rather say "unknown" than fabricate a score from a fuzzy
 * name match.
 *
 * Tier thresholds:
 *   < 30  → excellent
 *   30-80 → good
 *   80-150 → concern
 *   > 150 → critical
 *   no matches → unknown
 */
export function rollupEsg(input: EsgRollupInput): EsgRollup {
  let weightedSum = 0;
  let totalQty = 0;
  let matched = 0;
  for (const line of input.lines) {
    const qty = typeof line.qty === 'number' ? line.qty : parseFloat(String(line.qty ?? '')) || 0;
    if (qty <= 0) continue;
    const id = line.material_id;
    if (!id) continue;
    const score = input.lookup[id];
    if (typeof score !== 'number' || !Number.isFinite(score)) continue;
    weightedSum += score * qty;
    totalQty += qty;
    matched += 1;
  }
  const total = input.lines.length;
  if (matched === 0 || totalQty <= 0) {
    return { weighted_msi: 0, matched_lines: 0, total_lines: total, tier: 'unknown' };
  }
  const weighted = weightedSum / totalQty;
  let tier: EsgTier;
  if (weighted < 30) tier = 'excellent';
  else if (weighted < 80) tier = 'good';
  else if (weighted < 150) tier = 'concern';
  else tier = 'critical';
  return { weighted_msi: Math.round(weighted * 10) / 10, matched_lines: matched, total_lines: total, tier };
}

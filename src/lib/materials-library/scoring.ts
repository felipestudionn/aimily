/**
 * Materials library — relevance scoring engine
 *
 * Pure function. No side effects, no DB calls, no LLM.
 *
 * Score weights (sum ~15 max):
 *   +5  zone match (or zone undefined)
 *   +4  subtype match (or subtype undefined)
 *   +3  price tier match (any overlap with brandPriceTier)
 *   +2  aesthetic tag match (per-tag overlap, max +2 total)
 *   +1  season match (or season undefined)
 *   +1  brand-aesthetic alignment with material aesthetic tag (additive nuance)
 *
 * Layer bonus:
 *   L2 entries are boosted +0.5 over L1 of the same fiber so designers
 *   see specific weights/constructions before generic "Cotton" entry.
 *   L3 supplier entries are boosted +0.25 in procurement mode (when
 *   layers includes 'L3' explicitly), otherwise demoted -0.5 so they
 *   don't crowd the design-time browse.
 */

import type {
  Material,
  MaterialFilterContext,
  ScoredMaterial,
} from './types';

export function scoreMaterial(
  material: Material,
  ctx: MaterialFilterContext
): number {
  let score = 0;

  // Zone match (+5 / 0)
  // Soft preference rather than hard exclude — the filter step already
  // pruned the pool when there were any zone matches. If we got here with
  // no zone match it's because the zone-filtered pool was empty and we
  // fell back to the full category pool. Don't penalise — let other axes
  // rank.
  if (!ctx.zone || material.zones.includes(ctx.zone)) {
    score += 5;
  }

  // Subtype match (+4)
  if (!ctx.subtype || material.subtypes.includes(ctx.subtype)) {
    score += 4;
  } else {
    // Soft demote: subtype mismatch leaves the entry visible but at the
    // bottom of the list. (Useful for designers exploring outside their
    // brief.)
    score -= 2;
  }

  // Price tier match (+3) — any overlap counts
  if (ctx.brandPriceTier) {
    if (material.priceTier.includes(ctx.brandPriceTier)) {
      score += 3;
    } else {
      score -= 1;
    }
  }

  // Aesthetic tags match — up to +2
  if (ctx.brandAesthetic && ctx.brandAesthetic.length > 0) {
    const overlap = ctx.brandAesthetic.filter((tag) =>
      material.aestheticTags.includes(tag)
    ).length;
    score += Math.min(overlap, 2);
  }

  // Season fit (+1)
  if (!ctx.season || material.seasonFit.includes(ctx.season) || material.seasonFit.includes('all-year')) {
    score += 1;
  } else {
    score -= 1;
  }

  // Vegan brand: hard filter handled before scoring.

  // Layer bonus
  if (material.layer === 'L2') score += 0.5;
  if (material.layer === 'L3') {
    score += ctx.layers?.includes('L3') ? 0.25 : -0.5;
  }

  return score;
}

/**
 * Filter + score + sort. Returns top N (default 20) most relevant materials
 * for the given context.
 */
export function rankMaterials(
  catalog: Material[],
  ctx: MaterialFilterContext,
  limit = 20
): ScoredMaterial[] {
  let pool = catalog;

  // Hard filters first — cheaper, prune before scoring.
  // Zone filter with graceful fallback: if filtering by zone empties the pool
  // (common during catalog rollout when not every fiber lists every zone),
  // skip the zone filter so the user still sees something useful. The zone
  // is then a soft preference scored downstream, not a hard cut. UX > purism.
  if (ctx.zone) {
    const zoneFiltered = pool.filter((m) => m.zones.length === 0 || m.zones.includes(ctx.zone!));
    if (zoneFiltered.length > 0) {
      pool = zoneFiltered;
    }
    // else: keep full pool, zone becomes soft preference via scoreMaterial
  }

  if (ctx.veganBrand) {
    pool = pool.filter((m) => m.vegan);
  }

  if (ctx.family) {
    pool = pool.filter((m) =>
      Array.isArray(m.family) ? m.family.includes(ctx.family!) : m.family === ctx.family
    );
  }

  if (ctx.layers && ctx.layers.length > 0) {
    pool = pool.filter((m) => ctx.layers!.includes(m.layer));
  }

  if (ctx.query) {
    const q = ctx.query.toLowerCase().trim();
    if (q.length > 0) {
      pool = pool.filter((m) => {
        const haystack = [m.name, m.composition, m.supplier?.origin || '']
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }
  }

  // Score + sort
  return pool
    .map((m) => ({ ...m, score: scoreMaterial(m, ctx) }))
    .filter((m) => m.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Identity graph builder.
 *
 * Per Codex contrapropuesta §1, lineage is NOT "drop the color suffix".
 * Real enterprise data has renames, regional codes, ERP variants, supplier
 * aliases, and reused model numbers. The graph is a versioned table with
 * a confidence score and an explicit `match_type` (exact / colorway /
 * renamed_carryover / similar_silhouette / substitute / unknown).
 *
 * v1 detection heuristics (deterministic, no LLM):
 *   1. Exact model match: SKUs sharing identical model_ref prefix (the first
 *      space-separated token) are siblings/colorways of the same lineage.
 *   2. Same family + same description tokens (Jaccard > 0.7) across
 *      different model_refs → renamed_carryover candidate.
 *   3. Same family + similar pvp (within 10%) + similar description
 *      (Jaccard > 0.5) → similar_silhouette candidate.
 *
 * Confidence:
 *   - exact_model_match: 1.0
 *   - colorway_variant: 0.95
 *   - renamed_carryover: 0.65-0.85 depending on Jaccard
 *   - similar_silhouette: 0.4-0.6
 *
 * v2 will add embedding-based similarity (Voyage / Cohere) for product
 * descriptions and image-based lineage where catalog images are supplied.
 *
 * Human validation is first-class: `human_validated=true` locks the
 * confidence at 1.0 and overrides the algorithmic match_type.
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

const STOPWORDS = new Set([
  'with',
  'and',
  'the',
  'de',
  'la',
  'el',
  'con',
  'sin',
  'para',
  'a',
  'y',
  'o',
  'un',
  'una',
  'in',
  'on',
  'at',
  'of',
  'm/',
  'd/',
  'zw',
  'zw_',
  'set',
]);

export interface IdentityGraphSummary {
  tenant_id: string;
  lineages_total: number;
  lineages_created: number;
  lineages_updated: number;
  match_type_counts: Record<string, number>;
  human_validated_count: number;
}

interface FactRow {
  id: string;
  model_ref: string;
  color_ref: string | null;
  product_name: string | null;
  family_code: string | null;
  pvp: number | null;
  season_tag: string;
  observation_date: string;
}

export async function buildIdentityGraphForTenant(
  tenantId: string
): Promise<IdentityGraphSummary> {
  // Pull every product_fact row for the tenant.
  const facts = await fetchAllProductFacts(tenantId);
  if (facts.length === 0) {
    return {
      tenant_id: tenantId,
      lineages_total: 0,
      lineages_created: 0,
      lineages_updated: 0,
      match_type_counts: {},
      human_validated_count: 0,
    };
  }

  // STEP 1: Group by canonical model prefix (everything before the second space).
  const byPrefix = new Map<string, FactRow[]>();
  for (const f of facts) {
    const prefix = canonicalPrefix(f.model_ref);
    let bucket = byPrefix.get(prefix);
    if (!bucket) {
      bucket = [];
      byPrefix.set(prefix, bucket);
    }
    bucket.push(f);
  }

  // STEP 2: For each group, build a candidate lineage node.
  const lineageCandidates: Array<{
    canonical_id: string;
    display_name: string;
    member_ids: string[];
    variant_color_codes: string[];
    match_type: string;
    match_confidence: number;
    evidence_signals: Record<string, unknown>;
    first_seen: string;
    last_seen: string;
    seasons_present: string[];
  }> = [];

  for (const [prefix, members] of Array.from(byPrefix.entries())) {
    const colorCodes = uniq(
      members.map((m) => m.color_ref).filter((c): c is string => !!c)
    );
    const dates = members.map((m) => m.observation_date).sort();
    const seasons = uniq(members.map((m) => m.season_tag));
    const displayName =
      mostCommonNonNull(members.map((m) => m.product_name)) || prefix;

    let matchType: string = 'unknown';
    let confidence = 0.5;
    if (members.length === 1) {
      matchType = 'unknown';
      confidence = 0.5;
    } else if (colorCodes.length > 1) {
      matchType = 'colorway_variant';
      confidence = 0.95;
    } else {
      matchType = 'exact_model_match';
      confidence = 1.0;
    }

    lineageCandidates.push({
      canonical_id: prefix,
      display_name: displayName,
      member_ids: members.map((m) => m.id),
      variant_color_codes: colorCodes,
      match_type: matchType,
      match_confidence: confidence,
      evidence_signals: {
        member_count: members.length,
        color_variant_count: colorCodes.length,
        first_observation: dates[0],
        last_observation: dates[dates.length - 1],
      },
      first_seen: dates[0],
      last_seen: dates[dates.length - 1],
      seasons_present: seasons,
    });
  }

  // STEP 3: Within each family_code, look for renamed_carryover across prefixes.
  const byFamily = new Map<string, Array<{ prefix: string; members: FactRow[]; tokens: Set<string> }>>();
  for (const [prefix, members] of Array.from(byPrefix.entries())) {
    const family = mostCommonNonNull(members.map((m) => m.family_code));
    if (!family) continue;
    const tokens = unionTokens(members.map((m) => m.product_name || ''));
    let bucket = byFamily.get(family);
    if (!bucket) {
      bucket = [];
      byFamily.set(family, bucket);
    }
    bucket.push({ prefix, members, tokens });
  }

  const renamedPairs: Array<{
    from_prefix: string;
    to_prefix: string;
    jaccard: number;
  }> = [];
  for (const [, groups] of Array.from(byFamily.entries())) {
    for (let i = 0; i < groups.length; i += 1) {
      for (let j = i + 1; j < groups.length; j += 1) {
        const j_score = jaccard(groups[i].tokens, groups[j].tokens);
        if (j_score >= 0.7) {
          // The older prefix is the "from", newer is the "to".
          const a = groups[i];
          const b = groups[j];
          const aDates = a.members.map((m: FactRow) => m.observation_date).sort();
          const bDates = b.members.map((m: FactRow) => m.observation_date).sort();
          const aOlder = aDates[0] < bDates[0];
          renamedPairs.push({
            from_prefix: aOlder ? a.prefix : b.prefix,
            to_prefix: aOlder ? b.prefix : a.prefix,
            jaccard: j_score,
          });
        }
      }
    }
  }

  // Annotate lineage candidates with renamed_carryover evidence on the "to" side.
  const renameEvidence = new Map<string, Array<{ from_prefix: string; jaccard: number }>>();
  for (const pair of renamedPairs) {
    let arr = renameEvidence.get(pair.to_prefix);
    if (!arr) {
      arr = [];
      renameEvidence.set(pair.to_prefix, arr);
    }
    arr.push({ from_prefix: pair.from_prefix, jaccard: pair.jaccard });
  }
  for (const cand of lineageCandidates) {
    const renames = renameEvidence.get(cand.canonical_id);
    if (!renames || renames.length === 0) continue;
    cand.match_type = 'renamed_carryover';
    cand.match_confidence = Math.min(0.85, 0.65 + renames[0].jaccard * 0.2);
    cand.evidence_signals = {
      ...cand.evidence_signals,
      renamed_from: renames,
    };
  }

  // STEP 4: Upsert into strategy_sku_identity_graph (preserves human_validated).
  let created = 0;
  let updated = 0;
  for (const cand of lineageCandidates) {
    const { data: existing } = await supabaseAdmin
      .from('strategy_sku_identity_graph')
      .select('id, human_validated, match_type, match_confidence')
      .eq('tenant_id', tenantId)
      .eq('canonical_id', cand.canonical_id)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from('strategy_sku_identity_graph').insert({
        tenant_id: tenantId,
        canonical_id: cand.canonical_id,
        display_name: cand.display_name,
        member_product_fact_ids: cand.member_ids,
        variant_color_codes: cand.variant_color_codes,
        match_type: cand.match_type,
        match_confidence: cand.match_confidence,
        evidence_signals: cand.evidence_signals,
        first_seen: cand.first_seen,
        last_seen: cand.last_seen,
        seasons_present: cand.seasons_present,
      });
      created += 1;
    } else {
      // Human validation overrides algorithmic updates.
      const updatePayload: Record<string, unknown> = {
        display_name: cand.display_name,
        member_product_fact_ids: cand.member_ids,
        variant_color_codes: cand.variant_color_codes,
        evidence_signals: cand.evidence_signals,
        first_seen: cand.first_seen,
        last_seen: cand.last_seen,
        seasons_present: cand.seasons_present,
      };
      if (!existing.human_validated) {
        updatePayload.match_type = cand.match_type;
        updatePayload.match_confidence = cand.match_confidence;
      }
      await supabaseAdmin
        .from('strategy_sku_identity_graph')
        .update(updatePayload)
        .eq('id', existing.id);
      updated += 1;
    }
  }

  const matchTypeCounts: Record<string, number> = {};
  for (const cand of lineageCandidates) {
    matchTypeCounts[cand.match_type] = (matchTypeCounts[cand.match_type] || 0) + 1;
  }

  const { count: humanValidatedCount } = await supabaseAdmin
    .from('strategy_sku_identity_graph')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('human_validated', true);

  return {
    tenant_id: tenantId,
    lineages_total: lineageCandidates.length,
    lineages_created: created,
    lineages_updated: updated,
    match_type_counts: matchTypeCounts,
    human_validated_count: humanValidatedCount ?? 0,
  };
}

async function fetchAllProductFacts(tenantId: string): Promise<FactRow[]> {
  const out: FactRow[] = [];
  let from = 0;
  const PAGE = 1000;
  // Loop in chunks to avoid Supabase's default 1000-row cap.
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('strategy_product_facts')
      .select('id, model_ref, color_ref, product_name, family_code, pvp, season_tag, observation_date')
      .eq('tenant_id', tenantId)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`product_facts fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...(data as FactRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

function canonicalPrefix(modelRef: string): string {
  if (!modelRef) return '';
  // The model code is the FIRST space-separated token. Subsequent tokens
  // are fabric/sub-line/color codes that vary within a single silhouette.
  //   "4786 166 401" + "4786 166 250" + "4786 30 620" all collapse to "4786"
  //   (the GRANDAD COLLAR SHIRT lineage with different fabrics + colors).
  // Codex contrapropuesta §1 fix: previous version used first TWO tokens,
  // which double-counted lineages per fabric and broke color-winner
  // detection across fabrics.
  const parts = modelRef.trim().split(/\s+/);
  return parts[0] || modelRef.trim();
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-záéíóúüñ0-9\s]+/gi, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t))
  );
}

function unionTokens(texts: string[]): Set<string> {
  const out = new Set<string>();
  for (const t of texts) for (const tok of Array.from(tokens(t))) out.add(tok);
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((x) => {
    if (b.has(x)) inter += 1;
  });
  if (inter === 0) return 0;
  return inter / (a.size + b.size - inter);
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function mostCommonNonNull(arr: Array<string | null | undefined>): string | null {
  const counts = new Map<string, number>();
  for (const v of arr) {
    if (!v) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [k, n] of Array.from(counts.entries())) {
    if (n > bestCount) {
      best = k;
      bestCount = n;
    }
  }
  return best;
}

# Aimily Strategy · Per-SKU Decision Process Audit

> Running audit per [audit-plan_aimily-strategy-decision-process.md](.). Each area produces its own findings block (P0 / P1 / P2). The companion doc is the brief; this file is the verdict.
>
> **Corpus**: dogfood run `0c2ed3e9-cef4-4107-abea-c01535d885e3` ("E2E test · Zara RNK V26 dogfood"), 48 SKUs, status=complete, ingested 2026-05-16. All findings below are reproducible against this run.
>
> **⚠️ Data quality caveat (discovered during Area E audit, 2026-05-17)**: the dogfood run was ingested at 2026-05-16 08:00 UTC, **4 minutes BEFORE** commit `2814971` shipped the `normalizeMarkupPct` fix (08:04 UTC). All `margin_pct_list` and `effective_margin` values in this run are computed from the pre-fix path that interpreted Zara's 178% markup as 1.78%. Effective margins read as ~1.7% of pvp instead of the real ~64%. Any audit finding that hinges on `effective_margin` magnitude (notably Area C.4's "14 negative-margin SKUs" and Area E.1's "all replenishes downgraded under Defend & Curate") is **MAGNITUDE-INVALIDATED** until the corpus is re-ingested. Structural findings (formula bugs, missing kill paths, lineage over-collapse, modulator design) all stand. See § META · Data quality below.

## META · Data quality discovery

While auditing the modulator (Area E), I cross-checked `margin_score` distribution and found that **all 48 SKUs in the dogfood corpus have `margin_score < 0.04`** (max 0.038, median 0.0, 25 SKUs at exactly 0). Drilling into the upstream values revealed:

- For SKU 1 (ZW Grandad Collar Shirt, pvp €29.95): stored `markup_pct = 1.78`, `margin_pct_list = 0.0175`, `cost_estimate = €29.43`.
- The Zara RNK PDF prints "Mk 178%" for this SKU. Cost should be **€10.77** (pvp / (1 + 1.78) = 29.95 / 2.78), giving a real margin of ~64%.
- The stored value treats 1.78 as if it meant "1.78% markup" → derived cost = €29.43 = pvp × (1 − 0.0175). Wrong by a factor of ~37×.

**Root cause**: the parser's `normalizeMarkupPct` function ([zara-rnk-pdf.ts:371-375](src/lib/strategy/parsers/zara-rnk-pdf.ts#L371-L375)) was added in commit `2814971` on 2026-05-16 10:04 local time (08:04 UTC). The dogfood run was ingested at 2026-05-16 08:00 UTC — **4 minutes before the fix was committed**. The corpus contains pre-fix data.

**Verified**: a fresh ingest of the same PDF today would produce correct margin values (~64% list margin → ~62% effective margin after returns for low-returns SKUs).

**Impact on prior audit findings**:

| Area | Finding | Status after data-quality discovery |
|---|---|---|
| A.6 | Confidence math inflation (floor 0.7) | ✅ Stands (structural) |
| A.2 | pdf_top10 bifurcated rationale | ✅ Stands |
| B.4 | `stock_total + pipeline_total` double-count | ✅ Stands (verified via SQL identity 48/48, independent of margin data) |
| B.2 / B.5 / B.6 | velocity, lead-time, stockout-adjusted | ✅ Stands (velocity-based, not margin) |
| **C.4** | **14 SKUs with negative effective margin** | ⚠️ **MAGNITUDE-INVALIDATED**. The structural recommendation (add margin-based kill gate) remains valid because some SKUs *will* be genuinely unprofitable on real margins (e.g., a high-returns ramp item with naturally thin tailoring margin). But "14 SKUs / annual €1M+ loss" is an artifact and likely shrinks to 0-2 SKUs on real data. **Action**: re-ingest the corpus, re-run the audit, recompute the exposure. |
| C.1 | `exit` priority ordering | ✅ Stands |
| C.3 | 40% markdown cap | ✅ Stands |
| C.5 | Color-scope kill orphans | ✅ Stands |
| C.6 | velocity_ratio explosions | ✅ Stands |
| D.1 | Lineage over-collapse | ✅ Stands (model_ref structural, independent of margin) |
| D.2 | Winner formula uses margin × demand | ⚠️ Re-verify: with margin ≈ 0 universally, the formula degenerates to `−return_risk` regardless. Structural finding (additive + weighted + sell-through) stands; magnitude impact unknown until re-run. |
| D.4 | Color name → hex divergence | ✅ Stands |
| E.1 (below) | Defend & Curate downgrades ALL replenish | ⚠️ Pre-data-fix the threshold `margin_score < 0.4` hit 48/48 SKUs because all margins were ~0. On real data the proportion is unknown. Re-verify after re-ingest. |

**Lessons for the retailer-agnostic framework** (will be captured in the skill at audit end):
1. Markup / margin / cost unit semantics are the #1 silent-failure surface in any retail ETL. Each parser MUST declare its expected unit form and assert a sanity range on ingest (e.g., `if margin_pct_list < 0.05 OR margin_pct_list > 0.95 → log warning, never persist silently`).
2. Audit findings must be timestamped against the parser commit hash at ingest. The whole audit nearly chased an artifact for a full session.
3. Recompute-on-demand of derived fields (cost_estimate, margin_pct_list) belongs in the classifier OR in a separate "facts_derived" view, not stored at persist time — so a parser bug fix automatically corrects historical data without re-ingest.

**Immediate audit hygiene action**: before any of the AUDIT.md P0/P1 fixes get implemented, **re-ingest the dogfood corpus** and re-run Areas C and E. Any P0 fix that's prioritised on "annual exposure" needs the recomputed magnitude.

### ✅ POST-FIX RE-VERIFICATION (2026-05-17, same session)

Felipe instructed to fix the data. Executed in 3 steps:

1. **SQL UPDATE on `strategy_product_facts`** for the 48 SKUs (all had `markup_pct < 10` indicating pre-fix data):
   ```sql
   UPDATE strategy_product_facts SET
     cost_estimate   = round((pvp / (1 + markup_pct))::numeric, 2),
     margin_pct_list = round(((markup_pct * 100) / (100 + markup_pct * 100))::numeric, 4),
     markup_pct      = markup_pct * 100
   WHERE tenant_id = '60105796-…' AND markup_pct < 10 AND markup_pct IS NOT NULL AND pvp IS NOT NULL;
   ```
   Result: 48 rows updated. `margin_pct_list` distribution went from **avg 0.010 / max 0.038** (degenerate) to **avg 0.644 / range 0.575-0.715** (healthy Zara fast-fashion).

2. **Re-executed the orchestrator** via [scripts/reexecute-strategy-run.ts](scripts/reexecute-strategy-run.ts) — resets run_status to `pending` and calls `executeAnalysisRun(runId)`. Completed in 1466ms; regenerated 48 sku_scores + 8 family_scores + 89 candidates + 3 scenarios.

3. **Re-verified the magnitude claims**.

| Metric | Pre-fix (corrupt) | Post-fix (correct) |
|---|---:|---:|
| SKUs with margin_score = 0 | 25 | **0** |
| SKUs with margin_score < 0.4 | 48 | **1** (= 0.345, borderline) |
| Min effective_margin | -€2.83/unit | **+€6.20/unit** |
| Max effective_margin | +€1.49/unit | **+€52.38/unit** |
| Avg effective_margin | -€0.94/unit | **+€19.92/unit** |
| SKUs with effective_margin < 0 (Area C.4 claim) | **14** | **0** |
| Annual "exposure" headline | -€1.07M on worst SKU | **N/A — claim was 100% data artifact** |

**Area C.4 magnitude is fully retracted**. The corrected effective_margin shows every SKU in the corpus is profitable per unit, even after returns + reverse logistics. The "14 SKUs / €1M+ annual exposure" claim came entirely from corrupt margin data.

**Structural findings still stand** (all from Area C, independent of data quality):

- **C.4 structural fix**: even with correct margins, the recommendation to add a margin-based kill gate orthogonal to lifecycle remains valid — but its triggering set in this corpus is now empty or near-empty rather than 12 SKUs. The kill gate is a safety net for SKUs that *do* go negative on real data; just no examples in this dogfood.
- **C.1**: `lifecycle = 'exit'` still never fires (0 SKU-scope kill candidates post-fix, same as pre-fix). Priority chain reordering still needed.
- **C.3**: 40% markdown cap, unchanged.
- **C.5**: 3 color-scope kill candidates remain orphaned (same 3 lineages; the lineage over-collapse from D.1 still applies).
- **C.6**: velocity_ratio explosions on new SKUs, unchanged.

**Side-effect on Area E.1**: with real margins, the Defend & Curate threshold `margin_score < 0.4` now fires on **1/48 SKUs** instead of 48/48. The archetype works as intended. The structural critique (binary threshold → proportional units downgrade) still stands but is no longer urgent.

**Side-effect on Area B (replenish)**: post-fix the engine surfaces **36 replenish candidates** instead of the prior smaller set. The B.4 double-count bug remains unverified-but-likely against the new candidate set; a fresh walkthrough of 5 SKUs is the right next step before shipping the B.4 fix.

**Audit conclusion update**: of the original P0 findings, **B.4** (double-count), **D.1** (lineage over-collapse), **A.2** (rationale bifurcation), and **H.1** (backtest needs 2nd-period data) are the remaining ship-blockers for a Mango pitch. C.4 as a magnitude story is gone; C.4 as a structural safety-net stays.

---
>
> **Audit window opened**: 2026-05-17

---

## Area A · `amplify_winner` — the most surfaced action, the most heuristic

The action surfaced on heroes. Four independent triggers, none empirically validated. Code: [src/lib/strategy/sku-verdict-resolver.ts:345-493](src/lib/strategy/sku-verdict-resolver.ts#L345-L493).

### A.0 · Tally across the 48-SKU dogfood corpus

After applying the `returns_pct > 0.35` hard block and all four triggers (`pdf_rank ≤ 10`, `velocity_rank ≤ 10`, `family_velocity_ratio ≥ 2.0`, `demand_score ≥ 0.7 AND sell_through_bought_pct ≥ 0.5`):

| Status | Count | % of corpus |
|---|---|---|
| `amplify_winner` fires | 16 | 33% |
| Returns-blocked (would have fired) | 3 | 6% |
| No trigger fires | 29 | 60% |

**The 16 firing SKUs**, with which triggers fired:

| pdf | vel | family | demand | st | ret | ratio | pdf_t | sb | rb | fb | n_trig |
|----:|----:|---|----:|----:|----:|----:|:---:|:---:|:---:|:---:|----:|
| 1 | 3 | FluidoLargo | 0.29 | 0.12 | 0.03 | 1.94 | ✓ | – | ✓ | – | 2 |
| 2 | 12 | FluidoCorto | 0.81 | 0.38 | 0.06 | 1.05 | ✓ | – | – | – | 1 |
| 3 | 2 | FluidoCorto | 1.00 | 0.51 | 0.11 | 1.76 | ✓ | ✓ | ✓ | – | 3 |
| 4 | 38 | FamiliasL | 1.00 | 0.45 | 0.00 | 1.85 | ✓ | – | – | – | 1 |
| 6 | 39 | FluidoFab | 0.77 | 0.07 | 0.00 | 0.28 | ✓ | – | – | – | 1 |
| 7 | 1 | FluidoLargo | 0.29 | 0.17 | 0.17 | 2.02 | ✓ | – | ✓ | ✓ | 3 |
| 8 | 41 | FamiliasL | 0.45 | 0.06 | 0.00 | 0.84 | ✓ | – | – | – | 1 |
| 9 | 40 | FluidoCorto | 0.30 | 0.07 | 0.00 | 0.18 | ✓ | – | – | – | 1 |
| 10 | 22 | CollDCort | 1.00 | 0.61 | 0.33 | 0.86 | ✓ | ✓ | – | – | 2 |
| 12 | 6 | FluidoFab | 0.56 | 0.46 | 0.16 | 2.04 | – | – | ✓ | ✓ | 2 |
| 15 | 7 | FluidoFab | 1.00 | 0.35 | 0.32 | 2.02 | – | – | ✓ | ✓ | 2 |
| 17 | 4 | FluidoLargo | 0.27 | 0.50 | 0.11 | 1.66 | – | – | ✓ | – | 1 |
| 20 | 9 | CollDCort | 0.44 | 0.34 | 0.13 | 1.38 | – | – | ✓ | – | 1 |
| 27 | 8 | FluidoLargo | 0.18 | 0.27 | 0.12 | 1.49 | – | – | ✓ | – | 1 |
| 40 | 10 | FluidoLargo | 0.14 | 0.18 | 0.13 | 1.22 | – | – | ✓ | – | 1 |
| 41 | 26 | SastreFab | 1.00 | 0.56 | 0.04 | 0.86 | – | ✓ | – | – | 1 |

**Per-trigger fire counts** (of the 16 firing SKUs):

| Trigger | Fires | % of firing SKUs | Unique catches (no other trigger fires) |
|---|---:|---:|---:|
| `pdf_top10` | 9 | 56% | 6 (SKUs 2, 4, 6, 8, 9) — *but see A.2: 3 of these are clearly NOT heroes* |
| `vel_rank ≤ 10` | 9 | 56% | 4 (SKUs 17, 20, 27, 40) |
| `family_ratio ≥ 2.0` | 3 | 19% | **0** (all 3 also fire vel_rank) |
| `scoreBased` | 3 | 19% | 1 (SKU 41) |

---

### A.1 · Are the four triggers orthogonal?

**Finding A.1.a (P1)** · `family_ratio ≥ 2.0` is **fully redundant with `vel_rank ≤ 10` in this corpus**. All 3 SKUs that fire family_ratio (7, 12, 15) also fire vel_rank. There is zero additional information added by `familyBased` here. Either:

- Raise the threshold to `≥ 3.0` so it fires only on extreme outliers (real "stands out within family" cases). At ≥ 3.0 in this corpus, **zero SKUs fire it** — the dogfood's tightest family-outlier is SKU 5 at 2.10. The signal would only fire on genuine 3× outliers, making it a sharp secondary signal.
- Or remove the trigger entirely and absorb the meaning into a `vel_rank ≤ 10 AND family_ratio ≥ 1.5` joint condition (which would never fire alone, only as a confidence booster).

**Code ref**: [sku-verdict-resolver.ts:382-383](src/lib/strategy/sku-verdict-resolver.ts#L382-L383).

**Finding A.1.b (P2)** · `pdf_top10` and `vel_rank ≤ 10` are NOT redundant — they catch overlapping but distinct cohorts (3 SKUs overlap, 12 are unique to one or the other). Conceptually they answer different questions:
- `pdf_top10` = "what does the buyer see first in the source PDF" (anchor view)
- `vel_rank ≤ 10` = "what's actually moving units across the run"

Keep both, but see A.2 — `pdf_top10` has a more serious empirical problem.

**Finding A.1.c (P2)** · `scoreBased` (demand ≥ 0.7 AND st ≥ 0.5) catches **one unique case in the corpus**: SKU 41 (Chaqueta color cinturón, pvp €69.95, demand=1.0, st=0.56, vel_rank=26, pdf=41). Without this trigger, a high-margin slow-but-healthy hero would be silently missed. Keep the trigger but tighten — see A.6 on confidence inflation.

---

### A.2 · Why pdf_rank ≤ 10? Falsifiable test against the corpus

**Finding A.2 (P0)** · **The assumption "PDF rank = revenue rank" is empirically false in this corpus.** This is a top-priority finding because it directly causes false-positive heroes.

Per [state_aimily-strategy-2026-05-17.md §10.4](.) the assumption is: *"we assume Zara orders RNK reports by revenue, but never verified."*

Verified now. Top 15 SKUs from the dogfood, ranked by pdf_rank, with their `importe_7d` (actual €revenue from `strategy_sales_windows.importe`):

| pdf | name | pvp | velocity_7d | importe_7d (€) | Hero? |
|----:|---|----:|----:|----:|:---:|
| 1 | ZW Grandad Collar 401 | 29.95 | 12,647 | 449,387 | ✅ |
| 2 | Vestido Midi Drapeado | 39.95 | 7,785 | 358,844 | ✅ |
| 3 | ZW Mandarin Fluid Blouse | 35.95 | 13,081 | 539,302 | ✅ |
| 4 | Cazadora Bordada | 79.95 | 3,006 | 254,320 | ✅ (high pvp save) |
| 5 | Camisa Pliegues Cintura | 29.95 | 10,612 | 407,499 | ✅ (but blocked by returns 0.38) |
| **6** | **ZW Halter Long Dress** | **39.95** | **1,436** | **65,300** | **❌ NOT A HERO** |
| 7 | ZW Grandad Collar 250 | 29.95 | 13,147 | 477,887 | ✅ |
| **8** | **Set_64 Camisa Japonesa** | **39.95** | **1,361** | **67,990** | **❌ NOT A HERO** |
| **9** | **ZW Stripes Shirt Contrast** | **39.95** | **1,372** | **63,642** | **❌ NOT A HERO** |
| 10 | DW Mid-Rise Tapered Stripe | 35.95 | 5,227 | 199,353 | ✅ |
| 11 | ZW Pink Poplin Midi | 49.95 | 1,311 | 78,992 | ❌ |
| 12 | Camisa Rayas Gabardina | 35.95 | 10,270 | 432,303 | ✅ (excluded — pdf > 10) |
| 14 | **Cropped Blazer M/Corta** | **59.95** | **7,923** | **584,275** | **✅ #1 BY REVENUE — excluded (pdf=14)** |
| 15 | ZW Falda Combinada Fluida | 39.95 | 10,196 | 514,066 | ✅ (excluded — pdf=15) |

Three false positives in pdf_top10 (SKUs 6, 8, 9) — revenue 60-68K € while genuine heroes outside top-10 do 430-585K €. The PDF ordering is **NOT** by revenue; the rank-by-importe positions would be: 14 (€584K), 3, 15, 7, 1, 12 — i.e., the highest-revenue SKU sits at pdf_rank=14 and would be MISSED by the current trigger.

**Likely cause**: the PDF appears grouped by `model_ref` lineage rather than ranked by revenue. Looking at model_ref of pdf=1, 7, 17, 22, 27, 40, 47: all share the prefix `4786 xxx xxx` — the system is reading the Zara RNK report as it was scanned/parsed (lineage groupings), not as a flat revenue ranking.

**Display order: keep as-is** (Felipe 2026-05-17). The PDF stays rendered in the order the source provides — Zara's RNK ordering reflects whatever signal Zara curates (merchandiser highlight, newness, lineage grouping), and the buyer's anchor view should preserve that. No toggle, no resort.

**Trigger: keep, but bifurcate the rationale** (Felipe 2026-05-17). `pdfTopN` continues to fire `amplify_winner` — Zara's positioning IS signal. What's wrong is the conflation: a SKU surfaced by Zara curation alone (low velocity, low sell-through, ~€60K revenue) should not be told "design 2-3 follow-ups for next season" with 80%+ confidence. The signal is real, but it's "Zara flagged this" not "this is selling like crazy".

**Recommended fix** (P0):

Detect **trigger composition** when assembling rationale and route to one of two prose branches:

- **Confirmed hero** — `pdfTopN` fires AND at least one of {`vel_rank ≤ 10`, `scoreBased`, `familyBased`} also fires. Current rationale stays: *"Hero confirmado: …. Diseñar 2-3 secuelas siguiendo este patrón."*
- **Zara-curation flag** — ONLY `pdfTopN` fires (no other corroborating signal). New rationale: *"Zara lo posicionó en top {pdf_rank} del RNK aunque las métricas del run (velocidad {velocity_7d} uds/7d · sell-through {sell_through}%) no lo confirman como hero por ventas. Revisar contexto: ¿newness, lanzamiento de cápsula, prioridad de merchandiser? Validar antes de pedir secuelas a diseño."*

Confidence in the Zara-curation case caps at 0.60 (vs 0.95 for confirmed). The buyer sees "investigar contexto · confianza 55%" instead of "hero · confianza 83%".

In the dogfood corpus, this re-routes **5 of the 16 amplify_winner fires** (SKUs 2, 4, 6, 8, 9 — all pdf-only triggers) into the curation-flag branch. The 11 multi-trigger fires keep the hero rationale.

**Code refs**:
- [sku-verdict-resolver.ts:413-432](src/lib/strategy/sku-verdict-resolver.ts#L413-L432) — bifurcate rationale composition
- [sku-verdict-resolver.ts:434-451](src/lib/strategy/sku-verdict-resolver.ts#L434-L451) — cap confidence at 0.60 when `pdfTopN` is the sole trigger
- Optionally a new `amplify_winner_variant: 'confirmed' | 'zara_flag'` field on the verdict item, for UI to colour-code differently (still bg-midnight for confirmed, perhaps bg-sea-foam for flag).

---

### A.3 · Family-ratio distribution

**Finding A.3 (P1)** · Histogram of `velocity_7d ÷ family_avg_velocity_7d` across all 48 SKUs:

| Bucket | Count | % |
|---|---:|---:|
| < 0.50 | 7 | 15% |
| 0.50–1.00 | 21 | 44% |
| 1.00–2.00 | 16 | 33% |
| ≥ 2.00 (current threshold) | 4 | 8% |
| ≥ 3.00 (proposed) | 0 | 0% |

The 4 SKUs ≥ 2.0 are SKU 5 (2.10), SKU 7 (2.02), SKU 12 (2.04), SKU 15 (2.02). The threshold is **tight, not loose** — opposite of what the audit-plan worried about. But as A.1.a shows, the trigger adds zero unique cases.

**Why the redundancy**: a SKU that's ≥ 2× its family average velocity is almost guaranteed to also be in the top-10 by velocity in a 48-SKU corpus where most families have 5-10 members. The two signals are mathematically correlated unless a family is small (3-4 SKUs) AND has an outlier.

**Recommended fix**: either delete the trigger, or repurpose it. Idea worth piloting with Felipe: replace standalone `family_ratio ≥ 2.0` trigger with a **confidence multiplier**: if a SKU already fires another trigger AND family_ratio ≥ 2.0, bump confidence by +0.05 (capped). This makes family-outlier a "this isn't a fluke" booster, not a primary detector.

**Code ref**: [sku-verdict-resolver.ts:382-383](src/lib/strategy/sku-verdict-resolver.ts#L382-L383).

---

### A.4 · Returns hard block at 0.35

**Finding A.4.a (P2)** · The 0.35 cap bites correctly. Returns distribution in the corpus:

| Returns bucket | SKUs | Of which would fire amplify_winner (no block) |
|---|---:|---:|
| 0% | 10 | 4 fire |
| 0–10% | 13 | 5 fire |
| 10–20% | 8 | 5 fire |
| 20–30% | 4 | 1 fires (SKU 10, 0.327 — *survives*) |
| 30–35% | 4 | 2 fire (SKUs 10 already counted? recount: SKU 15 0.321, SKU 22 0.335 not hero) |
| **>35% (blocked)** | **9** | **3** would fire (SKUs 5, 18, 48) |

Three blocked SKUs:
- **SKU 5** (returns=38.1%, st=44.2%, pdf=5, vel=5, ratio=2.10) — would fire 3 triggers. Block is **correct**: 38% returns on a fluid blouse means fit/quality problem, do NOT design follow-ups.
- **SKU 18** (returns=38.4%, demand=0.77, st=0.52) — would fire `scoreBased`. Block correct, this should land in `investigate`.
- **SKU 48** (returns=49.8%, demand=1.0, st=0.54) — would fire `scoreBased`. Block correct, returns at 50% is alarming.

The 0.35 threshold matches Felipe's "Zara winners can hover at 25-30% returns" framing well: the 30-35% bucket survives, the 35%+ bucket gets blocked. **Validated empirically for this corpus**.

**Finding A.4.b (P1)** · **The block is silent** — when fired, the SKU just doesn't get `amplify_winner`. The buyer never sees "we considered this a hero but suppressed because returns are 38%." For SKU 5 specifically — a 3-trigger candidate killed by the block — the buyer should be told: *"This looks like a hero by velocity and family fit, BUT returns are 38%. Review fit/quality before considering for next season."*

**Recommended fix**: when `appendAmplifyWinnerAction` blocks on returns, **append an `investigate` action with a hero-mention rationale** instead. That converts a silent skip into an actionable surface. Code site: [sku-verdict-resolver.ts:372](src/lib/strategy/sku-verdict-resolver.ts#L372).

**Finding A.4.c (P2)** · The block is binary (0.349 amplifies, 0.351 doesn't). Consider a **smoothed fall-off**: at returns ∈ [0.20, 0.35], multiply confidence by `(1 - (returns - 0.20) / 0.15)`. At 0.20 confidence unchanged; at 0.35 confidence × 0 → effectively blocked. Smoother, more buyer-like.

---

### A.5 · Rationale operationality — "diseñar 2-3 secuelas"

**Finding A.5 (P1)** · The rationale promises specificity it can't deliver. Walkthrough for SKU 7 (pdf=7, vel_rank=1, family_ratio=2.02, the cleanest hero in the corpus):

**Current rationale** (rendered from the code at [resolver.ts:432](src/lib/strategy/sku-verdict-resolver.ts#L432)):
> *"Hero confirmado: top 7 del RNK Zara · top 1 en velocidad del run · vende 2.0× la media de su familia W.A FLUIDOS LARGO - 1500. Más allá de mantenerlo, diseñar 2-3 secuelas siguiendo este patrón (silueta + material + paleta) captura esa demanda en próxima temporada."*

**Senior buyer's voice would say** (per audit-plan §5):
> *"ZW Grandad Collar es el #1 en velocidad de toda la temporada y el #2 también está en top 10. Confirmado: la silueta camisa-grandad-collar funciona en fluidos largos. Para SS27: 2-3 secuelas en esta silueta, ojo a las longitudes (la actual cubre cadera), explorar variantes de cuello (mandarín ya está validado por SKU #3). Probablemente en colores nuevos del moodboard (rojo cereza, beige) más que repetir 401/250."*

The current rationale tells the buyer to "design 2-3 follow-ups following this pattern" but **doesn't ground the pattern in observable features**:

| Element | What rationale says | What rationale needs |
|---|---|---|
| Silhouette | "siguiendo este patrón" (vague) | The actual silhouette descriptor from product_name + family_code |
| Material | "material" (placeholder) | Family code maps to fabric category — surface that |
| Palette | Brief colours appended (when present) | Filter the brief colours by whether they fit the family (no patent leather for fluidos) |
| Price point | Not mentioned | The SKU's pvp anchors the price slot; mention "mantener pvp ~€30 anchor" |
| Sibling hero context | Not mentioned | When multiple SKUs in same lineage are heroes, surface them ("la 250 también funciona") |

**Recommended fix**: change the rationale generator to take the FULL signal cluster (lineage siblings, family_code, pvp) and compose a contextual rationale, not a templated one. Two options:

- **Option A (P1, lighter)**: keep template but inject `product_name`, family_code in plain language, sibling SKU model_refs ("también en top 10: 4786 166 250"), and pvp anchor ("mantener €29.95 como precio ancla").
- **Option B (P2, heavier)**: route the hero detection through `narrative.ts` (Claude Sonnet 4.5) for the rationale ONLY. The detection stays deterministic; the *prose* gets composed by the LLM with the structured evidence as input. Stays in the audit-plan's anti-pattern boundary (LLM in narrative layer, not decision layer).

**Code ref**: [sku-verdict-resolver.ts:413-432](src/lib/strategy/sku-verdict-resolver.ts#L413-L432).

---

### A.6 · Confidence math — calibration check

**Finding A.6 (P1)** · `appendAmplifyWinnerAction` floors confidence at 0.70 and caps at 0.95. Effective range across the 16 firing SKUs:

| SKU | Triggers fired | confPdfRank | confVelRank | confScore | confFamily | Final |
|----:|---|----:|----:|----:|----:|----:|
| 1 | pdf+vel | 0.93 | 0.86 | – | – | **0.93** |
| 2 | pdf | 0.91 | – | – | – | **0.91** |
| 3 | pdf+sb+vel | 0.89 | 0.88 | 0.85 | – | **0.89** |
| 4 | pdf | 0.87 | – | – | – | **0.87** |
| 6 | pdf | 0.83 | – | – | – | **0.83** ← *not a hero* |
| 7 | pdf+vel+fam | 0.81 | 0.90 | – | 0.702 | **0.90** |
| 8 | pdf | 0.79 | – | – | – | **0.79** ← *not a hero* |
| 9 | pdf | 0.77 | – | – | – | **0.77** ← *not a hero* |
| 10 | pdf+sb | 0.75 | – | 0.85 | – | **0.85** |
| 12 | vel+fam | – | 0.80 | – | 0.704 | **0.80** |
| 15 | vel+fam | – | 0.78 | – | 0.702 | **0.78** |
| 17 | vel | – | 0.84 | – | – | **0.84** |
| 20 | vel | – | 0.74 | – | – | **0.74** (floored to 0.70 doesn't apply — 0.74 > 0.70) |
| 27 | vel | – | 0.76 | – | – | **0.76** |
| 40 | vel | – | 0.72 | – | – | **0.72** |
| 41 | sb | – | – | 0.85 | – | **0.85** |

Floor 0.70, cap 0.95. Effective range: 0.72-0.93.

Problems:

1. **Floor inflates non-heroes**. SKU 6, 8, 9 — three SKUs that A.2 establishes are NOT heroes by any measure — read 77-83% confidence. The buyer sees "Hero confirmado · confianza 83%" and trusts the system.
2. **The floor 0.70 hides weak signals**. SKU 40 by trigger formula reads 0.72 — barely above the floor. If we removed the floor it'd read 0.72 anyway, but other SKUs with weak signals would drop into 0.5-0.6 range, surfacing "confidence: medium" rather than fake-high.
3. **Score-based confidence is fixed at 0.85** regardless of how strong the signal is. A SKU with demand=0.71 (just over threshold) and st=0.51 reads the same confidence as demand=1.0 and st=0.95. Calibration miss.

**Recommended fix** (composite):

- **Remove the 0.70 floor.** Let weak single-trigger fires read 0.55-0.65 honestly.
- **Make scoreBased proportional**: `confScore = 0.7 + 0.25 × (demand_score - 0.7)/0.3 × (sell_through - 0.5)/0.5` so demand=0.71/st=0.51 reads ~0.7 and demand=1.0/st=1.0 reads ~0.95.
- **Pair this with the A.2 fix**: once `pdfTopN` is replaced by `revenue_rank ≤ 8`, the SKUs 6/8/9 false-positives disappear and the remaining cohort is actually high-confidence — at which point the math reads correctly.

**Code ref**: [sku-verdict-resolver.ts:434-451](src/lib/strategy/sku-verdict-resolver.ts#L434-L451).

---

### Area A summary — prioritised findings

| ID | Priority | Finding | Code ref |
|---|:---:|---|---|
| A.2 | **P0** | `pdf_rank` ≠ revenue rank empirically. Keep trigger (Felipe call) but **bifurcate rationale**: confirmed-hero prose only when ≥2 triggers fire; Zara-curation-flag prose + confidence cap 0.60 when `pdfTopN` is the sole signal. Re-routes 5/16 fires in dogfood. | [resolver.ts:413-451](src/lib/strategy/sku-verdict-resolver.ts#L413-L451) |
| A.4.b | P1 | Returns block fires silently. When blocked, append `investigate` with hero-context rationale instead. | [resolver.ts:372](src/lib/strategy/sku-verdict-resolver.ts#L372) |
| A.5 | P1 | Rationale "diseñar 2-3 secuelas" lacks operational anchors (silhouette, sibling SKUs, pvp). Inject contextual fields. | [resolver.ts:413-432](src/lib/strategy/sku-verdict-resolver.ts#L413-L432) |
| A.6 | P1 | Floor 0.70 inflates confidence on weak single-trigger fires. Remove floor + make scoreBased proportional. | [resolver.ts:434-451](src/lib/strategy/sku-verdict-resolver.ts#L434-L451) |
| A.1.a | P1 | `family_ratio ≥ 2.0` adds zero unique catches. Raise to ≥ 3.0 OR repurpose as confidence multiplier. | [resolver.ts:382-383](src/lib/strategy/sku-verdict-resolver.ts#L382-L383) |
| A.4.c | P2 | Returns block is binary — consider smoothed fall-off in [0.20, 0.35]. | [resolver.ts:372](src/lib/strategy/sku-verdict-resolver.ts#L372) |
| A.1.b | P2 | Keep `pdf_top10` and `vel_rank ≤ 10` both — different cohorts. (After A.2 fix, `pdf_top10` becomes `revenue_rank ≤ 8`.) | – |
| A.1.c | P2 | `scoreBased` catches one unique SKU (high-pvp slow-mover). Keep but tighten via A.6. | [resolver.ts:377-379](src/lib/strategy/sku-verdict-resolver.ts#L377-L379) |

**One open question for Felipe before A.2 fix**: the current UI surfaces the PDF in original order (buyer's anchor view). If we drop `pdf_rank` as a trigger but keep it as the display order, we get a clean separation. But Felipe in state doc § 7 wrote "PDF rank > velocity rank as the canonical hero trigger" — that intuition needs revisiting given the empirical data.

---

## Area B · `replenish` formula — the most numerically consequential

The action with the highest dollar impact: a single replenish recommendation might trigger a €100K+ buy order. Code: [src/lib/strategy/sku-verdict-resolver.ts:138-177](src/lib/strategy/sku-verdict-resolver.ts#L138-L177) (`computeReplenishUnits`).

Current formula:
```
velocity_per_day = velocity_d1 (if > 0) || velocity_7d / 7
target_units     = velocity_per_day × target_rotation_days     (default rotation = 4 days)
currentStock     = stock_total + pipeline_total                (stock_total = stock_store + stock_warehouse)
gap              = max(0, round(target_units − currentStock))
```

---

### B.4 · `pipeline_total` semantics — **CRITICAL: double-count bug**

**Finding B.4 (P0 BUG, ship-blocker)** · The formula double-counts `stock_store + stock_warehouse`.

Verified directly against the dogfood corpus. For every one of the 48 SKUs in run `0c2ed3e9`:

```
pipeline_total = stock_store + stock_warehouse + stock_in_transit + stock_pending
```

48/48 SKUs match this identity exactly, delta = 0 (verified via SQL aggregate). This is also visible in the parser's own example output at [src/lib/strategy/parsers/zara-rnk-pdf.ts:53-66](src/lib/strategy/parsers/zara-rnk-pdf.ts#L53-L66): for SKU `4786 166 401` the values 12866 + 10157 + 4073 + 65647 = 92743 = `pipeline_total`.

Implication: in `computeReplenishUnits` at [resolver.ts:169](src/lib/strategy/sku-verdict-resolver.ts#L169):

```ts
const currentStock = (input.stock_total ?? 0) + (input.pipeline_total ?? 0);
// stock_total = stock_store + stock_warehouse
// pipeline_total ALREADY includes stock_store + stock_warehouse + in_transit + pending
// → currentStock double-counts (stock_store + stock_warehouse)
```

**Impact in the dogfood corpus**: at default rotation = 4 days, the bug **silently suppresses real replenish recommendations**. The buggy `currentStock` inflates available inventory by 20-50% (the duplicated store+warehouse units). For most SKUs the inflation doesn't change the gap=0 verdict (Zara generally has huge pipelines), but for at least one SKU it does:

| SKU 41 — Chaqueta Color Cinturón (pdf_rank=41) |  |
|---|---|
| velocity_d1 | 909 units/day |
| stock_store + warehouse + in_transit + pending = pipeline_total | 3,408 |
| target_units (4d × 909) | 3,636 |
| **Current (buggy)** | currentStock = 3,039 + 3,408 = 6,447 → gap = **0** (no replenish) |
| **Fixed** | currentStock = 3,408 → gap = **228 units** to replenish |
| Stock days (buggy → fixed) | 7.1d → **3.7d** (below 4d target) |
| Sell-through / lifecycle | 56% / ramp (high-margin hero, pvp €69.95) |
| Demand score | 1.00 |

This is exactly the SKU a senior buyer would replenish first: a high-margin (€69.95) ramping hero with 56% sell-through and 3.7 days of stock. The bug makes the system tell them "no need". **Real financial exposure**: under-buying €69.95 × 228 units × margin ≈ €10K opportunity loss on a single SKU, repeated across every borderline-stock SKU the system runs.

**Fix**: one-line change at [resolver.ts:169](src/lib/strategy/sku-verdict-resolver.ts#L169):

```diff
- const currentStock = (input.stock_total ?? 0) + (input.pipeline_total ?? 0);
+ const currentStock = input.pipeline_total ?? input.stock_total ?? 0;
```

Use `pipeline_total` as the canonical "total commitment" when present; fall back to `stock_total` only when pipeline is missing. Also drop the redundant `stock_total` from `SkuVerdictInput` (set in [route.ts:328-336](src/app/api/strategy/runs/[runId]/skus/route.ts#L328-L336)) since pipeline already contains it.

**Knock-on**: the SAME math fed into `recommend.ts` at [recommend.ts:219](src/lib/strategy/recommend.ts#L219) uses ONLY `pipeline_total` (no double-count) but with a different rotation reference (`velocity_7d × 4`, i.e., 4 weeks of weekly velocity ≈ 28 days of daily). Two engines, two formulas — see B.7 below for the inconsistency.

**Add a unit-test guard** so this doesn't regress: assert `currentStock === pipeline_total` on a fixture row matching the parser's own example.

---

### B.1 · Walk through 5 replenish examples vs senior-buyer gut

Applied both the buggy and fixed formulas to 5 representative SKUs from the dogfood. "Senior buyer" column is the verdict a 15-year merch director would give from the numbers alone.

| pdf | model_ref | name | v_d1 | v_7d | pipeline_fixed | target_4d | buggy gap | fixed gap | buyer says |
|----:|---|---|----:|----:|----:|----:|----:|----:|---|
| **1** | 4786 166 401 | Grandad Collar 401 | 2,801 | 12,647 | 92,743 | 11,204 | 0 | 0 | "33d stock, plus 65K pending arriving 5 weeks out — no replenish, but expect a *resize-down* signal next." ✅ |
| **17** | 4786 96 730 | Fluid Polo 730 | 1,236 | 10,823 | 11,752 | 4,944 | 0 | 0 | "9.5d stock on a hero — tight without lead-time data. **Need lead-time gate (B.5)** before signing off." ⚠️ |
| **41** | 2797 538 632 | Chaqueta Color Cinturón | 909 | 4,468 | 3,408 | 3,636 | **0** | **228** | "Hero, high pvp, 3.7d stock — yes, replenish 228 units to hit 4d." **Buggy formula WRONG.** ❌ |
| **13** | 4786 30 620 | SET_173 Linen Shirt | 3 | 1,216 | 59,178 | 12 | 0 | 0 | "v_d1=3 is obviously a measurement artifact — Monday/early-week. Real velocity ≈ 174/day. **Stock would last 340d**, not 19,726d. No replenish either way." Formula-correct verdict, **absurd intermediate math (B.2)**. ⚠️ |
| **10** | 9632 74 715 | DW Mid-Rise Tapered Stripe | 2,009 | 5,227 | 18,992 | 8,036 | 0 | 0 | "Peak hero, sell-through 61%, 9.5d stock. Stockout-risk=1.0. Without lead-time I can't sign off — prepare replenish quote." ⚠️ |

**Verdict on B.1**: of 5 walkthroughs, system matches senior buyer on **1 cleanly (SKU 1)**, **disagrees by formula bug on 1 (SKU 41)**, and **lacks data to converge on 3 (SKU 17/10 need lead-time, SKU 13 has unstable velocity signal)**. The two-out-of-five firm answers is not good enough for a Mango pitch.

---

### B.2 · `velocity_d1` vs `velocity_7d / 7` stability

**Finding B.2 (P1)** · The current preference (`v_d1` if > 0, else `v_7d / 7`) overweights a single day. In the dogfood corpus 4 of 48 SKUs show extreme `v_d1` outliers:

| SKU | v_d1 | v_7d | v_d1 × 7 | v_7d / 7 | Ratio (v_d1 × 7 ÷ v_7d) | Verdict |
|----:|----:|----:|----:|----:|---:|---|
| 1 | 2,801 | 12,647 | 19,607 | 1,807 | 1.55× | v_d1 OVERSHOOTS by 55% |
| 3 | 1,216 | 13,081 | 8,512 | 1,869 | 0.65× | v_d1 UNDERSHOOTS by 35% |
| **13** | **3** | **1,216** | **21** | **174** | **0.02×** | **v_d1 is essentially noise** |
| **23** | **1** | **1,089** | **7** | **156** | **0.01×** | **v_d1 is essentially noise** |
| 27 | 1,091 | 9,712 | 7,637 | 1,387 | 0.79× | v_d1 UNDERSHOOTS by 21% |

For SKUs 13 and 23, the buggy/fixed formula computes `current_stock_days` of **19,726d and 32,178d** respectively — visible in the buyer's drawer right now. Those numbers will erode buyer trust on the first walkthrough. *(A buyer who sees "26,040 days of stock" thinks "this system doesn't know what it's looking at" and stops trusting the recommendations.)*

**Recommended fix**:

```ts
// Use the 7-day average as the stable signal. Fall back to v_d1 only if 7d is missing.
// v_d1 alone is too volatile (Mondays vs Saturdays vary ±50% on Zara reports).
const velocityPerDay =
  input.velocity_7d != null && input.velocity_7d > 0
    ? input.velocity_7d / 7
    : input.velocity_d1 != null && input.velocity_d1 > 0
    ? input.velocity_d1
    : null;
```

**Why prefer 7-day**: it's literally a 7-day rolling sum, which is the most stable rate signal available in Zara RNK. `v_d1` is "yesterday only" and inherits whatever idiosyncrasy yesterday had (Monday is ~70% of Saturday in fashion retail). For a 4-day rotation target, "yesterday vs 7-day-avg" has enormous downstream impact.

**Alternative (for Felipe's review)**: a weighted blend `0.3 × v_d1 + 0.7 × (v_7d / 7)` would respect recency without putting noise as the dominant signal. But this adds tunability nobody asked for. Default to clean 7-day-avg unless Felipe wants the recency-weighted variant.

**Code ref**: [sku-verdict-resolver.ts:160-165](src/lib/strategy/sku-verdict-resolver.ts#L160-L165).

---

### B.3 · Rotation = 4 days hard-coded

**Finding B.3 (P1)** · The `DEFAULT_TARGET_ROTATION_DAYS = 4` constant ([resolver.ts:110](src/lib/strategy/sku-verdict-resolver.ts#L110)) is defensible for fast-fashion (Zara average rotation: 3-4 days for tops/blouses). It is **systematically wrong for slower categories**.

Examples in the dogfood corpus where 4d rotation produces buyer-incoherent verdicts:

| SKU | Category | pvp | v_d1 | stock_days (fixed) | What 4d rotation says | Senior buyer says |
|----:|---|---:|---:|---:|---|---|
| 4 | CAZADORA BORDADA (heavy outerwear) | €79.95 | 213 | 20.7d | "Stock at 5× rotation target" (no replenish) | "20d for an embroidered jacket is healthy — outerwear rotates 10-14d at this pvp." Implicit agreement, but the framing is wrong: the system thinks 20d is excessive; the buyer thinks it's normal. |
| 26 | BOMBER JACKET (decay lifecycle) | €59.95 | 108 | 416d | "Stock at 100× rotation" | "Yes, decaying — but rotation target for jackets late in lifecycle is 21d, not 4d. The signal is 'mark down', not 'oversupply 100×'." |
| 14 | CROPPED BLAZER (mature) | €59.95 | 1,312 | 47d | "Stock at 12× rotation" | "47d on a peaking blazer is fine. Tailoring rotates slower than fluidos." |

The fast-fashion 4d default makes the system **scream over-stock signals** on slow-moving high-margin items where the buyer would calmly say "yes, that's the right depth".

**Recommended fix** (range from light to heavy):

- **Light (ship now)**: surface `target_rotation_days` in the buyer's UI as an editable knob per SKU. The state doc § 7 already mentions this exists per-action in the data structure but no UI exposes it.
- **Medium (1 sprint)**: per-family-code defaults. The classifiers/index.ts taxonomies map already has `family_code`. Add a small lookup:
  ```
  W.A FLUIDOS *          → 4d  (fluid tops/shirts/dresses)
  W.A.SASTRE *           → 10d (tailoring)
  W.E FAMILIAS *         → 14d (capsule families)
  W.COLL D *             → 7d  (denim collection)
  default                → 4d
  ```
- **Heavy (later)**: lifecycle-aware rotation. `new/ramp` = 4-6d (aggressive replenish), `peak/mature` = 8-14d, `decay/exit` = no replenish trigger at all.

For the Mango pitch, the **medium** option is the right level. Mango's category mix is broader than Zara's (tailoring share is higher), and a single 4-day rotation will misfire ~25% of recommendations.

**Code ref**: [sku-verdict-resolver.ts:110](src/lib/strategy/sku-verdict-resolver.ts#L110).

---

### B.5 · No lead-time math

**Finding B.5 (P1)** · `supplier_lead_time_days` is in the schema ([strategy_product_facts](.) column), but **all 48 SKUs in the dogfood corpus have it set to null**. The parser doesn't populate it (Zara RNK report doesn't include supplier lead times). And the resolver never reads it.

Without lead-time, the formula's "buy enough to reach 4-day rotation" is incomplete:

- A SKU with 9.5d stock + 2d lead time → SAFE, no replenish.
- A SKU with 9.5d stock + 21d lead time → ALARMING, replenish urgently or face stockout.

Both render identically in the current system (no replenish).

**Two-part fix**:

1. **Where to get lead-time data**: Zara RNK doesn't have it. For Mango (named pilot target) it would come from the supplier master / PO history. Decide architecture:
   - Option A: a separate "lead times by supplier" CSV upload, joined by `supplier_id` (which Zara also doesn't expose).
   - Option B: a single `default_lead_time_days` parameter on the `strategy_constraints` row (already exists in `strategy_analysis_runs.default_lead_time_days` — verify it's wired through).
   - Option C: per-family default (similar to B.3).
   - **Recommended**: B for v1 (single knob), then refine to A or C with Mango's actual data.

2. **What the math becomes**:
   ```
   coverage_target_days = target_rotation_days + lead_time_days_buffer
   target_units = velocity_per_day × coverage_target_days
   gap = max(0, target_units − pipeline_total)
   ```
   With `lead_time_days_buffer = 14` (a common Mango fashion lead), SKU 17 (9.5d stock, hero) flips from "no replenish" to "buy enough to bridge 18d → ~10,500 units after pipeline" — which is what a senior buyer would do.

**Already-half-there**: `strategy_analysis_runs.default_lead_time_days` exists ([schema confirmed](.) — `integer` column). Check whether the SKU verdict pipeline reads it. If yes: wire to `coverage_target_days`. If no: that's a 2-line change to plumb through.

**Code ref**: [sku-verdict-resolver.ts:158-176](src/lib/strategy/sku-verdict-resolver.ts#L158-L176) (add `leadTimeDays` parameter) and [route.ts](src/app/api/strategy/runs/[runId]/skus/route.ts) (read from run's `default_lead_time_days`).

---

### B.6 · Observed vs stockout-adjusted velocity

**Finding B.6 (P1)** · Classifier 4 ("stockout-aware velocity") in [classifiers/index.ts](src/lib/strategy/classifiers/index.ts) backs out "velocity if stock had been available" from observed velocity + stockout patterns. The replenish formula uses **raw observed velocity** — not the stockout-adjusted version.

Concrete case from the corpus — **SKU 5 (Camisa Pliegues Cintura)**:
- velocity_7d = 10,612 (observed)
- stockout_risk_score = 1.00 (signals "this is depleting hard")
- returns_pct = 38% (blocked from amplify_winner)
- stores_with_stock = 1,317 (very wide distribution)

If the SKU stocked out across 30% of its stores by day 4 of the 7-day window, observed velocity is depressed: the true demand-IF-stocked would be ~14-15K units/7d, not 10,612. The replenish formula using observed velocity would buy enough for 10.6K/week; using stockout-adjusted would buy ~40% more.

**This is a Mango-pitch-critical signal** — being able to say "you would have sold X more units if you hadn't run out" is exactly the forensic value prop. Currently we COMPUTE this in the classifier but DON'T USE it in the buy quantity.

**Recommended fix**: pass `velocity_stockout_adjusted_7d` from `classifier_traces` (already stored in `strategy_sku_scores.classifier_traces`) into `computeReplenishUnits` as the preferred signal, falling back to raw velocity when not available.

**Code ref**: [sku-verdict-resolver.ts:160-165](src/lib/strategy/sku-verdict-resolver.ts#L160-L165) — extend velocity selection logic.

---

### B.7 · Two engines, two formulas (not in the audit-plan but found while reading)

**Finding B.7 (P1)** · The resolver and `recommend.ts` use **different replenish math**:

| Path | Formula | Rotation reference |
|---|---|---|
| `resolver.ts:170-171` | `velocity_per_day × 4 days` | 4 daily-velocity units |
| `recommend.ts:219` | `velocity_7d × 4` (weekly velocity × 4) | = ~28 daily-velocity units |

The resolver's `target_units` is roughly **7× smaller** than `recommend.ts`'s. Two engines, two answers, no reconciliation. This works in practice because the resolver's `recommended_units` overrides the candidate's `required_units` for the UI, but it's a maintenance trap.

**Recommended fix**: delete the duplicate calc in `recommend.ts:219` and have the candidate emit just a flag (`needs_replenish: true`) — let the resolver compute units centrally with the correct formula (after B.4 fix). Cleaner, no drift risk.

**Code ref**: [recommend.ts:219](src/lib/strategy/recommend.ts#L219).

---

### Area B summary — prioritised findings

| ID | Priority | Finding | Code ref |
|---|:---:|---|---|
| **B.4** | **P0 BUG** | Double-count of `stock_store + stock_warehouse`. `pipeline_total` already includes them (48/48 corpus match). At least 1 dogfood SKU (#41) currently mis-classified as no-replenish. **Ship-blocker for Mango pitch.** | [resolver.ts:169](src/lib/strategy/sku-verdict-resolver.ts#L169) |
| **B.5** | P0/P1 | No lead-time math. Hero SKUs with 9d stock + 14d lead time are silently un-actioned. Wire `strategy_analysis_runs.default_lead_time_days` into `coverage_target_days`. | [resolver.ts:158-176](src/lib/strategy/sku-verdict-resolver.ts#L158-L176) |
| **B.2** | P1 | `v_d1` preferred over `v_7d / 7` makes math absurd for low-activity days (SKU 13 → "19,726 days of stock"). Default to `v_7d / 7`. | [resolver.ts:160-165](src/lib/strategy/sku-verdict-resolver.ts#L160-L165) |
| B.6 | P1 | Replenish uses observed velocity, not stockout-adjusted. Under-buys heroes that ran out. **Forensic-pitch-critical**. | [resolver.ts:160-165](src/lib/strategy/sku-verdict-resolver.ts#L160-L165) |
| B.3 | P1 | 4d rotation hard-coded → wrong for tailoring/outerwear/decay. Add family-code rotation lookup. | [resolver.ts:110](src/lib/strategy/sku-verdict-resolver.ts#L110) |
| B.7 | P1 | Resolver and `recommend.ts` use different replenish formulas (7× apart). Delete the duplicate in recommend.ts. | [recommend.ts:219](src/lib/strategy/recommend.ts#L219) |
| B.1 | P2 | Walkthrough: system matches senior buyer on 1/5 cleanly. Will resolve when B.4/B.5/B.2 land. | – |

**Critical sequence for the next implementation sprint**:

1. B.4 first (one-line bug fix + unit test guard). Re-run the corpus, see how many more replenish actions surface.
2. B.2 second (also one-line, kills the absurd numbers users would see in the drawer).
3. B.5 third (architecture call: where does lead-time come from for the pilot).
4. B.6 fourth (data plumb-through from classifier traces).
5. B.3 last (medium-size — per-family rotation).

After B.4 + B.2 alone, the resolver becomes presentable to a buyer. The rest sharpens it.

---

## Area C · `kill` and `markdown_accelerate` — the destructive actions

The actions with the highest reputational risk if wrong, and the highest financial value if right. Code: candidate generators in [src/lib/strategy/recommend.ts:160-208](src/lib/strategy/recommend.ts#L160-L208) (kill + markdown_accelerate) and [src/lib/strategy/classifiers/index.ts:419-509](src/lib/strategy/classifiers/index.ts#L419-L509) (lifecycle + markdown_risk_score).

### C.0 · What fires (and doesn't) in the dogfood corpus

| Action | SKU candidates | Color candidates | Confidence avg |
|---|---:|---:|---:|
| `kill` | **0** | **3** | 0.70 |
| `markdown_accelerate` | **2** | 0 | 0.86 |
| `resize_down` | 6 | 0 | 0.43 |
| `investigate` | 16 | 0 | 0.41 |

**Lifecycle distribution across the 48 SKUs**:

| Lifecycle | Count |
|---|---:|
| new | 18 |
| ramp | 18 |
| mature | 4 |
| peak | 1 |
| decay | 2 |
| **exit** | **0** |
| insufficient_evidence | 5 |

Zero SKU-scope `kill` candidates fire because `lifecycle_stage === 'exit'` never matches in this corpus. The two `decay` SKUs (#15, #26) drive both markdown_accelerate fires.

---

### C.4 / C.1 · **The big one: 14 SKUs with negative effective margin, only 2 get a destructive action**

**Finding C.4 (P0)** · This is the most damaging finding so far in business terms. From the corpus, **14 of 48 SKUs (29%) have `effective_margin < 0`** — after returns + reverse logistics, the brand LOSES money on each unit sold. Of those 14:

- **2 receive `markdown_accelerate`** (the 2 decay SKUs)
- **12 receive NO destructive action** — most route to `investigate` at best

Listed in priority order (most damaging first):

| pdf | name | pvp | returns | ST | v_7d | lifecycle | **eff_margin** | Current verdict | Senior buyer |
|----:|---|----:|----:|----:|----:|---|----:|---|---|
| 37 | DW Refined Wide Leg | €29.95 | **51%** | 41% | 7,239 | ramp | **−2.83** | (investigate) | **KILL + markdown current stock + DO NOT re-buy** |
| 45 | TRAJE_104 Pantalón Tiro Alto | €39.95 | **49%** | 56% | 6,770 | mature | **−2.56** | (investigate) | **KILL** |
| 48 | ZW High Rise Tapered | €39.95 | **50%** | 54% | 5,737 | mature | **−2.56** | (investigate) | **KILL** |
| 43 | DW Ankle Relaxed 250 | €29.95 | **43%** | 31% | 3,995 | ramp | **−2.29** | (investigate) | **KILL** |
| 16 | DW Ankle Relaxed 427 | €29.95 | **43%** | 55% | 4,461 | mature | **−2.25** | (investigate) | **KILL** |
| 47 | ZW Knotted Collar | €29.95 | **42%** | 32% | 5,226 | ramp | **−2.21** | (investigate) | **KILL** |
| 5 | Camisa Pliegues Cintura | €29.95 | **38%** | 44% | 10,612 | ramp | **−1.94** | (investigate) | **KILL** |
| 18 | ZW Ankle Relaxed Straight | €35.95 | **38%** | 52% | 7,471 | ramp | **−1.91** | (investigate) | **KILL** |
| 38 | Camisa Romantica | €29.95 | **35%** | 32% | 1,107 | ramp | **−1.79** | (investigate) | KILL |
| 22 | SET_173 Linen Shirt 250 | €29.95 | **34%** | 49% | 7,037 | insufficient_evidence | **−1.71** | (investigate) | KILL |
| 10 | DW Mid Rise Tapered Stripe | €35.95 | **33%** | 61% | 5,227 | peak | **−1.54** | (investigate) | markdown + kill |
| 14 | Cropped Blazer M/Corta | €59.95 | **32%** | 49% | 7,923 | mature | **−1.07** | (investigate) | markdown + likely kill |
| **15** | **ZW Falda Combinada Fluida** | **€39.95** | **32%** | **35%** | **10,196** | **decay** | **−1.49** | **markdown ✓** | markdown ✓ + kill next |
| **26** | **Bomber Jacket** | **€59.95** | **16%** | **18%** | **3,957** | **decay** | **−0.21** | **markdown ✓** | markdown ✓ |

**Annual loss exposure on a single SKU**: SKU 37 (DW Refined Wide Leg) at −€2.83/unit × 7,239 units/week × 52 weeks ≈ **−€1.07M/year if continued at this velocity**. The system currently silently routes this to `investigate` and tells the buyer to "review fit before reordering". That is not enough.

**Why the misses happen** — five overlapping causes inside `lifecycle_stage` classifier ([classifiers/index.ts:419-457](src/lib/strategy/classifiers/index.ts#L419-L457)):

1. **Priority ordering preempts `exit`.** A SKU with low ST and negative margin but ≥60 days in store hits `mature` first and stops. SKUs 14, 16, 27, 45, 48 are all classified `mature` — `exit` is never even evaluated.
2. **`exit` requires `velocity_ratio < 1`** (week-on-week declining). For ramping-but-bleeding SKUs (37, 43, 47), velocity_ratio is > 1 (still growing) so `exit` is never possible — even though the unit economics are catastrophic.
3. **`exit` requires `ST < 0.2`** (very low sell-through). For high-velocity / high-returns SKUs (10, 16, 18, 48 — ST ≥ 0.5), this gate never opens.
4. **`insufficient_evidence` blocks too** (SKU 22). When velocity_8_14d is 0 or missing, the lifecycle defaults to "no signal" → no kill possible.
5. **`markdown_risk_score = 0` unless lifecycle ∈ {decay, exit}** ([classifiers/index.ts:500-509](src/lib/strategy/classifiers/index.ts#L500-L509)). Even if a mature/peak SKU has 80 stock days + bleeding margin, `markdown_accelerate` won't fire because the markdown_risk_score is forcibly zeroed.

**Recommended fix** (P0, three-part):

1. **Add an `effective_margin` kill gate**, orthogonal to lifecycle:
   ```ts
   // In recommend.ts, alongside the lifecycle='exit' kill candidate:
   if ((score.effective_margin ?? 1) < 0 && (input.returns_pct ?? 0) >= 0.30) {
     // Bleeding-returns kill: unit economics are negative AND fit is the cause
     out.push({ action_type: 'kill', confidence_action: 0.85, ... });
   }
   ```
   Rationale text changes from "exit lifecycle" framing to: *"Unit economics negativas: cada unidad enviada pierde €X tras devoluciones del Y%. Liquidar stock actual via markdown + NO incluir en compra de próxima temporada. Revisar fit/calidad si se considera relanzar."*

2. **Decouple `markdown_risk_score` from lifecycle**. Compute it for ANY SKU whose stockDays ≥ 60 and effective_margin ≤ 0.10 (low margin AND oversupplied). The current gating to `decay/exit` only is what makes the 12 mature/ramp/peak unit-loss SKUs invisible.

3. **Allow `kill` and `markdown_accelerate` to STACK**. A SKU like 37 needs both: *kill the SKU from next season's buy* + *markdown the current stock*. Currently they're mutually exclusive because they require different lifecycles.

**Code refs**: [recommend.ts:160-208](src/lib/strategy/recommend.ts#L160-L208) (add margin kill candidate), [classifiers/index.ts:500-509](src/lib/strategy/classifiers/index.ts#L500-L509) (decouple markdown_risk from lifecycle).

---

### C.1 · `kill` lifecycle definition

**Finding C.1 (P1)** · Even after C.4 adds a margin-based kill, the original lifecycle='exit' criteria has structural problems. From [classifiers/index.ts:451-456](src/lib/strategy/classifiers/index.ts#L451-L456):

```ts
} else if (
  (input.sell_through_bought_pct ?? 0) < ctx.thresholds.dog_sell_through_bought_p_max && // < 0.2
  velocityRatio != null &&
  velocityRatio < 1
) {
  lifecycle = 'exit';
}
```

The audit-plan question: *"if it's 'days_in_store > 90 AND velocity_ratio < threshold', we may be killing late-season classics that always have low ratios"*. The actual implementation is gentler — requires BOTH ST < 0.2 AND declining velocity — so it doesn't false-positive on classics. But it's so restrictive that no SKU in the dogfood ever reaches it.

**Recommended fix**:

- **Move `exit` evaluation BEFORE `mature` and `peak`** in the priority chain. If a SKU has terrible ST and declining velocity, that signal should win regardless of age.
- **Allow `exit` to fire on `velocity_ratio = null`** when sell-through is catastrophic (< 0.05). A SKU with no week-on-week comparison + 3% ST = clearly DOA, should be considered for kill, not silently dropped to `new` or `insufficient_evidence`.

**Code ref**: [classifiers/index.ts:419-457](src/lib/strategy/classifiers/index.ts#L419-L457) (reorder the if/else chain).

---

### C.2 · `markdown_accelerate` two-gate strictness

**Finding C.2 (P1)** · `markdown_accelerate` requires BOTH `lifecycle === 'decay'` AND `markdown_risk_score > 0.4`. From the corpus:

- Only 2 SKUs are `decay` → only 2 markdowns can ever fire.
- 12 unit-loss SKUs sit in mature/ramp/peak → invisible to markdown.

The fix is subsumed by C.4 (decoupling markdown_risk from lifecycle). When markdown_risk computes for any oversupplied SKU regardless of lifecycle, the corpus's 12 negative-margin SKUs would join the action. Re-running the formula with `lifecycle != 'new'` and `effective_margin < 0` AND `stockDays ≥ 60` produces markdown candidates for: SKUs 5, 10, 14, 15, 16, 18, 22, 26, 37, 43, 45, 47, 48 — **13 markdowns instead of 2**.

**Recommended fix**: see C.4 part 2.

---

### C.3 · Markdown magnitude cap at 40%

**Finding C.3 (P2)** · `proposed_magnitude.discount_pct = Math.min(0.4, markdown_risk_score ?? 0.2)` ([recommend.ts:191](src/lib/strategy/recommend.ts#L191)). 40% is the universal ceiling.

In the corpus, both markdown candidates hit the cap:
- SKU 15: markdown_risk = 0.67 → discount = 0.40 (capped)
- SKU 26: markdown_risk = 0.88 → discount = 0.40 (capped)

For SKU 26 (Bomber Jacket, stockDays=80, decay): 40% may not move the stock. Fast-fashion endgame for stuck outerwear is typically 50-70%. Conversely, for a €69.95 jacket (SKU 41 if it ever decayed), 40% is appropriate.

**Recommended fix** (P2 because it's less consequential than getting MORE markdowns surfaced first):

- Make the cap **price-tier aware**:
  - `pvp < €40` → cap 0.60 (fast-fashion can go deep)
  - `€40 ≤ pvp < €80` → cap 0.50
  - `pvp ≥ €80` → cap 0.40 (preserve brand price perception)
- Or pass through the full `markdown_risk_score` as the magnitude and let the buyer override.

**Code ref**: [recommend.ts:191](src/lib/strategy/recommend.ts#L191).

---

### C.5 · Color-scope `kill` candidates orphaned

**Finding C.5 (P1)** · Three `kill` candidates exist in `strategy_recommendation_candidates` for the dogfood run, all with `scope='color'`:

| scope_ref | rank | return_risk | demand_score |
|---|---|----:|----:|
| `d3f2a993-…#250` | bottom | 0.67 | 0.20 |
| `d3f2a993-…#251` | bottom | 0.84 | 0.10 |
| `65778e18-…#250` | bottom | 0.87 | 0.33 |

These are color losers within their lineages — "this color isn't working, drop it from next season". They're emitted by `generateColorWinnerCandidates` in [recommend.ts:454-479](src/lib/strategy/recommend.ts#L454-L479).

**The problem**: the SKU verdict resolver has an appender for color-scope **winners** (`appendExtendColorsAction`), but **no appender for color-scope losers**. So these 3 kill candidates sit in the DB and never reach any SKU's verdict stack.

**Recommended fix**:

- Mirror `appendExtendColorsAction` with `appendDropColorAction` (new action verb or reuse `kill` with `scope_hint: 'color'`).
- Action shows up on every SKU in the lineage's loser-color member set, with rationale: *"El color {anchor_color_name} es el peor del lineage (return-risk {X}%, demand {Y}%). Considera retirarlo de la próxima temporada y rebalancear los SKUs supervivientes."*

**Code ref**: [sku-verdict-resolver.ts:495-560](src/lib/strategy/sku-verdict-resolver.ts#L495-L560) (mirror the existing `appendExtendColorsAction`).

**Note on verb proliferation**: the audit-plan §4 says "don't propose new actions". Reusing `kill` with `scope: 'color'` discriminator in the evidence is preferred over a new `drop_color` verb. The display label can branch on `evidence.scope_hint === 'color'` to say "Retirar este color" vs "Matar este SKU".

---

### C.6 · A note on the velocity_ratio explosions

**Finding C.6 (P2, robustness)** · The `velocity_ratio = v_7d / v_8_14d` formula produces absurd values when `v_8_14d` is small or zero. From the corpus:

| pdf | model_ref | v_7d | v_8_14d | ratio | lifecycle |
|----:|---|----:|----:|----:|---|
| 8 | 5107 96 712 | 1,361 | 3 | **453.7** | ramp |
| 13 | 4786 35 250 | 5,085 | 17 | **299.1** | new |
| 11 | 2127 67 620 | 1,311 | 9 | **145.7** | ramp |

For products with daysInStore in the 14-25 range, v_8_14d represents the *birth window* of the SKU. A SKU just launched has near-zero "week before". Dividing by it produces noise that gets classified as `ramp`.

This is mostly harmless (these SKUs end up correctly tagged as ramping growth), but the ratio numbers themselves leak into evidence + rationale prose. A buyer reading "velocity_ratio: 453.7" thinks the system is hallucinating.

**Recommended fix**: cap `velocity_ratio` at, say, 5.0 in evidence outputs. The classifier can keep using the raw value internally for thresholding.

**Code ref**: [classifiers/index.ts:421-422](src/lib/strategy/classifiers/index.ts#L421-L422).

---

### Area C summary — prioritised findings

| ID | Priority | Finding | Code ref |
|---|:---:|---|---|
| **C.4** | **P0** | **14 SKUs with negative effective margin, 12 escape destructive actions.** Annual loss exposure ~€1M+ on the worst single SKU. Add margin-based kill gate + decouple markdown_risk from lifecycle + allow kill+markdown to stack. **Pilot-pitch-critical**. | [recommend.ts:160-208](src/lib/strategy/recommend.ts#L160-L208), [classifiers/index.ts:500-509](src/lib/strategy/classifiers/index.ts#L500-L509) |
| C.5 | P1 | 3 color-scope `kill` candidates orphaned in DB — never reach the buyer's UI. Add `appendDropColorAction` mirror. | [resolver.ts:495-560](src/lib/strategy/sku-verdict-resolver.ts#L495-L560) |
| C.1 | P1 | `exit` priority sits below `mature`/`peak`/`ramp`/`new` — never reachable for late-season dogs. Reorder priority chain. | [classifiers/index.ts:419-457](src/lib/strategy/classifiers/index.ts#L419-L457) |
| C.2 | P1 | `markdown_accelerate` two-gate (decay + risk>0.4) misses 12 oversupplied unit-loss SKUs. Subsumed by C.4 fix. | – |
| C.3 | P2 | 40% discount cap is universal — fast-fashion stuck stock needs deeper. Make price-tier aware. | [recommend.ts:191](src/lib/strategy/recommend.ts#L191) |
| C.6 | P2 | velocity_ratio explodes to 100-500× on freshly-launched SKUs. Cap at 5.0 in evidence. | [classifiers/index.ts:421-422](src/lib/strategy/classifiers/index.ts#L421-L422) |

**The Mango-pitch framing** — the single most important takeaway: a senior merchandising director walking through these 48 SKUs would *count the money*. They'd see "€2.83/unit lost × 7,239 units/week" and say *kill it now*. The current system would say *"investigate this; the returns are elevated"* with 34% confidence. The forensic-merchandising value proposition (the whole pitch) is "we find the money leaks". We're finding 2 of 14 today.

---

## Area D · `extend_colors` and lineage identity

The action that's only as good as the identity graph below it. If the lineage is wrong, every color-level signal is wrong. Code: lineage construction in [src/lib/strategy/identity-graph.ts](src/lib/strategy/identity-graph.ts), winner generator in [recommend.ts:398-481](src/lib/strategy/recommend.ts#L398-L481), appender in [resolver.ts:495-560](src/lib/strategy/sku-verdict-resolver.ts#L495-L560).

### D.0 · Lineage distribution in the dogfood corpus

| Members per lineage | Count | % |
|---:|---:|---:|
| 1 (orphan) | 24 | 75% of lineages, 50% of SKUs |
| 2 | 6 | – |
| 3 | 1 | – |
| **9** | **1** | – |
| Total lineages | 32 | – |

**Match type**:
| Match type | Count | Confidence |
|---|---:|---:|
| `unknown` | 24 | 0.50 |
| `colorway_variant` | 7 | 0.95 |
| `exact_model_match` | 1 | 1.00 |

24 of 48 SKUs are **lineage orphans** (single-member lineage). They can never receive `extend_colors`, `kill` (color-loser scope), or `carryover_survivor` signals because all those require `members.length ≥ 2`.

---

### D.1 · **The lineage matcher over-collapses by first model_ref token**

**Finding D.1 (P0)** · The canonical prefix used to group SKUs into a lineage is **the first space-separated token of `model_ref`** ([identity-graph.ts:313-324](src/lib/strategy/identity-graph.ts#L313-L324)):

```ts
function canonicalPrefix(modelRef: string): string {
  // The model code is the FIRST space-separated token. Subsequent tokens
  // are fabric/sub-line/color codes that vary within a single silhouette.
  const parts = modelRef.trim().split(/\s+/);
  return parts[0] || modelRef.trim();
}
```

The comment claims subsequent tokens are "fabric/sub-line/color codes". **This is empirically false in the dogfood corpus.** The 9-member "ZW - FLUID POLO" lineage (canonical_id `d3f2a993-…`, prefix "4786", match_type `colorway_variant` @ 0.95 confidence) actually contains **five completely different garments**:

| model_ref | product_name | color_ref |
|---|---|---|
| 4786 **166** 401 | ZW - GRANDAD COLLAR SHIRT WITH KNOT | 401 |
| 4786 **166** 250 | ZW - GRANDAD COLLAR SHIRT WITH KNOT | 250 |
| 4786 **30** 620 | SET_173 - 100% LINEN SHIRT | 620 |
| 4786 **30** 250 | SET_173 - 100% LINEN SHIRT | 250 |
| 4786 **34** 251 | ZW - KNOTTED COLLAR SHIRT | 251 |
| 4786 **35** 250 | ZW - BALLOON SLEEVE POPELIN SHIRT | 250 |
| 4786 **96** 250 | ZW - FLUID POLO SHORT SLEEVE BLOUSE | 250 |
| 4786 **96** 730 | ZW - FLUID POLO SHORT SLEEVE BLOUSE | 730 |
| 4786 **96** 800 | ZW - FLUID POLO SHORT SLEEVE BLOUSE | 800 |

The middle token (166 / 30 / 34 / 35 / 96) is the actual style/silhouette code. The first token "4786" appears to be Zara's internal **family/category code** (note all 9 SKUs share `family_code = W.A FLUIDOS LARGO - 1500`). Grouping by first token alone produces a lineage that spans 5 distinct silhouettes.

**The 3-member "D.W. THE ANKLE RELAXED" lineage** (prefix "8307") IS coherent — all 3 have `product_name = D.W. THE ANKLE RELAXED` with the same family, just different color washes (427, 441, 250). The matcher works correctly when product diversity within a model-family is low.

**Why this breaks the destination actions**:

- **`extend_colors`**: the candidate generator sorts the 9 members by `margin × demand − return_risk` and picks the top-1 winner. The "winning color" is the highest-scoring product across 5 different silhouettes — not a color signal at all, just whichever specific SKU happened to score highest. The rationale tells the buyer "color X is the winner of this lineage — extend the palette around it" while comparing apples to oranges.
- **`kill` (color-scope)**: the 3 color-scope kill candidates in the corpus are `d3f2a993-…#250`, `d3f2a993-…#251`, `65778e18-…#250`. The first two point at color codes 250 and 251 inside the over-collapsed lineage. Color 250 appears 4 times (Grandad, Linen Shirt, Balloon Sleeve, Fluid Polo). "Kill color 250 from this lineage" semantically means "drop 4 different SKUs with no relationship".
- **`carryover_survivor`**: classifier 8 checks `lineage_seasons_present ≥ 2`. If the over-collapsed lineage has any single SKU from a previous season, it tags all 9 members as carryover candidates. Same false positive.

**Codex contra-propuesta context** (cited in the code comment): the comment says *"previous version used first TWO tokens, which double-counted lineages per fabric"*. That fix overcorrected. The right answer is somewhere between — first 2 tokens is too aggressive *only* when the second token is a fabric subcode that should aggregate. The dogfood empirically suggests using **2 tokens is correct** for this Zara RNK structure (each of the 5 garments has its own middle-token signature).

**Recommended fix** (P0, with 2 implementation options):

**Option A (light, ship-now)**: revert to first 2 tokens of `model_ref`. Re-run the dogfood corpus and see how the FLUID POLO lineage breaks apart:

- Prefix "4786 166" → 2 SKUs (Grandad Collar, both colors) — legit
- Prefix "4786 30" → 2 SKUs (Linen Shirt, both colors) — legit
- Prefix "4786 34" → 1 SKU (Knotted Collar, orphan)
- Prefix "4786 35" → 1 SKU (Balloon Sleeve, orphan)
- Prefix "4786 96" → 3 SKUs (Fluid Polo, 3 colors) — legit

So 9 → 4 lineages (2+2+1+1+3 = 9), with 2 ending up as orphans. That's correct: a SKU with no colourway sibling shouldn't be grouped with a different silhouette just because they share a family ID.

The codex critique that "first 2 tokens double-counts per fabric" may not apply to this Zara RNK dataset — there's no evidence in the corpus of two same-silhouette SKUs differing only by fabric token. If such a case exists in Mango's data, handle it then with Option B.

**Option B (robust, 1 sprint)**: prefix + product_name similarity. Two SKUs share a lineage iff they share `model_ref` first 2 tokens AND their `product_name` strings match (Jaccard ≥ 0.6 on tokens). This explicitly resolves the dogfood case AND handles edge cases where prefix is misleading.

**Code ref**: [identity-graph.ts:313-324](src/lib/strategy/identity-graph.ts#L313-L324).

**Knock-on for other audit findings**: the C.5 color-scope kill candidates I flagged in Area C as "orphaned in DB" are pointing to *incoherent* color references because the lineage they belong to is over-collapsed. Fixing D.1 retroactively makes those 3 kill candidates correct (they'd point to coherent within-silhouette color-losers).

---

### D.2 · Winner formula `margin × demand − return_risk`

**Finding D.2 (P1)** · [recommend.ts:416-423](src/lib/strategy/recommend.ts#L416-L423):

```ts
const aRank =
  (a.score!.margin_score ?? 0) * (a.score!.demand_score ?? 0) −
  (a.score!.return_risk_score ?? 0);
```

Issues:

1. **Multiplicative AND subtractive on the same 0-1 scale**. `margin × demand` ranges 0-1; `return_risk` ranges 0-1. Subtraction can produce negative ranks (e.g. margin=0.5, demand=0.5, returns=0.3 → rank=-0.05). Ranking by negative values is fine, but the interpretation gets fuzzy. A pure additive form like `(margin + demand)/2 − returns` would keep all terms on comparable axes.

2. **Unweighted**. Margin and demand are equally weighted; for a forensic merchandising tool the weighting should be **buyer-tunable**, not implicit. A buyer in "defend & curate" archetype cares about margin much more than demand; a buyer in "amplify" cares about demand much more than margin. The `archetype` is already in scope (in the modulator) but isn't passed into the color winner selection.

3. **Sell-through ignored**. The winner formula uses demand_score (which is velocity-based) but not `sell_through_bought_pct`. A SKU that's selling fast but burning down inventory it shouldn't have bought is "high demand" but not actually a hero. Real merchandiser scoring blends velocity + sell-through.

**Recommended fix**: rewrite to:

```ts
const aRank =
  0.4 × margin_score +
  0.3 × demand_score +
  0.2 × sell_through_score +
  −0.1 × return_risk_score;
```

Then expose those four weights as `strategy_algorithm_versions` knobs so the buyer can re-rank per archetype.

**Code ref**: [recommend.ts:413-424](src/lib/strategy/recommend.ts#L413-L424).

---

### D.3 · Single-winner-per-lineage threshold

**Finding D.3 (P2)** · `thresholds.color_winner_top_n_per_lineage` defaults to 1. In multi-color lineages (e.g. the 9-member Fluid Polo, the 3-member Ankle Relaxed), only the top-1 color surfaces as winner.

In the corpus this affects:
- 9-member Fluid Polo lineage: 1 winner + 1 loser surfaced; 7 colors in the middle silent.
- 3-member Ankle Relaxed lineage: 1 winner + 1 loser; 1 color in the middle silent.

**Recommended fix**: scale `top_n` by lineage size — e.g. `Math.max(1, Math.floor(members.length / 3))`. The 9-member lineage gets 3 winners + 3 losers; the 3-member lineage gets 1 of each. More signal density, no false positives.

Also enable Felipe's `amplify_winner` rationale to mention sibling-color heroes ("color rojo cereza también está en top 3 del lineage").

**Code ref**: [recommend.ts:426-427](src/lib/strategy/recommend.ts#L426-L427) and the default value in the active algorithm version row.

---

### D.4 · Color name → hex resolution: two divergent sources

**Finding D.4 (P1)** · The system uses **two separate sources of truth** for color names, with incompatible normalisation:

1. **Backend**: `strategy_taxonomies` row with `taxonomy_kind = 'color'` maps numeric codes → snake_case names:
   ```json
   { "code_to_name": { "401": "blanco", "300": "amarillo_claro", "730": "beige_tostado" } }
   ```
2. **Frontend**: `COLOR_NAME_HEX` dictionary in [PdfOverlayViewer.tsx:108-126](src/app/(app)/strategy/[tenantSlug]/runs/[runId]/pdf-view/PdfOverlayViewer.tsx#L108-L126) maps space-separated names → hex:
   ```ts
   { 'amarillo': '#e8c84a', 'verde botella': '#1f4634', 'azul marino': '#1a3162' }
   ```

**Failure modes**:

- **Normalisation mismatch**: taxonomy outputs `amarillo_claro` (snake_case), `COLOR_NAME_HEX` keys are `'amarillo'` or `'amarillo claro'` (space). Lookup for `amarillo_claro` fails → falls back to grey.
- **Incomplete taxonomy**: the active row has 21 color codes mapped. The dogfood corpus contains codes **251, 60, 91, 94, 632, 712, 715, 804, 441, 819, 919** — none mapped. These render as raw codes or fall back to grey.
- **Two-step lookup, single point of silent failure**: code → name (taxonomy) → hex (dict). Any miss in either step = grey swatch + the buyer never knows why.

In the corpus, **23 of 48 SKUs have a color_ref that the active taxonomy doesn't map** (47%). Their `extend_colors` and `amplify_winner` swatches show grey fallback, eroding visual signal.

**Recommended fix**:

- **Unify the mapping** at the taxonomy level. Add a `code_to_hex` field alongside `code_to_name`. Resolve both in one lookup, both in the backend. Frontend just renders the hex it receives.
- **Backfill the dogfood taxonomy** with the missing 23 codes. (Possibly automated by sampling RGB from the actual product images, if Zara publishes them; or done manually for the pilot.)
- **Telemetry on misses**: log a warning when a color_ref can't be resolved. Right now misses are silent.

**Code refs**: [PdfOverlayViewer.tsx:108-143](src/app/(app)/strategy/[tenantSlug]/runs/[runId]/pdf-view/PdfOverlayViewer.tsx#L108-L143) (delete after backend resolves hex), backend resolver to be added in [resolver.ts:495-560](src/lib/strategy/sku-verdict-resolver.ts#L495-L560).

---

### D.5 · No proposal of NEW colors (just naming the existing winner)

**Finding D.5 (P2)** · The audit-plan §D.5 references Felipe's earlier request: *"proponer EL color"* — not just identify the lineage's existing winner, but suggest concrete NEW colors to extend the palette toward.

Current `extend_colors` rationale (from state doc § 3.8): *"El color rojo cereza es el ganador dentro de este lineage (82% confianza). Considera extender la paleta con tonos adyacentes para amplificar el winner."*

This says "extend with adjacent tones" but proposes ZERO concrete tones. The `amplify_winner` action does propose brief colours (from `strategy_creative_briefs.color_story`), but `extend_colors` doesn't.

**Recommended fix** (one-paragraph design, then implement in a sprint):

When `extend_colors` fires on a lineage with an established winner color, surface 1-3 **adjacent palette suggestions** from one of:

- **The active creative brief's color_story**, filtered to "adjacent" hue family (e.g., winner is "rojo cereza" → propose burdeos, granate, vino from the brief).
- **The tenant's brand palette** (when present in `strategy_creative_briefs.brand_palette`).
- **A simple hue-shift heuristic** as fallback: ±15° around the winner's hex on the HSL wheel, snapped to nearest brief color.

Rationale becomes operational: *"El color rojo cereza es el ganador del lineage. Para próxima temporada, extender hacia tonos adyacentes del moodboard: burdeos, granate. Mantener cereza como ancla."*

**Code ref**: would extend [resolver.ts:495-560](src/lib/strategy/sku-verdict-resolver.ts#L495-L560) `appendExtendColorsAction` to compose the adjacency list.

---

### D.6 · 50% of corpus is lineage-orphan — `extend_colors` can never fire on them

**Finding D.6 (P2, mostly informational)** · 24 of the 48 SKUs are single-member lineages with `match_type = 'unknown'`, `confidence = 0.5`. The `extend_colors` action requires `members.length ≥ 2`, so half the corpus is silent on color-extension signals even when the SKU itself is a hero.

Example: **SKU 41** (Chaqueta Color Cinturón, ramp lifecycle, demand=1.0, sell-through 56%, the high-margin hero from area B) is an orphan. Its `amplify_winner` action fires (good) but `extend_colors` cannot fire (it's alone). The buyer is told "this is a hero, design 2-3 follow-ups" but gets no color-extension hint to feed into those follow-ups.

This is partially addressed by `amplify_winner`'s brief-color suggestions (which DO surface even for orphans). But the lineage-derived "adjacent color" signal that D.5 proposes won't ever fire for orphans.

**Recommended fix** (subsumed by D.1 + D.5):

- D.1 fix may un-orphan some SKUs once the prefix is more discriminating (a SKU that's currently orphan because it shares prefix "4786" with 8 unrelated others might find ITS own real lineage if there's a second-season carryover).
- For SKUs that remain genuine orphans (truly unique silhouettes), the D.5 fix should still surface brief-color or brand-palette suggestions even without lineage siblings.

---

### Area D summary — prioritised findings

| ID | Priority | Finding | Code ref |
|---|:---:|---|---|
| **D.1** | **P0** | Lineage matcher groups by first model_ref token only. 9-member "Fluid Polo" lineage actually spans 5 different garments. Breaks `extend_colors`, color-scope `kill`, `carryover_survivor`. Use first 2 tokens (Option A) or add product_name similarity (Option B). | [identity-graph.ts:313-324](src/lib/strategy/identity-graph.ts#L313-L324) |
| D.4 | P1 | Two divergent color-name sources (snake_case backend taxonomy vs space-separated frontend dict) + 47% of corpus color codes missing from taxonomy → grey-fallback swatches with silent failures. Unify in taxonomy with `code_to_hex`. | [PdfOverlayViewer.tsx:108-143](src/app/(app)/strategy/[tenantSlug]/runs/[runId]/pdf-view/PdfOverlayViewer.tsx#L108-L143), backend resolver |
| D.2 | P1 | Color winner formula `margin × demand − returns` is multiplicative-and-subtractive, unweighted, ignores sell-through. Make additive + weighted + sell-through-aware. | [recommend.ts:413-424](src/lib/strategy/recommend.ts#L413-L424) |
| D.3 | P2 | `top_n=1` surfaces only 1 winner per lineage regardless of size. Scale by `floor(members / 3)`. | [recommend.ts:426-427](src/lib/strategy/recommend.ts#L426-L427) |
| D.5 | P2 | `extend_colors` rationale says "extend toward adjacent tones" but proposes ZERO concrete tones. Wire brief.color_story + brand_palette adjacency. | [resolver.ts:495-560](src/lib/strategy/sku-verdict-resolver.ts#L495-L560) |
| D.6 | P2 | 50% of corpus is lineage-orphan; `extend_colors` never fires on them. Partially mitigated by D.1 fix + D.5 brief-color fallback. | – |

**Sequence**: D.1 first (everything else depends on coherent lineages), then D.4 (visual signal that buyers see immediately), then D.2/D.3/D.5 as polish.

**Knock-on with Area C**: the 3 color-scope `kill` candidates I flagged in C.5 as DB orphans (invisible to UI) are pointing at incoherent over-collapsed lineages. Fixing D.1 first makes those kill candidates correct; only then is it worth wiring C.5's `appendDropColorAction`.

---

## Area E · The modulator — does archetype actually change anything?

Modulator applies three layers after the resolver produces raw verdicts: ARCHETYPE → BUDGET → BRIEF. Code: [src/lib/strategy/sku-verdict-modulator.ts](src/lib/strategy/sku-verdict-modulator.ts) (314 lines).

**⚠️ Context note**: E.1 below was the area where I discovered the data-quality issue documented in § META. The "Defend & Curate downgrades ALL replenish" finding is partially an artifact of corrupted margin data. The structural critiques (E.2 budget logic, E.3 transition halving, E.4 brief annotation-only) are independent of margin data and stand cleanly.

### E.1 · Defend & Curate — does it ever differentiate?

**Finding E.1 (P1, partly data-quality)** · The modulator's Defend & Curate archetype downgrades replenish actions when `evidence.margin_score < 0.4` ([modulator.ts:95-108](src/lib/strategy/sku-verdict-modulator.ts#L95-L108)).

In the dogfood corpus the threshold currently fires on **48/48 SKUs** because all margin_scores are < 0.04 (max 0.038, from the data-quality bug). Defend & Curate effectively becomes "downgrade everything" — the archetype is indistinguishable from "do nothing".

**Two layered fixes**:

1. **First, re-ingest the corpus to get real margins**. With healthy 60%+ list margins, the *distribution* of `margin_score` across SKUs should span the 0-1 range. Then the 0.4 threshold catches the actual thin-margin cohort (high-cost + high-returns SKUs), not everyone.

2. **Second, even after re-ingest, the binary threshold is brittle**. A SKU at margin_score=0.39 gets downgraded; at 0.41 it survives. Combined with the data dependency, this makes the archetype's behaviour wildly different across ingests. **Recommended**: replace binary downgrade with a **proportional units downgrade** — `recommended_units × (margin_score / 0.4)` capped at 1.0. A SKU at margin_score=0.3 buys 75% of recommended units, at 0.4 buys 100%, at 0.5+ unaffected. Smooth, defensible.

**Code ref**: [modulator.ts:82-158](src/lib/strategy/sku-verdict-modulator.ts#L82-L158).

---

### E.2 · Budget cap zeroes lowest-margin first — wrong primitive

**Finding E.2 (P1)** · When the total cost of replenish + carryover exceeds `target_buy_budget_eur`, the modulator sorts buyables by `marginScore ASC` and zeroes recommended_units on the lowest-margin SKUs until under budget ([modulator.ts:216-249](src/lib/strategy/sku-verdict-modulator.ts#L216-L249)).

The audit-plan flagged this as questionable: *"Should it instead drop lowest-confidence? Or lowest-margin × velocity (lowest €/day return)?"*

The right primitive is **expected € contribution per buy-€** (ROI on the marginal buy):

```
roi_per_marginal_eur = (margin_score × velocity_per_day × time_to_sell_days) / cost_per_unit
```

A SKU with low margin BUT huge velocity returns more € on every buy-€ than a high-margin SKU that sells 5 units/week. Margin-only sorting:

- Over-prioritises niche high-margin slow-movers (e.g., €79.95 jacket with 60% margin selling 213/day)
- Under-prioritises high-velocity thin-margin volume movers (e.g., €29.95 fluid blouse with 40% margin selling 12K/week)

The current logic would zero the blouse first (lower margin), keeping the jacket — but the blouse generates 50× the €-contribution per buy-€.

**Recommended fix**: sort buyables by computed `roi_per_marginal_eur ASC` instead of `marginScore ASC`. Drop the *least productive* € first.

A weaker but acceptable interim: sort by **`marginScore × velocity_7d`** (same shape, no need to compute time_to_sell). The blouse wins on this metric.

**Code ref**: [modulator.ts:216-217](src/lib/strategy/sku-verdict-modulator.ts#L216-L217).

---

### E.3 · Category Transition halves ALL replenish — too blunt

**Finding E.3 (P1)** · The Category Transition archetype halves `recommended_units` on every replenish action, regardless of which family is being transitioned ([modulator.ts:112-128](src/lib/strategy/sku-verdict-modulator.ts#L112-L128)):

```ts
if (
  archetype.archetype_id === TRANSITION_ARCHETYPE &&
  item.action === 'replenish' &&
  item.recommended_units != null &&
  item.recommended_units > 0
) {
  filteredActions.push({
    ...item,
    recommended_units: Math.round(item.recommended_units / 2),
  });
  ...
}
```

The Category Transition posture has a specific meaning: *"I'm REDUCING investment in family X to FUND family Y."* But the modulator has no knowledge of which family is being abandoned. It just blanket-halves everywhere — which means the budget is shifted from the transitioning family BUT ALSO from the receiving family, and from every neutral family.

**Recommended fix**: Category Transition needs a **`from_family` + `to_family` payload** (or equivalent — could be `archetype.action_mix` extended with `transitioning_from: family_code`). Then:

- Halve replenish ONLY on SKUs in `from_family`
- Leave SKUs in `to_family` alone or BOOST them (×1.3?)
- Leave neutral families untouched

This is also a UX requirement — the buyer needs to declare what they're transitioning FROM/TO. Currently the archetype picker doesn't capture this.

**Code ref**: [modulator.ts:112-128](src/lib/strategy/sku-verdict-modulator.ts#L112-L128) + archetype context schema in `strategy_constraints`.

---

### E.4 · Brief misalignment is annotation only — needs to actually modulate

**Finding E.4 (P1)** · `applyBrief` reads `brief.family_pivot` (e.g., `{ "W.A FLUIDOS LARGO - 1500": -0.30 }` = "pivot 30% away from this family"). When a SKU in a pivoting-away family has a `replenish`/`carryover` action, the modulator adds an annotation note. **It doesn't change any action** ([modulator.ts:262-292](src/lib/strategy/sku-verdict-modulator.ts#L262-L292)).

For a forensic-merchandising tool, this is a missed opportunity. The buyer SAID "I'm pivoting 30% away from W.A FLUIDOS LARGO for next season" — and the system answers *"OK noted"* while still recommending full replenishes on that family.

**Recommended fix**: make the modulator act proportionally to `pivot` magnitude:

```ts
// pivot ∈ [-0.5, +0.5]
const replenishMultiplier = pivot < 0
  ? Math.max(0.3, 1 + pivot)       // pivot=-0.3 → ×0.7; pivot=-0.5 → ×0.5
  : Math.min(1.5, 1 + pivot * 0.5); // pivot=+0.3 → ×1.15; small boost cap

for (const action in v.actions) {
  if (action === 'replenish' && action.recommended_units != null) {
    action.recommended_units = Math.round(action.recommended_units × replenishMultiplier);
  }
}
```

And for kill/resize_down/markdown when brief is pivoting INTO a family (`pivot > +0.1`):

- Annotate the conflict (current behaviour ✓)
- ALSO bump the action's `confidence_action` DOWN by `pivot × 0.3` so the buyer sees lower confidence on a kill that conflicts with creative direction.

The current "annotation only" makes the brief decorative. The buyer entered effort to fill it; the system should respect that input.

**Code ref**: [modulator.ts:255-292](src/lib/strategy/sku-verdict-modulator.ts#L255-L292).

---

### E.5 · Order of operations matters and isn't justified

**Finding E.5 (P2)** · The modulator runs archetype → budget → brief in fixed order ([modulator.ts:298-313](src/lib/strategy/sku-verdict-modulator.ts#L298-L313)).

Consider the case: archetype = Defend & Curate (downgrades thin-margin replenish to hold), then budget cap (sorts surviving replenishes by margin and zeroes lowest). If archetype already removed the thinnest margins, budget cap now zeroes the *next* thinnest. The two layers compound in a way that's not obviously the right policy.

The opposite order — budget → archetype — would let the buyer's strategic posture override budget priority (e.g., Defend & Curate first protects margin even if it means cutting more than the budget needed).

**Recommended fix**: document the intended composition order in the modulator comment + add a unit test that demonstrates "this order, and why". Today's order is plausible but undefended.

**Code ref**: [modulator.ts:298-313](src/lib/strategy/sku-verdict-modulator.ts#L298-L313).

---

### E.6 · No "Defend Margin Pool" archetype

**Finding E.6 (P2)** · Four archetypes today: A (Replenish & Amplify), B (Balanced ROI), C (Defend & Curate), D (Category Transition). The audit-plan didn't ask this but I see it in the data: there's no archetype for **"protect the seasonal margin pool"** — i.e., aggressively cull and avoid stock builds in a high-uncertainty / low-margin season.

Mango is named as a pilot. Mango's positioning is more margin-protective than Zara's volume-first model. A "Margin Pool Defender" archetype that:
- Default-halves replenishes on any SKU with `effective_margin < 25%`
- Routes any SKU with returns_pct > 0.30 to `investigate` regardless of velocity
- Surfaces markdown_accelerate earlier (at stockDays ≥ 45 instead of decay-lifecycle gating)

...might be the actual pitch archetype for Mango. Worth Felipe-discussion.

**Code ref**: extension to [modulator.ts:31-39](src/lib/strategy/sku-verdict-modulator.ts#L31-L39) (ArchetypeContext) + new branch in `applyArchetype`.

---

### Area E summary — prioritised findings

| ID | Priority | Finding | Code ref |
|---|:---:|---|---|
| E.1 | P1 (data + structural) | Defend & Curate binary threshold (margin_score < 0.4) makes the archetype useless when margin distribution is degenerate. Re-ingest first, then replace binary downgrade with proportional units. | [modulator.ts:95-108](src/lib/strategy/sku-verdict-modulator.ts#L95-L108) |
| E.2 | P1 | Budget cap sorts by margin only — under-prioritises high-velocity thin-margin volume movers. Sort by `margin × velocity` (or full ROI/€) instead. | [modulator.ts:216-217](src/lib/strategy/sku-verdict-modulator.ts#L216-L217) |
| E.3 | P1 | Category Transition halves ALL replenish blindly. Needs `from_family` + `to_family` to direct the halving and possibly boost the destination. | [modulator.ts:112-128](src/lib/strategy/sku-verdict-modulator.ts#L112-L128) |
| E.4 | P1 | Brief misalignment is annotation-only. Make it modulate units proportionally to `pivot` magnitude. | [modulator.ts:255-292](src/lib/strategy/sku-verdict-modulator.ts#L255-L292) |
| E.5 | P2 | Order of operations (archetype → budget → brief) is undefended. Document and test. | [modulator.ts:298-313](src/lib/strategy/sku-verdict-modulator.ts#L298-L313) |
| E.6 | P2 | No "Margin Pool Defender" archetype — likely the right pitch archetype for Mango. | [modulator.ts:31-39](src/lib/strategy/sku-verdict-modulator.ts#L31-L39) |

**Sequence**: re-ingest dogfood (META requirement) → re-verify E.1 → then E.2 (immediate ROI fix) → E.4 (the brief deserves to matter) → E.3 → E.5/E.6.

---

## Area F · The 6 confidence dimensions

Each SKU score carries 6 confidence dimensions: `data_completeness`, `identity`, `demand`, `margin`, `creative_fit`, `action`. Felipe rejected surfacing these as a 6-grid in the UI (state doc § 7) — they collapse into a single "confidence: X%" on the action chip. The audit-plan asks whether the 6 are calibrated or noise.

### F.1 · The 6 dimensions across the corpus

| Dimension | Avg | Min | Max | Distinct values | Variance signal |
|---|---:|---:|---:|---:|---|
| `confidence_data_completeness` | 1.00 | 1.00 | 1.00 | 1 | **None — constant** |
| `confidence_identity` | 0.95 | ? | ? | small | **Near-constant** |
| `confidence_demand` | 0.55 | varies | varies | many | **Real signal** |
| `confidence_margin` | 0.90 | ? | ? | small | **Near-constant** |
| `confidence_creative_fit` | NULL | NULL | NULL | NULL | **Dead — null on 48/48** |
| `confidence_action` | 0.47 | 0.34 | 0.86 | **2** | **Binary masquerading as continuous** |

**Finding F.1 (P1)** · Of the 6 confidence dimensions, only 1 (`demand`) carries actual variance in the corpus. The others are either constant, near-constant, dead (null everywhere), or binary in disguise.

**`confidence_action`** is especially misleading. It reads as a continuous probability between 0 and 1, but takes only 2 values across all 48 SKUs:
- `0.86` when the underlying classifier had clean inputs (no stockout suppression, no insufficient-evidence flag)
- `0.34` when the classifier flagged uncertainty (e.g., `stockout_risk_score > 0`)

Two states. The 0.34 and 0.86 are essentially "low confidence" and "high confidence" booleans dressed as numbers. The UI surfacing "confianza 34%" to a buyer implies a continuous probability that doesn't exist in the underlying signal.

**Recommended fix**:

- **Delete or rebuild `confidence_creative_fit`**. Currently null everywhere. Either wire it from the brief alignment (compute "how well does this SKU fit the brief's archetypes/colors/families?") or delete it from the schema.
- **Make `confidence_action` continuous**. Compose it from the underlying classifier traces — e.g., `confidence_action = (1 - stockout_suppression_severity) × data_completeness × demand_certainty`. Get 20+ distinct values across the corpus.
- **Collapse data_completeness + identity + margin into a single "input quality" dimension** since they barely vary. Three near-constant fields ≠ three signals.

**Code refs**: confidence computation lives across [classifiers/index.ts](src/lib/strategy/classifiers/index.ts) (lots of `confidence_data_completeness = 1.0` hard-coded) and per-candidate generators in [recommend.ts](src/lib/strategy/recommend.ts).

---

### F.2 · `confidence_creative_fit` is dead — wire it or delete it

**Finding F.2 (P1)** · Confirmed at the SQL aggregate level — 48 of 48 scores have `confidence_creative_fit IS NULL`. The dimension is in the schema, allocated DB space, surfaced in the resolver's `confidence_breakdown` object, but **populated nowhere in the codebase**.

Two options:

1. **Delete it** — drop the column, remove from `confidence_breakdown`, save the noise.
2. **Wire it** — compute creative fit as a function of:
   - SKU's family_code overlap with brief's family_pivot direction
   - SKU's color_ref membership in brief's color_story
   - SKU's lifecycle/archetype membership in brief's archetypes_focus

   Then `confidence_creative_fit` becomes the rationale's anchor for "this SKU matches the brief" vs "this SKU is off-brief". That's actually a useful signal for the buyer.

**For Mango pitch**: option 2 is the right move — creative fit is one of the few signals a merch director cares about that's NOT already covered by velocity/margin/returns. Currently dead.

**Code ref**: new computation needed in [classifiers/index.ts](src/lib/strategy/classifiers/index.ts) (classifier 11 — creative fit), wired into `SkuScore.confidence_creative_fit`.

---

### Area F summary

| ID | Priority | Finding | Code ref |
|---|:---:|---|---|
| F.1 | P1 | 3 of 6 confidence dimensions are near-constant, 1 is binary-disguised-as-continuous, 1 is null. Only `demand` carries real variance. Surfacing single composite "confidence X%" to buyer overstates underlying signal richness. | classifiers/index.ts (multiple sites) |
| F.2 | P1 | `confidence_creative_fit` is null on 48/48. Wire it from brief alignment or delete the column. | classifiers/index.ts (new classifier 11) |

---

## Area G · Display logic / UI

### G.1 · PDF rank source

**Finding G.1** · Per state doc § 10.4 and Felipe's call in Area A: **leave PDF order as input**. No re-rank, no toggle. Closed.

### G.2 · `visibleActions()` drops `hold` when others present

**Finding G.2 (P2)** · `visibleActions()` in PdfOverlayViewer filters out `hold` whenever any other action is present. The dropped `hold` may have been the only action carrying `data_sufficiency_warning` (e.g., "new SKU, insufficient evidence — verdict uncertain"). When we drop it, we lose that warning.

**Recommended fix**: before dropping `hold`, copy its `data_sufficiency_warning` (if non-null) into the surviving action's `data_sufficiency_warning`. Surface a small "ℹ️ datos limitados" badge on the action chip.

**Code ref**: PdfOverlayViewer.tsx `visibleActions` function.

### G.3 · `replenish` + `resize_down` collision filtered silently

**Finding G.3 (P2)** · When both fire (logical conflict), the lower-confidence one is dropped silently. The buyer doesn't see "1 conflicting verdict suppressed". Surface a small hint, even just a tooltip on the action.

### G.4 · Drawer "Volver al panel" resets filter

**Finding G.4 (P3)** · Drawer's back-button exits to `filter='all'`. Should remember the filter that was active when the SKU was clicked. Minor UX.

### Area G summary

All P2/P3 — UX polish. None of these change the merit of the system. Defer until the P0/P1 substantive fixes (A, B.4, C.4 after re-ingest, D.1) ship.

---

## Area H · Backtesting — the only empirical validator

### H.1 · Has the backtest engine ever run on real data?

**Finding H.1 (P0 — gating for Mango pitch)** · The audit-plan §H.1 says: *"No threshold should survive the audit without a backtest result."*

The current dogfood corpus is a single observation date (2026-05-16). The backtest engine ([src/lib/strategy/backtest.ts](src/lib/strategy/backtest.ts)) trains on N-1 and tests on N. **It needs at least two seasonal periods of data to run meaningfully**. The dogfood is one snapshot — backtest can't compute precision/recall against future outcomes it doesn't have.

To make Area H actionable for the pilot:
1. Felipe needs to ingest at least 2 historical Zara RNK PDFs (e.g., V25 and V26, or I26+V26 sequenced).
2. Run the engine on V25 → produce recommendations
3. Compare against V26 actual outcomes (sell-through, returns, kills made)
4. Compute precision (% of recommended kills that proved correct), recall (% of correct kills the system caught), return-trap catch (% of high-velocity high-returns SKUs flagged).

**Until that happens, every threshold in this audit is a hypothesis**. The audit-plan said this explicitly. **This is the single most pitch-critical action**: until the dogfood includes back-testable data, no enterprise will pay €40-90K for a pilot. The forensic claim ("we'd have caught this in advance") needs empirical proof.

**Recommended fix**: get at least one prior-period Zara RNK from Felipe (he has them per the state doc — the 2026-05-15 business plan mentioned "the 48-SKU dogfood is one snapshot"). Re-ingest, re-run, populate `strategy_backtests`. **Add this as the highest-priority audit follow-up.**

### H.2 · Beyond return-trap catch — additional metrics

**Finding H.2 (P1)** · The backtest currently measures precision/recall/return-trap catch. Additional metrics worth computing for the pilot:

- **Stockout avoidance**: % of `replenish` recommendations that prevented an observed stockout in the test period
- **Markdown precision**: % of `markdown_accelerate` actions that the buyer actually executed in the next period (proxy via subsequent on_promo or pvp_compare deltas)
- **Hero conversion**: % of `amplify_winner` SKUs whose lineage's NEXT-season SKUs (carryover candidates) actually outperformed family avg

These are second-order metrics that turn a "did the action fire correctly" measure into a "did the action MOVE THE NEEDLE for the business" measure. Mango will ask the second question.

### Area H summary

| ID | Priority | Finding |
|---|:---:|---|
| H.1 | **P0 (pitch gate)** | Backtest has no real data. Get a second period from Felipe and run it. Until then, every threshold is hypothesis. |
| H.2 | P1 | Add stockout-avoidance + markdown-precision + hero-conversion metrics to backtest. |

---

## Cross-area summary — prioritised punch list for the next sprint

Pulling all P0/P1 across areas, with the right execution order:

### Pre-flight (must-do before any P0 implementation)

- **Re-ingest the dogfood corpus** with current parser (post-`normalizeMarkupPct` fix). All Area C and Area E margin-related findings need fresh data to verify magnitude. (META · Data quality)
- **Get a second-period Zara RNK from Felipe** to enable backtesting. (H.1)

### P0 implementation order

1. **B.4** — one-line fix for double-count of `stock_total + pipeline_total` in replenish. Verified 48/48 in corpus. Ship-blocker. [resolver.ts:169](src/lib/strategy/sku-verdict-resolver.ts#L169)
2. **B.2** — switch `velocity_d1` preference to `velocity_7d / 7` to kill the "19,726 days of stock" UI artifact. [resolver.ts:160-165](src/lib/strategy/sku-verdict-resolver.ts#L160-L165)
3. **D.1** — fix lineage matcher to use first 2 model_ref tokens. Re-runs `extend_colors` and color-kill candidates on coherent lineages. [identity-graph.ts:313-324](src/lib/strategy/identity-graph.ts#L313-L324)
4. **C.4** (after re-ingest) — add margin-based kill gate orthogonal to lifecycle. Decouple markdown_risk from lifecycle. Allow kill + markdown stacking. [recommend.ts:160-208](src/lib/strategy/recommend.ts#L160-L208), [classifiers/index.ts:500-509](src/lib/strategy/classifiers/index.ts#L500-L509)
5. **A.2** — bifurcate `amplify_winner` rationale: confirmed-hero vs Zara-curation-flag (confidence cap 0.60 for the latter). [resolver.ts:413-451](src/lib/strategy/sku-verdict-resolver.ts#L413-L451)
6. **B.5** — wire `default_lead_time_days` into `coverage_target_days` for replenish. [resolver.ts:158-176](src/lib/strategy/sku-verdict-resolver.ts#L158-L176)
7. **H.1** — populate backtest with second-period data. Establish baseline precision/recall numbers.

### P1 to bundle in the same sprint or the next

- B.6 (stockout-adjusted velocity)
- B.3 (per-family rotation)
- B.7 (delete duplicate replenish in recommend.ts)
- C.5 (color-kill orphan appender — after D.1)
- C.1 (lifecycle priority reorder)
- C.3 (price-tier-aware markdown cap)
- D.4 (unify color name → hex in taxonomy)
- D.2 (winner formula rewrite — additive + weighted + sell-through)
- E.1 / E.2 / E.3 / E.4 (modulator fixes)
- F.1 / F.2 (rebuild confidence dimensions OR delete dead ones)
- A.4.b (returns-block → investigate annotation)
- A.5 (rationale operationality)
- A.6 (confidence floor + scoreBased proportional)

### What stays open for product discussion (not engineering)

- Renaming Strategy → In-Season + full refactor (after audit completes) → already memorialised in [`project_rename-strategy-to-in-season.md`](.)
- The retailer-agnostic framework skill (in progress at audit end) — make this engine reusable beyond Zara
- E.6 — Margin Pool Defender archetype for Mango
- F.2 — wire `confidence_creative_fit` from brief alignment

---

*Audit complete. Final action: write the retailer-agnostic framework skill to memorialise the lessons learned, particularly the data-quality lessons from META.*

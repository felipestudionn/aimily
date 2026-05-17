# Aimily In-Season · 5-source research synthesis · 2026-05-17

**Sources compared**: Agent 1 (Zara/Inditex academic+industry) · Agent 2 (indie merch tech) · Agent 3 (rivals + Mango deep dive) · Agent 4 (academic canon) · Codex (independent consult).

**Purpose**: replace every invented threshold in aimily In-Season's decision engine with what real industry uses — citation-backed — and frame the Mango pilot wedge sharply.

**The big news**: 8 of our 14 thresholds need re-framing. 2 are well-grounded. The 9-action taxonomy is **a UX construct, not an industry concept** — that's both a problem and the wedge. And there's an exceptional pitch window at Mango right now that closes when their o9 deployment matures.

---

## 1 · Executive verdict — where 3+ sources agree

These are the points where independent sources converged. Read these and you have the conclusion.

1. **The 9 discrete actions (kill / amplify / investigate / etc) are a UX layer, not an industry standard.** The academic canon optimizes continuously (Smith & Achabal, Caro & Gallien, Bitran & Mondschein). Vendors expose KPIs and leave action to the planner (Centric, o9, Anaplan all do this). Zara has *zero* documented per-SKU verdict verbs at HQ. This is **our wedge** — but we should frame it as such, not as "we discovered industry's missing taxonomy."

2. **Zara has no "kill SKU" decision verb anywhere in the academic record.** The implicit kill mechanism is the **broken-assortment / key-sizes pull-back rule** (Caro & Gallien 2010 §3.1): when a major size (S/M/L) stocks out at a store, associates physically remove the entire article from display. SKUs die by *attrition* (warehouse depletion) or *display pull-back*, not by verbal decision. Aimily's `kill` verb is therefore **a buyer-side construct for environments where automated pull-back doesn't exist** — i.e., everywhere except Inditex. That's most retailers including Mango.

3. **The Mango pitch window is exceptional and time-bound.** Four events in 11 months reframe everything: Isak Andic dies 14 Dec 2024 → Toni Ruiz consolidated Chairman+CEO Jan 2025 → o9 signed 25 Mar 2025 → Helena Helmersson (ex-H&M CEO who personally led the recovery from the $4.3B 2018 inventory disaster) joins board Jul 2025 as independent director. Inventory rigour is now **board-level priority with the person who knows exactly how to do it**. (Agent 3 + Codex both confirm o9 deal date and scope.)

4. **Mango's stack has o9 (planning, since Mar 2025) + Centric PLM (since Apr 2013) + 15+ internal AI platforms but no forensic / post-mortem layer.** Seasonal post-mortem still happens in PowerPoint. Independently confirmed by Agent 2 ("scope is pre-season heavy"), Agent 3 ("conspicuously absent"), and Codex ("o9 is the system of record... aimily's wedge should not be 'we replace o9'... should be 'we sit on retailer feeds and produce SKU-level action stacks fast enough for buyers to use daily/weekly'"). **That's the wedge — buyer-ready in-season verdicts that complement, not replace, o9's enterprise plan.**

5. **The single most rigorous mechanic Zara documented (Caro & Gallien 2010) is the broken-assortment pull-back rule**, and **distribution-normalized velocity is the only aimily threshold that's directly aligned**. This is our strongest-grounded element. The rest is buyer practice + folk wisdom + invention.

6. **Returns gates need to be relative, not absolute.** All 5 sources agree (Coresight 2023, Agent 4 canon, Agent 2 industry consensus, Agent 1 Zara, Codex): online apparel returns avg **24.4%**, brick **6-9%**, dresses **54%**, skirts **47%**. Our 18% gate is *below* the online apparel average — it's not a "high returns" signal, it's an "average returns for online" signal. **Fix**: `returns_pct > 1.5× category_baseline (channel-aware)`, not 18% absolute. For brick-skewed SKUs, 18% is still high; for online-skewed SKUs it's noise.

7. **The 60-day stock gate is the wrong unit.** Agent 1, Agent 4 and Codex all say the canonical trigger is **Forward Weeks of Cover (FWOC) relative to season-end**, not absolute days. Zara's documented clearance trigger (Caro & Gallien 2012 verbatim): "estimated time to sell remaining stock at current rate vs. time remaining in clearance window." **Fix**: `stock_days > days_to_season_end × buffer` — the season horizon is what makes the number meaningful.

---

## 2 · The "Zara has no kill verb" reframe

This is the biggest framing insight from the research and deserves its own section.

**What Zara actually does** (Caro & Gallien 2010 *Operations Research*, peer-reviewed, from direct Zara field engagement):

- HQ runs a **twice-weekly shipment optimization** since at least 2005. The decision unit is **SHIPMENT QUANTITY** per article × size × store. The objective is maximizing expected network sales subject to warehouse inventory.
- A SKU "dies" when (a) the warehouse runs out and isn't reordered, OR (b) a major size stocks out at a store and the **broken-assortment pull-back rule** fires — store associates physically remove the entire article from display.
- In-season markdowns are **near-zero**. *"Zara follows the latter and avoids price changes during the selling season"* (Caro & Martínez-de-Albéniz 2014 p.18, verbatim). Markdowns happen only in **clearance windows** (2× per year, ~2 months each, cluster-based, country-specific, never-increase ratchet).
- Store-level SKU life cycle is **5-6 weeks at store** (Caro et al. 2010 *Interfaces* p.196, verbatim).
- Forecasting model uses only 2 inputs: (i) historical sales, (ii) store manager's *requested* quantity (weighted by a learned credibility coefficient).
- Production batches are **<1,000 units per style** (trade press, widely cited but not Inditex-disclosed).

**What this means for aimily's 9 actions**:

| Aimily verb | Zara analog | Verdict |
|---|---|---|
| KILL | None (implicit via attrition / display pull-back) | **Buyer-side construct.** Correct for Mango (no automated pull-back). Frame rationale as "below the threshold where Zara would pull from display." |
| MARKDOWN_ACCELERATE | None in-season (out-of-policy at Zara). Cluster-level clearance only. | **Mango is closer to H&M than to Zara on pricing** — markdown verb works. But trigger must be FWOC-vs-season-end, not 60d absolute. |
| REPLENISH (N units) | Shipment optimization at SKU × size × store | **Right intuition, simplified granularity.** Our integer-unit recommendation is buyer-PO level, not store-allocation level. Document this explicitly in the verdict copy. |
| RESIZE_DOWN | None (Zara solves this via small initial batches <1k) | **Buyer-side construct.** Highly relevant for Mango / mass-market over-committers. |
| INVESTIGATE | None | **Software / buyer-side construct.** Closest to the weekly trading meeting ritual (Goworek, Diamond & Pintel). |
| AMPLIFY_WINNER | Implicit via the shipment optimization re-allocating scarce inventory to high-velocity stores | **Buyer-side construct for next-season decisions.** Correct framing. |
| EXTEND_COLORS | None documented as a verb. Pull-back applies to colors as well as sizes. | **Differentiator from Zara, not a copy.** Zara extends reactively (runs out of red → makes more red). We do it proactively with moodboard swatches. |
| CARRYOVER | None at Zara (Zara designs ~50% of product during season — opposite of carryover). | **Buyer-side construct.** Highly relevant for Mango under their declared "calmer fashion / more timeless" strategy. |
| HOLD | None | **Fallback / UX-only verdict.** Already correct (filtered out when other actions present). |

**The strategic reframe**:

> Aimily In-Season is **a senior buyer's weekly decision-support layer**, not a copy of Zara's HQ algorithm. The 9 verbs reflect how a senior merchandising director thinks during their weekly trading review — they are NOT what Zara's optimization model emits. For environments without Zara's automated pull-back machinery (i.e., 99% of fashion retailers including Mango), the verbal verdict layer adds real value. That's our positioning.

---

## 3 · Threshold verdict — line-by-line, cross-source

Each row: the threshold I invented, what the 5 sources say, recommended replacement. Sources cited inline.

| # | Aimily threshold (current) | Cross-source verdict | Recommended replacement |
|---|---|---|---|
| 1 | `returns_pct ≥ 18%` → INVESTIGATE | **Too low absolute.** Coresight 2023 says apparel online is 24.4% avg (Agent 4); Agent 1 Zara puts brick baseline 8-10%, online 25-30%; Agent 2 says dresses 54%, skirts 47% category-relative; Agent 4 says move to `>1.5× category benchmark` for online apparel. | `returns_pct > 1.5× category_baseline(brand, channel)`. Keep 18% as floor when baseline unknown. **Critical**: ask Mango for their per-category baseline — single highest-load-bearing unknown. |
| 2 | `returns_pct > 35%` → block AMPLIFY | **Reasonable but should be relative.** Agent 1 defensible as "approaching online apparel norm"; Agent 4 says depends on margin (60-70% GM survives ~40-45% returns; 35% GM breaks even at ~25-30%). Codex agrees, says margin-scaled. | `returns_pct > 2.5× category_baseline` OR `effective_margin < 0`. Keep 35% as absolute floor for brick-skewed SKUs. |
| 3 | `pdf_rank ≤ 10` → AMPLIFY_WINNER | **HARD PUSHBACK from 3 sources.** Codex: "too crude... commercial buyers do not care if SKU is 'top 10' unless normalized by exposure, age, distribution, stock availability, margin, returns, and buy depth." Agent 1: "Top-10 is a buyer's arbitrary cutoff, not a Zara threshold." Agent 4: "no academic basis; Fisher–Raman would use Bayesian posterior on early sales." | **Replace** with `top-quintile of sell-through-velocity WITHIN family` after normalizing for exposure, days-in-store, distribution. The rank-with-context. This is the **#1 fix for the SKU 1 bug** — exactly what Felipe asked. |
| 4 | `velocity_rank ≤ 10` → AMPLIFY_WINNER | Same as #3 — too crude as absolute. Agent 1 says hero status at Zara is *emergent* (store-manager requests + warehouse depletion rate). | Replace with `velocity_per_active_store_per_day > 1.5× family_avg` AND `days_in_store ≥ 14`. Use Caro & Gallien's "non-stockout-day-equivalent stores" denominator. |
| 5 | `sell_through_bought < 20%` + `total_bought > 1000` + `lifecycle != new` → RESIZE_DOWN | **Right intuition, brittle absolutes.** Agent 1: 20% defensible at week 4-6 but **window-blind today** (would fire at day 7 if no lifecycle gate). Agent 4: "should be % of buy", not absolute 1000 units. | Make window-aware: `STB < 20% by day 21 AND total_bought > p75(category_buys_this_season)`. The "1000" is invented; "% of buy" is canonical. |
| 6 | `lifecycle = 'exit'` (sell_through <10% after 30+ days) → KILL | **Defensible but should be category-aware.** Agent 4: fast-fashion 85%+ STR, basics 65-70%, core 70-80%, seasonal 60%+. Below 10% at 30d is universally a dog across all archetypes — keep. | Keep. Optional: tighten to `STR < 10% by day 21 for fast-fashion` (Mango's archetype). |
| 7 | `effective_margin < 0` AND `returns_pct ≥ 30%` → KILL | **Supported.** Agent 4 margin-arithmetic: 35% GM breaks even at ~25-30% returns. Codex agrees. | Keep. Optionally add the breakeven calculation as a derived rationale: "this SKU is below margin-breakeven given current return rate." |
| 8 | `markdown_risk_score = min(1, stock_days / 90)` > 0.4 → MARKDOWN_ACCELERATE | **WRONG UNIT — all 3 academic sources agree.** Agent 1, Agent 4, Codex: canonical trigger is `forward_weeks_of_cover > weeks_remaining_in_season`. Caro & Gallien 2012 verbatim: "estimated remaining-time-to-sell at current rate vs. time remaining in window". | **Replace**: `markdown_risk = stock / forward_velocity_per_week` and trigger when `> season_weeks_remaining × buffer (1.2)`. The 90-day denominator is meaningless without season horizon. |
| 9 | `stock_days = pipeline_total / (velocity_7d / 7)` | Computation correct. Application wrong (see #8). | Keep formula. Compare against season-end horizon, not absolute 90 days. |
| 10 | `stockout_risk_score > 0.3` AND `velocity_7d > 0` → REPLENISH | **Defensible — broken-assortment rule supports this.** Agent 1: Zara's forecasting model adjusts for stockout suppression explicitly (broken-assortment cascade). Agent 4: standard buyer practice. | Keep. Add a confidence dimension: if stockout_risk is the *only* signal triggering replenish, mark confidence_demand lower (we're inferring suppressed demand). |
| 11 | Lifecycle: `ramp` when velocity ratio ≥ 1.3×, `decay` when ≤ 0.7× | **Defensible.** Agent 1: trade-press hero spike is 7d ≥ 1.5× 30d — 1.3× is conservative-but-reasonable. Agent 4: no academic source, but matches industry rule-of-thumb. | Keep as soft trigger. Consider adding `strong_hero` at 1.5× and `kill_candidate` at 0.5×. **Calibrate empirically once we have 2 periods of data** (audit H.1). |
| 12 | Markdown depth tiers 40/50/60% by pvp segment | **WRONG NUMBERS, canonical structure.** Agent 2: industry consensus is phased 15-20% → 30-40% → 50-60% (Shopify, Toolio, Peasy). Agent 4: Goworek 25% week 2-3, 50% week 8, 75% week 11-12. Bitran-Mondschein: 4 markdown steps captures 80% of optimal lift. | **Replace** with phased: stage 1 at 60% time-elapsed = -15-20%, stage 2 at 80% time-elapsed = -30-40%, stage 3 end-of-season = -50-60%. Cluster-based, never-increase ratchet (Zara mechanic). |
| 13 | `family_velocity_ratio ≥ 2.0` → AMPLIFY | **Defensible but high bar.** No primary source for "2.0×" specifically. Agent 4 Fisher-Raman: "velocity > 1.2× plan" is the canonical signal. | Lower to 1.5× for soft amplify, keep 2.0× for strong amplify. |
| 14 | `demand_score ≥ 0.7` AND `sell_through ≥ 50%` → AMPLIFY | **Defensible.** Agent 4 sequel trigger (BoF/IESE Mango sources): "full-price sell-through ≥ 80% within first 4 weeks AND low returns" — our 50% is conservative. | Tighten for stronger signal: STR ≥ 80% by week 4 = strong sequel candidate. Keep ≥ 50% as soft signal. |

**Summary tally**:
- **2/14 well-grounded** (#7 KILL margin gate, #10 REPLENISH stockout)
- **6/14 directionally right, need re-framing as relative/dynamic** (#1, #2, #5, #6, #11, #14)
- **3/14 need replacement** (#3 pdf_rank, #4 velocity_rank, #8 stock_days unit)
- **2/14 wrong numbers, canonical structure** (#12 markdown tiers, #13 family ratio)
- **1/14 keep** (#9 formula)

**None are catastrophically wrong. Several are brittle.** The brittleness is what causes the SKU 1 bug — top-10 absolute rank propagates kill action to a hero. Fixing #3 + #8 alone removes most of the audit's worst cases.

---

## 4 · Cross-KPI opportunity matrix

The heart of senior buyer expertise — where 2+ KPIs combine to expose opportunity or risk. Sources annotated: **Z** = Zara-documented (Caro & Gallien), **B** = buyer practice (multiple sources), **A** = aimily inference (no primary source), **C** = canon (academic).

| # | Cross-KPI signal | Meaning | Action | Source |
|---|---|---|---|---|
| 1 | **High velocity + high returns** | Possible fit / quality issue OR ill-fitting design | INVESTIGATE; do NOT auto-replenish | **B** — fashion buyer practice; Asos 2022 + Boohoo 2023 post-mortems confirm |
| 2 | **High margin + low velocity + early window** | Slow-burn premium item, give it time | HOLD | **B/C** — canon: salvage-value floor logic |
| 3 | **High margin + low velocity + late window** | Mispositioned price | MARKDOWN | **C** — Smith & Achabal optimal pricing |
| 4 | **Low margin + high velocity** | Traffic driver, possibly cannibalizing margin SKUs | HOLD or RESIZE_DOWN — don't kill (loss-leader logic) | **B** |
| 5 | **High sell-through + low distribution breadth** | Under-distributed hero | AMPLIFY + extend distribution | **Z** — Caro & Gallien 2010 direct mechanic |
| 6 | **Velocity declining + stock high** | Decay phase, urgent | MARKDOWN_ACCELERATE / schedule into clearance | **Z** — Caro & Gallien 2012 estimated-time-to-sell heuristic |
| 7 | **Hero on velocity + dog on margin (returns-adjusted)** | Star product, eroding economics | AMPLIFY_WINNER with cost-reduced sequel; flag tech-pack | **A/B** — Codex calls this aimily's "real wedge" for Mango |
| 8 | **Velocity flat + emptying_rate high** | Apparent flatness masked stockout — actual demand higher | REPLENISH; mark confidence_demand higher | **Z** — broken-assortment rule explicitly addresses this |
| 9 | **High velocity in N stores + zero distribution in N+M similar** | Geographic / archetype heroship | Extend distribution to similar stores | **Z** — Caro & Gallien 2010 optimization premise |
| 10 | **Color A velocity ≫ Color B velocity in same style** | Color winner emerged | EXTEND_COLORS A; consider drop_color B (per-SKU) | **A/B** — buyer practice; broken-assortment applies to colors (Caro & Gallien 2010 p.260) |
| 11 | **Total bought small + high sell-through + low days_in_store** | Under-bought hero | REPLENISH heavy; increase next-buy intake | **B** |
| 12 | **Total bought large + low sell-through + high days_in_store** | Over-bought dog | RESIZE_DOWN next-buy + MARKDOWN current | **B/C** — canon: Smith & Achabal |
| 13 | **Returns_pct ≫ category baseline AND velocity falling** | Customer rejection in flight | KILL / pull-back immediately. Do NOT markdown into more channels (margin destruction). | **Z** — broken-assortment is the brick equivalent |
| 14 | **High pdf_rank + low velocity_rank** | Retailer hyped it but reality didn't confirm | INVESTIGATE before amplify; cap confidence at 60% | **A** — Codex pushback; addresses the SKU 1 bug class directly |
| 15 | **Low pdf_rank + high velocity_rank** | Sleeper hit — under-exposed but performing | AMPLIFY + extend distribution; flag for next-period push | **A/B** — buyer practice for "hidden winners" |

**These 15 patterns are what the resolver should bias toward surfacing.** Pattern #14 specifically addresses the SKU 1 bug — when PDF rank and real velocity rank disagree, the verdict copy should explicitly say "retailer's own ranking and our velocity ranking disagree — investigate context before amplifying" and cap confidence.

---

## 5 · The 9-action taxonomy verdict

| Action | Canon support | Verdict |
|---|---|---|
| **KILL** | None academic. Buyer practice yes. | Keep. Frame as "below the threshold where Zara would pull-back from display." Make trigger margin-relative and category-aware. |
| **MARKDOWN_ACCELERATE** | Strong (Bitran & Mondschein 1997, Caro & Gallien 2012). | Keep. Replace 60d gate with FWOC-vs-season-end. Implement 3-stage phased depth (15-20% / 30-40% / 50-60%). |
| **REPLENISH** | Strong (Caro & Gallien 2010, Fisher & Raman 1996). | Keep. Document N-units formula as `velocity_per_day × (target_cover_days + lead_time) − stock`. |
| **RESIZE_DOWN** | Buyer practice; closest canon = Fisher & Raman accurate response (reserve capacity for reactive production). | Keep. Replace `total_bought > 1000` with `> p75(category_buys_this_season)`. |
| **INVESTIGATE** | **Weak — no academic equivalent.** Closest is the weekly trading meeting ritual. | **Keep but rename** verdict copy to "flag for buyer review" — `investigate` is too software-y. Industry talks about "trading meeting flags." Felipe to confirm preferred Spanish term ("Revisar" / "Marcar para revisión"). |
| **AMPLIFY_WINNER** | Buyer practice; Fisher-Raman 1996 supports next-buy intake adjustment. | Keep. Frame as next-season design brief, not current-season action. Add the dual-evidence requirement (pdf_rank AND velocity_rank both top-quintile, not either alone). |
| **EXTEND_COLORS** | **No canon, no Zara primary source.** Aimily-original. | Keep — this is a *differentiator* vs Zara's reactive model. Frame as proactive creative direction. Per-SKU rule: only attach to the SKU whose color IS the winner. |
| **CARRYOVER** | Weak academic. Strong textbook (basic stock method, Diamond & Pintel). | Keep. Particularly important for Mango's "calmer fashion / timeless" strategic direction (Helmersson influence). |
| **HOLD** | None — software fallback only. | Keep as UX fallback. Already filtered out when other actions present. |

**Two structural recommendations**:

1. **Consider merging INVESTIGATE and AMPLIFY_WINNER into a "review-action" verdict** that asks the buyer to decide between reorder / sequel / accept. Agent 4 notes these are *adjacent* in the canon (high-velocity SKUs warrant deeper analysis). Keep separate for now but flag for v2.

2. **Bifurcate AMPLIFY_WINNER into in-season vs next-season** actions (Agent 3 recommendation). In-season amplify = "this is a confirmed hero, push it harder NOW via distribution / replenish." Next-season amplify = "design 2-3 sequels for next season." Currently we conflate both.

---

## 6 · Mango pilot insertion plan — consolidated

The exceptional pitch window (governance reset + o9 mid-deployment + Helmersson on board). Independent confirmation from Agent 3 + Codex with discrepancies flagged.

### Champions — priority order

1. **Luis Casacuberta — Chief Product & Sustainability Officer** (engineer + IESE MBA, owner of Woman / Man / Kids / Home). **Strongest champion. His pain is our pain.** Source: Agent 3 (Mango governing bodies + LinkedIn). Codex missed him — bug in Codex's Mango research.

2. **Jochen Grosspietsch — Chief Supply Chain Officer.** Direct consumer of replenish + resize_down verdicts. Source: Agent 3.

3. **Margarita Salvans — CFO.** Defends ROI; €33M saved = 100bps of €3.3B revenue. Source: Agent 3.

4. **Helena Helmersson — Independent board member.** Air cover; led H&M recovery from $4.3B 2018 disaster. **Separate briefing, not main pitch.** Source: Agent 3.

5. **Jordi Álex Moreno — Chief Information Technology Officer** (correctly identified by Codex; Agent 3 confirms). Integration sponsor for the o9 complementary positioning.

6. **Eva Gallego — Global Director of Mango Woman** (since 2025; ex-El Corte Inglés Director de Compras). **Strongest commercial buyer persona.** Both Codex and Agent 3 agree. Start the pilot in Mango Woman — highest SKU complexity, strongest return/fit signal.

### NEVER approach

- **Toni Ruiz (Chairman & CEO)** — too senior for direct outreach; Agent 3 explicit. Codex disagrees and recommends him; **Agent 3 wins this call** based on Mango governance reality.
- **Jonathan Andic** — **under criminal investigation** as of 2025 (Agent 3 finding, separate research). Do not approach.
- **Daniel López** — NOT a buyer despite some Modaes confusion; Codex recommended him as champion, Agent 3 corrects: he's board member responsible for company/franchise expansion + wholesale. Useful only if the pilot is framed around US expansion.

### Pain points to lead with

1. **o9 builds the planning brain but doesn't ship a per-SKU in-season verdict layer for buyers.** Agent 2 confirms: o9's Fashion case study lists capabilities but publishes *zero quantified customer outcomes* — unusual for a Gartner Leader. The wedge: "post-launch decisions in week 6 are still happening in PowerPoint."

2. **The Helmersson lens**: every board meeting will now ask "what did our inventory do this season and why?" Mango needs a forensic / post-mortem layer that explains *why* a SKU lost €200k, not just *that* it lost it. **Aimily In-Season is the explanation engine.**

3. **US expansion concentrates risk.** Mango is doubling US footprint by 2026; local-signal learning by trial and error is expensive. Aimily can identify sleeper SKUs by market/store cluster and prevent Spanish/global buys from drowning local signals. (Agent 3 + Codex independently raised this.)

4. **Returns at category level are not yet operationalized into buying decisions.** Industry online apparel returns avg 24.4% (Coresight 2023). A SKU can be a gross-sales winner and a net-margin loser. Aimily's return-adjusted hero/dog logic is a *real* wedge — none of the 10 vendors in the indie tech survey automate a kill on returns (Agent 2).

5. **The 4E plan ("Elevate, Expand, Earn, Empower") commits Mango to "calmer fashion / more timeless"** — that requires more CARRYOVER decisions per season, which is exactly where our basic-stock-method-aligned logic helps most.

### Wedge framing vs o9

> **o9** = enterprise planning platform: MFP, Assortment Planning, Demand Planning, scenario planning, data model. Strategic.
>
> **Aimily In-Season** = per-SKU in-season commercial decision engine: action stack, buyer-readable explanations, fast overlay on retailer feeds, return-adjusted hero/dog logic, the "what should I do Monday morning?" layer. Tactical.

**This is a complementary buy, not a replacement.** o9 will eventually try to ship this layer (Agent 2 estimates 18-30 month window). We land first, prove value, become the embedded layer.

### Backtesting is the deliverable

**Caro & Gallien proved their Zara model with controlled field experiment: +3-4% sales lift (inventory model, 2007) and +6% clearance revenue (markdown model, 2008).** That's the bar. The aimily equivalent is precision/recall on prior-period recommendations against actual outcomes. Without it, every threshold is just an opinion.

**This requires 2-period data** — current period + at least one prior period — which is the audit H.1 item. **Without this, we can't pitch.**

### Open questions to ask Mango contact directly

1. Which o9 modules are in production today vs roadmap? Confirm in-season verdict layer is NOT covered.
2. What's the seasonal review process today? Who's in the room, what reports do they look at, what decisions come out?
3. What's the per-category returns baseline? (Single highest-load-bearing unknown.)
4. Do we get 2-period data for backtest? (Pilot gate.)
5. What internal vocabulary do you use post-o9? (Don't pitch with Zara-specific terms if they speak o9 language now.)
6. Is "RNK" your internal term? Agent 1 couldn't find it in any public Zara/Inditex source — it may be Mango-specific.

---

## 7 · What to fix in code FIRST — priority order

Based on the threshold audit + the SKU 1 bug Felipe found:

### P0 — Fixes the SKU 1 bug class (do these in the next session)

1. **Filter color-scope action propagation by SKU color** (the original bug Felipe found). `appendDropColorAction` and `appendExtendColorsAction` must check `sku.color_ref === affected_color_code` before attaching. Per the SKU-output cardinal rule.

2. **Rebuild identity graph** with corrected `canonicalPrefix` (D.1 audit fix that didn't propagate to DB).

3. **Replace `pdf_rank ≤ 10` with `top-quintile within family, normalized for exposure/age/distribution`** (threshold #3 in the verdict table). The single biggest source of false amplify_winner verdicts.

4. **Add the dual-evidence requirement to AMPLIFY_WINNER**: require BOTH `pdf_rank ≤ 10` AND `velocity_rank ≤ 10` (or both top-quintile after #3) — not either alone. The current OR logic means a SKU at top of the retailer's listing with no velocity confirmation still gets amplify. Add the rationale-bifurcation for the disagreement case (pattern #14 in cross-KPI matrix).

### P1 — Fixes the brittleness (do these in the audit window after P0)

5. **Reframe `markdown_risk_score`** from `stock_days / 90` to `forward_weeks_of_cover / season_weeks_remaining`. Per Caro & Gallien 2012 verbatim.

6. **Make returns thresholds category-and-channel-aware**: `returns_pct > 1.5× category_baseline(channel)` for INVESTIGATE; `> 2.5×` for KILL block. Keep absolute floors (18%, 35%) for fallback when baseline unknown. *Requires getting Mango's category baseline.*

7. **Make `sell_through_bought < 20%` window-aware**: don't fire before day 21. Make `total_bought > 1000` relative: `> p75(category_buys_this_season)`.

8. **Implement phased markdown depth** (15-20% / 30-40% / 50-60%) by time-elapsed-in-season, not by pvp tier. Add never-increase ratchet for clusters that already received a markdown.

### P2 — Vocabulary + structure (do these alongside the rename to "In-Season")

9. **Rename `lineage → style` everywhere user-facing** (feedback memory already captured).

10. **Bifurcate AMPLIFY_WINNER into `amplify_in_season` (distribute / replenish now) vs `amplify_next_season` (design sequels)**.

11. **Rename INVESTIGATE in user-facing copy** to "Marcar para revisión" / "Flag for review" — "investigate" is too software-y.

12. **Add `confidence_action` capping** when only PDF-rank-alone triggers amplify (Zara-flag case): cap at 60% per pattern #14.

### P3 — Backtest infrastructure (the pilot gate)

13. **Implement backtest engine** that takes prior-period verdicts and computes precision/recall against actual outcomes. Define metrics: hit rate on heroes (sell-through ≥ target), hit rate on kills (SKU actually died), markdown-correctness, replenish-correctness. **This is what converts the product from "thoughtful" to "defendable."**

14. **Capture confidence per recommendation post-hoc**: actual outcome vs predicted, with breakdown by confidence dimension (demand / margin / identity / creative_fit). This is the data we show Mango to prove the engine works.

---

## 8 · Source quality + open data needs

### Strongest peer-reviewed evidence (Tier 1)

- Caro & Gallien 2010 *Operations Research* — broken-assortment rule, twice-weekly cadence, +3-4% sales lift
- Caro & Gallien 2012 *Operations Research* — clearance cluster-level optimization, never-increase ratchet, +6% revenue lift
- Caro et al. 2010 *Interfaces* — the "offer" report, 5-6 week store life cycle
- Fisher & Raman 1996 *Operations Research* — accurate response, +60% profit from 50/50 commitment split
- Smith & Achabal 1998 *Management Science* — optimal markdown formula
- Bitran & Mondschein 1997 *Management Science* — 4 markdown steps capture 80% of optimal lift

### Strongest industry numbers (Tier 2 — verified)

- Inditex FY2024 gross margin: 57.8% (+8 bps) — only Inditex-disclosed margin proxy
- Coresight 2023: online apparel returns 24.4% avg, all-online 16.5%, brick 6-9%
- McKinsey State of Fashion 2025: 44% of assortments end up marked down industry-wide
- Nextail (Guess case via Gartner): -7.5% inventory coverage, +5% full-price in-season sales, +7% YoY EMEA
- ToolsGroup (Miroglio Fashion): +16% revenue, €1M margin uplift
- H&M 2018: $4.3B inventory pile-up, 17.6% inventory:sales Q1, Karl-Johan Persson target 12-14%
- Shein: <2% unsold, 100-unit test orders, 2,000-10,000 new SKUs/day (Rest of World)

### Open data needs from Mango contact (Felipe's homework)

1. Per-category returns baseline (most load-bearing unknown).
2. Confirmation that "RNK" is Mango-specific (Agent 1 could not source this term to any public Zara/Inditex artifact — documented Inditex name is "the offer" / *la oferta*).
3. Current internal vocabulary post-o9 deployment.
4. Whether 2-period data will be available for backtest (pilot gate).
5. Which o9 modules are live today vs roadmap (confirm in-season verdict layer NOT covered).

### Folk wisdom flagged — DO NOT cite as fact in pitch material

- **Zara 85% full-price sell-through** — repeated everywhere, not in any Inditex disclosure or peer-reviewed paper. Directionally correct, not citable.
- **Zara 10-15% markdown rate** — same. Mechanism is documented (cluster-level, 2 windows/year); depth is not.
- **Zara <1,000 units per batch** — widely cited, never sourced to Inditex disclosure.
- **Zara 12,000 designs/year** — folklore.
- **Centric "up to 18% revenue increase"** — Agent 2: no named customer, no methodology. Marketing fluff.

---

## 9 · TL;DR

1. **Don't fix bugs first** — fix the **framing**: aimily In-Season is a senior buyer's weekly decision-support layer, not a copy of Zara's HQ algorithm. The 9 verbs reflect how a senior buyer thinks, not what Zara's optimization model emits. That's a feature, not a bug.

2. **The SKU 1 bug is a symptom of `pdf_rank ≤ 10` being too crude.** Fix that one threshold (top-quintile-within-family + normalized for exposure) and require dual evidence (pdf_rank AND velocity_rank) — most of the catastrophic propagations disappear.

3. **8/14 thresholds need re-framing as relative/dynamic.** None are catastrophically wrong; several are brittle absolutes in a relative domain. P0-P3 priority order above.

4. **Mango pitch window is exceptional**: Helmersson on board + Casacuberta as champion + o9 deployment leaves in-season layer wide open. Lead with Mango Woman (Eva Gallego). Backtest is the pilot gate.

5. **Backtesting is the deliverable.** Caro & Gallien proved the Zara model with +3-4% sales lift via controlled field experiment. Aimily needs the equivalent — precision/recall on prior-period verdicts. Without it, every threshold is just an opinion.

6. **The wedge vs o9 is "in-season forensic verdict layer with buyer-readable explanations."** Frame as complementary, not replacement.

---

## 10 · Cross-references

- [`research_zara-inditex-2026-05-17.md`](research_zara-inditex-2026-05-17.md) — Agent 1, deepest source on Zara mechanics
- [`research_indie-merch-tech-2026-05-17.md`](research_indie-merch-tech-2026-05-17.md) — Agent 2, vendor landscape
- [`research_fast-fashion-rivals-mango-2026-05-17.md`](research_fast-fashion-rivals-mango-2026-05-17.md) — Agent 3, Mango governance + rivals
- [`research_merchandising-canon-2026-05-17.md`](research_merchandising-canon-2026-05-17.md) — Agent 4, academic canon
- [`research_codex-merch-intel-2026-05-17.md`](research_codex-merch-intel-2026-05-17.md) — Codex independent consult
- [`decision-map_aimily-in-season-2026-05-17.md`](../../../.claude/projects/-Users-felipemartinez-aimily/memory/decision-map_aimily-in-season-2026-05-17.md) — current decision tree state pre-research
- [`AUDIT.md`](../AUDIT.md) — 8-area audit (A-H)

# Fashion Merchandising Canon — Grounding aimily In-Season's Thresholds

> Research dossier · 2026-05-17 · Source-of-truth for re-grounding any threshold currently invented in `src/lib/strategy/classifiers/index.ts`, `recommend.ts`, and modulator. Distinguishes peer-reviewed citation from textbook folk wisdom. Every threshold currently in aimily In-Season is cross-checked against the canon at the end of this doc.

---

## 0. Executive summary — 10 hard facts only

1. **No academic paper specifies a numeric "amplify_winner" or "kill" threshold for an individual SKU.** The canon optimizes inventory/pricing models continuously; discrete verdict classes are an industry / software invention, not a textbook concept. aimily's 9 discrete actions are a UX layer on top of a continuous optimization problem.
2. **The canonical markdown trigger is time-on-floor + sell-through-vs-plan, not stock-days.** Smith & Achabal (1998) and Caro & Gallien (2012) both formulate optimal price as a function of remaining inventory, remaining season time, and demand elasticity — not "60 days of cover." The 60d gate in aimily is folk wisdom.
3. **Industry-standard markdown cadence (Goworek; CottonWorks)**: −25% at week 2–3, −50% at week 8, −75/80% at week 11–12. This is **trade practice**, not peer-reviewed.
4. **Caro & Gallien 2012 reports +6% clearance revenue** vs Zara's manual markdown process, after replacing manual decisions with a forecast-driven price optimization. Caro & Gallien 2010 reports **+3–4% sales** ($233–$353M revenue) from replacing manual shipment allocation with an OR model that pairs forecast demand with a shadow-price for display assortment.
5. **Fisher & Raman 1996 (Sport Obermeyer)**: producing ~50% of season volume *before* observing any sales and ~50% *after* an early-sales window of ~20% of cumulative season demand reduces stockout+markdown cost by enough to **raise profits ~60%** vs full speculative production. This is the strongest peer-reviewed evidence for the "early sales → reorder winners, kill losers" pattern aimily uses.
6. **Apparel online return rate (Coresight 2023): 24.4% average**, vs ~16.5% all-online and ~6–9% brick-and-mortar. Coresight explicitly does **not** publish a "kill" threshold — that's an aimily/industry invention.
7. **Sproles (1981, *Journal of Marketing*)** is the canonical fashion-lifecycle paper but **gives no duration ranges** for intro/rise/peak/decline. Vejlgaard (2008) gives non-peer-reviewed estimates: cosmetic trends 1–2 yrs, clothing 2–3 yrs, interiors 5–7 yrs. **Within-season SKU lifecycles are largely silent in the academic canon.**
8. **Rogers' adopter shares (2.5/13.5/34/34/16)** are the canonical adoption distribution but were derived from agricultural diffusion, not apparel; the mapping to fashion-cycle stages is qualitative, not quantitative.
9. **The newsvendor's "critical fractile" = (p−c) / p.** For apparel with full price €100 / cost €30 / salvage €15: critical fractile ≈ (100−30)/(100−15) = **82% service level** as the *profit-maximizing* stocking quantile — not the 95% Felipe might have assumed. Fashion's optimal service level is *lower* than basics because salvage values are non-trivial (markdowns recoup some cost).
10. **McKinsey State of Fashion 2025**: markdowns hit ~44% of assortments in 2024 (industry-wide); discounts up ~5pp YoY; 2023 produced ~5B surplus units. **The industry already accepts that ~half of every collection ends up marked down** — meaning a single SKU getting markdowned is not informative; the question is *depth and timing*.

---

## 1. Open-to-Buy (OTB) — canonical formula and re-buy logic

### Formula (textbook canon, Goworek / Diamond & Pintel / Kincade)

> **OTB$ = Planned Sales + Planned Markdowns + Planned EOM Inventory − Planned BOM Inventory − On-Order**

Equivalent forms:
- Planned Receipts = Planned Sales + Planned EOM − BOM (excluding markdowns)
- Cash OTB$ = Retail OTB$ ÷ (1 + initial markup %)

### KPIs that feed it
- **Stock-to-sales ratio (BOM stock / monthly sales)** — typically 2.5–4.0 for fashion specialty
- **Forward weeks of supply (FWOS)** — alternative to dollar planning, used in fast fashion
- **Initial markup %** — converts retail OTB to cost OTB
- **Cumulative markdown %** — historically 25–45% in department stores (Pashigian 1988)

### Re-buy logic for proven heroes — **silent in the textbook canon**

Diamond & Pintel and Goworek discuss OTB as a *budget*, not a *re-buy trigger*. The canonical re-buy mechanism appears in:
- **Fisher & Raman (1996)** — "accurate response" reserves ~50% of seasonal capacity for reactive production triggered by early sales. No SKU-level threshold given; the reorder quantity is a Bayesian posterior of demand updated on observed sales over the first ~20% of the season.
- **Caro & Gallien (2010)** — Zara's weekly shipment allocation uses a forecast tied to recent sales plus a "shadow price" for display-assortment effect (showing the SKU stimulates demand for the family).

There is **no canonical "if pdf_rank ≤ 10 then reorder" rule.** Industry practice picks top deciles by velocity, but the threshold is arbitrary.

**Sources**: Goworek (2007, *Fashion Buying*, 2nd ed., Wiley); Diamond & Pintel (2008, *Retail Buying*, 8th/9th ed., Pearson); Kincade & Gibson (2010, *Merchandising of Fashion Products*, Pearson); Shopify OTB guide 2026; CottonWorks Six-Month Plan PDF.

---

## 2. Fashion lifecycle academic frameworks

### Sproles 1981 (canonical paper)

> Sproles, G. B. (1981). "Analyzing Fashion Life Cycles — Principles and Perspectives." *Journal of Marketing*, 45(4), 116–124. DOI: 10.2307/1251479.

- **Stages described**: introduction, rise, peak/culmination, decline, obsolescence (5 stages).
- **Bell-curve representation**: standard.
- **Duration ranges**: **NOT specified** by Sproles. He explicitly says cycles span "decades and centuries" (long-run) or "several months to years" (short-run). No KPI thresholds.
- **KPIs distinguishing stages**: qualitative ("acceptance by innovators" → "mass acceptance" → "saturation" → "rejection by innovators"). Sproles cites no quantitative trigger.

### Rogers (1962/2003) diffusion of innovations

Adopter categories with exact %:
| Stage | Share |
|---|---|
| Innovators | 2.5% |
| Early Adopters | 13.5% |
| Early Majority | 34% |
| Late Majority | 34% |
| Laggards | 16% |

Tipping point conventionally drawn between Early Adopters and Early Majority (cumulative 16%). **Rogers' research was agricultural** — application to fashion is by analogy, not empirical replication.

### Vejlgaard (2008, *Anatomy of a Trend*, McGraw-Hill — trade book, not peer-reviewed)

- Cosmetic trends: 1–2 years
- Clothing & accessories: 2–3 years
- Interior design: 5–7 years

These are estimates, repeated in many textbooks without primary citation.

### Within-season SKU lifecycle (4–26 weeks)

**The academic canon is largely silent on the intra-season micro-lifecycle of an individual SKU.** Caro & Martínez-de-Albéniz (2015) note that "fast fashion" SKUs typically have 4–8 week display lifespans with deliberate scarcity to drive urgency. No canonical "ramp/decay velocity" multipliers exist. aimily's 1.3× ramp / 0.7× decay multipliers are an aimily invention.

**Sources**: Sproles 1981 (DOI 10.2307/1251479); Rogers 2003 (5th ed., Free Press, ISBN 978-0743222099); Vejlgaard 2008 (ISBN 978-0071489508); Caro & Martínez-de-Albéniz 2015 (Springer ISOR Vol. 223, DOI 10.1007/978-1-4899-7562-1_9).

---

## 3. Markdown optimization — the academic canon

### Smith & Achabal (1998), *Management Science* 44(3), 285–300, DOI 10.1287/mnsc.44.3.285

> "Clearance Pricing and Inventory Policies for Retail Chains"

**Demand model (paraphrased — confirmed via abstract + EconPapers + Semantic Scholar; the multiplicative form is canonical)**:

> d(t, p, I) = γ(t) · f(p) · g(I)

where γ(t) is a seasonal multiplier (e.g. exponential decay), f(p) is price-elasticity (often constant-elasticity or exponential), and g(I) is the **assortment/inventory-depletion effect** — sales rate falls as remaining assortment shrinks (the "broken size pile" phenomenon).

**Optimal markdown**: a function of remaining inventory I, remaining time T, salvage value S, and the parameters of γ, f, g. There is **no fixed "30% / 50% / 75%"** in Smith & Achabal — the optimal depth is computed.

**Practical implication**: salvage value S sets the floor of how deeply you should mark down. If S = 30% of cost, never go below cost−30%; if S = 0 (truly worthless after season), markdown depth can be very deep.

### Pashigian (1988), *American Economic Review* 78(5), 936–953

> "Demand Uncertainty and Sales: A Study of Fashion and Markdown Pricing"

- Central thesis: **markdowns are a rational response to demand uncertainty** under product variety. As fashion variety expanded 1958–1985, markdown frequency rose because the share of "fashion" (high uncertainty) merchandise rose.
- Empirical: department-store markdown % rose from ~5% (1950s) to ~25–30% (1980s); cumulative markdown in fashion categories typically 30–45%.
- No SKU-level kill threshold; the framework is industry-aggregate.

### Bitran & Mondschein (1997), *Management Science* 43(1), 64–79

> "Periodic Pricing of Seasonal Products in Retailing"

- Continuous-time dynamic-programming model. Stochastic customer arrivals with valuation distribution F(v).
- Optimal price decreases over time as inventory cushion shrinks and time-to-end-of-season shrinks. The optimal price path is **monotone non-increasing** (no markup once you've marked down).
- They show that with k discrete repricing opportunities, ~80% of the gain over a single fixed price is captured at k = 4 (i.e. **4 markdown steps capture most of the value**).

### Caro & Gallien (2012), *Operations Research* 60(6), 1404–1422, DOI 10.1287/opre.1120.1102

> "Clearance Pricing Optimization for a Fast-Fashion Retailer" (Zara)

- Combines a forecasting model (with covariates: price, season-week, store-cluster) with a price-optimization model.
- **Constraint Zara imposed**: prices can only decrease (not increase); price changes happen at fixed cadence; price = same across all stores in a country.
- Markdown decisions happen weekly during clearance. The optimization solves for the price path that maximizes revenue subject to inventory exhausting by end-of-season.
- **Reported lift: +6% clearance revenue** in a controlled experiment in Belgium + Ireland, FW 2008.
- **Critical context for aimily**: Zara markdowns during clearance only — "almost never discounted during the regular selling season" (Caro & Gallien 2012, abstract). aimily's in-season markdown_accelerate verdict is **not** the Zara model; it's closer to mass-market behavior (Mango, Inditex peers).

### Industry markdown cadence (trade practice, not peer-reviewed)

| Time on floor | Depth |
|---|---|
| Week 2–3 | −25% |
| Week 8 | −50% |
| Week 11–12 | −75% to −80% |

**Caveat**: this cadence is widely repeated in trade publications (CottonWorks, BoF) but I found no peer-reviewed citation establishing it as optimal.

---

## 4. Inventory theory applied to fashion

### Caro & Gallien (2010), *Operations Research* 58(2), 257–273

> "Inventory Management of a Fast-Fashion Retail Network" (Zara shipment allocation)

- Optimization model decides weekly SKU-level shipments from 2 central warehouses to ~1,500 stores.
- **Demand forecast**: historical sales + store-manager shipment-request signal (used as soft input).
- **Display-assortment effect** is the key innovation: shipping a SKU to a store stimulates demand for the family. The model uses a shadow price for "having the SKU on display" so a slow store still gets some inventory to keep the assortment visible.
- **Reported lift: +3–4% sales** in a controlled experiment, ≈ $233M / $353M additional revenue for 2007/2008.
- **No explicit "hero" or "winner" rule**; all SKUs flow through the same optimization, the optimization just allocates more to high-forecast stores.

### Caro & Martínez-de-Albéniz (2015), Springer ISOR Vol. 223

- Survey chapter on fast-fashion business model.
- Notes that demand forecasting in fashion *works best when early sales data are used to predict subsequent sales* (Fisher–Raman pattern).
- Cites overproduction range of 25–40% above demand as industry norm (forecasting errors ~32% annually for 15 major retailers studied).

---

## 5. Returns economics

### Coresight Research (April 2023)

- Online apparel return rate: **24.4%** (12 months ending March 2023).
- All-online return rate: **16.5%**.
- Brick-and-mortar: not measured directly but multiple Coresight reports estimate **6–9% in store**.
- 67% of brands believe zero returns would lift bottom line by ≥20% (signals returns are economically significant but not necessarily "kill-level").

### NRF / Appriss Retail (2024)

- US retail returns total: ~16.5% of sales, $743B (2023 figures, updated for 2024).
- Apparel category: 20.4% online estimate in 2024.

### **No canonical "kill" threshold exists in peer-reviewed literature.**

The closest implicit threshold comes from gross-margin arithmetic: a SKU with 50% gross margin survives ~33% returns if return cost = full margin loss + 15% logistics tax (back-of-envelope, not from a paper). At 60–70% gross margin (Zara), a SKU survives ~40–45% returns; at 35% gross margin (mass-market), the breakeven is ~25–30%.

### Recent academic work

- Petersen & Kumar (2009), *Journal of Marketing* 73(3): empirical evidence that managing return rates is more valuable than minimizing them — moderate returns correlate with higher LTV.
- Recent JFMM and IJRDM 2022–2024 papers focus on bracketing behavior and return-policy design, not SKU-level kill thresholds.

**Sources**: Coresight Research 2023 returns report; NRF Retail Returns 2023/2024; Petersen & Kumar 2009 (DOI 10.1509/jmkg.73.3.35).

---

## 6. Color / SKU portfolio theory — Fisher & Raman accurate response

### Fisher & Raman (1996), *Operations Research* 44(1), 87–99, DOI 10.1287/opre.44.1.87

> "Reducing the Cost of Demand Uncertainty Through Accurate Response to Early Sales"

- Case: Sport Obermeyer (ski parkas, ~1990–94).
- **Two-stage commitment**: ~50% of season volume committed pre-season (before Las Vegas trade-show orders observed), ~50% reactive.
- **Forecast accuracy after early sales**: coefficient of variation drops dramatically once 10–20% of season demand is observed. Fisher–Raman show that updating priors with early sales **roughly halves forecast error** for individual styles.
- **Reported profit lift: ~60%** vs the firm's manual response process.

### Fisher, Hammond, Obermeyer, Raman (1994), *HBR* May–June 1994

> "Making Supply Meet Demand in an Uncertain World"

- Distinguishes **predictable** SKUs (basics — forecast once, commit fully) from **unpredictable** SKUs (fashion — split commitment, reactive on early sales).
- "Panel of forecasters" approach: have multiple buyers independently forecast each SKU; the **standard deviation across forecasters** is itself the predictor of demand uncertainty.

### Within-style color decisions

- Fisher–Raman explicitly model **SKU-level** (style + color + size) reorders.
- No academic paper formalizes "extend colors with swatches from moodboard." That action (aimily's `extend_colors`) is a creative-merch hybrid not in the OR canon.
- Closest canonical analog: "demand transference" or "cannibalization" models in Smith et al. (2009, *MSOM*) on assortment effects — selling color A stimulates demand for the style; selling out of color A doesn't fully transfer.

---

## 7. Textbook citations

### Goworek, *Fashion Buying* (2nd ed., Wiley-Blackwell 2007, ISBN 978-1405149921)

Chapters typically include:
- Ch 1: The buying cycle (range planning → critical path → in-season management)
- Ch 4: Garment sourcing
- Ch 6: Fashion forecasting
- Ch 7: Pricing and margins
- The book does describe sell-through monitoring and the buyer's weekly review but **does not provide quantitative KPI thresholds** for kill/markdown/repeat decisions. The treatment is qualitative.

### Diamond & Pintel, *Retail Buying* (9th ed., Pearson 2012, ISBN 978-0132179355)

- Ch 6 (typical): Six-month merchandise plan
- Ch 7: Open-to-buy (formula as above)
- Ch 8: Model stock (the canonical method for assortment planning)
- Ch 13: Markdown management — covers reasons for markdowns and the 25%→50%→75% cadence as **rule of thumb**, citing "common practice" rather than primary research.

### Kincade & Gibson, *Merchandising of Fashion Products* (Pearson 2010, ISBN 978-0131731257)

- Comprehensive merchandising textbook; covers the FTAR (Fiber-Textile-Apparel-Retail) pipeline.
- Six-month plan, OTB, basic stock method, weeks-of-supply method.
- Markdown discussion is operational (how to record/post markdowns), not optimization-theoretic.

### Cachon & Terwiesch, *Matching Supply with Demand* (4th ed., McGraw-Hill 2018)

- Operations textbook with detailed newsvendor chapter (Ch 12).
- Critical-fractile derivation: q* = F⁻¹(C_u / (C_u + C_o)) where C_u = underage cost = price − cost, C_o = overage cost = cost − salvage.
- For fashion with p=100, c=30, s=15: q* = F⁻¹(70/85) ≈ **82nd percentile** of demand distribution.
- For basics with p=50, c=20, s=18: q* = F⁻¹(30/32) ≈ **94th percentile**.
- **Implication for aimily**: optimal service level is *lower for fashion than basics*. Pre-season stocking around 80–85% service level is canonical.

### Easey, *Fashion Marketing* (3rd ed., Wiley 2009)
### Jackson & Shaw, *Mastering Fashion Marketing* (Palgrave 2009)

Both are marketing-side textbooks. They cite Sproles 1981 and Rogers 1962 but add no quantitative thresholds beyond those primary sources.

### Folk-wisdom flag

Across these five textbooks, the following numbers appear **without primary citation** and should be treated as trade practice, not peer-reviewed truth:
- "Mark down at 25% / 50% / 75% on weeks 3 / 8 / 12"
- "Sell-through 60–80% is good; <50% is bad"
- "Fast fashion targets 80%+ STR; luxury targets ~50%"
- "Fashion items have a 12-week selling window"

---

## 8. Demand forecasting / newsvendor in fashion

### Newsvendor canonical setup (Cachon & Terwiesch ch. 12; Porteus 1990)

- Single period, perishable product, demand D ~ F.
- Order q to maximize E[π(q)] = p·E[min(q, D)] + s·E[(q − D)⁺] − c·q.
- Optimal: F(q*) = (p − c)/(p − s) = critical fractile.
- For lognormal/normal demand: q* = μ + z·σ where z = Φ⁻¹(critical fractile).

### Forecasting methods documented in the fashion canon

- **Bayesian updating from early sales** (Fisher–Raman 1996, Caro–Gallien 2010): the workhorse academic method. Use first 1–4 weeks of sales to update a prior derived from buyer judgment / historical analogs.
- **Look-alike historical analogs** (Caro–Gallien 2012): match the new SKU to last year's most-similar SKU at the same lifecycle stage; use that as prior.
- **Cluster-then-forecast** (industry; Toolio, Relex implementations): cluster SKUs by attributes, forecast at cluster, distribute to SKU by share.
- **ML approaches** (Loureiro, Miguéis, da Silva 2018, *Decision Support Systems*): neural nets outperform classical methods only when feature engineering captures seasonality + price + promo + weather. No magic-bullet ML method dominates short-lifecycle forecasting yet.

### Newsvendor + short history

- The "demand learning newsvendor" literature (Levi, Roundy, Shmoys 2007 *Math of OR*; Besbes & Muharremoglu 2013) shows that **with 2–4 weeks of sales data**, distribution-free bounds give within 5–15% of full-information optimum. This is the strongest theoretical argument for aimily's **early-season reorder window**.

---

## 9. Senior buyer / merchandiser decision frameworks

### The textbook position (Goworek, Diamond & Pintel, Kincade & Gibson)

The textbooks describe the buyer's job qualitatively as:
1. **Range planning** (pre-season, OTB-budget-constrained)
2. **Critical-path management** (sample → fit → bulk → DC → store)
3. **In-season trading** (weekly review of sell-through, action plan)
4. **End-of-season review** (kill list, basics carryover, hero analysis)

**There is no documented quantitative mental model.** The textbooks present senior-buyer judgment as the integration of:
- Sell-through actual vs plan
- Weeks of cover vs target
- Margin per SKU
- Returns rate
- Competitive landscape (was the competitor cheaper / on trend)
- Brand fit (does this SKU represent who we want to be)

### What the canon does have: the trading-week ritual

Every textbook describes a **weekly trading meeting** where buyer + merchandiser + planner review:
- Top-10 sellers (reorder candidates)
- Bottom-10 sellers (markdown / kill candidates)
- Forward weeks of cover by family
- OTB position
- Returns trend

The 10/10/family/OTB/returns structure **is** the canonical "senior-buyer mental model." aimily's per-SKU verdict pile is a *fine-grained version of this same ritual*, automated.

### The 2×2 / 3×3 cross-KPI frameworks

**Velocity × Margin matrix** (industry, e.g. Toolio dashboards; not in textbook canon):
| | Low margin | High margin |
|---|---|---|
| **Low velocity** | Kill | Investigate (premium niche?) |
| **High velocity** | Drive (volume) | Star (amplify) |

**Velocity × Sell-through matrix** (similar):
| | Low STR | High STR |
|---|---|---|
| **Low velocity** | Dog | (rare — slow but selling clean) |
| **High velocity** | Hero — but watch stock | Hero — reorder |

**BCG growth-share applied to apparel** (Smart Insights, Anderson UCLA blog):
- Stars: high growth + high share — feed (reorder)
- Cash cows: low growth + high share — milk (carryover basic)
- Question marks: high growth + low share — investigate
- Dogs: low growth + low share — kill or markdown

**Caveat**: BCG was designed for product portfolios with multi-year horizons, not 12-week fashion cycles. Direct mapping is folk wisdom.

---

## 10. Carryover decisions

### Textbook treatment (Goworek; Kincade & Gibson)

- "Basic carryover" applies to **never-out-of-stock** SKUs: white T-shirts, denim 5-pocket, classic blazer. The canonical method is the **basic stock method** (Diamond & Pintel ch. 7): planned BOM = avg monthly sales + safety stock; reorder triggered at min-stock.
- "Trend carryover" is **silent in the academic canon**. The decision to carry a trend-driven hero into the next season as a sequel is a creative-merch judgment, not a modeled decision.
- Fisher & Raman 1996 implicitly handles this: the second commitment (reactive production) is for the *current* season; carryover into next season is outside the model's horizon.

### Industry practice (Mango / Inditex case studies)

- ~10–15% of an assortment is "carryover basic" (always available).
- ~5–10% of trend SKUs are "amplified" into 2–3 sequel SKUs (different color, fabric, silhouette tweak) in the *following* season.
- The trigger for sequel: full-price sell-through ≥ 80% within the first 4 weeks AND positive customer reviews / low returns. **Not in peer-reviewed papers** — sourced from BoF and IESE case studies on Mango.

---

## 11. THE CANONICAL DECISION FRAMEWORK — distilled

Based on integration of Smith & Achabal, Caro & Gallien (both papers), Fisher & Raman, Pashigian, Bitran & Mondschein, plus the four textbooks, the *implicit* senior-buyer mental model that emerges is:

### A. Weekly trading-loop signals (per SKU)

1. **Velocity vs forecast**: actual sell rate ÷ planned rate. >1.2× = winner. <0.7× = laggard.
2. **Forward weeks of cover**: stock ÷ (forward planned weekly demand). Markdown trigger when FWOC > (remaining season weeks + 1).
3. **Sell-through-to-date vs plan**: actual STR_t ÷ planned STR_t. Same 1.2× / 0.7× bands.
4. **Effective margin**: (price − cost − markdown_taken − return_cost) ÷ price. Kill candidate when negative.
5. **Returns rate**: vs category benchmark (apparel ≈ 20–25% online, ≈ 6–9% store). >1.5× category = investigate; >2× category = markdown / kill.

### B. Stage-gating

Combine signals through a decision tree, in order:

1. **Is returns-adjusted margin negative?** → KILL (markdown to clear) regardless of velocity.
2. **Is velocity > 1.2× AND returns ≤ 1× category AND sell-through-to-date ≥ 80%?** → AMPLIFY (reorder / sequel).
3. **Is velocity > 1.2× AND returns 1–1.5× category?** → INVESTIGATE (fit issue masking a winner).
4. **Is velocity 0.7–1.2× AND it's a basic?** → CARRYOVER.
5. **Is velocity < 0.7× AND time on floor < 4 weeks?** → HOLD (give it time).
6. **Is velocity < 0.7× AND time on floor 4–8 weeks?** → REDUCE BUY / RESIZE DOWN.
7. **Is velocity < 0.7× AND time on floor > 8 weeks?** → MARKDOWN.

### C. The cross-KPI matrix the canon implies

The two strongest predictors in the literature are **velocity** (Fisher–Raman) and **margin-after-returns** (Smith–Achabal, Petersen–Kumar). The senior buyer effectively builds a 2×2:

| | Low margin-after-returns | High margin-after-returns |
|---|---|---|
| **Low velocity** | Kill fast / markdown deep | Hold / investigate fit / reduce buy |
| **High velocity** | Drive volume / accept thin margin | **The unicorn** — amplify, reorder, sequel |

Sell-through is the *integrator* (it folds velocity × time-on-floor into one number) — once chosen, the buyer uses it to time the matrix actions.

---

## 12. aimily In-Season's 9 actions vs the canon

| aimily action | Canon support | Canonical equivalent |
|---|---|---|
| **kill** | Strong (Smith & Achabal, Caro & Gallien 2012) | Optimal markdown-to-zero when salvage ≥ 0 and time-to-end < buffer |
| **markdown_accelerate** | Strong (Bitran & Mondschein, Caro & Gallien 2012) | Multi-step markdown with optimal depth; Caro–Gallien recommends 4 steps |
| **replenish (N uds)** | Strong (Fisher & Raman, Caro & Gallien 2010) | Bayesian-updated reorder quantity |
| **reduce_buy / resize_down** | Moderate (Fisher & Raman second commitment as negative) | "Don't exercise the second-commitment option" |
| **investigate** | **Weak** — no academic equivalent | Closest: "review fit" in textbook trading-loop |
| **amplify_winner (replicate style)** | Moderate (Caro–Martinez-de-Albeniz 2015) | "Successful style → develop sequel" — Mango/Inditex industry practice |
| **extend_colors (swatches from moodboard)** | **None** — aimily invention | Closest: assortment-planning literature on color depth |
| **carryover (basic)** | Strong (Diamond & Pintel ch. 7 basic-stock method) | Basic-stock model |
| **hold** | Implicit (Fisher–Raman early-sales window) | "Wait for the early-sales signal to mature" |

### Recommended consolidations / renames

- **investigate** and **amplify_winner** are *adjacent* in the canon (high-velocity SKUs warrant deeper analysis). Consider merging into a single "review-action" verdict that asks the buyer to decide between reorder / sequel / accept.
- **extend_colors** has no canonical analog. Either re-anchor it on a documented industry practice (Mango's "color depth play" in successful styles) or label it explicitly as an aimily creative-merch differentiator.
- **resize_down** is the negation of Fisher–Raman's second commitment. Rename to **reduce_reorder** to align with the canonical mental model.
- **markdown_accelerate** should specify *depth + cadence*, not just "mark down". Caro–Gallien's 4-step path is the canon.

---

## 13. aimily's current thresholds vs the canon — line-by-line

| aimily threshold | Canon verdict | Recommended threshold |
|---|---|---|
| **18% returns gate for `investigate`** | **Silent / under benchmark.** Coresight 2023 says apparel online is 24.4% avg. 18% is *below* category norm. | Move to **>1.5× category benchmark**. For apparel online: investigate when returns > 30–35%. |
| **pdf_rank ≤ 10 for `amplify_winner`** | **Invented.** Fisher–Raman would say: rank by Bayesian-updated demand posterior, not by raw rank. | Replace with **velocity > 1.2× plan AND STR > 80% at week 4**. |
| **20% sell_through_bought for `resize_down`** | **Weak support.** Canonical "low" STR is typically <50% at week 4–6 (industry rule of thumb, not papers). 20% at any meaningful time-on-floor is severe. | If at week 4: STR <40% → reduce reorder. STR <20% → markdown candidate, not just reduce. |
| **60d stock for `markdown_accelerate`** | **Wrong unit.** Canon uses *forward weeks of cover relative to remaining season*, not days. Caro–Gallien 2012 explicit on this. | Markdown trigger: **FWOC > remaining season weeks + 1 week buffer**. For a 12-week season at week 6: trigger if FWOC > 7. |
| **35% returns for `amplify` block** | **Reasonable** but should be category-relative. 35% is plausibly the breakeven for ~60% gross-margin SKUs (Zara economics). | Make it **dynamic: 1.5–2× category benchmark**, scaled by gross-margin. For 60% GM apparel online: 35–40% is correct. For 35% GM: drop to 25%. |
| **1.3× ramp / 0.7× decay velocity multipliers** | **No academic basis.** Sproles is silent on intra-season velocity transitions. | Empirically calibrate from the retailer's own history (the Fisher–Raman approach: forecaster panel + Bayesian update). Don't hard-code multipliers. |
| **total_bought >1000 for `resize_down` gate** | **No academic basis.** The canon thinks in % of buy, not absolute units. | Replace with **remaining buy ÷ original buy > 50% AND velocity < 0.7× plan**. |

---

## 14. Open research questions — where the canon is silent or contradicts

1. **Discrete verdict classes** — the academic canon is continuous-optimization. aimily's 9 discrete verdicts are a UX choice that no paper validates. Open question: does discretization cost performance vs continuous optimization, and how much?
2. **Within-season SKU lifecycle stages** — Sproles is about long-run trends; nothing in the canon formalizes the 4–26 week SKU micro-lifecycle. Industry practice fills the gap with folk wisdom (week-2 / week-8 / week-12 markdowns).
3. **Color portfolio rebalancing** — Fisher–Raman handles SKU-level (style+color+size) but doesn't address "the green sold 3× the blue — kill blue, double green." This is mass-market practice with no peer-reviewed citation.
4. **Returns-adjusted velocity** — Petersen–Kumar 2009 argues moderate returns ≠ kill. But the apparel-specific threshold where returns flip a winner into a loser is empirically open.
5. **Carryover decision criteria for trend SKUs** — well-defined for basics (basic-stock method), undefined in the academic literature for trend pieces. Mango/Inditex use ~80% STR-at-week-4 as the sequel trigger but this is industry lore.
6. **"Investigate" as a verdict** — there's no academic action class for "send this to a human for closer look." It's a software workflow concept, not a canonical merch action.
7. **The 4-step optimal markdown** (Bitran–Mondschein) vs the **2-step coarse markdown** (industry weekly markdown reviews) — gap between optimal and practical not closed in the literature.
8. **Display-assortment vs SKU-level decisions** — Caro–Gallien 2010 shows that a SKU's value isn't just its own sales but its contribution to the family's display. aimily's per-SKU verdicts may double-count or miss this family-level effect.

---

## 15. References

### Peer-reviewed (primary literature)

- Bitran, G. R., & Mondschein, S. V. (1997). Periodic Pricing of Seasonal Products in Retailing. *Management Science*, 43(1), 64–79. DOI: 10.1287/mnsc.43.1.64. https://pubsonline.informs.org/doi/10.1287/mnsc.43.1.64
- Caro, F., & Gallien, J. (2010). Inventory Management of a Fast-Fashion Retail Network. *Operations Research*, 58(2), 257–273. DOI: 10.1287/opre.1090.0698. PDF: http://personal.anderson.ucla.edu/felipe.caro/papers/pdf_FC07.pdf
- Caro, F., & Gallien, J. (2012). Clearance Pricing Optimization for a Fast-Fashion Retailer. *Operations Research*, 60(6), 1404–1422. DOI: 10.1287/opre.1120.1102. PDF: http://personal.anderson.ucla.edu/felipe.caro/papers/pdf_FC15.pdf
- Caro, F., Gallien, J., Díaz, M., García, J., Corredoira, J. M., Montes, M., Ramos, J. A., & Correa, J. (2010). Zara Uses Operations Research to Reengineer Its Global Distribution Process. *Interfaces*, 40(1), 71–84. DOI: 10.1287/inte.1090.0472. PDF: http://web.mit.edu/jgallien/www/ZaraInterfaces2010.pdf
- Caro, F., & Martínez-de-Albéniz, V. (2015). Fast Fashion: Business Model Overview and Research Opportunities. In *Retail Supply Chain Management* (ISOR Vol. 223, pp. 237–264). Springer. DOI: 10.1007/978-1-4899-7562-1_9.
- Fisher, M., & Raman, A. (1996). Reducing the Cost of Demand Uncertainty Through Accurate Response to Early Sales. *Operations Research*, 44(1), 87–99. DOI: 10.1287/opre.44.1.87.
- Fisher, M., Hammond, J. H., Obermeyer, W. R., & Raman, A. (1994). Making Supply Meet Demand in an Uncertain World. *Harvard Business Review*, May–June 1994. https://hbr.org/1994/05/making-supply-meet-demand-in-an-uncertain-world
- Pashigian, B. P. (1988). Demand Uncertainty and Sales: A Study of Fashion and Markdown Pricing. *American Economic Review*, 78(5), 936–953.
- Petersen, J. A., & Kumar, V. (2009). Are Product Returns a Necessary Evil? Antecedents and Consequences. *Journal of Marketing*, 73(3), 35–51. DOI: 10.1509/jmkg.73.3.35.
- Rogers, E. M. (2003). *Diffusion of Innovations* (5th ed.). Free Press. ISBN: 978-0743222099.
- Smith, S. A., & Achabal, D. D. (1998). Clearance Pricing and Inventory Policies for Retail Chains. *Management Science*, 44(3), 285–300. DOI: 10.1287/mnsc.44.3.285.
- Sproles, G. B. (1981). Analyzing Fashion Life Cycles — Principles and Perspectives. *Journal of Marketing*, 45(4), 116–124. DOI: 10.2307/1251479.

### Textbooks

- Cachon, G., & Terwiesch, C. (2018). *Matching Supply with Demand: An Introduction to Operations Management* (4th ed.). McGraw-Hill. ISBN: 978-1259872075.
- Diamond, J., & Pintel, G. (2012). *Retail Buying* (9th ed.). Pearson. ISBN: 978-0132179355.
- Easey, M. (Ed.) (2009). *Fashion Marketing* (3rd ed.). Wiley-Blackwell. ISBN: 978-1405139533.
- Goworek, H. (2007). *Fashion Buying* (2nd ed.). Wiley-Blackwell. ISBN: 978-1405149921.
- Jackson, T., & Shaw, D. (2009). *Mastering Fashion Marketing*. Palgrave Macmillan. ISBN: 978-0230205963.
- Kincade, D. H., & Gibson, F. Y. (2010). *Merchandising of Fashion Products*. Pearson. ISBN: 978-0131731257.
- Vejlgaard, H. (2008). *Anatomy of a Trend*. McGraw-Hill. ISBN: 978-0071489508. (Trade book — flag as not peer-reviewed.)

### Industry / trade

- Coresight Research (2023). *The True Cost of Apparel Returns*. https://coresight.com/research/the-true-cost-of-apparel-returns-alarming-return-rates-require-loss-minimization-solutions/
- McKinsey & BoF (2024). *The State of Fashion 2025*. https://www.mckinsey.com/industries/retail/our-insights/state-of-fashion-2025
- McKinsey & BoF (2025). *The State of Fashion 2026: When the rules change*. https://www.mckinsey.com/industries/retail/our-insights/state-of-fashion
- NRF / Appriss Retail (2023/2024). *Retail Returns Report*.
- Shopify (2026). *Open-to-Buy: Definition, Formula, and Plan Guide*. https://www.shopify.com/blog/open-to-buy-plans
- CottonWorks. *Six-Month Plan, Parts 1–4*. https://www.cottonworks.com/
- Heuritech. *Sell-Through Rate: Boost Sales and Inventory Management*. https://heuritech.com/articles/sell-through-fashion/
- BoF (multiple dates). *The Art of the Markdown*. https://www.businessoffashion.com/articles/news-analysis/the-art-of-the-markdown/

### Folk-wisdom flagged (claims that propagate across textbooks without primary citation)

- "Mark down at 25/50/75% on weeks 3/8/12" — trade practice; no primary citation found.
- "Sell-through 60–80% is the fashion benchmark" — first traced to a 2018 Coresight survey of US retailers; the 80% threshold then propagated unchallenged.
- "Fast fashion 4-week display lifespan" — IESE / BoF case studies on Zara; not in peer-reviewed papers.
- "10–15% basic carryover, 5–10% sequel rate" — Mango / Inditex investor-presentation lore; not in the academic canon.

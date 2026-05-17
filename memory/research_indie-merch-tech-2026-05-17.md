# Research · Indie/Enterprise Merch-Tech Vendor Landscape (2026-05-17)

> Scope: ground aimily In-Season's per-SKU verdict thresholds (kill / markdown / replenish / resize_down / investigate / amplify_winner / extend_colors / carryover / hold) against what real merch-tech vendors publish, automate or claim. Mango is the priority pilot target because they signed o9 on 2025-03-25.

> Skepticism note (read first): vendor marketing in this category is **vague by design** — they sell "AI" and "decisions" without publishing numerical thresholds. Almost every concrete number in this document either (a) comes from public help docs (Nextail is the gold-standard exception — they actually publish thresholds), (b) is an industry consensus number quoted by third-party guides, or (c) is a benchmark from a vertical analyst. Vendor whitepapers are mostly fluff. Every claim below is flagged **VERIFIED** (cited primary source with the number), **CLAIMED** (vendor asserts capability, no number) or **CONSENSUS** (industry guide / analyst, not the vendor itself).

---

## Executive Summary (10 hard-facts bullets)

1. **Mango chose o9 on 2025-03-25** for Merchandise Financial Planning (MFP), Assortment Planning and Demand Planning across ~2,850 stores in 120 markets — explicitly replacing "fragmented, outdated systems" with an integrated AI-powered framework. The press release has NO quote from Mango leadership and NO KPI targets — only o9's CEO statement [o9 press release · businesswire mirror · just-style]. **VERIFIED on partnership, CLAIMED on outcomes.**
2. **Nextail is the only vendor in this set that publishes numerical replenishment thresholds in plain help docs.** Warehouse coverage bands are: **Very Low <2 weeks · Low 2-6 weeks · Good >6 weeks**; demand-forecast lookback **capped at 10 weeks**; supports both **soft** (skip if WH stock + sales probability low) and **hard** minimum display logic. **VERIFIED** [help.nextail.co coverage + replenishment params].
3. **Industry consensus markdown trigger**: end-of-season sell-through **below 60%** is the cue for most apparel buying teams to escalate markdowns; **<50%** signals structural problem. Markdown depth typically: 15–20% at 60% time-elapsed → 30–40% at 80% time-elapsed → 50–60% at end-of-season [Shopify · Toolio · Peasy]. **CONSENSUS, not vendor-published.**
4. **Sell-through targets vary by product archetype**: fast-fashion 85%+ · basics/replenishment 65–70% · core styles 70–80% (excellent) · seasonal fashion 60%+ (strong) · <50% signals markdown/marketing intervention [Shopify · Toolio · AIMS360]. **CONSENSUS.**
5. **Returns rate benchmarks**: online apparel **26% average globally**, **30–40% high range** (US), dresses ~54%, skirts ~47%, brick-and-mortar 8–10% [Prime-AI · NetSuite]. None of the vendors in this survey publish a returns-rate "kill" threshold — they all expose returns as a KPI without an automation rule. **CONSENSUS / GAP.**
6. **Weeks-of-cover targets by archetype** (industry consensus, vendor-agnostic): fast-fashion 4–6 weeks · basics 3–4 weeks · seasonal jackets up to 12 weeks · premium footwear 10–14 weeks · sandals (in season) ~6 weeks [stylematrix.io · reactivesdp]. **CONSENSUS.**
7. **Service-level differentiation by ABC**: top-tier (AA) **99%** · fast-movers (AB) **97–98%** · low-priority (CC) **85–90%**; top NA retailers target **98.5% in-stock** on hero items [businessplan-templates.com · retalon]. **CONSENSUS.**
8. **Dead-stock ratio bands**: <5% healthy · 5–10% warning · >10% serious problem [eFulfillment Service]. **CONSENSUS.**
9. **Only Blue Yonder and ToolsGroup explicitly market "explainability" / "confidence" as a feature**. Blue Yonder Luminate uses "explainable ML" language; ToolsGroup ships probabilistic forecasts with explicit confidence intervals (stock-to-service curve). o9 talks about "explaining plan vs actual deviations" but ships single-point recommendations. Centric AI Agents "break down price suggestions in plain language". None publishes a 6-dimensional confidence vector — all single-point or single-interval. **VERIFIED differentiation gap.**
10. **Vendor maturity is reverse to fashion-specificity**: Blue Yonder + o9 + Anaplan are biggest and most generic (consumer goods + retail at scale). Nextail + Toolio + Centric are smaller and more fashion-native. Nextail and Toolio are the only ones where you can read the actual decision logic in their public help docs.

---

## Per-Vendor Profile (priority 5)

### 1. o9 Solutions — Mango's pick (signed 2025-03-25)

**Modules deployed at Mango**: MFP, Assortment Planning, Demand Planning. Downstream o9 supports Forecasting, Allocation, Replenishment, Promotion + Markdown Optimization, Supplier Collaboration through the same "Digital Brain" platform [o9 merchandise planning page].

**KPIs exposed** (CLAIMED, not numerically targeted on public site):
- Sales, margin, inventory turns, promotional effectiveness — "continuously tracked"
- Sell-through performance (input to inventory recommendations)
- In-season KPIs "for timely market adjustments"
- Multi-channel inventory alignment (e-comm + retail + wholesale)

**Thresholds published**: **NONE.** o9's marketing is uniformly capability-level. The "Fashion & Apparel Case Study" lists capabilities ("postpone commitment decisions to procure fabric, lock color, size, destination") but **zero quantified customer results** — no % uplift, no sell-through delta, no margin improvement. This is unusual for a Leader-quadrant vendor and worth flagging in the Mango pitch.

**Automation triggers**: described abstractly as "specialized AI agents" answering "what happened and why? what is likely to happen? what cross-functional actions should be taken?" The Enterprise Knowledge Graph (EKG) is a four-layer closed-loop system that "captures business relationships and converts raw data into contextual knowledge". **No specific event-based trigger is published.**

**Confidence handling**: o9 says the knowledge model gets "progressively faster and more intelligent in explaining plan versus actual deviations" — this is post-hoc explanation, not pre-decision confidence. No multi-dimensional confidence score is exposed. **Single-point recommendation, no uncertainty band.**

**Recognition**: 2025 Gartner Peer Insights Customers' Choice for Supply Chain Planning; Leader in inaugural 2026 Gartner Magic Quadrant for Discrete Industries SCP.

### 2. Centric Software (Centric Planning + Visual Boards + Pricing & Inventory + Market Intelligence ex-EDITED)

**KPIs exposed**: Assortment KPIs (financial alignment, store-cluster performance, share-of-category mix), pricing KPIs (lifecycle pricing, margin impact, competitor pricing), demand forecasting accuracy. Visual Boards are "visualized pivot tables that combine live data with 2D/3D images" — visualization-first, KPI-set is whatever the customer wires in.

**Thresholds published**: **NONE numerically.** Centric ships a unified forecasting engine across pre-season + in-season + EOS. Marketing claims "revenue increases of up to 18% from select customer implementations" but does not break that down.

**Automation triggers**: New (Nov 2025) "AI Agents" recommend price + markdown actions "explained in plain language" with drivers like demand shifts, competitor pricing, margin impact. The trigger logic itself is not published.

**Confidence handling**: AI Agents explain "key drivers" of a recommendation — this is feature-attribution, not confidence quantification. **Single-point recommendations with explanation. No uncertainty modeling exposed.**

**Strength**: visual-first pivoting + competitive intelligence (Market Intelligence module, ex-EDITED). Weakness for our wedge: the decision engine logic is hidden, customer has to take it on trust.

### 3. Nextail — Spanish, fashion-native (THE benchmark vendor)

**This is the only vendor in the survey that publishes its decision logic in plain English help docs.**

**KPIs exposed** [help.nextail.co]:
- Warehouse Coverage (in weeks)
- Demand forecast (period parameter, lookback in days, lookback capped at 10 weeks)
- Stockout rate (calculated from past sales + stockouts, used to back out "real" demand)
- Performance Index
- Residual Value (for EOS markdown framing)
- Sell-through rate (per SKU/PoS/day)

**Thresholds published** [help.nextail.co/en/coverage-calculation-and-levels]:
- **Warehouse coverage Very Low: < 2 weeks**
- **Warehouse coverage Low: 2–6 weeks**
- **Warehouse coverage Good: > 6 weeks**
- Demand forecast lookback: **capped at 10 weeks**
- Soft minimum display: skipped if WH stock low AND store sales probability low
- Hard minimum display: enforced as long as WH stock exists

**Automation triggers** (CLAIMED in marketing, partially documented in help):
- Replenishment is triggered by the optimization stage which picks "the most profitable SKU/PoS/day allocation from billions of combinations"
- Constraints: prepacks, blocks, visual rules, sales thresholds, min/max store orders, max store capacities, min display

**Confidence handling**: Performance Index is a derived metric (Nextail's wrapper around sell-through + velocity) but no multi-dim confidence vector. **Single-point.**

**Strength for our research**: Nextail is the closest reference for what an *implementable, fashion-native replenishment engine* looks like, with thresholds we can copy-anchor against. **Use Nextail's coverage bands as the industry comparable for aimily's replenishment thresholds.**

### 4. ToolsGroup (SO99+, demand sensing)

**KPIs exposed**: service level, fill rate, forecast accuracy, inventory turns, weeks-of-cover. Probabilistic forecasts with full distribution (not just point estimate).

**Thresholds published** (these are improvement *ranges* claimed in ToolsGroup ebook, **VERIFIED**) [toolsgroup.com/wp-content/uploads/2020/08/EB_EN_How-to-Calculate-...pdf]:
- Service level improvement: **3–5 percentage points** is typical; can be more if base <90%
- Specifically: 90% → 95% fill rate is achievable; 96% → 98% is the higher band
- Forecast accuracy improvement: **15–40%**
- Inventory reduction: **10–30%**
- Service level uplift: **2–5 pp**
- Customer case: Miroglio Fashion → **+16% revenue, €1M margin uplift**

**Automation triggers**: SO99+ ships a "stock-to-service curve" — the demand probability distribution over lead time, with the service level attained for any given stock level. This IS an explicit decision surface (rare).

**Confidence handling**: **The only vendor in this survey that ships uncertainty as a first-class output** — probabilistic forecast returns a full distribution with confidence intervals, not a point estimate. The narrative ("a forecast number with bands around it of possible outcomes, each with a probability") is the closest analog to aimily's 6-dimension confidence stack. Still a single dimension (demand), but at least it admits uncertainty.

**Differentiation**: this is the vendor we should *match or exceed* on confidence presentation, but they cover demand only — they don't quantify margin uncertainty, returns risk, lineage cannibalization etc.

### 5. RELEX Solutions

**KPIs exposed**: inventory levels, waste, availability, on-shelf availability, forecast accuracy. Strong on grocery → "perishables, fresh, slow + fast movers, seasonality, promotions".

**Thresholds published**: **NONE on public site.** RELEX is consistent with the "AI/ML + unified platform + automation" marketing template — no numerical thresholds in customer-facing material.

**Automation triggers**: "automate replenishment and inventory optimization for more efficient inventory positioning and waste reduction" — capability-level only. Recent (2025) Monoprix deployment across 400 stores cited; no fashion-specific result published.

**Confidence handling**: NONE published. **Single-point.**

**Fashion fit**: weaker than Nextail/Centric — RELEX's DNA is grocery/perishables. DistriCenter (French fashion + home textiles + shoes) is the named fashion reference. Mango wouldn't pick them.

---

## The o9-Mango Deployment: what we know, what we can infer, what to ask

**What we know (verified)**:
- Announced 2025-03-25 [o9 / Business Wire / silicon.co.uk / just-style.com]
- Modules: MFP + Assortment Planning + Demand Planning (3 of o9's core retail solutions, not the full Digital Brain)
- Scope: ~2,850 stores, 120 markets
- Stated goal: replace "fragmented, outdated systems" with "integrated, AI-powered, data-driven planning framework"
- Mango's 2025 reported results (separately): +13% sales (€3.767B), +13% EBITDA (€722M), +11% net profit, +260 stores opened, €225M tech/logistics investment [Modaes / FashionNetwork / WWD]
- o9 CEO quote in press release; **NO Mango leadership quote published**

**What we can infer**:
- The o9 deployment in 2025 is **early-stage** at Mango — go-live likely 2026-2027 given the modules are MFP/Assortment/Demand (pre-season heavy). In-season execution layer (allocation, replenishment, markdown automation) is **not in the announced scope**.
- This is exactly the gap aimily In-Season can colonize: **in-season forensics + per-SKU verdict layer that o9 doesn't ship as MVP modules**. o9 will eventually offer it, but the 18–30 month window is real.
- Mango has signed o9 for *strategic* planning, not *tactical* execution — leaves the per-SKU forensic verdict layer wide open as a complementary buy.

**What to ask Mango directly in pilot conversations**:
1. Which o9 modules are in production today vs. roadmap? (Confirm in-season verdict layer is NOT covered.)
2. Who owns the in-season decision (markdown, kill, replicate) at SKU level — buyer? merchandiser? planning team? Are they in the o9 UI or in an Excel layer on top?
3. What's your current full-price sell-through target by archetype? (anchor question — pick a number they own)
4. What's your current returns rate per category, and what threshold triggers an item review?
5. What weeks-of-cover do you target for fast-fashion vs basics vs party-wear?
6. What's your dead-stock ratio today and what's the target?
7. Do you have a backtest framework for in-season decisions (would buyer X's decision have made €N more if they'd called it differently)? — **This is our killer question**, aimily ships it as the pilot deliverable; o9 does not.
8. How is confidence currently represented on a recommendation? Is it a single number, a band, or absent? — **Anchor for the 6-dimension confidence pitch.**

---

## Cross-Vendor Consensus (where they all agree — likely industry truth)

| Topic | Consensus | Source pattern |
|---|---|---|
| **Sell-through is the master KPI for in-season fashion** | Every vendor exposes it | o9 + Centric + Nextail + Toolio + Blue Yonder + Lily AI all reference sell-through as primary signal |
| **Weeks of cover is the master inventory KPI** | Every vendor exposes WoC | Nextail (explicit bands), o9 + Centric (mentioned), industry guides converge on 4–6w fast-fashion / 10–14w premium |
| **Markdown is a multi-stage process, not a single event** | Stage 1 light (15–20%) → Stage 2 deeper (30–40%) → Stage 3 clearance (50–60%) | Shopify, Toolio, Peasy, Centric Pricing all describe a phased approach |
| **Returns are a reportable KPI but not a decision driver** | All vendors *show* returns; none of the 10 *automate* a kill decision on returns alone | Cross-vendor — nobody publishes a returns threshold rule |
| **Probabilistic / confidence-aware forecasting is the future** | All major vendors are moving here | ToolsGroup ships it now; Blue Yonder + o9 + Centric describe "explainable AI" |
| **In-season decisions need to be tied to OTB** | Open-to-Buy is the budget gating layer above SKU verdicts | Anaplan, Toolio, Blue Yonder, o9 all reference OTB |
| **Lifecycle stage matters** | Pre-season → in-season → EOS need different decision logic | Centric, o9, Toolio explicit; Nextail implicit |
| **Service level should be differentiated by ABC** | AA 99% / AB 97–98% / CC 85–90% | Multiple industry guides, no vendor disagrees |

## Cross-Vendor Disagreement (open debate — where we can have an opinion)

| Topic | Position A | Position B | Our read |
|---|---|---|---|
| **Single-point vs probabilistic forecast** | o9, Centric, RELEX, Blue Yonder ship single-point with explanation | ToolsGroup ships full distribution | ToolsGroup is right but stuck on demand only — aimily can extend to multi-dim |
| **Decision logic transparency** | Nextail publishes thresholds in help docs | Everyone else hides logic in "AI" | Nextail's transparency builds trust; the others let customer wonder if it's actually working |
| **In-season vs pre-season focus** | o9, Anaplan, Blue Yonder are pre-season heavy | Nextail, Centric Pricing are in-season heavy | Pre-season is the legacy moat; in-season is the wedge where forensic per-SKU verdicts live |
| **Markdown automation depth** | Blue Yonder ships "AI Markdown Predictor" (autonomous price+timing recommendation); Centric Pricing similar | o9 mentions markdown but no autonomous engine | Disagree on autonomy — buyer-in-the-loop seems more accepted than fully autonomous |
| **Visual vs tabular UI** | Centric Visual Boards (pivot tables w/ 2D/3D imagery), Nextail visual constraints | o9, Anaplan, Blue Yonder are mostly grids | Aimily's PDF-overlay is closer to Centric philosophy — good company |
| **Attribute taxonomy as billable module** | Lily AI sells attribute enrichment as standalone, +15% sell-through claim | Bundled inside other vendors' platforms | aimily Strategy already has versioned taxonomies — keep this billable |
| **Confidence as a UI element** | ToolsGroup exposes distribution; Blue Yonder exposes "confidence"; Centric exposes drivers | o9, Anaplan ship point estimates | The market is moving toward confidence; aimily's 6-dim is leading-edge |

---

## Gaps where aimily In-Season can differentiate (10 opportunities)

1. **6-dimension confidence vector**. No vendor in the survey ships multi-dim uncertainty (demand × margin × returns risk × lineage match × distribution × stockout-bias). ToolsGroup is closest with 1-dim probabilistic demand. **High differentiation, easy to demo.**
2. **Per-SKU verdict stack** (kill / markdown / replenish / resize_down / investigate / amplify / extend_colors / carryover / hold). Nobody else exposes a *fixed taxonomy* of verdicts — they expose KPIs and leave action to the planner. **Verdict-as-output is our wedge.**
3. **Lineage-aware decisions** (carryover survivor, color winner intra-lineage, cannibalization detector). Nextail handles SKU-level; o9 + Centric handle category-level; nobody publishes intra-lineage logic. **Specific to fashion, missing in market.**
4. **Backtest as a deliverable**. None of the 10 vendors ship backtesting as a customer-facing report. o9's case study has zero quantified results. **Pilot-pricing wedge — Mango will pay for a defensible backtest.**
5. **PDF overlay / source-document anchoring**. Centric Visual Boards is closest with imagery overlay but works off live data, not source PDFs. aimily can ingest the existing buyer PDF (Zara RNK style) and overlay verdicts on the same document the buyer already reads. **Adoption-friendly, unique.**
6. **Distribution-normalized velocity classifiers**. Industry sell-through targets vary by archetype but no vendor publishes the *normalization*. aimily's 10 deterministic classifiers (distribution-normalized velocity, returns-penalized margin, capacity-aware demand ceiling, stockout-aware velocity, lifecycle stage) are more explicit than anything in the survey.
7. **Defend & Curate (E.1) archetype**. No vendor exposes an "archetype-aware" decision logic — they treat SKUs uniformly. aimily's archetype layer (hero/dog/dead-stock/extend/etc) is fashion-native.
8. **Retailer-agnostic ingestion framework**. Vendors are typically one-architecture (RDBMS-fed). aimily's parser + retailer-profile + taxonomy triplet means we can land on a PDF report and still emit verdicts. Nextail/Centric need full ERP integration.
9. **Plain-English narrative per scenario** (Claude Sonnet for learnings + creative application). Centric has "AI Agents that break down recommendations in plain language" — closest competitor. We should match or exceed quality.
10. **Open taxonomy + versioning** (Strategy already has `strategy_taxonomies` versioned). Lily AI is closest, but they sell taxonomy as standalone. aimily ships it bundled — that's a feature, not a bug, for mid-market.
11. **In-season forensics, not pre-season planning**. o9, Anaplan, Blue Yonder are pre-season heavy (MFP, assortment). aimily can colonize the post-launch / in-season verdict layer that o9 explicitly does NOT cover in the Mango deployment.
12. **EU AI Act ready**. None of the vendors mention high-risk AI compliance posture publicly. aimily can lead on this (Article 6, Annex III applicability) when the regulation activates 2027-12-02.

---

## What this tells us about aimily In-Season's current thresholds

Apply same supported/contradicted/unknown framework to our engine's invented thresholds:

| aimily threshold (current) | Industry consensus | Verdict |
|---|---|---|
| Sell-through <50% → "investigate or markdown" | Cross-vendor consensus: <50% triggers markdown intervention [Shopify · Toolio] | **SUPPORTED** |
| Sell-through 60–70% → "hold / steady" | Basics 65–70% is the band [Shopify] | **SUPPORTED for basics; CONTEXT-DEPENDENT for fast-fashion (would be too low)** |
| Sell-through >80% → "amplify / replenish" | Core styles 70–80% = "excellent", fast-fashion 85%+ | **SUPPORTED but consider raising to 85% for fast-fashion archetype** |
| Returns rate >40% → "kill" | Online apparel avg 26%, dresses 54%, skirts 47% [Prime-AI] | **UNKNOWN — no vendor publishes a returns kill threshold. Our 40% is reasonable but should be category-aware: 40% high for tops, low for dresses** |
| Weeks of cover <2 → "replenish urgent" | Nextail "Very Low <2 weeks" matches exactly | **SUPPORTED — direct Nextail parallel** |
| Weeks of cover 2–6 → "monitor" | Nextail "Low 2–6 weeks" matches exactly | **SUPPORTED** |
| Weeks of cover >6 → "good / no action" | Nextail "Good >6 weeks" matches exactly | **SUPPORTED — Nextail parallel** |
| Margin <X% → "kill gate" (C.4 safety net) | No vendor publishes margin kill threshold | **UNKNOWN — but conceptually supported by Blue Yonder/Centric markdown-optimization logic** |
| Hero classification: top 20% of velocity | Industry ABC logic: AA = top tier 99% service level | **SUPPORTED in spirit, AA/AB/CC mapping more granular than our binary hero/dog** |
| Dead stock: 0 sales in N weeks | Dead-stock ratio <5% healthy / >10% problem [eFulfillment] | **SUPPORTED as ratio, our N-week absolute threshold is UNKNOWN — consider switching to ratio + lookback** |
| Markdown depth 15–20% / 30–40% / 50–60% by time elapsed | Shopify + Toolio + Peasy all converge here | **SUPPORTED — exact industry consensus** |
| Single-point recommendation vs 6-dim confidence | ToolsGroup is closest (1-dim probabilistic) | **DIFFERENTIATED — we are ahead of the market** |
| Backtest required for verdict acceptance | No vendor ships backtest as a deliverable | **DIFFERENTIATED** |
| Service level by archetype | ABC differentiation 99/97/85% consensus | **PARTIALLY SUPPORTED — aimily should add explicit archetype→target service level mapping** |
| Output unit = SKU not style (Felipe's cardinal rule) | Nextail operates at SKU/PoS/day; o9 model graph "products at the level required" | **SUPPORTED industry-wide, no contradiction** |

**Net assessment**: aimily's thresholds are **mostly inside the industry consensus band**. The two that need attention are (a) archetype-aware sell-through targets (currently a single number, industry uses 3+ bands per archetype) and (b) returns-rate kill threshold (currently 40% blanket, industry suggests category-aware 30–55% range). Backtest, 6-dim confidence, per-SKU verdict taxonomy, lineage-aware logic, and PDF overlay are all **DIFFERENTIATED** versus the field — keep building.

---

## References (verified URLs)

### o9 Solutions
- [o9 + Mango Partnership Press Release (2025-03-25)](https://o9solutions.com/news/o9-and-mango-partner-to-modernize-the-fashion-brands-end-to-end-planning-capabilities/)
- [Business Wire mirror of o9-Mango press release](https://www.businesswire.com/news/home/20250325114741/en/o9-and-Mango-Partner-to-Modernize-the-Fashion-Brands-End-to-End-Planning-Capabilities)
- [Just-Style coverage of Mango + o9](https://www.just-style.com/news/mango-o9-supply-chain/)
- [Retail Tech Innovation Hub on AI + Mango planning](https://retailtechinnovationhub.com/home/2025/3/25/ai-key-as-o9-partners-with-mango-to-modernise-fashion-retailers-end-to-end-planning-capabilities)
- [Silicon UK press release mirror](https://www.silicon.co.uk/press-release/o9-and-mango-partner-to-modernize-the-fashion-brands-end-to-end-planning-capabilities)
- [Retail TouchPoints — Mango Ramps Up Data-Driven Planning](https://www.retailtouchpoints.com/topics/inventory-merchandising/mango-ramps-up-data-driven-planning-for-global-operations)
- [o9 Solutions Fashion & Apparel Case Study](https://o9solutions.com/case-studies/fashion-apparel/)
- [o9 Assortment Planning Solution Page](https://o9solutions.com/solutions/assortment-planning/)
- [o9 Apparel / Footwear / Luxury Industry Page](https://o9solutions.com/industries/retail/apparel-footwear-luxury)
- [o9 Merchandise Planning Solution Page](https://o9solutions.com/solutions/merchandise-planning)
- [o9 Enterprise Knowledge Graph Guide](https://o9solutions.com/resources/a-guide-to-the-o9-enterprise-knowledge-graph)
- [o9 Digital Brain Platform](https://o9solutions.com/digital-brain)
- [o9 Q1 2025 Growth + Customer Acquisition Press Release](https://o9solutions.com/news/o9-gains-a-strong-start-to-2025-with-continued-growth-in-new-customer-acquisition)
- [o9 2026 Gartner MQ Discrete Industries SCP](https://o9solutions.com/resources/2026-gartner-magic-quadrant-discrete-industries)

### Mango background
- [Modaes (English) — Toni Ruiz on Mango 2025 record](https://www.modaes.com/global/companies/toni-ruiz-mango-mango-is-going-through-the-most-solid-moment-in-its-history)
- [Mango Fashion Group Governing Bodies](https://mangofashiongroup.com/en/governing-bodies/toni-ruiz)
- [WWD — Mango CEO Toni Ruiz interview](https://wwd.com/business-news/business-features/mango-toni-ruiz-expansion-geopolitics-partywear-sustainability-1235412375/)
- [FashionNetwork — Mango Strongest in History (Toni Ruiz)](https://ww.fashionnetwork.com/news/-mango-is-in-the-strongest-position-in-its-history-says-chairman-and-ceo-toni-ruiz,1813345.html)

### Centric Software
- [Centric Visual Boards](https://www.centricsoftware.com/centric-visual-boards/)
- [Centric Planning & Pricing](https://www.centricsoftware.com/centric-planning/)
- [Centric Software AI-Powered End-to-End Price Management Press Release](https://www.prnewswire.com/news-releases/centric-software-launches-ai-powered-end-to-end-price-management-to-navigate-tariff-pressures-and-maximize-margins-302615077.html)
- [Centric Pricing & Inventory Enhanced Capabilities Press Release](https://www.prnewswire.com/news-releases/centric-software-launches-enhanced-pricing--inventory-capabilities-to-maximize-margins-and-reduce-excess-stock-302691914.html)
- [How AI/ML Optimize Retail Cycle — Centric Blog](https://www.centricsoftware.com/blog/how-ai-and-ml-optimize-the-full-retail-cycle-from-pre-season-planning-to-post-season-analysis/)
- [Centric Market Intelligence (ex-EDITED)](https://www.centricsoftware.com/centric-market-intelligence)
- [The Assortment Strategy Playbook — Centric whitepaper](https://www.centricsoftware.com/whitepapers/the-assortment-strategy-playbook/)
- [The Interline on Centric Visual Boards Assortment Optimization](https://www.theinterline.com/2023/12/18/centric-software-transforms-assortment-optimization-with-centric-visual-boards/)

### Nextail (transparency benchmark)
- [Nextail Coverage Calculation and Levels (THE doc)](https://help.nextail.co/en/coverage-calculation-and-levels)
- [Nextail Replenishment Parameters](https://help.nextail.co/en/replenishment-parameters)
- [Nextail Replenishment Algorithm Part 1 — Forecast](https://help.nextail.co/en/replenishment-algorithm-part-1-forecast)
- [Nextail Replenishment Algorithm Part 2 — Optimization](https://help.nextail.co/en/replenishment-algorithm-part-2-optimization)
- [Nextail Stockouts Calculation](https://help.nextail.co/en/support/solutions/articles/36000101567-stockouts-calculation)
- [Nextail Performance Index](https://help.nextail.co/en/performance-index)
- [Nextail Allocation & Replenishment Solution](https://nextail.co/solution/allocation-and-replenishment)
- [Nextail Cost of Inefficient Replenishment Logic Resource](https://nextail.co/resource/cost-of-inefficient-replenishment-logic)

### ToolsGroup
- [ToolsGroup Inventory + Service Level Improvements eBook (PDF)](https://www.toolsgroup.com/wp-content/uploads/2020/08/EB_EN_How-to-Calculate-Inventory-and-Service-Level-Improvements-from-Supply-Chain-Planning-Software-1.pdf)
- [ToolsGroup Probabilistic Forecasting Primer](https://blog.toolsgroup.com/en/probabilistic-forecasting)
- [ToolsGroup Demand Sensing Solution](https://www.toolsgroup.com/solutions/demand-sensing-software/)
- [ToolsGroup 2025 Gartner MQ Recognition](https://www.toolsgroup.com/news/toolsgroup-recognized-in-the-2025-gartner-magic-quadrant-for-supply-chain-planning-solutions-for-the-second-consecutive-year/)
- [ToolsGroup Fashion Industry Demand Planning Blog](https://www.toolsgroup.com/blog/demand-forecasting-fashion-industry/)
- [ToolsGroup Five Capabilities for Fashion Planning](https://www.toolsgroup.com/blog/five-key-supply-chain-planning-capabilities-for-fashion-products/)

### RELEX Solutions
- [RELEX Cut Through Retail Complexity Whitepaper](https://www.relexsolutions.com/resources/cut-through-retail-complexity-with-advanced-forecasting-replenishment-technology/)
- [RELEX AI-driven Forecasting Resource](https://www.relexsolutions.com/resources/ai-driven-retail-forecasting-and-replenishment/)
- [RELEX DistriCenter (fashion) Press Release](https://www.relexsolutions.com/news/districenter-selects-relex-to-improve-forecasting-replenishment-promotions-and-allocation/)
- [Monoprix + RELEX 2025 Deployment](https://retailtechinnovationhub.com/home/2025/6/17/monoprix-connects-with-relex-solutions-to-use-ai-powered-forecasting-and-replenishment-across-400-stores)
- [RELEX Replenishment Topic Hub](https://www.relexsolutions.com/topic/replenishment/)

### Blue Yonder
- [Blue Yonder Merchandise Operations Solution](https://blueyonder.com/solutions/merchandise-operations)
- [Blue Yonder MFP FAQ](https://info.blueyonder.com/retail-planning-category-management/what-is-blue-yonder-merchandise-financial-planning)
- [Blue Yonder Strategic Pricing for Fashion Blog](https://blog.blueyonder.com/strategic-pricing-for-fashion-retailers-in-times-of-uncertainty/)
- [Blue Yonder AI in Demand Planning Blog 2025](https://blueyonder.com/blog/2025/ai-in-demand-planning-are-you-realizing-your-full-potential)
- [Blue Yonder AI/ML Capabilities Overview](https://blueyonder.com/why-blue-yonder/ai-and-machine-learning)
- [Blue Yonder Named Leader 2025 Gartner MQ SCP](https://www.businesswire.com/news/home/20250421590060/en/Blue-Yonder-Named-a-Leader-in-the-2025-Gartner-Magic-Quadrant-for-Supply-Chain-Planning-Solutions-for-12th-Time-in-a-Row-Positioned-Furthest-in-Completeness-of-Vision)

### Toolio
- [Toolio Platform Overview](https://www.toolio.com/platform-overview)
- [Toolio Merchandise Planning](https://www.toolio.com/merchandise-planning)
- [Toolio 10 Essential Reports Blog](https://www.toolio.com/post/10-essential-reports-for-strategic-merchandise-planning)
- [Toolio Sell-Through Rate Guide](https://www.toolio.com/post/sell-through-rate-how-to-calculate-and-5-strategies-to-optimize)
- [Toolio Free Templates](https://www.toolio.com/templates-and-tools)

### Anaplan
- [Anaplan Retail Merchandise Financial Planning](https://www.anaplan.com/solutions/merchandise-financial-planning-for-retail/)
- [Anaplan Retail Planning Solutions](https://www.anaplan.com/solutions/retail-planning/)
- [Anaplan Assortment Planning](https://www.anaplan.com/solutions/assortment-planning/)
- [Anaplan Retail Industries Page](https://www.anaplan.com/industries/retail/)

### Lily AI
- [Lily AI Product Attribution Blog](https://www.lily.ai/resources/blog/bringing-ai-science-to-the-art-of-merchandising-with-product-attribution-data/)
- [Lily AI Product Attributes Page](https://www.lily.ai/product-attributes/)
- [Lily AI Industries](https://www.lily.ai/industries/)
- [Lily AI Trend Attribution 101](https://www.lily.ai/resources/blog/trend-attribution-101-capitalizing-on-cycles-sooner/)
- [TechCrunch — Lily AI Funding](https://techcrunch.com/2022/08/24/lily-ai-lands-new-capital-to-help-retailers-match-customers-with-products/)

### EDITED (now part of Centric Market Intelligence)
- [EDITED Homepage](https://edited.com/)
- [EDITED Profit-Aware Retail Intelligence Blog](https://edited.com/blog/true-retail-intelligence-why-you-need-to-be-proft-aware/)
- [Centric Market Intelligence New Categories Press Release](https://www.centricsoftware.com/press-releases/centric-market-intelligence-new-product-categories-innovations-competitive-intelligence/)

### Industry consensus / benchmark sources (not vendor)
- [Shopify Sell-Through Rate Guide](https://www.shopify.com/blog/sell-through-rate)
- [Shopify Retail Markdowns Guide](https://www.shopify.com/blog/retail-markdowns)
- [AIMS360 Sell-Through Rate Apparel Industry](https://www.aims360.com/fashion-business-resources/sell-through-rate-apparel-industry-erp-software-sellthrough-calculator)
- [Style Matrix Retail Weeks of Cover Guide](https://stylematrix.io/weeks-of-cover-retail-how-much-stock-should-you-hold/)
- [ReactiveSDP Weeks of Cover Blog](https://reactivesdp.com/blog/weeks-of-cover-retail-planning.html)
- [EasyReplenish Automated Stock Replenishment](https://www.easyreplenish.com/blog/automated-stock-replenishment-for-fashion-brands)
- [Heuritech Sell-Through Rate Fashion](https://heuritech.com/articles/sell-through-fashion/)
- [Prime-AI Clothing Return Rate Benchmarks by Country/Category](https://www.prime-ai.com/en/media/clothing-return-rates-by-category-and-country-csf-a/)
- [NetSuite — Top 20 Demand Planning KPIs](https://www.netsuite.com/portal/resource/articles/accounting/demand-planning-kpis-metrics.shtml)
- [NetSuite — 10 Apparel & Fashion KPIs](https://www.netsuite.com/portal/resource/articles/erp/apparel-kpis.shtml)
- [eFulfillment Service Deadstock Decoded](https://www.efulfillmentservice.com/2025/03/deadstock-decoded-what-it-is-what-it-means-and-how-fashion-brands-can-turn-unsold-inventory-into-profit/)
- [Peasy Markdown Optimization Guide](https://www.peasy.nu/blog/markdown-optimization-when-to-discount-using-data)
- [Style Matrix Fashion Inventory Turnover Benchmarks](https://stylematrix.io/inventory-turnover-in-fashion-benchmarks-analysis-and-turn-rate-strategies/)
- [Retalon Inventory Turnover in Retail](https://retalon.com/blog/inventory-turnover-ratio)
- [Lokad Review of Centric Software](https://www.lokad.com/review-of-centricsoftware-com/)
- [Lokad Fashion Apparel Supply Chain Optimization](https://www.lokad.com/fashion-apparel-supply-chain-optimization/)

---

## Skepticism callouts (where vendor claims are weak)

- **o9 Fashion & Apparel case study** lists capabilities but ships **zero quantified outcomes** — no sell-through delta, no margin uplift number, no inventory reduction %. Unusual for a Leader-quadrant vendor and worth raising in the Mango pitch as proof that o9 doesn't yet own the in-season verdict layer.
- **Centric "up to 18% revenue increase"** is an "internal analysis of select customer implementations" — no named customer, no methodology. Marketing fluff.
- **RELEX "Monoprix 400 stores"** is announced 2025-06-17, no published results yet. Premature to use as proof point.
- **ToolsGroup Miroglio Fashion (+16% revenue, €1M margin)** is the most defensible quantified customer result in the survey — named customer, two specific numbers. Use this as the bar.
- **"AI explainability" claims** from Blue Yonder, Centric, o9 are mostly feature-attribution (showing drivers), not real uncertainty quantification. Only ToolsGroup ships actual probability distributions.
- **Lily AI "+15% sell-through"** is a single customer case study with no methodology disclosed. Reasonable as anecdote, not as benchmark.

# Aimily Strategy — Competitive Landscape (2026-05-15)

Scope: B2B enterprise SaaS thesis. Combine (A) historical SKU performance + numerical strategic direction (margin / price ladder / SKU count / family-share targets) with (B) optional creative direction (moodboard, archetype, color/family focus) → output a next-season Collection Plan: family structure, SKU counts, price ladders, buy quantities, justified by historical learnings AND filtered through creative intent, with LLM-generated strategic narrative.

Target customers: established fashion brands at Inditex / H&M / Mango scale (also Tier 2: Mango, Decathlon, Deichmann, Tendam, MCM, Valentino, Kering maisons).

---

## 1. Player map

### Quant-side planning / allocation / MFP

- **Centric Planning (Centric Software / Dassault Systèmes)** — Cloud-native MFP + assortment + pricing + inventory. Owned by Dassault Systèmes; acquired AI PXM player **Contentserv for €220M in Feb 2025** (Dassault PR, 2025-02-25). Centric also ships **Visual Boards** (visual assortment + moodboard collaboration) — the closest existing surface to Aimily Strategy's creative side; Valentino signed Dec 2025, Deichmann March 2025. Centric Pricing & Inventory claims "up to 18% revenue uplift", Planning "up to 110% margin uplift". Enterprise license; no public list price.
- **o9 Solutions** — "Digital Brain" platform: MFP, assortment, demand, supply. ~$750M ARR (Getlatka, mid-2025), $3.7B valuation post-2023 KKR round, $533M raised. **Mango signed in March 2025** (o9 PR, 2025-03-25) for MFP + assortment + demand replacement, covering 2,850 stores / 120 markets. Also: Nike, Walmart, Estée Lauder. Pure quant — not a creative-intent surface.
- **Nextail** — Madrid-based "merchandise execution" platform; prescriptive AI for allocation, replenishment, in-season reflow. Multi-million-euro reinvestment from existing investors Nov 2024 + new CEO; named "Best Fashion Retail Merchandising Platform 2025." Mid-market fashion. No moodboard / creative layer.
- **ToolsGroup** — Forecasting + replenishment + assortment. **Acquired JustEnough** (which itself absorbed earlier merch-planning IP); Miroglio Fashion case study cites 16% revenue uplift + €1M margin. Quant.
- **Blue Yonder** (Panasonic-owned, ~$1B+ revenue) — Apparel & Footwear vertical. Named Leader in IDC MarketScape: Retail AI-Driven Assortment Planning 2025. Heavy implementation, enterprise scale.
- **RELEX Solutions** — Helsinki-based unified retail planning. Also named Leader in IDC MarketScape Assortment Planning 2025. Strong in grocery + apparel mid-market.
- **Anaplan** — Horizontal connected-planning platform with MFP + assortment apps. Acquired by Thoma Bravo 2022. Named Leader in IDC MarketScape Assortment Planning 2025 + ISG Exemplary Leader 2025 for Retail Supply Chain Planning. **Entry pricing ~$30-50K/yr, total enterprise first-year ~$80-150K incl. implementation** (ITQlick / Vendr 2025).
- **SymphonyAI Retail CPG** (ex-Symphony Retail) — MFP, assortment, allocation. Quieter in 2024-2026 vs. above. Quant.
- **JustEnough** — folded into ToolsGroup (see above).

### Trend / creative / qualitative

- **Heuritech** — Paris-based; CV on social images, 2000+ attributes, 24-month forecast at claimed 90% accuracy. Clients: LVMH, Dior, Moncler, Havaianas. **Merged into Luxurynsight** ("Luxurynsight and Heuritech — AI & Data Leaders for Luxury, Fashion, and Beauty," 2025). Subscription, undisclosed price. Forecast-only — does not output a Collection Plan.
- **Stylumia** — Bangalore; "True Demand" forecasting + ImaGenie generative design. 100+ clients incl. Fortune 100; claims 25-50% sales uplift. Forecast + design ideation; not a plan-output tool.
- **Trendalytics** — NYC; trend + TikTok-driven merchandising insight. AI assortment recommendations layered on consumer-signal data. No buy-quantity output.
- **EDITED** — London; competitive retail intelligence, market pricing, assortment benchmarks. Acquired DynamicAction (2021). Launched **myEDITED 2.0 in April 2025** (BusinessWire, 2025-04-30) with "Triple Lens" intelligence framework. Diagnostic, not prescriptive.
- **WGSN** — Trend forecasting incumbent. **Launched WGSN Fashion Buying platform 2025** with TrendCurve AI Color, Materials & Details, TikTok Trading, Opportunity Calculator, Assortment Builder. 94% accuracy claim 1y out. Subscription. Closest competitor on the creative side (since they now ship an Assortment Builder), but **no integration with the customer's own SKU history**.
- **First Insight** — Pittsburgh; pre-launch consumer testing for assortment / price / design decisions; NRF 2025 launched generative naming + sentiment. Customers: Gap, M&S, Family Dollar, Woolworths. Consumer-validation lens, not historical-SKU lens.
- **T-Fashion / Visenze** — visual-search + trend tagging, narrower.

### Recent AI-native entrants (2024-2026)

- **Raspberry AI** — $24M Series A from a16z, Jan 2025 (TechCrunch, 2025-01-13). 70 customers incl. Under Armour, MCM, Li & Fung, Gruppo Teddy, Deckers, KnitWell. **Design-side wedge: text-to-image + visual marketing**, expanded into visual marketing March 2025. NOT a buy-quantity / plan-output tool.
- **Merchmix** — Launched 2025 as "world's first agentic SaaS retail platform"; ingests 200+ external sources; pilots with fashion + pharmacy retailers in AU/UK/US (Sep 2025). Plans stock optimisation autonomously — quant only.
- **Athena Studio** — NYFTLab 2025 cohort, "AI-native PLM"; centralises product-dev data, flags overdevelopment. Operational, not strategic.
- **Vody** — multimodal LLM "for inventory enhancement"; thin public info.
- **AI.Fashion (YC)** — creative suite, design / image gen — not planning.
- **Bezel (YC W25)** — AI human models for e-com photography — not planning.
- **Flock AI** — $6M seed from Work-Bench post Lookiero-Outfittery merger; personalisation + demand forecasting, B2C-tilted.
- **Daydream** — AI shopping agent, consumer-facing.

### Wholesale-adjacent (relevant slice only)

- **JOOR (Lightspeed)** — 14K brands / 650K buyers / 150 countries. 2025 roadmap: **"Smart Assortment"** auto-suggesting buys from local sell-through. Wholesale lens — buyer side, not brand-side line plan.
- **NuORDER (Lightspeed)** — $96B in transactions; **"Order Trends" launched June 2025** (BusinessWire, 2025-06-25), surfaces best-performing categories/colors/sizes inside the wholesale flow; +10.9% AOV in trial. Same wholesale lens.

---

## 2. Gap analysis — does anyone combine SKU history × creative direction × LLM narrative?

Short answer: **no one, end-to-end, in a single workflow**. The closest two surfaces:

1. **Centric Visual Boards + Centric Planning + Contentserv (Dassault stack).** Visual Boards gives you the moodboard + visual assortment canvas; Centric Planning gives you MFP / assortment / pricing; Contentserv (post-Feb 2025) adds AI PXM. **But these are separate modules** stitched by services / consulting. There is no single workflow where a buyer drops a moodboard + numerical targets and gets a justified next-season Collection Plan back. Critically, **no public-facing LLM-generated strategic narrative** — Centric ships dashboards, not prose recommendations. This is the most credible incumbent threat if Dassault ever decides to fuse the three modules; today it's the gap.

2. **WGSN Fashion Buying (2025).** Trend + Assortment Builder + Opportunity Calculator. **But it has zero access to your SKU history** — it's an external forecast lens. You can't feed it last season's margins/sell-through and get a plan that respects them.

Everyone else falls cleanly into one of two camps:
- **Quant camp** (o9, Centric Planning, Anaplan, Blue Yonder, RELEX, ToolsGroup, Nextail, Merchmix) — eats your SKU history, outputs numbers. No creative direction input. No prose narrative.
- **Creative camp** (Heuritech, Stylumia, Trendalytics, EDITED, WGSN, First Insight, Raspberry) — outputs trends, designs, or consumer-tested concepts. No buy quantities. No reconciliation with your history.

A third gap: **nobody ships an LLM-generated strategic narrative on top of the plan.** o9 dashboards, Centric what-ifs, WGSN reports — all human-authored or templated. The "strategic-merchant-in-a-box" prose layer (justification: "we cut SKU 14 because Q3 sell-through trailed 18% and your moodboard skews away from this archetype") is open.

**The wedge** = Aimily Strategy is the only product that fuses (A) the customer's own SKU history, (B) optional creative direction artifacts (moodboard / archetype / color focus / family share targets), and (C) an LLM narrative explaining each recommendation. Centric is the natural acquirer / blocker — moving fast here matters.

---

## 3. Inditex / H&M / Mango — internal stack reality 2025-2026

- **Inditex** — Famous for in-house. 2025 disclosures: built **XTEND platform** (LLM-based conversational layer over their data tools) + **Inditex Data AI-Feature Store** powering **"Just-In-Telligent" (JIT)** demand forecasting using real-time weather, sentiment, foot-traffic. Reported -20% overstock vs. 2023 (Klover.ai / CTO Magazine 2025; Stanford ICME 2025). Hired Jetlore consumer-behavior team years earlier. Generative AI for catalog imagery (Zara, 2025). **Signal**: deep in production deployment of LLM agents over proprietary data; no disclosed external buying-AI vendor. Hardest customer to crack — but the JIT system is store-allocation, not pre-season line architecture; **the creative-led pre-season plan is still a manual buyer process** even at Inditex.
- **H&M Group** — Heavy investment in AI/ML. **Google Cloud partnership** disclosed for AI on customer experience + supply chain (AIMagazine 2025). BCG case study calls AI at H&M "Amplified Intelligence." MIT Sloan profiled H&M AI Ethics 2025. Q1 2025 CEO commentary (WWD): AI digital twins collapsed campaign creative time from 6 weeks to <24 hours. Owns Sellpy (resale). **Signal**: still mixing internal builds with hyperscaler partnerships — open to vendor partners on specific verticals.
- **Mango** — **Picked o9 in March 2025** for MFP + assortment + demand (o9 / Retail Touchpoints 2025), explicitly replacing "fragmented, outdated systems." Also launched Mango customer-facing AI assistant 2025. **Signal**: actively shopping external vendors. Path to land.

Read-across: even the most internally-developed stack (Inditex) doesn't have a creative-led pre-season recommender. H&M is in a strategic-partner posture. Mango just bought a quant platform but the creative-merchandising layer remains open. The "buying decision still happens in Excel + a printed moodboard" reality persists even at the top of the market — Nextail's positioning ("defeating Excel in fashion retail," Datalaria / dev.to 2024) is the same argument that applies up-market.

---

## 4. Pricing benchmarks

Public list pricing is rare. Triangulating from G2 / Vendr / ITQlick / disclosed deal sizes / funding:

- **Anaplan**: ~$30-50K/yr entry, $80-150K total first-year incl. implementation; large fashion deals likely $300K-$1M+/yr (ITQlick, Vendr 2025).
- **o9 Solutions**: opaque; $750M ARR / ~hundreds of enterprise tenants implies average **mid-six-figure to low-seven-figure ACV**. Mango-class deals reportedly multi-year, multi-million-€.
- **Centric Software**: per-seat PLM + module licensing; tier-1 fashion deployments commonly $250K-$1M+/yr blended; Visual Boards + Planning + Contentserv stacked likely 7-figure.
- **Blue Yonder**: enterprise apparel deals routinely $500K-$2M+/yr.
- **Nextail**: mid-market; €60-300K/yr range typical for fashion retailers (inferred from "Plans & packaging" page positioning).
- **WGSN**: subscription ~£8K-£25K/yr per seat-bundle for traditional product; Fashion Buying tier likely premium ~£25-80K+/yr for enterprise.
- **Heuritech**: undisclosed; luxury client pricing inferred $80-250K/yr.
- **Stylumia**: $50-200K/yr range from India-anchored pricing scaled to global enterprise.
- **First Insight**: ~$50-300K/yr depending on volume of tests / SKUs.
- **Raspberry AI**: per-seat creative tool; estimated $5-20K/seat/yr × 50-200 seats at large customer = $250K-$2M.

**Implication for Aimily Strategy pricing:** the air it can breathe is anywhere from $80K (low entry beside Anaplan / Nextail) to $750K+ (against o9 / Centric Planning bundles). Tier-2 entry at €120-300K/yr per brand seems defensible; tier-1 (Inditex/H&M-scale) starts at €750K-€2M+/yr with multi-year commit.

---

## 5. EU AI Act + data-sensitivity positioning

- AI Act timeline: **governance + AI Office active Aug 2, 2025**; most high-risk obligations applied from Aug 2, 2026 — **but the omnibus amendment pushed high-risk effective date to Dec 2, 2027** (Baker McKenzie / Fibre2Fashion 2025).
- **Fashion retail "buying AI"** sits **just below Annex III high-risk** because it doesn't directly determine employment / credit / education. **BUT**: if Aimily Strategy outputs influence sourcing decisions (supplier orders → factory worker employment), the boundary tightens. Plus GPAI obligations (training-data summaries, copyright policy, model cards) **apply regardless of risk class** when an LLM is in the loop.
- **What incumbents disclose today**: Centric / o9 / Anaplan publish security pages (SOC 2 etc.) but not AI-Act-specific positioning. WGSN markets "AI-augmented expert intelligence" with humans in the loop — implicit Article 14 (human oversight) framing.
- **Open lane for Aimily Strategy**: explicit **(a) no training on customer SKU data** clause, **(b) DPA + SCCs by default**, **(c) VPC / on-prem deployment for tier-1 brands**, **(d) Annex IV-style technical documentation already prepared** in case a high-risk reclassification arrives. None of the incumbents we surveyed lead with this in their marketing. For enterprise procurement at Inditex / H&M / Mango, this is a 10-point differentiator on the RFP and removes legal blocker risk pre-contract.

---

## 6. Aimily Strategy wedge — the positioning

**"The creative-led merchandising AI for fashion brands with real SKU history."**

The flag plants here: every incumbent forces brands to choose between **quant systems that ignore creative intent** (o9, Centric Planning, Blue Yonder, Anaplan, Nextail) and **creative systems that ignore your numbers** (WGSN, Heuritech, Stylumia, Raspberry AI). Centric Software is the only stack that *could* fuse both — and they ship the pieces but not the workflow, and they have no LLM-generated narrative on top. Aimily Strategy is the workflow: drop in last season's SKU performance + an optional moodboard + family-share or margin targets, get a justified Collection Plan with a strategic narrative that respects both.

Three tactical advantages compounding:
1. **Tier-2 first** (Mango / Tendam / Deichmann / MCM / Valentino-scale brands that have rich SKU history but no in-house AI team) — too small to justify o9 ACVs, too large for Centric SMB Visual Boards. Mango's o9 signing is a tell: this tier *will* spend on AI planning if a vendor packages it correctly.
2. **Creative-side input is the moat against the quant camp** — they'd need to acquire or build a creative-direction surface and rewire their LLM stack. Centric is closest (Visual Boards exists) but moves at Dassault speed.
3. **EU AI Act-native positioning** removes the procurement legal block and pre-empts the 2027 high-risk deadline.

The clock is on Centric to fuse Visual Boards + Planning + Contentserv with an LLM narrative layer. Until they ship that, the wedge is open.

---

## Sources

- Centric Software / Dassault: [Contentserv acquisition Feb 2025](https://www.3ds.com/newsroom/press-releases/dassault-systemes-announces-centric-softwares-acquisition-ai-powered-pxm-solution-contentserv) · [Centric Planning](https://www.centricsoftware.com/centric-planning/) · [Centric Visual Boards / Valentino Dec 2025](https://www.theinterline.com/2025/12/16/valentino-partners-with-centric-software-to-streamline-product-development-improve-collaboration-and-power-strategic-initiatives/) · [Deichmann March 2025](https://www.theinterline.com/2025/03/17/deichmann-steps-into-the-future-with-centric-plm-visual-assortment-boards/) · [Pricing & Inventory AI Nov 2025](https://www.prnewswire.com/news-releases/centric-software-launches-ai-powered-end-to-end-price-management-to-navigate-tariff-pressures-and-maximize-margins-302615077.html)
- o9 Solutions: [Mango partnership March 2025](https://o9solutions.com/news/o9-and-mango-partner-to-modernize-the-fashion-brands-end-to-end-planning-capabilities/) · [Contrary Research breakdown](https://research.contrary.com/company/o9-solutions) · [Getlatka revenue](https://getlatka.com/companies/o9-solutions)
- Nextail: [Q2 2025 update](https://nextail.co/resource/q2-2025-nextail-ai-fashion-retail-growth) · [2024 CEO + reinvestment](https://retailtechinnovationhub.com/home/2024/11/7/ai-powered-retail-technology-firm-nextail-announces-new-ceo-and-multi-million-euro-investment-from-current-investors) · [Datalaria deep-dive](https://datalaria.com/en/posts/nextail/)
- MakerSights: [makersights.com](https://www.makersights.com/) · [PTC integration 2024](https://www.theinterline.com/2024/05/16/ptc-makersights-increase-product-creation-efficiency-and-consumer-informed-assortment-decisions-with-best-in-class-integration/)
- Heuritech: [heuritech.com](https://heuritech.com/) · [Luxurynsight merger](https://heuritechjoins.luxurynsight.com/) · [FashionUnited AW26 2025-11](https://fashionunited.com/news/fashion/decoding-aw26-trends-and-shifting-consumer-patterns-heuritechs-ai-driven-forecasts/2025111969241)
- Stylumia: [stylumia.ai](https://www.stylumia.ai/)
- EDITED: [myEDITED 2.0 April 2025](https://www.businesswire.com/news/home/20250430638563/en/EDITED-Unveils-myEDITED-2.0-A-Game-Changing-Platform-for-Retail-Intelligence)
- WGSN: [Fashion Buying launch](https://www.wgsn.com/en/wgsn/press/press-releases/wgsn-launches-fashion-buying-dedicated-intelligence-and-forecast-led) · [WWD coverage](https://wwd.com/sourcing-journal/sj-denim/wgsn-fashion-buying-new-platform-retailers-trend-forecasting-ai-tiktok-1238837995/)
- First Insight: [NRF 2025](https://www.firstinsight.com/press-releases/first-insight-showcases-leading-ai-innovations-at-nrf-2025-see-how-customers-like-gap-ms-family-dollar-woolworths-leverage-it-today)
- Blue Yonder / RELEX / ToolsGroup / Anaplan IDC MarketScape Assortment Planning 2025: [Anaplan analyst summary](https://www.anaplan.com/solutions/assortment-planning/) · [RELEX assortment](https://www.relexsolutions.com/solutions/assortment-planning-software/) · [Blue Yonder apparel](https://blueyonder.com/industries/apparel-and-footwear) · [Lokad apparel survey July 2025](https://www.lokad.com/fashion-apparel-supply-chain-optimization/)
- Anaplan pricing: [ITQlick 2025](https://www.itqlick.com/anaplan/pricing) · [Vendr](https://www.vendr.com/marketplace/anaplan)
- JOOR / NuORDER: [Order Trends June 2025](https://www.businesswire.com/news/home/20250625860361/en/NuORDER-by-Lightspeed-Introduces-Order-Trends-A-Powerful-New-Tool-Designed-to-Bring-Insights-to-Wholesale-Buying) · [JOOR Smart Assortment roadmap](https://www.joor.com/nuorder-vs-joor)
- Raspberry AI: [TechCrunch Series A Jan 2025](https://techcrunch.com/2025/01/13/raspberry-ai-raises-24m-from-a16z-to-accelerate-fashion-design/) · [BoF coverage](https://www.businessoffashion.com/articles/technology/generative-ai-design-platform-raspberry-ai-raises-24-million/)
- Merchmix: [Retail Tech Innovation Hub Sep 2025](https://retailtechinnovationhub.com/home/2025/9/4/retail-technology-innovation-of-the-week-ai-software-firm-merchmix-enters-pilot-with-retailers-in-fashion-and-pharmacy)
- Inditex: [Klover.ai AI strategy](https://www.klover.ai/inditex-ai-strategy-analysis-of-dominance-in-new-era-fashion/) · [Stanford ICME forum](https://icme.stanford.edu/events/career-forum-education/ai-inditex-future-fashion) · [CTO Magazine on Zara](https://ctomagazine.com/zara-innovation-ai-for-retail/)
- H&M: [Google Cloud partnership](https://aimagazine.com/machine-learning/google-cloud-announces-partnership-with-h-m-to-advance-ai) · [BCG case study](https://www.bcg.com/about/client-impact/how-artificial-intelligence-is-amplifying-growth) · [MIT Sloan ethics](https://sloanreview.mit.edu/article/ai-ethics-strategy-lessons-from-hm-group/) · [WWD Q1 2025](https://wwd.com/business-news/financial/hm-q1-2025-results-net-profit-down-53-percent-1237063611/)
- Mango: [o9 deal Retail Touchpoints](https://www.retailtouchpoints.com/topics/inventory-merchandising/mango-ramps-up-data-driven-planning-for-global-operations)
- EU AI Act fashion: [Fibre2Fashion mapping](https://www.fibre2fashion.com/industry-article/10992/eu-ai-act-and-fashion-a-practical-map-of-tools-risks-and-timelines) · [Baker McKenzie radar](https://www.bakermckenzie.com/en/insight/publications/resources/product-risk-radar-articles/eu-regulation-on-ai) · [Legalink retail](https://www.legalink.net/en/publications/newsletters/artificial-intelligence-in-retail-transforming-customer-experience-and-redefining-the-rules-under/7201/)
- BoF on AI buying: [Fashion's Other AI Revolution](https://www.businessoffashion.com/articles/technology/fashions-other-ai-revolution/) · [Fashionista on excess inventory AI](https://fashionista.com/2025/10/ai-fashion-trend-forecasting-inventory-buying)

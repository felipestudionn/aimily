# Aimily In-Season Decision Engine: Research Grounding

Date: 17 May 2026  
Scope: commercial buying, assortment planning, lifecycle, replenishment, markdown, hero/dog decisions. Not software product management. Not visual merchandising.

## Executive Verdict

**Cited fact:** The canon supports Aimily’s core premise: senior buyers act on cross-KPI patterns, not isolated metrics. The durable KPIs are sell-through, rate of sale / velocity, weeks of supply, full-price sell-through, gross margin, markdown exposure, returns, availability / stockout, distribution breadth, and lifecycle age.

**Cited fact:** Zara/Inditex’s operating model is not “better thresholds”; it is shorter feedback loops, smaller initial commitments, fast replenishment / reallocation, and early clearance optimization. Published Zara sources repeatedly cite: 15-20% of sales at markdown vs 30-40% peers; <10% unsold inventory vs 17-20% industry; 85% full-price sell-through vs 60-70% industry; twice-weekly store replenishment; store/SKU allocation based on demand and inventory constraints (Ferdows, Lewis & Machuca 2004; Ghemawat & Nueno 2003; Caro & Gallien 2010, 2012).

**Inference:** Your taxonomy is directionally canonical. The weakest actions are not the actions themselves, but the trigger thresholds. Several of your numbers are plausible engineering defaults, but not industry-cited thresholds. You should position them as **initial priors** and backtest per customer/category/channel.

**Hard pushback:** Top-10 `pdf_rank` / `velocity_rank` gates are too crude for a buyer-facing system. Commercial buyers do not care if an SKU is “top 10” unless the ranking is normalized by exposure, age, distribution breadth, stock availability, margin, returns, and buy depth. A top-10 item with full distribution and heavy homepage push is less interesting than a low-ranked sleeper with constrained distribution and high sell-through.

---

## Pillar 1: Zara / Inditex Operating Model

### What Is Cited

**Cited fact:** Zara’s advantage is a closed feedback loop between store demand, design, production, allocation, and replenishment. HBR’s “Rapid-Fire Fulfillment” describes Zara as receiving constant store feedback and delivering small batches frequently, reducing forecasting risk and markdown exposure (Ferdows, Lewis & Machuca 2004, HBR: https://hbr.org/2004/11/rapid-fire-fulfillment).

**Cited fact:** Zara’s stores receive deliveries twice weekly. Store managers transmit qualitative and quantitative demand signals to headquarters; designers and commercial teams react quickly (Ghemawat & Nueno 2003, HBS case; Ferdows et al. 2004).

**Cited fact:** Multiple case summaries of the HBS/HBR material cite Zara selling roughly **85% of products at full price**, compared with an industry average of **60-70%**, and carrying **<10% unsold inventory**, compared with **17-20%** industry average (Ferdows et al. 2004; Crofton & Dopico 2007 as cited in secondary teaching material; example scan: https://www.readkong.com/page/super-responsive-supply-chain-the-case-of-spanish-fast-1034971).

**Cited fact:** Zara’s markdown exposure is commonly cited at **15-20% of sales / season volume**, versus **30-40%** for much of the industry (Ghemawat & Nueno 2003; HBR teaching reproductions; example: https://www.scribd.com/document/452749865/Zara-Case-Study).

**Cited fact:** Caro & Gallien’s Zara allocation model optimizes store shipments for each SKU-store over replenishment periods using forecasts, inventory by size, and display constraints. A key operational feature: if a key size is missing, the store may remove the reference from display, so broken size curves suppress demand (Caro & Gallien 2010, Operations Research, DOI 10.1287/opre.1090.0697; PDF: https://www.mit.edu/people/jgallien/ZaraOR2010.pdf).

**Cited fact:** The Caro & Gallien Zara allocation pilot produced a **3-4% sales increase** in stores using the model relative to controls, with controlled implementation design (Caro & Gallien 2010).

**Cited fact:** Caro & Gallien’s clearance pricing work says Zara used a manual, informal markdown process until 2007; the optimized clearance model was piloted in Belgium and Ireland and produced roughly **6% revenue increase** on clearance items in the live experiment (Caro & Gallien 2012, Operations Research, DOI 10.1287/opre.1120.1102; PDF: https://www.anderson.ucla.edu/faculty_pages/felipe.caro/papers/pdf_FC15.pdf).

**Cited fact:** Inditex 2024 annual report reports **7.5% sales growth**, **record gross margin**, and more than **8 billion online visits**; it does not publish per-SKU decision thresholds, RNK report interpretation, return-rate triggers, or markdown algorithm thresholds (Inditex Annual Report 2024: https://static.inditex.com/annualreport2024/en).

### RNK / Repartido Report Interpretation

**Unknown:** I found no public primary source explaining a Zara internal RNK / Repartido report field-by-field.

**Inference:** Based on Caro & Gallien, the relevant normalization is not raw SKU sales. It is SKU-store expected demand conditional on current inventory, size availability, store capacity, replenishment period, and total warehouse stock. In Aimily terms, any rank should be corrected for:

- days live
- distribution breadth
- store count / store-days
- available size curve
- stockouts / broken-size suppression
- markdown status
- exposure / retailer push
- returns and net sales

**Implementation implication:** A “distribution-by-store-per-day” metric is strongly supported as an engineering proxy, but the cited Zara model goes further: it optimizes at SKU-store-size level, not only SKU aggregate.

### Zara Markdown Logic

**Cited fact:** Zara’s low markdown rate is a result of avoiding large speculative buys and using fast response, not simply choosing lower markdown depths. Clearance optimization explicitly balances liquidation and revenue rather than fixed markdown ladders (Caro & Gallien 2012).

**Inference:** Your `stock_days / 90` risk score is a reasonable simplification for pilot explainability, but it is not Zara-like. Zara’s documented clearance model is demand/price/inventory/time-to-outdate optimization, not a fixed 90-day WOS rule.

### Color Portfolio Decisions

**Cited fact:** Zara’s operating model supports in-season design and color/cut changes based on demand feedback; case materials cite Zara designing/producing a large share of product during the season rather than committing all pre-season (Ghemawat & Nueno 2003; Ferdows et al. 2004).

**Unknown:** I found no public Zara numeric rule like “if one colorway is 2x family velocity, extend colors.”

**Inference:** `EXTEND_COLORS` is commercially canonical, but the trigger must compare colorways inside the same style family after controlling for exposure, initial buy depth, size availability, and store distribution.

---

## Pillar 2: Merch Tech Landscape

### What Vendors Actually Publish

**o9 Solutions**

**Cited fact:** o9 announced Mango as a customer on **25 March 2025**. The stated scope is **Merchandise Financial Planning, Assortment Planning, and Demand Planning**, replacing fragmented/outdated systems with an integrated AI-powered planning framework (o9 press release: https://o9solutions.com/news/o9-and-mango-partner-to-modernize-the-fashion-brands-end-to-end-planning-capabilities).

**Cited fact:** o9 describes capabilities around enterprise knowledge graph, scenario planning, demand/supply balancing, real-time learning, collaboration, and planning from long-range to execution horizons (same source).

**Cited fact:** o9 apparel case material emphasizes postponing commitment decisions for **fabric, color, size, destination, price, and flow** (o9 fashion case: https://o9solutions.com/case-studies/global-fashion).

**Inference:** o9 is the system of record / planning brain. Aimily’s wedge should not be “we replace o9.” It should be “we sit on retailer sell-through feeds and produce SKU-level commercial action stacks fast enough for buyers to use daily/weekly.”

**Centric Software**

**Cited fact:** Centric Planning covers merchandise financial planning, assortment planning, allocation/replenishment, and markdown management. Its marketing says markdown management optimizes stock and margin targets and develops optimal price from launch through final markdown (Centric Planning: https://www.centricsoftware.com/centric-planning/).

**Unknown:** Centric publishes modules and outcomes, not hard SKU thresholds.

**Nextail**

**Cited fact:** Nextail defines sell-out as `units sold / units purchased` and sell-through as `units sold / units received`; it supports top/bottom product reports by product, family, season, store, city, region (Nextail help: https://help.nextail.co/en/sell-out-and-sell-through-calculation).

**Cited fact:** Nextail replenishment uses SKU-store-day demand forecasts plus optimization, stock positions, sales thresholds, residual value, and constraints; it explicitly says robustness over accuracy and “meritocracy” in stock allocation (Nextail replenishment intro: https://help.nextail.co/kb/introduction-to-replenishment).

**Cited fact:** A Gartner-cited Guess/Nextail case reports **7.5% reduction in store inventory coverage**, **5% increase in full-price in-season sales**, **1% reduction in stockouts**, and **7% YoY EMEA sales increase** (Nextail summary of Gartner case: https://nextail.co/resource/nextail-mentioned-in-gartner-case-study-on-guesss-inventory-results-driven-by-machine-learning).

**RELEX**

**Cited fact:** RELEX markdown optimization uses inventory projections, price elasticity, rules/constraints, campaign goals, and termination dates. RELEX cites customer outcomes including **15-20% lower end-stock balances** and **4.9% margin growth** (RELEX markdown guide: https://www.relexsolutions.com/resources/markdown-optimization-how-retailers-can-clear-stock-while-maximizing-margin/).

**Blue Yonder**

**Cited fact:** Blue Yonder’s retail planning FAQ frames MFP as planning how much inventory to buy, when it should arrive, and how it should sell to meet revenue, gross margin, and turnover targets. It gives an illustrative scenario of reducing sales plan by **10%** to reduce receipts (Blue Yonder FAQ: https://info.blueyonder.com/retail-planning-category-management/what-is-blue-yonder-merchandise-financial-planning).

**Anaplan**

**Cited fact:** Anaplan MFP covers open-to-buy, assortment planning, allocation and replenishment, store-market omnichannel planning, and real-time demand signal response (Anaplan MFP: https://www.anaplan.com/solutions/merchandise-financial-planning-for-retail/).

**Toolio**

**Cited fact:** Toolio markets weeks of supply as a reorder / marketing pivot signal. Customer claims include **50-75% SKU count reduction**, **5-10 weeks of stock reduction**, **50% inventory reduction**, and **4% inventory cost reduction** in named case snippets (Toolio: https://www.toolio.com/).

**Gartner / IDC**

**Cited fact:** Gartner’s 2024 Market Guide for Retail Forecasting, Allocation and Replenishment says retailers are modernizing legacy supply-chain solutions toward collaborative planning, data-centric techniques, AI/ML, and clear use cases (Gartner abstract: https://www.gartner.com/en/documents/5377963).

**Cited fact:** Gartner’s 2024 Supply Chain Planning Magic Quadrant includes Blue Yonder, o9, RELEX, Anaplan, ToolsGroup and others (Gartner abstract: https://www.gartner.com/en/documents/5374263).

**Cited fact:** Blue Yonder announced it was a Leader in Gartner’s 2025 Magic Quadrant for Supply Chain Planning Solutions (Blue Yonder press release: https://blueyonder.com/media/2025/blue-yonder-named-a-leader-in-the-2025-gartner-magic-quadrant-for-supply-chain-planning).

### What Vendors Do Not Publish

**Unknown:** I found no credible vendor source publishing hard rules such as:

- returns >18% triggers investigate
- top-10 rank triggers winner action
- WOS >90 days triggers markdown
- family velocity ratio >=2.0 triggers color extension
- demand score >=0.7 triggers design sequel

**Inference:** Enterprise planning vendors sell configurable models, workflows, optimization, and scenario planning. They avoid universal thresholds because thresholds vary by category, channel, lifecycle age, season, price point, margin, lead time, and brand strategy.

---

## Pillar 3: Mango and Rivals

## Mango

### Current Operating Facts

**Cited fact:** Mango’s official LinkedIn/company material says it operates in **120+ markets**, has **2,900+ points of sale**, and creates **over 18,000 garments and accessories per year** at Campus Mango (Mango LinkedIn: https://www.linkedin.com/company/mango/).

**Cited fact:** Mango closed 2024 with **€3.339B revenue**, **€219M net result**, and **€219M investment**, according to Modaes coverage of company results (Modaes: https://www.modaes.com/empresas/mango-eleva-un-27-su-beneficio-en-2024-pero-frena-su-crecimiento-al-76).

**Cited fact:** Mango’s 4E 2024-2026 plan is built around Elevate, Expand, Earn, Empower. Forbes reported the plan and U.S. expansion, including over $200M investment in 2023 mainly in stores and logistics/distribution (Forbes: https://www.forbes.com/sites/markfaithfull/2024/03/12/mango-targets-us-growth-to-make-north-america-third-largest-market/).

**Cited fact:** o9 says Mango’s implementation covers MFP, Assortment Planning, and Demand Planning, with approximately **2,850 stores in 120 markets** at announcement time (o9, 25 Mar 2025).

**Cited fact:** Mango launched AI shopping assistant Mango Stylist in July 2025 as part of the Earn pillar: technological innovation, data-driven decision-making, and operational excellence (TheIndustry.fashion: https://www.theindustry.fashion/mango-becomes-ai-pioneer-with-new-virtual-assistant-mango-stylist/).

### Correcting the Named Executives

**Cited fact:** Toni Ruiz is Chairman and CEO of Mango as of January 2025 / CEO since 2020 (Mango governing bodies: https://www.mangofashiongroup.com/en/governing-bodies).

**Cited fact:** Daniel López is not CEO. Mango’s official governance page describes him as Board / Steering Committee member responsible for company/franchise store expansion and wholesale (Mango governing bodies).

**Cited fact:** Jordi Álex Moreno is Mango’s Chief Information Technology Officer (Mango governing bodies).

**Cited fact:** Eva Gallego was appointed global director of Mango Woman in 2025; before Mango she was buying director for accessories, fashion, luxury, jewellery, watches, and footwear at El Corte Inglés (FashionNetwork: https://ww.fashionnetwork.com/news/Mango-appoints-eva-gallego-to-lead-its-women-s-division%2C1747678.html; Spanish trade source: https://noticierotextil.net/economia/mango-incorpora-a-eva-gallego-como-nueva-directora-de-mango-woman/).

**Unknown:** I did not find a credible source for “Roxane Galsim, CTO of Mango.” Official Mango governance identifies Jordi Álex Moreno as CITO.

### Mango Pilot Insertion Plan

**Pain point 1: o9 implementation creates planning data gravity, but not necessarily buyer-ready SKU actions.**  
**Inference:** o9 will consolidate planning. Aimily should ingest retailer sell-through feeds and produce SKU action stacks that buyers can approve/reject, feeding insights back into o9 planning assumptions.

**Pain point 2: Mango is expanding aggressively in the U.S.; local demand read is expensive to learn by trial and error.**  
**Cited fact:** Mango’s U.S. expansion is central to 4E (Forbes 2024).  
**Inference:** Aimily can identify sleeper SKUs by market/store cluster and prevent Spanish/global buys from drowning local signals.

**Pain point 3: Mango Woman leadership reset creates a live category wedge.**  
**Cited fact:** Eva Gallego became global director of Mango Woman in 2025.  
**Inference:** Start with Mango Woman, not company-wide transformation. Women’s fashion has the highest SKU complexity and strongest return/fit signal.

**Pain point 4: returns need to be operationalized into buying decisions.**  
**Cited fact:** Online apparel returns commonly run around 20-30%; total U.S. retail returns were **14.5% of sales in 2023** (NRF/Appriss: https://nrf.com/media-center/press-releases/nrf-and-appriss-retail-report-743-billion-merchandise-returned-2023; Shopify: https://www.shopify.com/enterprise/blog/eCommerce-returns/).  
**Inference:** A SKU can be a gross-sales winner and a net-margin loser. Aimily’s return-adjusted action logic is a real wedge.

**Executives to target:**

- **Eva Gallego, Global Director Mango Woman**: strongest commercial buyer persona.
- **Toni Ruiz, Chairman & CEO**: strategic sponsor for 4E, U.S. expansion, operational excellence.
- **Jordi Álex Moreno, Chief Information Technology Officer**: integration sponsor, especially because o9 is already in flight.
- **Daniel López, Board / Steering Committee, expansion and wholesale**: useful if the pilot is framed around U.S. expansion / franchise / wholesale sell-through.

**Wedge vs o9:**

- o9: enterprise planning platform, MFP/AP/DP, scenario planning, data model.
- Aimily: per-SKU in-season commercial decision engine; action stack; buyer-readable explanations; fast overlay on retailer feeds; return-adjusted hero/dog logic; “what should I do Monday morning?” layer.

## Rivals

### H&M

**Cited fact:** In 2018 H&M had roughly **$4B-$4.3B** in unsold inventory; inventory rose to **17.6% of sales** in Q1 2018 and operating profit fell **62%** to a 16-year low (News24/Bloomberg: https://www.news24.com/business/Companies/Retail/hms-pile-of-unsold-garments-grow-as-earnings-plunge-20180327; NPR: https://www.kgou.org/business-and-economy/2018-03-28/h-m-leaves-4-3-billion-in-unsold-inventory-on-the-racks).

**Cited fact:** H&M FY2018 gross margin was **52.7%**, down from **54.0%** (H&M 2018 annual report: https://www.annualreports.com/HostedData/AnnualReportArchive/h/hm-group_2018.pdf).

**Inference:** H&M’s failure mode was not one bad threshold; it was slow demand sensing, too much inventory commitment, and insufficiently fast correction.

### Shein

**Cited fact:** Wired reports Shein places small initial orders of **100-200 pieces** to test designs before scaling winners (Wired: https://www.wired.com/story/fast-cheap-out-of-control-inside-rise-of-shein/).

**Cited fact:** Advocacy and trade summaries commonly cite Shein small-batch orders of about **100 units**, then rapid scale-up if demand proves out (Labour Behind the Label 2024 briefing: https://labourbehindthelabel.org/wp-content/uploads/2024/06/SHEIN-IPO-2024-Briefing.pdf).

**Inference:** Shein’s model validates Aimily’s `AMPLIFY_WINNER`, `EXTEND_COLORS`, and `RESIZE_DOWN` logic, but Shein’s threshold is production-test economics, not retail sell-through alone.

### ASOS / Boohoo

**Cited fact:** ASOS warned in June 2022 that profits could fall from over **£190M** to as little as **£20M**, citing a significant increase in returns (Guardian: https://www.theguardian.com/business/2022/jun/16/asos-warns-on-profits-amid-significant-increase-in-customer-returns).

**Cited fact:** Boohoo swung to a **£90.7M pretax loss** in FY2023 after a **£92.2M profit** the prior year, with higher return levels as a factor (Guardian: https://www.theguardian.com/business/2023/may/16/boohoo-loss-shoppers-return-items-fashion-high-street).

**Cited fact:** Boohoo’s 2022 interim results said return rates were up significantly YoY and ahead of pre-pandemic levels (Boohoo interim results: https://www.boohooplc.com/sites/boohoo-corp/files/all-documents/result-centre/2022/boohoo-group-plc-interim-results-fy23-final.pdf).

**Inference:** Returns deserve to block winner replication when they destroy net margin or indicate fit/quality failure. This supports your second returns rule directionally.

### Uniqlo / Fast Retailing

**Cited fact:** Fast Retailing reports extensive integrated reporting and supply-chain focus; UNIQLO uses RFID and real-time inventory visibility as part of its supply-chain execution (Fast Retailing reports: https://www.fastretailing.com/eng/ir/library/annual.html).

**Cited fact:** Academic/case summaries of the Ariake Project describe AI-driven demand confirmation and RFID-based real-time inventory visibility before production decisions (Gakushuin/Usui PDF: https://duobfe01ry0nr.cloudfront.net/189_PDF_UNIQLO_Supply_Chain_Management_594e5e9be7.pdf).

**Inference:** Uniqlo supports `CARRYOVER` and replenishment logic for basics more than fashion hero-chasing. Its operating model is closer to disciplined core replenishment than Zara’s high-fashion scarcity loop.

---

## Pillar 4: Academic / Textbook Canon

### Open-to-Buy and Buyer Control

**Cited fact:** Merchandise Financial Planning / OTB is the commercial budgeting process that maps planned sales, inventory, receipts, markdowns, and gross margin. Oracle’s MFP guide describes weekly review of sales impact on beginning/end inventory and adjusting receipts where open-to-buy exists (Oracle MFP user guide: https://docs.oracle.com/cd/E75764_01/merchfinplan/pdf/cloud/1601/mfprcs-1601-ug.pdf).

**Cited fact:** Anaplan and Blue Yonder similarly define MFP as aligning sales, inventory, receipts, margin, and turnover targets (Anaplan MFP; Blue Yonder MFP FAQ).

**Inference:** Aimily actions should map to OTB levers: cancel/kill, accelerate markdown, reorder/replenish, reduce future receipts, investigate quality/fit, expand style family, carry over basics.

### Accurate Response

**Cited fact:** Fisher & Raman’s “Reducing the Cost of Demand Uncertainty Through Accurate Response to Early Sales” frames fashion as long lead time, uncertain demand, and high inventory loss; it uses early sales to update production decisions (Fisher & Raman 1996, Operations Research 44(1):87-99; summary: https://studylib.net/doc/13621701/reducing-the-cost-of-demand-uncertainty-through-accurate-...).

**Inference:** This is the strongest academic support for Aimily’s “early signal -> buy/reorder/resize decision” architecture.

### Markdown Optimization

**Cited fact:** Smith & Achabal model clearance pricing and inventory policies for retail chains; demand depends on price, seasonality, and remaining assortment/inventory. Pricing errors cause lost revenue or excess inventory liquidation (Smith & Achabal 1998, Management Science, DOI 10.1287/mnsc.44.3.285: https://pubsonline.informs.org/doi/10.1287/mnsc.44.3.285).

**Cited fact:** Bitran & Mondschein show periodic pricing for seasonal products; later summaries state optimal price generally decreases over time and with higher inventory left (Bitran & Mondschein 1997, Management Science, DOI 10.1287/mnsc.43.1.64; cited at https://www.aimsciences.org/article/doi/10.3934/jimo.2022005?viewType=HTML).

**Cited fact:** Pashigian argues growing fashion/product variety increased markups, markdowns, and sales frequency in department stores (Pashigian 1988, AER: https://EconPapers.repec.org/RePEc:aea:aecrev:v:78:y:1988:i:5:p:936-53).

**Cited fact:** Caro & Gallien 2012 bring this directly to Zara clearance pricing and report a live controlled pilot.

**Inference:** Markdown acceleration should be driven by remaining selling time, inventory, elasticity, margin, and terminal-stock target. Fixed depth tiers are less canonical than optimized markdown ladders.

### Returns Economics

**Cited fact:** NRF/Appriss reports U.S. retail returns at **14.5% of sales in 2023** (NRF 2023 report).

**Cited fact:** Shopify says average ecommerce return rates can range up to **30%** for some retailers and processing a return can cost **20-65%** of item value (Shopify enterprise returns guide: https://www.shopify.com/enterprise/blog/eCommerce-returns/).

**Cited fact:** Several logistics/returns industry sources place apparel/fashion online returns around **20-30%**, with footwear/fashion sometimes higher; these are less authoritative than NRF/Shopify but directionally consistent (Red Stag: https://redstagfulfillment.com/average-return-rate-for-a-shopify-store/).

**Inference:** A return threshold must be category/channel-specific. 18% is high for all-retail, normal for online apparel, low for fit-sensitive ecommerce dresses/footwear.

---

## Validation of Your 14 Thresholds

| # | Your threshold | Verdict | Replacement / comment |
|---|---|---|---|
| 1 | `returns_pct >= 18%` triggers `INVESTIGATE` | **Partially supported, likely too low for online apparel** | NRF all-retail 2023 is 14.5%, but online apparel commonly 20-30%. Use category/channel bands: store apparel >12-15% investigate; ecommerce apparel >25-30%; footwear/fitted dresses >30-35%. |
| 2 | `returns_pct > 35%` blocks `AMPLIFY_WINNER` | **Supported directionally** | 35% is above normal apparel ecommerce and should block replication unless margin is exceptional and return reasons are benign. Better: block if return-adjusted gross margin below target or fit/quality return reason over-indexes. |
| 3 | `pdf_rank <= 10` triggers `AMPLIFY_WINNER` | **Unknown / too crude** | No canonical top-10 threshold found. Use exposure-adjusted demand: high rank only matters after controlling for retailer push, distribution, stock, age, and margin. |
| 4 | `velocity_rank <= 10` triggers `AMPLIFY_WINNER` | **Unknown / too crude** | Rank can work as a feature, not a trigger. Use velocity percentile plus stock availability, sell-through, margin, and returns. |
| 5 | `sell_through_bought <20%` and buy >1000 and not new -> `RESIZE_DOWN` | **Supported directionally; threshold aggressive** | Fashion sell-through benchmarks are often 60-80% by season, >80% for short-life drops. <20% after a fair selling window is a serious dog. Need lifecycle-age normalization. |
| 6 | `exit`: sell-through <10% after 30+ days -> `KILL` | **Supported directionally, but too rigid** | If 30 days is a meaningful fraction of the selling window, <10% is severe. But expensive outerwear, occasionwear, or low-distribution launches may need different windows. |
| 7 | `effective_margin <0` and returns >=30% -> `KILL` | **Supported** | Negative effective margin plus high returns is a clear commercial kill unless there is strategic brand/traffic rationale. |
| 8 | `markdown_risk_score >0.4`, score=`stock_days/90` -> `MARKDOWN_ACCELERATE` | **Unknown / simplistic** | WOS is canonical. Fixed 90 days is not. Use days to season end / exit date, forecast, margin, elasticity, and target terminal inventory. |
| 9 | `stock_days = pipeline_total / (velocity_7d/7)` | **Supported as WOS/DOS proxy** | Weeks/days of supply is canonical. But use net velocity, availability-adjusted velocity, and trend-adjusted demand; avoid 7d only for noisy SKUs. |
| 10 | `stockout_risk_score >0.3` and velocity_7d>0 -> `REPLENISH` | **Unknown threshold, supported concept** | Replenishment is canonical. Trigger should depend on service level, lead time, minimum presentation stock, size curve, and margin. |
| 11 | lifecycle ramp if WoW velocity ratio >=1.3, decay <=0.7 | **Unknown** | No cited canonical 30% WoW threshold. Plausible engineering prior, but must control for stockouts, markdowns, traffic, seasonality, and weekday mix. |
| 12 | markdown depth: 40% premium, 50% mid, 60% fast fashion | **Contradicted as universal** | Markdown literature optimizes depth by elasticity/time/inventory. Retail practice uses ladders, but no canonical segment tiers found. Zara wins by less markdown exposure, not fixed 40/50/60 rules. |
| 13 | `family_velocity_ratio >=2.0` contributes to winner | **Unknown, plausible** | No cited public threshold. Good feature for sequels/color extension if normalized for distribution, stock, and exposure. |
| 14 | `demand_score >=0.7` and sell-through >=50% contributes to winner | **Unknown / 50% may be weak** | Sell-through >=50% can be merely mid-market healthy depending on timing. For winner status, require above category-time benchmark, high full-price sell-through, margin, and low returns. |

---

## Cross-KPI Relationship Matrix

| Pattern | Signal | Buyer action |
|---|---|---|
| High velocity + high returns | Gross demand exists, but fit/quality/expectation problem may destroy net margin | `INVESTIGATE`; block `AMPLIFY_WINNER` until return reasons and net margin clear |
| High velocity + low returns + high margin | True winner | `AMPLIFY_WINNER`, `REPLENISH`, possible `EXTEND_COLORS` |
| High velocity + low margin | Volume hero, profit weak | Reprice, reduce promo exposure, replenish only if contribution margin positive |
| High margin + low velocity | Premium dog or underexposed item | Check distribution/exposure; if enough exposure, markdown or resize down |
| Low margin + low velocity | Commercial dog | `KILL`, `MARKDOWN_ACCELERATE`, `RESIZE_DOWN` |
| Velocity declining + stock high | Markdown risk | `MARKDOWN_ACCELERATE`; transfer/rebalance before deep discount |
| Velocity declining + stock low | Natural sell-down | `HOLD`; avoid unnecessary markdown |
| High sell-through + low distribution breadth | Sleeper hit | Expand distribution, replenish, test additional doors |
| High retailer rank + low velocity rank | Retailer hyped it; customer rejected or stock/price issue | Investigate price, imagery, fit, placement quality; avoid amplifying blindly |
| Low retailer rank + high velocity rank | Organic sleeper | `AMPLIFY_WINNER`; negotiate more exposure / reorder |
| Normal velocity + high stockout / broken sizes | Demand suppressed by availability | `REPLENISH` / size rebalance; do not mark as mediocre |
| High returns + one size over-index | Fit grading issue | `INVESTIGATE` size/fit; adjust next-season size curve |
| One colorway wins, siblings die | Color preference, not style failure | `EXTEND_COLORS` around winner; markdown losing colors |
| High sell-through + negative margin | Promotion-created false hero | Stop replenishment unless margin corrected |
| Low sell-through + high bought units + not new | Buy-depth error | `RESIZE_DOWN`, markdown, avoid sequel |

---

## Verdict on 9-Action Taxonomy

**Canonical / keep:**

- `KILL`: canonical discontinue/cancel/exit decision.
- `MARKDOWN_ACCELERATE`: canonical clearance / markdown action.
- `REPLENISH`: canonical for continuity, basics, and proven winners.
- `RESIZE_DOWN`: canonical future buy-depth reduction, though rename below.
- `INVESTIGATE`: canonical exception workflow for fit, quality, data, size curve, imagery.
- `AMPLIFY_WINNER`: canonical “chase winners / design sequels,” supported by accurate response and fast-fashion practice.
- `EXTEND_COLORS`: canonical, but should be subordinate to style-family winner logic.
- `CARRYOVER`: canonical for basics / proven evergreen lines.
- `HOLD`: necessary fallback.

**Rename suggestions:**

- `RESIZE_DOWN` -> `REDUCE_NEXT_BUY`. “Resize” can sound like size-curve adjustment, not buy-depth reduction.
- `AMPLIFY_WINNER` -> `CHASE_WINNER` or `EXPAND_STYLE_FAMILY`. Buyers understand “chase.”
- `KILL` -> internally fine, but for buyer UI consider `EXIT_STYLE` / `CANCEL_FUTURE_BUY`.

**Split suggestion:**

- Split `INVESTIGATE` reasons: `FIT_QUALITY_INVESTIGATE`, `DATA_STOCK_INVESTIGATE`, `PRICE_EXPOSURE_INVESTIGATE`. Same action family, different owner.

**Do not consolidate:**

- Keep `EXTEND_COLORS` separate from `AMPLIFY_WINNER`. Same style may deserve color expansion without full sequel investment.

---

## Recommended Initial Rule Replacements

Use these as **priors**, not claimed universal truth.

1. Returns:
   - Store apparel: investigate above 12-15%.
   - Ecommerce apparel: investigate above 25-30%.
   - Block winner above 35% unless return-adjusted margin and return reasons are acceptable.

2. Winner:
   - Require high velocity percentile, high full-price sell-through versus lifecycle benchmark, positive effective margin, adequate availability, and returns below category threshold.
   - Do not use top-10 rank alone.

3. Dog / resize down:
   - <20% sell-through after 30+ days is a severe signal only if the SKU had enough exposure and stock.
   - Better: sell-through below 40-50% of planned curve by mid-season; below 20% after meaningful exposure -> hard resize down / markdown.

4. Markdown:
   - Replace `stock_days / 90` with `projected_terminal_stock`, `days_to_exit`, `forecast_decay`, `gross_margin`, `markdown_elasticity`, and `target_sell-through`.
   - Keep WOS/DOS for explainability.

5. Replenishment:
   - Trigger on forecast demand during lead time + safety stock + presentation minimum + size curve, not stockout risk score alone.
   - Block replenishment into high-return or negative-margin SKUs.

---

## References

- Ferdows, K., Lewis, M. A., & Machuca, J. A. D. “Rapid-Fire Fulfillment.” Harvard Business Review, 2004. https://hbr.org/2004/11/rapid-fire-fulfillment
- Ghemawat, P., & Nueno, J. L. “Zara: Fast Fashion.” Harvard Business School, 2003.
- McAfee, A., Dessain, V., & Sjoman, A. “Zara: IT for Fast Fashion.” Harvard Business School, 2007.
- Caro, F., & Gallien, J. “Inventory Management of a Fast-Fashion Retail Network.” Operations Research 58(2), 2010. DOI: 10.1287/opre.1090.0697. https://www.mit.edu/people/jgallien/ZaraOR2010.pdf
- Caro, F., & Gallien, J. “Clearance Pricing Optimization for a Fast-Fashion Retailer.” Operations Research 60(6), 2012. DOI: 10.1287/opre.1120.1102. https://www.anderson.ucla.edu/faculty_pages/felipe.caro/papers/pdf_FC15.pdf
- Inditex Annual Report 2024. https://static.inditex.com/annualreport2024/en
- o9 / Mango announcement, 25 Mar 2025. https://o9solutions.com/news/o9-and-mango-partner-to-modernize-the-fashion-brands-end-to-end-planning-capabilities
- o9 global fashion case. https://o9solutions.com/case-studies/global-fashion
- Nextail sell-through help. https://help.nextail.co/en/sell-out-and-sell-through-calculation
- Nextail replenishment help. https://help.nextail.co/kb/introduction-to-replenishment
- RELEX markdown optimization. https://www.relexsolutions.com/resources/markdown-optimization-how-retailers-can-clear-stock-while-maximizing-margin/
- Centric Planning. https://www.centricsoftware.com/centric-planning/
- Anaplan MFP. https://www.anaplan.com/solutions/merchandise-financial-planning-for-retail/
- Blue Yonder MFP FAQ. https://info.blueyonder.com/retail-planning-category-management/what-is-blue-yonder-merchandise-financial-planning
- Toolio. https://www.toolio.com/
- Gartner Market Guide for Retail Forecasting, Allocation and Replenishment, 2024. https://www.gartner.com/en/documents/5377963
- Gartner Magic Quadrant for Supply Chain Planning, 2024. https://www.gartner.com/en/documents/5374263
- NRF / Appriss 2023 returns report. https://nrf.com/media-center/press-releases/nrf-and-appriss-retail-report-743-billion-merchandise-returned-2023
- Shopify ecommerce returns guide. https://www.shopify.com/enterprise/blog/eCommerce-returns/
- H&M 2018 annual report. https://www.annualreports.com/HostedData/AnnualReportArchive/h/hm-group_2018.pdf
- H&M inventory coverage. https://www.news24.com/business/Companies/Retail/hms-pile-of-unsold-garments-grow-as-earnings-plunge-20180327
- Wired on Shein. https://www.wired.com/story/fast-cheap-out-of-control-inside-rise-of-shein/
- ASOS returns warning. https://www.theguardian.com/business/2022/jun/16/asos-warns-on-profits-amid-significant-increase-in-customer-returns
- Boohoo returns/loss. https://www.theguardian.com/business/2023/may/16/boohoo-loss-shoppers-return-items-fashion-high-street
- Mango governing bodies. https://www.mangofashiongroup.com/en/governing-bodies
- Mango 2024 results, Modaes. https://www.modaes.com/empresas/mango-eleva-un-27-su-beneficio-en-2024-pero-frena-su-crecimiento-al-76
- Mango U.S. expansion / 4E. https://www.forbes.com/sites/markfaithfull/2024/03/12/mango-targets-us-growth-to-make-north-america-third-largest-market/
- Mango Woman appointment. https://ww.fashionnetwork.com/news/Mango-appoints-eva-gallego-to-lead-its-women-s-division%2C1747678.html
- Smith, S. A., & Achabal, D. D. “Clearance Pricing and Inventory Policies for Retail Chains.” Management Science 44(3), 1998. DOI: 10.1287/mnsc.44.3.285. https://pubsonline.informs.org/doi/10.1287/mnsc.44.3.285
- Pashigian, B. P. “Demand Uncertainty and Sales: A Study of Fashion and Markdown Pricing.” American Economic Review 78(5), 1988. https://EconPapers.repec.org/RePEc:aea:aecrev:v:78:y:1988:i:5:p:936-53
- Bitran, G. R., & Mondschein, S. V. “Periodic Pricing of Seasonal Products in Retailing.” Management Science 43(1), 1997. DOI: 10.1287/mnsc.43.1.64.
- Fisher, M., & Raman, A. “Reducing the Cost of Demand Uncertainty Through Accurate Response to Early Sales.” Operations Research 44(1), 1996.

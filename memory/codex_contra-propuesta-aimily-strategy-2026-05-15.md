**Contra-Propuesta**

Your architecture is too close to “AI planning feature bolted onto Block 2.” For enterprise, that is the wrong center of gravity.

The product should not start as “historical data plus creative direction produces next collection plan.” That is politically threatening, hard to prove, and easy to dismiss as a black-box consultant. The stronger wedge is:

> **Aimily Strategy should be a decision-intelligence layer that explains what to repeat, kill, resize, recolor, carry over, markdown, or investigate, then optionally emits a Block 2 plan.**

The plan is not the product. The defensible insight layer is the product.

---

**1. Entity Model**

Your table split is directionally useful, but the boundaries are wrong.

I would not make `strategy_observations` a giant normalized-plus-JSON bucket. That becomes a swamp. Split ingestion from facts:

- `strategy_sources`
  Uploaded PDF/CSV/feed metadata, parser version, tenant, season, market, source confidence.

- `strategy_raw_records`
  Row-level raw extracted data, original labels, raw JSON, extraction confidence, source row/page coordinates.

- `strategy_product_facts`
  Product identity, model, color, family, season, activation date, price, promo state.

- `strategy_inventory_facts`
  Store stock, warehouse, transit, pending, blocked, fabric, availability, store coverage.

- `strategy_sales_windows`
  Yesterday, previous day, last 7d, prior 7d, sold units, value, gross commission, store sale count.

- `strategy_efficiency_facts`
  Bought, shipped, sold, sell-through bought, sell-through shipped, returns.

Then compute downstream.

`strategy_learnings` should not be a free-floating table of labels. It should be run-scoped and versioned:

- `strategy_analysis_runs`
  Input source set, algorithm version, tenant mapping version, creative brief version, generated at.

- `strategy_sku_scores`
  SKU/color-level metrics: demand score, margin score, return risk, stockout risk, markdown risk, confidence.

- `strategy_family_scores`
  Family-level ROI, saturation, cannibalization, return drag, stock productivity.

- `strategy_recommendation_candidates`
  Concrete possible actions before final scenario assembly.

Your `strategy_sku_lineage` should not be a naive table created by dropping the color suffix. That is too brittle. Make it a **materialized identity graph** with confidence:

- exact model match
- colorway variant
- renamed carryover
- similar silhouette
- substitute product
- unknown

Enterprise data will contain renames, regional codes, ERP variants, supplier aliases, and reused model numbers. “Drop color suffix” works for Zara PDF demo data. It will break in the real world.

`strategy_directions` should be split. Bucket A and Bucket B are not peers.

- Bucket A = constraints and commercial intent.
  Target margin, SKU count, budget, tiering, family allocation, channel mix. These are hard or semi-hard constraints.

- Bucket B = creative preference and narrative modulation.
  Moodboard, palette, archetype, styling language. These are soft weights.

If you store them together, you will eventually let a moodboard override a margin constraint because both are just “direction.” Bad boundary.

---

**2. Blind Spots**

The biggest blind spot: **sales are not demand**.

A SKU can sell poorly because nobody wanted it, or because it was under-distributed, out of stock, launched late, priced wrong, hidden in weak stores, cannibalized by a sibling, or held back by replenishment. Your current classifiers risk confusing observed sales with customer preference.

Specific underused signals from the Zara PDF:

- `Días en tienda`
  You need velocity per active day. A 7-day-old SKU and a 60-day-old SKU cannot be ranked naively.

- `Nº T st / St Act`
  Distribution breadth matters. Sell-through across 20 stores is not comparable to sell-through across 500 stores.

- `stores-with-sale-yesterday`
  This is a demand diffusion signal. A SKU selling in many stores is healthier than one carried by one flagship spike.

- `Mx Vta L-D` and `Mx Vta NP L-D`
  This is a ceiling/capacity signal. It can reveal latent demand and promo dependency.

- `Almacén Disp.`, `Tránsito`, `Pendiente`
  You need forward-looking stock pressure. A climber with no runway is not a buy recommendation; it is a replenishment or substitute recommendation.

- `Tasa Vaciado` and `Tas.Vac.Dis`
  These are stronger operational warning signals than raw unit rank.

- `Éxito Enviado %` vs `Éxito Comp %`
  This distinction matters. Field absorption and full-buy sell-through answer different questions.

- `% Devo cli`
  Returns should not be a note. They should be a hard penalty. A 50% return SKU is not a hero; it is a margin trap unless the economics still work after reverse logistics.

- Compare/crossed price and promo flag
  You need markdown-adjusted demand. A discounted “winner” may be a loser at full price.

You also need dimensions not present in the PDF:

- geography or region
- channel split
- store cluster
- size curve
- weather
- marketing exposure
- product page traffic
- search terms
- add-to-cart vs purchase
- return reason
- markdown date
- stockout days
- image/model/styling treatment
- supplier lead time
- gross margin after returns and markdowns

Without these, your output should say “directional hypothesis,” not “recommendation.”

---

**3. Deterministic First vs LLM End-to-End**

Do not let an LLM reason end-to-end over raw observations for enterprise recommendations.

That produces impressive demos and indefensible decisions. The failure mode is subtle: the LLM will explain correlations as causes, overweight vivid rows, miss censored demand, and invent strategic certainty where the data is insufficient.

The right stack is:

1. deterministic parsing
2. deterministic normalization
3. deterministic feature computation
4. deterministic scoring and constraints
5. scenario generation
6. LLM narrative, critique, and merchandising-language translation

Use the LLM to explain, compare, challenge, summarize, and map creative language onto product attributes. Do not use it as the primary calculator.

There is one valid agentic use case: **investigation assistant**. Let the agent ask, “Why is this SKU marked as a hero despite 49% returns?” or “Show me white shirts with high velocity but low full-buy sell-through.” That is analyst augmentation, not autonomous planning.

Enterprise audit favors classifiers-first. You can show formulas, inputs, thresholds, model versions, and exceptions. LLM-end-to-end gives you vibes with logs.

---

**4. Wedge Question**

“Next-season buying recommendations” is probably the wrong beachhead for Inditex/H&M-scale customers.

That decision is politically loaded. Buyers, planners, merch directors, finance, sourcing, and regional teams all own pieces of it. An external product saying “here is next season’s plan” walks directly into organizational resistance.

Easier wedges:

1. **Carryover / kill / resize recommendations**
   “Which winners deserve another season, which apparent winners are return traps, which dogs should not be repeated?”
   Low friction. Merchants already debate this.

2. **Color extension on proven models**
   “This silhouette works; which colors should expand or contract?”
   This is closer to creative-led merchandising and uses your Bucket B story well.

3. **Markdown timing and stock-risk alerts**
   More operational, faster ROI, easier to prove. But it competes more directly with planning/replenishment vendors.

4. **Return-adjusted hero detection**
   Strong because many internal dashboards still crown high-volume SKUs while ignoring return drag.

5. **Family architecture critique**
   “Your romantic blouse family looks overbought; only these two archetypes are earning expansion.”
   This is strategic without pretending to replace the planner.

The lowest-friction buyer inside a large org is not the C-suite. It is a category, merchandising, or buying director with one painful seasonal review process. Sell them a sharper post-season/pre-season decision pack, not a planning brain.

---

**5. Pricing and Packaging**

Do not start with €750K+ “AI strategy platform” unless you already have executive sponsorship. Sell a paid diagnostic that becomes infrastructure.

Smallest check-worthy deliverable:

> **Season Performance Intelligence Pack**
> Ingest one or two seasons, normalize SKU performance, identify true heroes/dogs/climbers/return traps/color winners, produce recommended carryover and cut list, export to the customer’s planning format.

Pilot structure:

- 6-8 weeks
- 1 category or department
- 1-2 seasons of data
- one creative direction overlay
- retrospective backtest against known outcomes
- final decision workshop
- output: ranked recommendations, confidence, evidence, plan deltas

Pricing:

- Tier-2 paid pilot: €40K-€90K
- Enterprise pilot: €100K-€250K
- Annual after pilot: €250K-€750K for limited scope
- Expansion: more categories, regions, feeds, planning integrations, custom deployment

Land-and-expand path:

1. post-season intelligence
2. carryover/color/kill decisions
3. pre-season assortment scenarios
4. Block 2 plan emission
5. integrations into PLM, ERP, o9/Anaplan/Centric
6. private deployment / dedicated tenant

Do not lead with “we replace planning.” Lead with “we make your existing planning decisions more evidence-backed and creative-aware.”

---

**6. Failure Modes**

Concrete nonsense scenarios:

- A SKU sells slowly because it launched 5 days ago. Engine calls it a dog.
- A SKU sells fast because it was underbought and stocked only in top stores. Engine calls it a mass hero.
- A color wins because it was allocated to better locations. Engine calls it a color preference.
- A discounted SKU spikes. Engine recommends expansion at full price.
- A high-return trouser looks like a hero on sold units. Engine ignores reverse logistics and recommends more.
- A sold-out SKU shows weak last-7-day sales. Engine thinks demand decayed.
- A family underperforms because one bad product polluted the average. Engine cuts the whole family.
- A PDF only contains top-ranked SKUs. Engine cannot see the true dogs but pretends it can.
- Carryover looks healthy because only survivors remain visible. Survivorship bias corrupts the lesson.

Protections:

- every recommendation needs confidence
- every confidence score needs data sufficiency reasons
- engine must be allowed to say “insufficient evidence”
- recommendation cards must show evidence, counter-evidence, and assumptions
- no auto-write into Block 2 without human approval
- accepted recommendations should create a diff, not overwrite plans
- all runs must be reproducible by source version and algorithm version

Confidence should not be one number. Use separate confidence dimensions:

- data completeness
- identity confidence
- demand confidence
- margin confidence
- creative fit confidence
- action confidence

A recommendation with high creative fit and low demand confidence should look risky by design.

---

**7. Architecture Risks**

The biggest technical debt risk is letting Strategy leak into Block 2 too early.

Do not add only “two TEXT narrative columns” to `collection_plans`. That is under-modeled. You need provenance.

Add something like:

- `collection_plan_strategy_links`
  `collection_plan_id`, `strategy_recommendation_id`, `strategy_run_id`, accepted_by, accepted_at, emitted_diff, confidence_summary.

Keep narrative in Strategy tables. Block 2 should receive structured plan data plus a pointer back to the evidence.

Tenant isolation:

- For normal SaaS: shared DB with strict RLS can work.
- For serious enterprise pilots: schema-per-tenant is cleaner operationally.
- For Inditex/H&M-scale: assume dedicated Supabase project or dedicated Postgres/VPC deployment.

Do not underestimate procurement. “We use shared Supabase with RLS” may be technically fine and commercially fatal for tier-1.

Vector store:

You probably need embeddings, but not as the source of truth. Use them for:

- archetype re-tagging
- visual/moodboard similarity
- product description similarity
- cross-season substitute detection

But the canonical recommendation engine should rely on structured facts and versioned scores, not vector retrieval.

---

**8. What You Haven’t Asked**

You need a backtesting story.

Before selling recommendations, prove that if the engine had existed last season, it would have identified:

- false heroes
- real carryovers
- return traps
- overbought winners
- family saturation
- color mistakes
- late climbers

Without backtesting, this is a nice strategy narrative generator.

You also need a taxonomy product, not just a mapping table. Family mapping, color mapping, archetype mapping, and model lineage will be painful enterprise work. Make that visible, versioned, reviewable, and billable.

Final blunt take: your current proposal is too eager to emit a plan. The stronger product is a forensic merchandising intelligence layer with creative modulation. Earn trust by being right about last season before claiming authority over next season.

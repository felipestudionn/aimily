---
name: Aimily Strategy · Business Plan v1
description: Forensic merchandising intelligence layer (with creative modulation) for established fashion brands at tier-2 to tier-1 scale. Wedge product anchored on Block 2 — parallel anex to aimily.app like Studio. Day 1 scope, pricing, architecture, backtesting story, competitive moat, EU AI Act lane, MVP roadmap.
type: project
---

# Aimily Strategy · Business Plan v1

**Date**: 2026-05-15
**Status**: Day 0 — research consolidated, ready to commit to MVP scope
**Companion docs (read in order)**:
1. `research_aimily-strategy-data-schema-mapping-2026-05-15.md` (data dimension + schema deltas · my draft, partially superseded by Codex contrapropuesta below)
2. `research_aimily-strategy-competitive-landscape-2026-05-15.md` (35+ players, wedge real, Centric blocker, Mango tier-1 landable)
3. `audit_block-2-for-aimily-strategy-2026-05-15.md` (Block 2 spine, CIS as integration layer, 5 technical gaps, parallel `/strategy` anex recommendation)
4. `codex_contra-propuesta-aimily-strategy-2026-05-15.md` (adversarial review — reframed wedge from "plan emitter" to "forensic intelligence layer", 8 demolitions, backtesting + taxonomy as first-class modules)

---

## 0. Executive summary

**Aimily Strategy is a forensic merchandising intelligence layer with creative modulation.** It ingests historical SKU performance from established fashion brands (Inditex / H&M / Mango scale) plus an optional creative direction overlay, computes evidence-backed decisions about what to repeat / kill / resize / recolor / carry over / markdown / investigate, and — only after earning trust on the post-season decision layer — emits a pre-populated Collection Plan into the existing aimily Block 2 surface.

**The plan emission is NOT the v1 product.** The defensible insight layer is. We win enterprise trust by being demonstrably right about the previous season (via backtesting) before we claim authority over the next season. This reframe came directly from the Codex adversarial review and unlocks a much sharper political position inside Inditex/H&M-scale buying orgs, where "external AI replaces planning" is dead on arrival and "external AI sharpens the merchant's seasonal review pack" is paid pilot in 8 weeks.

**Architecture follows the Aimily Studio pattern**: separate anex at `aimily.app/strategy`, separate Stripe enterprise contracts, separate authenticated workspace, shared aimily authentication. Block 2 is reused verbatim as the eventual emission target — the bridge is a single endpoint that writes canonical CIS keys, from which `loadFullContext()` projects everything downstream automatically. No reopening of the closed Block 2 surface; no risk to the existing aimily 360 product. **Day 1 scope: 5-6 weeks of focused build on the forensic intelligence layer + paid-diagnostic pilot kit. No plan emission until v3.**

---

## 1. Tesis del producto

### 1.1 Reframe definitivo (de Codex)

| Eje | Draft inicial (mío) | v1 definitivo (post-Codex) |
|---|---|---|
| Centro de gravedad | Plan emitter sobre Block 2 | Decision-intelligence layer; plan emission opcional/posterior |
| Primer output | Collection Plan recomendada | Ranked decisions (carryover / kill / resize / recolor / markdown / investigate) con evidence + counter-evidence + 6 confidence dimensions |
| Buyer | CMO / planning director (top-down) | Category / merchandising / buying director (con un seasonal review process doloroso) |
| Mensaje | "Recomendamos tu próxima colección" | "Hacemos tu seasonal review más evidence-backed y creative-aware" |
| Pilot ticket | €120-300K tier-2 / €750K-2M+ tier-1 | €40-90K tier-2 pilot / €100-250K enterprise pilot / €250-750K annual |
| Trust-building | "AI propone, tú apruebas" | Backtesting: "te demostramos qué *habríamos* dicho la temporada pasada" |
| Validity proof | Confidence score único | 6 confidence dimensions + evidence trail + algorithm version + data sufficiency declarations |

### 1.2 La frase de una línea

> **Aimily Strategy** es el layer forense que explica qué repetir, matar, redimensionar, recolorear, mantener, rebajar o investigar de tu temporada pasada — y opcionalmente proyecta esas decisiones a tu próxima colección en aimily Block 2.

### 1.3 Por qué este producto, por qué ahora

1. **El wedge es real y abierto** — el competitive landscape confirma: 35+ players, dos campos siloed (quant: o9 / Centric Planning / Anaplan / Blue Yonder / RELEX / ToolsGroup / Nextail / MakerSights · creative: WGSN / Heuritech / Stylumia / Trendalytics / EDITED / First Insight / Raspberry AI). Nadie ship la intersección "SKU history × creative direction × LLM strategic narrative" en un workflow fusionado.

2. **El blocker es Centric / Dassault** — ya poseen Centric Planning + Visual Boards (Valentino 2025-12, Deichmann 2025-03) + Contentserv (€220M acquisition 2025-02). Tres piezas, NO fusionadas, NO LLM-narrative layer. Acquirer natural si el wedge madura. Eso significa **window of opportunity ~18-30 meses**.

3. **Tier-1 reality** — Inditex corre XTEND + JIT in-house (LLM agents propietarios, -20% overstock vs 2023) pero JIT es store-allocation, NO pre-season line architecture. El creative-led plan sigue siendo manual incluso en Inditex. H&M firmó Google Cloud (postura). **Mango firmó o9 en 2025-03 — quant locked, creative-merch capa abierta. Mango = referencia tier-1 más landable.**

4. **EU AI Act lane abierta** — high-risk effective date pushed a 2027-12-02 por omnibus amendment. Ningún incumbent lidera con (a) no training on customer data, (b) DPA + SCCs default, (c) VPC/on-prem, (d) Annex IV docs preparados. Compliance-as-differentiator es **diferenciador hoy** y **destructor de bloqueos legales tier-1 mañana**.

5. **aimily ya tiene la mitad del producto construido** — el audit Block 2 confirma: `loadFullContext()` (262 LOC) es el pipe Block 1→Block 2 listo para que Bucket B (creative) lo absorba sin código nuevo. Los 7 endpoints `recordDecisions()` → `collection_decisions` versionado están listos para emisión Strategy→Block 2 vía single bridge endpoint. **No reescribir Block 2; reusarlo verbatim.**

---

## 2. Target customer + wedge entry

### 2.1 Customer scale matrix

| Tier | Examples | SKU/season | Seasons of history | Data format | ACV target | Lead time |
|---|---|---|---|---|---|---|
| Tier-1 mega | Inditex (Zara/Pull&Bear/Bershka/Stradivarius/Massimo Dutti), H&M, Uniqlo | 10K-50K | 10+ | Internal proprietary feed (Zara RNK PDF style) | €750K-2M+ annual (post-pilot) | 12-18 months |
| Tier-1 fashion | Mango, Adolfo Domínguez, Tendam (Cortefiel), Desigual, Mango Teen, Cos | 2K-10K | 5-10 | ERP exports + custom feeds | €250-750K annual | 6-12 months |
| Tier-2 premium | Bimba y Lola, Massimo Dutti standalone if accessible, Sandro/Maje, Reformation, Ganni, Acne Studios | 500-2K | 3-7 | Shopify Plus + ERP | €100-250K annual | 3-6 months |
| Tier-2 mid | Mid-market DTC with mature collections | 200-800 | 2-5 | Shopify + Centra + Lightspeed | €40-100K annual | 2-4 months |
| Tier-3 SMB | Shopify-native digital brands | <200 | 1-3 | Pure Shopify export | NOT TARGET — use aimily 360 instead | - |

**Phase 1 target = tier-2 premium + tier-1 fashion (Mango as anchor reference)**. Tier-1 mega is the eventual prize but politically multi-year. Tier-3 SMB stays on aimily 360 — Strategy doesn't apply, they have insufficient history.

### 2.2 The buyer persona (Codex insight)

**NOT the CMO. NOT the Chief Merchant Officer.** Those buyers want a "planning brain" and will get blocked by IT, procurement, sourcing, and regional teams.

**The right buyer is a Category / Merchandising / Buying Director** who:
- Owns one painful seasonal review process (post-season retrospective + pre-season briefing)
- Has more SKU performance data than human analysis can absorb
- Currently runs the retrospective on Excel + screenshots + meetings
- Reports to CMO/CMD and needs to defend decisions with evidence
- Has discretionary budget for "consulting / analytics" up to €100K without board approval

The pitch to this buyer is: *"In 6-8 weeks we ingest your last 1-2 seasons, run a backtest that demonstrates we would have identified your real winners and losers, produce an evidence-backed carryover/kill/resize/recolor decision pack for your next seasonal review meeting. You stay in charge of the decisions; we make your case bulletproof."*

That's a writable check. The €750K planning-replacement isn't, not in year one.

### 2.3 Wedge entry — ranked by political friction (Codex)

| # | Wedge module | Friction | ROI proof | Sells to |
|---|---|---|---|---|
| 1 | **Carryover / kill / resize decisions** | LOW — merchants already debate this | Inventory-cost reduction on misclassified carryovers; markdown avoidance on misclassified heroes | Category director |
| 2 | **Color extension on proven models** | LOW — closer to creative-led merchandising, uses Bucket B story well | Higher hit rate on color SKUs in proven silhouettes | Merch + creative director (joint) |
| 3 | **Return-adjusted hero detection** | MEDIUM — challenges existing dashboards that crown high-volume ignoring returns | Margin reclamation; reverse-logistics cost avoidance | CFO + category director |
| 4 | **Family architecture critique** | MEDIUM — "your romantic family is overbought; only these 2 archetypes deserve expansion" is opinionated | Strategic resize without replacing the planner | Merchandising director |
| 5 | **Markdown timing + stock-risk alerts** | HIGH — competes directly with planning/replenishment vendors (o9, Centric Planning) | Operational, fastest ROI | Planning director (but contested) |
| 6 | Next-season buying recommendations | VERY HIGH — politically loaded across buyers + planners + merch + finance + sourcing + regional | Strategic but indefensible without buy-in across functions | NOT V1 — defer to v3 |

**MVP launches with #1 + #2 + #3 + #4.** #5 is sandbox-explored but not headline. #6 is the v3 plan-emission target.

---

## 3. Input architecture · dual bucket, SEPARATE entities (Codex correction)

**Critical Codex correction**: Bucket A and Bucket B are NOT peers. Storing them together in `strategy_directions` eventually lets a moodboard override a margin constraint because "both are just direction". Bad boundary. They must be separate entities with different semantic weight.

### 3.1 Bucket A · Hard / semi-hard constraints (mandatory)

`strategy_constraints` table:
- Target total SKUs
- Target buy budget (absolute or % growth)
- Target average margin (post-returns-post-markdowns)
- Family share-of-wallet targets (e.g. `{vestidos: 0.30, sastrería: 0.15}`)
- Price ladder overrides (per family or global)
- Positioning tier (`premium` | `mid` | `value`)
- Channel mix targets (DTC / wholesale / department-store splits)
- Geographic/regional priorities
- Sourcing constraints (supplier lead times, capacity ceilings)
- Drop count and cadence
- Hard exclusions (sustainability standards, banned suppliers, etc.)

These are CONSTRAINTS the recommendation must respect. Violation = rejected recommendation.

### 3.2 Bucket B · Creative brief (optional, soft weights)

`strategy_creative_brief` table (reuses Block 1 entities verbatim):
- Moodboard ID (FK to Block 1 moodboards)
- Color story (target palette)
- Family pivot direction (`+15% romántico`, `-10% sastrería`)
- Archetype focus list
- Silhouette / cut preferences
- Material / fabric direction
- Customer segment shift narrative
- Creative narrative free-text (LLM input)

These are SOFT WEIGHTS that modulate candidate selection but never override constraints. Audit trail records exactly how each soft weight changed the output vs the pure-data baseline.

### 3.3 Phase 1 input format: Inditex-style internal ranking

The Zara RNK TOTAL PDF analyzed (121 SKUs, V26 + I26+V26 carryover) is the canonical phase-1 ingest format. Per SKU/color row exposes:

- **Identity**: reference `XXXX YYY ZZZ` (model.color.subcolor), description, season tag, family hierarchy (`WOMAN - W.A FLUIDOS LARGO - 1500`), activation date, cluster size
- **Pricing**: PVP current, PVP compare (crossed if discounted), Mk% markup (135-252% observed), promo flag
- **Stock state (multi-location)**: Tienda, Almacén, Almacén Disp., Tránsito, Pendiente (+ expected date), Ajustado, Tejido (fabric), Bloq/B Rfid T st, Días en tienda, Nº T st / St Act (stores with stock / active stores), Alm+Td+Tr+Pte pipeline total, St Dis CD2 (central warehouse 2)
- **Velocity (4 time buckets)**: yesterday / day-before / last-7d / days -8 to -14 × {units, gross commission, % share net sales, importe €}, Mx Vta L-D and Mx Vta NP L-D (max sale Mon-Sun with/without promo as capacity ceiling), stores-with-sale-yesterday, rotation 1d+7d per location, Rot.Td.+Tr+Aj 7D, Rot.Td.+Tr 7D, Tasa Vaciado, Tas.Vac.Dis
- **Pipeline efficiency**: Comprado / Vendido / Enviado / Éxito Enviado % / Éxito Comp % / % Devo cli

### 3.4 Phase 2 input format: Shopify CSV exports

For tier-2 mid market with Shopify Plus / Lightspeed / Centra. Joining 3 reports:
- `Sales by product variant` — units sold, net/gross sales, returns, discounts
- `Inventory Levels` — multi-location stock
- `Returns report` — return counts and (where exposed) reasons

What Shopify lacks vs Zara internal feed (must derive or accept as gap):
- Per-store granularity below shop level — flatter
- `Days in store` / `# stores with stock` — derive from inventory + first-sold timestamp
- `% Devo cli` per SKU/period — derive from returns join
- Stock pipeline (pendiente, tránsito) — separate `Inventory Levels` join

Phase 2 ingest = normalized subset. Tier-2 customers accept tighter feature set.

### 3.5 Phase 3 input format: ERP + PLM custom feeds

For tier-1 (Mango, Tendam) with SAP / Oracle Retail / Centric PLM / Microsoft D365 backbones. Custom ETL per customer, SFTP or API. **Productized as Onboarding Engineering revenue** (not free).

### 3.6 Missing dimensions (per Codex blind-spot list)

The Zara PDF does NOT expose, but Strategy must request from customer at onboarding:
- Geography / region splits
- Channel splits (online vs physical retail vs wholesale vs outlet)
- Store clusters (urban / mall / flagship / outlet / international)
- Size curve performance (some sizes carry the SKU, others kill margin)
- Weather data (sales correlate with regional weather)
- Marketing exposure (campaign units, paid social, email volume per SKU)
- Product page traffic (web sessions per SKU)
- Search terms reaching SKU pages
- Add-to-cart vs purchase conversion
- Return reasons (fit / quality / color expectation / changed mind)
- Markdown date and depth per SKU
- Stockout days per SKU per location
- Supplier lead time per SKU
- Gross margin AFTER returns and markdowns (the real number, not list)
- Image/model/styling treatment in catalog (some "winners" win because of styling, not product)

**Without these, all output must label itself "directional hypothesis", not "recommendation".** Confidence framework enforces this.

---

## 4. Data architecture — corrected after Codex

### 4.1 Ingestion (3 tables, not one swamp)

`strategy_sources` — metadata per upload
- `id`, `tenant_id`, `season`, `market`, `source_format`, `source_type` (pdf/csv/api/sftp), `parser_version`, `uploaded_at`, `confidence`, `record_count`, `coverage_dimensions` (jsonb · which dimensions are present)

`strategy_raw_records` — row-level raw extraction
- `id`, `source_id`, `row_index`, `page_coord` (pdf x/y/page), `raw_json`, `original_labels`, `extraction_confidence`, `parser_warnings`

Anti-corruption layer: source-format-specific fields preserved here; nothing downstream reads `raw_records`. Used for re-derivation when parser improves.

### 4.2 Facts (4 normalized tables, denormalized into score views)

`strategy_product_facts` — identity per SKU per observation snapshot
- `id`, `tenant_id`, `source_id`, `observation_date`, `model_ref`, `color_ref`, `variant_ref`, `product_name`, `family_code`, `subfamily_code`, `season_tag`, `activation_date`, `pvp`, `pvp_compare`, `markup_pct`, `on_promo`, `cluster_size`

`strategy_inventory_facts` — stock state per snapshot
- `id`, `tenant_id`, `product_fact_id`, `observation_date`, `stock_store`, `stock_warehouse`, `stock_available`, `stock_in_transit`, `stock_pending`, `stock_pending_date`, `stock_adjusted`, `stock_blocked`, `stock_fabric`, `days_in_store`, `stores_with_stock`, `stores_active`, `stores_total`, `pipeline_total`, `cd2_available`

`strategy_sales_windows` — velocity per snapshot
- `id`, `tenant_id`, `product_fact_id`, `observation_date`, `window` (`d1` | `d2` | `7d` | `8_14d`), `units`, `gross_commission`, `share_net_sales`, `importe`, `max_sale_promo`, `max_sale_no_promo`, `stores_with_sale_yesterday`, `rotation_1d`, `rotation_7d`, `emptying_rate`, `emptying_rate_available`

`strategy_efficiency_facts` — lifecycle metrics
- `id`, `tenant_id`, `product_fact_id`, `observation_date`, `total_bought`, `total_sold`, `total_shipped`, `sell_through_shipped_pct`, `sell_through_bought_pct`, `returns_pct`

### 4.3 Identity graph (not a "drop color suffix" table)

`strategy_sku_identity_graph` — confidence-weighted lineage
- `id`, `tenant_id`, `canonical_id` (the chosen lineage anchor)
- `member_product_fact_ids[]`
- `match_type` ENUM (`exact_model_match` | `colorway_variant` | `renamed_carryover` | `similar_silhouette` | `substitute_product` | `unknown`)
- `match_confidence` (0-1, computed)
- `evidence_signals` jsonb (string similarity, image embedding distance, family co-occurrence, etc.)
- `human_validated` bool
- `first_seen`, `last_seen`, `seasons_present[]`

**Why this matters**: real enterprise data has renames, regional codes, ERP variants, supplier aliases, and reused model numbers. "Drop color suffix" works for the Zara PDF demo. Breaks immediately in production. Identity must be a graph with confidence, not a regex.

Identity graph is REQUIRED for backtesting (you can't backtest carryover detection without lineage).

### 4.4 Analysis runs (versioned, reproducible)

`strategy_analysis_runs` — one row per generated recommendation set
- `id`, `tenant_id`, `created_at`, `created_by`
- `source_set_ids[]` (which uploads participated)
- `algorithm_version` (semantic version of classifiers + thresholds bundle)
- `taxonomy_version` (which family/color/archetype mapping was active)
- `constraint_set_id` (FK to `strategy_constraints`)
- `creative_brief_id` (FK to `strategy_creative_brief`, nullable)
- `data_coverage_summary` jsonb (which dimensions were present / missing per coverage axis)
- `run_status` (`pending` | `complete` | `failed`)

Every score, every recommendation, every confidence number traces back to ONE `analysis_run`. Re-running with newer algorithm version creates a NEW analysis run, doesn't mutate the old. Enterprise audit demands this.

### 4.5 Scores (run-scoped, multi-dimensional)

`strategy_sku_scores` — per SKU/color, per analysis run
- `id`, `run_id`, `product_fact_id`
- `demand_score` (0-1, distribution-normalized velocity)
- `margin_score` (post-returns, post-markdown)
- `return_risk_score`
- `stockout_risk_score`
- `markdown_risk_score`
- `cannibalization_risk_score` (vs siblings in same family/lineage)
- `distribution_breadth_score`
- `lifecycle_stage` (`new` | `ramp` | `peak` | `decay` | `mature` | `exit`)
- `confidence_data_completeness`
- `confidence_identity`
- `confidence_demand`
- `confidence_margin`
- `confidence_creative_fit`
- `confidence_action`

`strategy_family_scores` — per family, per analysis run
- `id`, `run_id`, `family_code`
- `family_roi`
- `saturation_score`
- `cannibalization_score`
- `return_drag_score`
- `stock_productivity`
- `share_of_wallet_pct`
- `share_of_wallet_trend` (Δ vs prior season)

### 4.6 Recommendation candidates + final scenarios

`strategy_recommendation_candidates` — concrete possible actions BEFORE final scenario assembly
- `id`, `run_id`, `scope` (`sku` | `family` | `archetype` | `color` | `lineage`)
- `scope_ref` (id of the entity scored)
- `action_type` (`carryover` | `kill` | `resize_up` | `resize_down` | `recolor` | `markdown_accelerate` | `markdown_delay` | `investigate` | `substitute` | `geographic_redistribute`)
- `proposed_magnitude` (units, %, price delta)
- `evidence` jsonb (the score rows + observations backing this)
- `counter_evidence` jsonb (what argues against this action)
- `confidence_action` (composite of the 6 dimensions)
- `data_sufficiency_warning` text (e.g. "Only 1 season of history; carryover detection lower confidence")

`strategy_scenarios` — assembled recommendation sets honoring constraints
- `id`, `run_id`, `name`, `description`
- `candidate_ids[]`
- `constraint_satisfaction_summary` jsonb
- `creative_application_summary` text (how Bucket B modulated the candidate selection vs pure-data baseline)
- `total_predicted_margin`, `total_predicted_revenue`, `total_predicted_returns`, `total_predicted_buy_budget`
- `scenario_type` (`base_case` | `creative_amplified` | `risk_minimized` | `growth_aggressive` | `kill_heavy`)

The user typically reviews 2-4 scenarios per analysis run. Picks one, deviates on specific SKUs, then exports.

### 4.7 Provenance + Block 2 emission (Codex correction)

NOT "two TEXT narrative columns on collection_plans". A proper provenance table:

`collection_plan_strategy_links` — when Strategy emits a plan into Block 2
- `id`, `collection_plan_id` (FK to existing Block 2), `strategy_run_id`, `strategy_scenario_id`
- `accepted_by`, `accepted_at`, `emitted_diff` jsonb (what changed from previous plan state)
- `confidence_summary` jsonb (the 6 confidence dimensions snapshotted at emission)
- `deviation_log` jsonb[] (every time the user overrode a recommendation, with reason)

Block 2 receives **structured plan data plus a pointer back to the evidence**. Narrative stays in Strategy tables. The Block 2 surface shows "Generated from Strategy run #abc on 2026-04-15 — see decision pack" with a link out.

### 4.8 Tenant isolation strategy

| Customer tier | Isolation pattern | Cost / complexity |
|---|---|---|
| Tier-3 SMB (NOT TARGET — defer to aimily 360) | N/A | - |
| Tier-2 mid (€40-100K) | Shared Supabase + strict RLS on `tenant_id` enforced at every query layer | Low overhead, acceptable risk for small ACV |
| Tier-2 premium (€100-250K) | Shared Supabase but dedicated `tenant_<id>` schema with auto-prefix routing | Moderate ops; isolates blast radius |
| Tier-1 fashion (€250-750K) | **Dedicated Supabase project per tenant** in their region (EU for Mango/Tendam, etc.) | Per-tenant infra cost; enterprise-tier procurement-friendly |
| Tier-1 mega (€750K-2M+) | Dedicated VPC + on-prem option (BYOC — Bring Your Own Cloud); Postgres + Supabase Self-Hosted in customer's AWS/Azure | High-touch; required for Inditex/H&M-style legal review |

**Critical Codex insight**: "We use shared Supabase with RLS" may be technically fine and commercially fatal for tier-1. Procurement reviews kill deals. Plan for dedicated isolation from contract #1 in tier-1.

### 4.9 Vector store role (limited, not source of truth)

Embeddings (pgvector or dedicated vector DB) used ONLY for:
- Archetype re-tagging of historical SKUs against customer's creative direction
- Moodboard ↔ product image similarity for creative_application narrative
- Product description similarity for renamed-carryover detection
- Cross-season substitute detection (when a model is discontinued, find the closest replacement in current lineup)

**The canonical recommendation engine relies on structured facts and versioned scores, NOT vector retrieval.** Vector hits feed evidence into deterministic scores; never bypass them.

---

## 5. Deterministic classifiers — corrected for distribution / returns / capacity / stockout

Codex demolished the naive classifiers I drafted. These are the v1 corrected versions. Pure SQL/analytics — no LLM calls. They populate `strategy_sku_scores` per analysis run.

### 5.1 Distribution-normalized velocity

Naive: `units_sold_7d`
Corrected: `units_sold_7d / max(stores_active, 1) / days_in_store_active`

A SKU sold 12K units in 1042 stores over 6 days has different velocity than 12K units in 200 stores over 30 days. Normalize before ranking.

### 5.2 Returns-penalized margin

Naive: `margin = pvp * (markup_pct / (100 + markup_pct))`
Corrected: `effective_margin = margin × (1 − returns_pct) − reverse_logistics_cost_per_unit × returns_pct`

A 50% returns SKU is NOT a hero; it's a margin trap. Hard penalty, not a note. Reverse logistics cost is customer-supplied at onboarding (typical €4-12 per unit depending on category).

### 5.3 Capacity-aware demand ceiling

Signal: `Mx Vta NP L-D` (max non-promo daily sale) vs current `vel_d1`
If current velocity is at 90%+ of historical max non-promo capacity → demand-constrained, expansion candidate IF stock pipeline can support it.
If current velocity is at 30% of historical max → underperforming AT current distribution / pricing / styling.

### 5.4 Stockout-aware velocity

Naive: low `vel_7d` = decay
Corrected: low `vel_7d` AND `stores_active / stores_with_stock < 0.6` = stockout-suppressed velocity, NOT demand decay. Replenish recommendation, not kill recommendation.

### 5.5 Cannibalization detector

Within a `family_code` × `season_tag` slice:
For each SKU, check if SKUs with overlapping description tokens / image embeddings show inverse velocity correlation. High overlap + inverse velocity = cannibalization. Recommend consolidation, not parallel expansion.

### 5.6 Lifecycle stage classifier

Inputs: `days_in_store`, `vel_7d / vel_8_14d` slope, `stock_pipeline_total / vel_7d` runway
- `new`: `days_in_store < 14` → "insufficient evidence" flag, no classification yet
- `ramp`: `days_in_store ∈ [14, 28]` AND slope positive → climber candidate
- `peak`: slope ≈ 0, high velocity, high distribution → maintain
- `decay`: slope negative AND NOT stockout-suppressed → consider markdown or kill
- `mature`: `days_in_store > 90` AND stable velocity → carryover candidate
- `exit`: very low velocity AND high stock AND no creative-fit → kill

### 5.7 Color winner detection (lineage-aware)

Per `lineage_id` (from identity graph, NOT regex):
Rank colorways by `effective_margin × distribution_normalized_velocity × (1 / returns_pct adjustment)`.
Top 1-2 = color winner; bottom 1-2 = color loser.
Carryover recommendation: re-buy color winners at 1.3-1.5×, drop color losers, EXPAND PALETTE based on Bucket B color story onto the winning silhouette.

### 5.8 Carryover survivor classifier

`season_tag` contains 2+ seasons AND lifecycle ∈ {peak, mature} AND `effective_margin >= P50_for_family` AND `returns_pct <= P75_for_family`
→ "survivor" — recommend continuation with refresh (new color extension per 5.7).

Survivorship bias warning: if the input feed shows only top-N SKUs by sales (the Zara PDF is top-121-of-much-larger-collection), you cannot detect REAL dogs because they're not in the data. Flag `data_sufficiency_warning: "feed truncated to top-N; carryover survivor classification biased upward"`.

### 5.9 Returns-risk family detector

Per `family_code`: weighted-avg `returns_pct` across SKUs in family vs cross-family P75.
If family avg > P75 → flag family-level fit/quality issue. Recommendation = investigate before scaling family (e.g. tech-pack review, supplier review, fit model review).

### 5.10 Family ROI + share-of-wallet trend

`family_roi = Σ(effective_margin × units_sold) / Σ(units_bought × cost)` per season
`share_of_wallet = Σ(importe) per family / Σ(importe) total` per season, trended over 2-4 seasons.

Rank families by ROI AND trend direction. The pivot recommendation = re-allocate budget from declining-ROI families to ascending-ROI families WITHIN constraints (don't violate the constraint of "min 10% in core families even if dipping").

---

## 6. Backtesting story — FIRST-CLASS module (Codex critical gap)

**Without a backtesting story, this is "a nice strategy narrative generator". Enterprise won't pay for it.**

### 6.1 What backtesting proves

"If Aimily Strategy had existed at the END of season X−1, with only the data available then, what would it have recommended for season X? Compare to what actually happened in season X."

Specifically prove the engine would have identified:
- **False heroes** — SKUs that looked great mid-X−1 but tanked in X (or in late X−1)
- **Real carryovers** — SKUs the engine would have flagged as survivors and the customer kept (and made money on)
- **Return traps** — SKUs the engine would have penalized for returns and the customer scaled anyway (and lost margin)
- **Overbought winners** — heroes the engine would have flagged as oversupplied (high Comprado / low Éxito Comp)
- **Family saturation** — families the engine would have called overbought
- **Color mistakes** — colorways the engine would have flagged as losers
- **Late climbers** — accelerating SKUs the engine would have caught for replenishment

### 6.2 Backtesting workflow

1. Customer uploads N seasons of historical data
2. Strategy splits: trains on seasons 1..N-1, tests on season N
3. Engine produces what it WOULD have recommended at end-of-N-1
4. Compare to actual season-N outcomes
5. Produce a backtesting report: precision/recall per recommendation type, hit rate on heroes, false-positive rate on dogs, return-trap catch rate, color-winner accuracy, lineage identity-graph hit rate
6. Show side-by-side: "Engine would have killed SKU X (saved €Y on overbuy); customer kept SKU X (actual loss €Z)"

### 6.3 Backtesting as paid pilot deliverable

The pilot output = the backtesting report. This is what the customer pays €40-90K (tier-2) or €100-250K (enterprise) to see. If the backtest is bad, the customer walks away with a sharper understanding of their own data and we walk away with the learning. **No upsell pressure.**

If the backtest is good (and it will be, because the deterministic classifiers are conservatively designed to outperform Excel + meetings), the customer signs the annual contract.

### 6.4 Backtesting is also QA infrastructure

Internal: every algorithm version is backtested against the previous version's customer set before promotion. Algorithm regressions caught before they hit customer recommendations.

External: customers can re-run a closed analysis_run against newer algorithm versions to see how recommendations would shift. Transparent versioning, no black box.

---

## 7. Taxonomy product (Codex critical gap — billable module)

**Codex: "You also need a taxonomy product, not just a mapping table. Family mapping, color mapping, archetype mapping, and model lineage will be painful enterprise work. Make that visible, versioned, reviewable, and billable."**

### 7.1 Taxonomies to maintain per tenant

1. **Family taxonomy** — customer's internal family codes ↔ aimily canonical family ontology
   - Zara: `W.A FLUIDOS LARGO - 1500` ↔ aimily: `Vestidos · Largo · Fluido`
   - Mango: `Camisería · Casual · M/L` ↔ aimily: `Camisería · Manga larga · Casual`

2. **Color taxonomy** — customer's color codes ↔ named colors ↔ Pantone (where available)
   - Zara: `401` ↔ `Blanco` ↔ Pantone 11-0601 TCX
   - Inditex internal palettes evolve season-to-season; mapping is dynamic, not static

3. **Archetype taxonomy** — products ↔ archetypes (aimily-canonical or customer-custom)
   - The Gold Standard archetypes (resort-luxe, minimal-architect, sustainable-craft, romantic-feminine, etc.) used in Block 4 / Studio Style cards
   - Plus customer-specific archetypes if needed

4. **Lineage taxonomy** — the identity graph manually validated for high-confidence carryovers
   - Customer reviewer marks "yes, model 4786 in 2025 became model 5907 in 2026 after redesign" — graph learns

### 7.2 Taxonomy module UX

- Upload-driven discovery: parser proposes mappings with confidence; reviewer approves or corrects
- Versioned per tenant: changes don't retroactively rewrite past analysis runs
- Editable by category director in Strategy UI; permissions distinct from data ingest
- Export/import for cross-team review (CSV out, CSV in)
- Visual diff: "since last review, 23 new colorways added, 8 family code changes flagged"

### 7.3 Billing model

Taxonomy module is **billable separately** at onboarding:
- Tier-2 mid: included in pilot price (1 category, basic taxonomies) — €40-90K covers it
- Tier-2 premium / tier-1 fashion: separate Taxonomy Setup engagement = €25-75K (consulting + tooling, runs in parallel with pilot)
- Tier-1 mega: Taxonomy Engineering = €100-250K (dedicated engineer for 4-8 weeks; integrates with their PLM)

This is real revenue, not a freebie. It also creates switching cost — customers don't migrate taxonomies easily.

---

## 8. LLM role · narrative + critique + investigation, NEVER calculator

**Codex absolute rule: do NOT let LLM reason end-to-end over raw observations for enterprise recommendations. LLM-end-to-end produces "vibes with logs" and is indefensible in enterprise audit.**

### 8.1 The stack (deterministic first, LLM on top)

1. Deterministic parsing (PDF/CSV → `raw_records`)
2. Deterministic normalization (`raw_records` → fact tables)
3. Deterministic feature computation (fact tables → derived metrics)
4. Deterministic scoring (metrics → `sku_scores`, `family_scores`)
5. Deterministic constraint satisfaction (`scores` + `constraints` → `candidates` → `scenarios`)
6. **LLM step**: narrative generation, critique, merchandising-language translation, creative_application explanation

### 8.2 What LLM is for (3 valid roles)

**Role A · Narrator** — translates `sku_scores` + `family_scores` + recommended actions into merchandising language. "The grandad collar shirt family (4786 lineage) showed strong carryover signals in colorways 401 (white) and 250 (black) with effective margins 12 points above family average, but color 305 (tan) underperformed at 26.7% returns versus family average 8.3%. Recommend re-buying 401 at 1.5× and 250 at 1.3×, dropping 305, and extending into tabaco (from your Bucket B color story) on the same silhouette."

**Role B · Critic** — challenges the deterministic engine's recommendations. "Engine recommends scaling SKU X based on 79% sell-through. However, only 11 days in store, 38 stores active out of 1,042 — distribution too narrow to extrapolate. Recommend treating as ramp candidate, not hero, until day-30 data is in."

**Role C · Investigation assistant** — analyst augmentation. Customer asks: "Why is this SKU marked as a hero despite 49% returns?" Engine responds with structured trace: "The hero classification is on `effective_margin × distribution × non-promo velocity`; the returns penalty IS applied (effective margin = €18.40 net of returns and reverse logistics versus list margin €34.20), but the post-penalty margin still ranks in top decile. Caveat: return reason data unavailable; recommend further investigation if returns are fit-related."

### 8.3 What LLM is NOT for

- NOT primary calculator
- NOT autonomous scenario picker
- NOT silent constraint negotiator
- NOT customer-facing chat that bypasses the deterministic engine
- NOT mass recommendation generator without `analysis_run` versioning

Every LLM call is bounded by a structured input (the scored entities) and produces a structured + narrative output (the narrative is human-readable, the scores are machine-traceable).

### 8.4 Models used

- **Claude Sonnet 4.6 / 4.7** for narrative + critique + creative-direction language work (matches aimily 360 default)
- **Anthropic 4.7 (1M context)** for backtesting report synthesis where large multi-season trace must be summarized
- **OpenAI gpt-5.1-codex-max** for the algorithm engineering review loop (internal, not customer-facing)
- **Vector embeddings**: Voyage or Cohere for product description / moodboard / image similarity

LLM cost per analysis run estimated €1.50-8 per run depending on output size. Negligible vs ACV.

---

## 9. Confidence framework · 6 dimensions, not 1 number

Every recommendation card surfaces 6 distinct confidence scores (0-1) plus data sufficiency declarations. Codex: "A recommendation with high creative fit and low demand confidence should look risky by design."

### 9.1 The 6 dimensions

| Dimension | What it measures | Example signal lowering it |
|---|---|---|
| **Data completeness** | How many of the expected dimensions are present | Customer didn't supply geographic splits → -0.2 |
| **Identity confidence** | How sure are we that this SKU is the same entity across seasons | Renamed carryover detected via similarity not exact match → -0.15 |
| **Demand confidence** | How sure are we that observed velocity reflects true demand | High stockout rate suppressing observed velocity → -0.3 |
| **Margin confidence** | How sure are we about effective margin number | Reverse logistics cost not supplied by customer (using category default) → -0.1 |
| **Creative fit confidence** | How aligned is this with Bucket B brief | No Bucket B supplied → null / 0 weighting |
| **Action confidence** | How robust is the recommended action under reasonable scenario variation | Recommendation flips between scenarios A and B at small data perturbation → -0.25 |

### 9.2 Composite action confidence

`composite = data_completeness × identity × demand × margin × (1 + 0.1 × creative_fit) × action_robustness`

Not a single number — the breakdown is the value. The composite is for sorting/filtering only.

### 9.3 "Insufficient evidence" verdict

If `data_completeness < 0.4` OR `demand_confidence < 0.3` OR (`days_in_store < 14` for the SKU) → engine refuses to issue a strong recommendation. Output is "insufficient evidence — investigate / collect more data / wait N more weeks". This is a feature, not a bug. Enterprise respects calibrated uncertainty more than confident guessing.

---

## 10. Product modules · v1 → v5 land-and-expand roadmap

### v1 · Season Performance Intelligence Pack (MVP, Day 0–8 weeks)

Forensic intelligence layer. Inputs: 1-2 seasons of SKU history, hard constraints, optional creative brief. Outputs: ranked decisions (carryover / kill / resize / recolor / family critique / return-trap detection) + backtesting report against the previous season. NO plan emission to Block 2.

**Deliverable to customer (pilot)**: PDF + interactive web report + decision workshop session. Decision pack ready for their next seasonal review meeting.

### v2 · Color extension + family architecture critique (v1 + 4-8 weeks)

Adds Bucket B modulation properly: color story applied to color-winner detection within proven lineages; family pivot translated into archetype-level resize recommendations. Adds the family architecture critique module ("your romantic family is overbought; only these 2 archetypes earn expansion").

### v3 · Plan emission to Block 2 (v2 + 6-12 weeks)

The bridge endpoint `/api/strategy/emit-to-collection-plan` writes canonical CIS keys into the customer's Block 2 collection. Customer continues in standard aimily Block 2 UI with their plan pre-populated and justified. `collection_plan_strategy_links` records provenance. Deviation log captures every override. **This is the v3 milestone — the original "plan emitter" vision, but earned through v1 + v2 trust.**

### v4 · Mid-season adjustment + replenishment intelligence (v3 + 8-12 weeks)

Real-time (weekly) snapshots; mid-season replenishment recommendations; markdown timing alerts; stock-risk signals. Competes more directly with planning vendors but earned via the relationship built in v1-v3.

### v5 · Cross-tenant intelligence (anonymized, opt-in, 2027+)

OPT-IN benchmarks: "your romántico family vs anonymized peer cohort". Sensitive — requires aggregate-only, differential privacy, and explicit customer consent. Long-term moat: each tenant contributes patterns to a shared evidence pool that improves classifier confidence for everyone WITHOUT exposing raw data.

---

## 11. Pricing model · paid diagnostic → annual → expansion

### 11.1 Pricing tiers

| Module | Tier-2 mid | Tier-2 premium | Tier-1 fashion | Tier-1 mega |
|---|---|---|---|---|
| Paid pilot (v1, 6-8 weeks) | €40-90K | €60-120K | €100-250K | €250-500K |
| Annual license (post-pilot, v1+v2) | €60-120K | €100-200K | €250-500K | €500K-1.2M |
| Annual license (v1+v2+v3 plan emission) | €100-180K | €180-300K | €400-750K | €750K-1.5M |
| Annual + v4 mid-season | +€40-80K | +€80-150K | +€150-300K | +€300-600K |
| Taxonomy Setup engagement | included | €25-75K | €75-150K | €100-250K |
| Custom ERP/PLM integration | N/A (Shopify-native) | €40-100K one-time | €100-250K one-time | €250-600K one-time |
| Dedicated VPC / on-prem | N/A | N/A | +€100-200K/yr | +€200-400K/yr |

### 11.2 Pilot structure (paid, NOT free)

- 6-8 weeks
- 1 category or department scoped
- 1-2 seasons of historical data ingested
- 1 creative direction overlay (Bucket B)
- Retrospective backtest against known season-X outcomes
- Final decision workshop (2-hour session with category director + analyst + creative lead)
- Output: ranked recommendations, confidence summary, evidence trail, plan deltas, backtest scorecard

### 11.3 Land-and-expand path

1. Paid pilot in 1 category — succeed
2. Annual contract for that category (v1+v2)
3. Expand to 2-4 more categories — annual scaling
4. v3 plan emission engaged for the most mature category
5. v4 mid-season layer (replenishment, markdown) added selectively
6. Integration with customer's PLM / ERP / o9 / Centric infrastructure as needed
7. Dedicated tenant / VPC for tier-1
8. Multi-region scaling

### 11.4 The pitch line (NOT a sales script — a positioning anchor)

> *"We make your existing planning decisions more evidence-backed and creative-aware. We don't replace planning. We prove the engine works on your last season before we touch your next one."*

Crucially: NOT "we replace o9 / Centric / your in-house tool". Coexist. Different layer.

---

## 12. Block 2 integration · single bridge endpoint, no surface reopening

Audit conclusion: Block 2 is closed end-to-end. Reopening it for Strategy is a regression risk. The clean path is:

### 12.1 Parallel `/strategy` anex

`aimily.app/strategy/...` — separate authenticated workspace, separate landing, separate API namespace at `/api/strategy/...`. Shared aimily auth (single sign-on); separate Stripe products (enterprise contracts, not consumer packs).

### 12.2 The bridge endpoint

`POST /api/strategy/emit-to-collection-plan`
- Input: `strategy_scenario_id`, `target_collection_id` (or null = create new collection)
- Action: writes canonical CIS keys into Block 2's `collection_decisions` via existing `recordDecisions()`; creates rows in `families`, `skus`, `drops`; populates `collection_plans` budget; records provenance in `collection_plan_strategy_links`
- Output: redirect URL to the seeded Block 2 collection

From the customer's point of view: they finish in Strategy, click "Send to Block 2", land in a Block 2 collection that's pre-populated. They iterate normally. Every CIS key has a `source: 'strategy'` tag and a back-link.

### 12.3 No Block 2 code changes required for v1-v2

v1 and v2 are pure Strategy modules — zero Block 2 changes. v3 adds the bridge endpoint + the provenance table migration. That's the only Block 2 surface touch in the entire Strategy roadmap.

### 12.4 Reuse of existing aimily infrastructure

- `loadFullContext()` (262 LOC) handles all Block 1 → Block 2 context injection — Strategy's Bucket B writes to `creative.*` CIS subdomains and `loadFullContext` absorbs it automatically
- `recordDecisions()` write-through to `collection_decisions` versioned — Strategy uses verbatim
- `prompt-foundations.ts` expert personas (`merchPlanner`, `financialStrategist`) — reused for Strategy LLM narratives
- Family Card UI gold standard — Strategy UI replicates verbatim
- Bidirectional drift modal + auto-balance — Strategy UI uses identical pattern for scenario comparison

**Reuse percentage of existing aimily infrastructure for Strategy MVP**: ~40% (UI patterns, CIS pipeline, LLM personas, auth). New build: data architecture, classifiers, backtesting, taxonomy module, recommendation UX.

---

## 13. Competitive positioning · the gap, the moat, the timing

### 13.1 The void (confirmed by competitive landscape research)

No incumbent ships the intersection of:
1. Hard SKU performance history
2. Optional creative direction modulation
3. LLM-generated strategic narrative
4. Backtesting validation as paid pilot deliverable
5. EU AI Act compliance lane as first-class concern

Players are in one or two of these, never all five.

### 13.2 Centric Software / Dassault Systèmes · the blocker

They have the three pieces but not the workflow:
- Centric Planning (the quant layer)
- Centric Visual Boards (the visual assortment / moodboard canvas — Valentino 2025-12, Deichmann 2025-03)
- Contentserv (the AI PXM acquired 2025-02 for €220M)

They have NOT fused these into a single workflow. They have NOT added an LLM-narrative layer. They have a stacked-7-figure enterprise sales motion and 3-12 month deployment cycles. Aimily Strategy moves faster (8-week pilot vs 6-month implementation), is creative-led not PLM-led, and serves tier-2 where Centric's SMB Visual Boards is too thin and Centric Planning is too heavy.

**Window of opportunity before Centric ships a fused workflow or acquires us**: 18-30 months. We need 2-3 reference tier-2 wins in the first 12 months.

### 13.3 o9 / Anaplan / Centric Planning · the quant alternative

Mango signed o9 in 2025-03 — the quant rails are locked. **That's the opportunity, not the problem.** o9 doesn't do creative-merch. Aimily Strategy sits ON TOP of o9 / Anaplan / Centric Planning — they handle allocation and forecasting; Strategy handles the upstream decision pack that feeds them.

Coexistence pitch to Mango: *"o9 tells you HOW MUCH to buy of what you've decided. Aimily Strategy helps you decide WHAT to buy, with evidence from your own last season and creative direction from your own brand team."*

### 13.4 WGSN / Heuritech / Stylumia · the creative alternative

These tools tell you what the world wants. They don't reconcile with your OWN history. Aimily Strategy reconciles your trend direction with your own SKU performance.

Coexistence pitch: *"WGSN tells you the world wants oversized cardigans. We tell you which of YOUR last-season oversized cardigans worked, which didn't, and why — then we apply WGSN's direction onto YOUR winning silhouettes."*

### 13.5 Raspberry AI / Mercer / Centric SMB Visual Boards · adjacent threats

Raspberry (YC W24) does AI-generated creative concepts. Mercer.ai is moodboard-driven. Centric SMB Visual Boards is moodboard + assortment canvas. None do the forensic intelligence layer. None do backtesting. **Aimily Strategy is differentiated by the backtest.**

---

## 14. EU AI Act + data privacy · differentiator now, blocker-killer later

### 14.1 Compliance position

- **No training on customer data** — every customer's data stays in their tenant; no cross-tenant training; this is in the DPA and contractually binding
- **DPA + SCCs default** — Standard Contractual Clauses for any cross-border data flow; EU customers stay EU-region
- **VPC / dedicated tenant available** — tier-1 mega gets dedicated Supabase or on-prem (BYOC)
- **Annex IV documentation prepared** — Aimily Strategy can produce the AI Act high-risk system documentation if reclassified
- **Audit trail** — every recommendation traces to algorithm version, taxonomy version, source set, confidence breakdown; reproducible end-to-end
- **Human-in-the-loop required** — engine cannot autonomously modify production plans; every emission to Block 2 requires explicit user acceptance

### 14.2 High-risk classification stance

Buying recommendations that affect sourcing decisions MIGHT be classified as high-risk under EU AI Act if interpreted as affecting employment (supplier relationships, labor implications). High-risk effective date is 2027-12-02. Aimily Strategy positions as:

- Recommendation tool, NOT autonomous decision system (human-in-the-loop is a hard product constraint)
- Audit trail + reproducibility + algorithm versioning ready for Annex IV
- No biometric / facial / employment data processed
- Customer remains the controller; aimily is processor

This positioning is procurement-friendly and removes the legal-block risk at tier-1.

### 14.3 Competitive moat from compliance

No incumbent leads with this. By 2027 it'll be table stakes. Today it's a differentiator that closes deals because procurement teams stop seeing it as a risk vendor.

---

## 15. MVP scope · Day 0 to v1 launch (8 weeks)

### Week 1-2 · Data ingestion + identity graph foundation

- PDF parser for Zara-style internal ranking (canonical phase 1 format)
- Shopify CSV ingest (phase 2 format)
- Tables built: `strategy_sources`, `strategy_raw_records`, `strategy_product_facts`, `strategy_inventory_facts`, `strategy_sales_windows`, `strategy_efficiency_facts`
- Identity graph v0: similarity-based lineage with confidence; human review UI

### Week 3-4 · Classifier engine + scoring

- 10 deterministic classifiers (§5)
- `strategy_analysis_runs` versioned
- `strategy_sku_scores` + `strategy_family_scores`
- 6-dimension confidence framework
- Data sufficiency declarations

### Week 5-6 · Recommendation engine + scenarios

- Candidate generation per scope (sku / family / archetype / color / lineage)
- Constraint satisfaction (Bucket A enforcement)
- Bucket B modulation (3 patterns: family pivot, color story, archetype focus)
- Scenario assembly (2-4 scenarios per run)
- Evidence / counter-evidence / assumptions per recommendation card

### Week 7 · Backtesting engine

- Train/test split logic
- Backtest report generator (precision/recall, hit rate, false positives)
- Side-by-side comparison UI (engine recommendation vs actual outcome)

### Week 8 · UI + decision pack export

- `aimily.app/strategy` landing + authenticated workspace
- Scenario comparison UI (reuse Block 2 drift modal pattern)
- Decision pack export (PDF + interactive web report)
- Taxonomy module v0 (basic mapping editor)
- Pilot kit: customer-facing onboarding flow + data upload UX + intro video

### Day 1 launch criteria

- Mango pitch deck ready (60 min, customized with their public data points)
- 1 paid pilot signed (target: Mango, fallback: Tendam or Adolfo Domínguez)
- Backtest results from Felipe's own SLAIZ data (the actual aimily customer; functional dogfood)
- Pricing page at `aimily.app/strategy/pricing`
- DPA + privacy policy + AI Act position statement reviewed by legal
- Sales motion documented: discovery call → data sample audit → pilot proposal → contract → 6-8 week pilot

### Out of scope for MVP (defer to v2+)

- Plan emission to Block 2 (v3)
- Mid-season replenishment (v4)
- Cross-tenant benchmarks (v5)
- Geographic / weather / marketing-exposure ingest (v2+)
- ERP / PLM custom integrations (per-customer, post-pilot)

---

## 16. Risks + failure modes · 10 nonsense scenarios with protections

### 16.1 The 10 nonsense scenarios Codex flagged

1. **New launch called dog**: SKU sells slowly because launched 5 days ago. Engine calls it dog. **Protection**: lifecycle classifier returns `new` for `days_in_store < 14`; "insufficient evidence" verdict.

2. **False mass hero**: SKU sells fast because underbought and stocked only in top stores. Engine calls it mass hero. **Protection**: distribution-normalized velocity + capacity-aware demand ceiling.

3. **False color preference**: Color wins because allocated to better locations. Engine calls it color preference. **Protection**: distribution-controlled color comparison; require coverage threshold before color winner verdict.

4. **Promo-spike expansion**: Discounted SKU spikes. Engine recommends expansion at full price. **Protection**: `Mx Vta NP L-D` (non-promo ceiling) as primary capacity signal; promo flag is hard penalty in margin score.

5. **High-return hero scaling**: High-return trouser looks like hero on units sold. Engine ignores reverse logistics. **Protection**: returns-penalized effective margin (§5.2); hero classification REQUIRES `effective_margin >= P75`, not list margin.

6. **Sold-out decay**: Sold-out SKU shows weak last-7-day. Engine thinks demand decayed. **Protection**: stockout-aware velocity (§5.4); flag and propose replenishment.

7. **Family-wide kill from one bad SKU**: Family underperforms because one product polluted average. Engine cuts the family. **Protection**: family scores use weighted median + interquartile filtering; family kill REQUIRES bottom-quartile + lifecycle in {decay, exit}.

8. **Truncated-feed survivorship**: PDF only contains top-ranked SKUs. Engine can't see true dogs but pretends it can. **Protection**: data sufficiency declarations expose feed coverage; carryover survivor classifier flags survivorship bias warning.

9. **Survivor-bias carryover**: Carryover looks healthy because only survivors are visible. **Protection**: cross-reference identity graph against `total_seasons_in_lineup` from customer's PLM/ERP feed (required dimension at onboarding).

10. **Cannibalization mis-attribution**: SKU A "succeeds" because SKU B (its sibling) failed and customers shifted. Engine doesn't see causality. **Protection**: cannibalization detector (§5.5) flags inverse-correlated siblings.

### 16.2 General protections

- Every recommendation surfaces 6 confidence dimensions + data sufficiency warnings + evidence + counter-evidence
- Engine allowed to say "insufficient evidence" — failure mode is silence, not confident wrong
- Recommendation cards show assumptions: which dimensions are present, which are missing, which are defaulted
- No auto-write into Block 2 — every emission requires explicit user acceptance
- Accepted recommendations create a `deviation_log` diff, never overwrite plan history
- All runs are reproducible by source version + algorithm version + taxonomy version
- Customer's `deviation_log` is THEIR feedback signal — the engine learns where it was overridden and tunes future recommendations (but never in-flight — algorithm version bump required)

### 16.3 Failure scenarios that don't have full protection (acknowledged risk)

- **Catalog-style differences**: same SKU shown beautifully in catalog A and badly in catalog B may have different velocity for reasons unrelated to product. Strategy can't see styling treatment without image embeddings, and image embeddings of catalog images can be misleading. **Mitigation**: surface as investigation item, not hero/dog verdict.

- **Macro-environment shifts**: weather, economic, geopolitical effects swamp signal. The engine can't predict these and shouldn't try. **Mitigation**: confidence dimensions remain transparent; customer applies their own macro overlay.

- **Customer doesn't supply key dimensions**: if customer refuses to provide return reasons, marketing exposure, or stockout days, the engine's outputs are weaker. **Mitigation**: pricing is tied to data quality; better data → more confident verdicts → higher annual contract value. Incentive aligned.

---

## 17. KPIs

### 17.1 Product KPIs

- **Backtest precision** on heroes: % of engine-predicted heroes that did become real heroes — target > 70% in v1, > 80% in v2
- **Backtest precision** on dogs: % of engine-predicted dogs that did flop — target > 75% in v1
- **Return-trap catch rate**: % of high-return-margin-traps the engine flagged — target > 60% in v1, > 75% with full return-reason data
- **Color-winner accuracy** (intra-lineage): % of engine color winners that outperformed the lineage average — target > 70%
- **Carryover survival**: % of engine-recommended carryovers that perform ≥P50 in season N — target > 70%
- **Customer override rate**: % of recommendations a customer overrides in the decision workshop — target < 30% (lower = engine trusted; higher = engine off-base)
- **Time-to-decision pack**: weeks from data upload to final decision workshop — target ≤ 6 in v1

### 17.2 Business KPIs

- **Pilot conversion rate** (pilot → annual): target > 60% in year 1, > 70% in year 2
- **Pilot ACV** (closed annual contract value per converted pilot): target €120K average year 1
- **ACV expansion** (year-2 vs year-1 ACV per customer): target +50% from category expansion + module additions
- **Logo concentration**: target ≤ 25% of ARR from top customer in year 1, ≤ 15% by year 2
- **Reference logos** (named customers who agree to be used in pitches): target 2 in year 1 (Mango + 1 other), 5 by end year 2

### 17.3 Trust / quality KPIs

- **Recommendations with insufficient evidence verdict**: target 15-25% (too low = overconfident; too high = engine useless)
- **Customer NPS post-decision-workshop**: target ≥ 50
- **Backtest run reproducibility**: 100% (every analysis run must reproduce exactly when re-executed with same algorithm version)
- **Algorithm version regressions caught**: 100% (every version bump is backtested against the prior customer set before promotion)

---

## 18. Open questions (deferred, not blocking)

1. **Snapshot cadence for Tier-1**: end-of-season vs weekly. Default: weekly snapshots, retain rolling 24 months. Tier-1 may demand daily — defer decision until first tier-1 contract.

2. **Color taxonomy resolution**: customer-supplied dictionary required at onboarding. If customer can't supply, derive from product description + Pantone matching + (optional) image embeddings — accept lower confidence.

3. **Family taxonomy alignment**: per-tenant mapping table maintained in Taxonomy Setup engagement. Version-locked per analysis run.

4. **Multi-tenant ML model improvements**: deferred to v5 cross-tenant intelligence module. Until then every tenant has tenant-local algorithm versions with no cross-tenant learning.

5. **Real-time push vs batch ingest**: v1 = batch (manual upload). v4 = real-time/weekly automated push via SFTP or API. Skip in MVP.

6. **Mobile UX for category director**: v1 = web only (decision workshops happen on big screens in meeting rooms). Mobile companion app deferred to v3+.

7. **Multilingual UI**: v1 = English + Spanish (matches aimily 360 nine-locale roadmap selectively). Tier-1 European customers may demand French/German/Italian — add per-customer as needed.

8. **API-only integration option**: some tier-1 customers won't use the Strategy UI directly; they'll consume recommendations via API into their own analyst dashboards. v1 = UI-first, API-export of all entities, full programmatic access in v3 (when plan emission lands).

---

## 19. Day 1 execution checklist

### Code

- [ ] New tables migration (sources, raw_records, product_facts, inventory_facts, sales_windows, efficiency_facts, identity_graph, analysis_runs, sku_scores, family_scores, recommendation_candidates, scenarios, constraints, creative_brief, plan_strategy_links)
- [ ] Zara PDF parser (PDF.js + structured extraction with confidence)
- [ ] Shopify CSV ingest (3-report join: sales_by_variant + inventory_levels + returns)
- [ ] Identity graph builder + similarity engine
- [ ] 10 deterministic classifiers
- [ ] Candidate generator + constraint satisfaction
- [ ] Scenario assembler
- [ ] Backtesting engine (train/test split + report)
- [ ] LLM narrative + critique + investigation endpoints
- [ ] Taxonomy module UI
- [ ] `aimily.app/strategy` landing + authenticated workspace
- [ ] Bridge endpoint `/api/strategy/emit-to-collection-plan` (v3, NOT MVP)

### Infrastructure

- [ ] Decide tenant isolation strategy per tier (RLS / schema / dedicated project)
- [ ] Vector store provisioning (pgvector in Supabase for v1, evaluate Pinecone for tier-1 scale)
- [ ] Storage bucket strategy for source uploads (per-tenant, encrypted-at-rest, EU-region)
- [ ] DPA + AI Act position statement legal review
- [ ] Compliance docs: DPA template, SCCs, Annex IV draft

### Go-to-market

- [ ] Mango pitch deck (specific to their o9 deployment + creative-merch open layer)
- [ ] Pilot proposal template (6-8 weeks, scope, deliverables, pricing, success criteria)
- [ ] Customer success / pilot delivery process documented
- [ ] First pilot signed in 8 weeks from Day 0

### Brand / positioning

- [ ] `aimily.app/strategy` landing copy
- [ ] Positioning anchor: *"Evidence-backed, creative-aware merchandising intelligence for fashion brands with real SKU history."*
- [ ] Differentiation page vs Centric / o9 / WGSN explicit
- [ ] Backtesting story as headline (NOT pricing — pricing is conversation-2)

---

## 20. Naming · "Aimily Strategy" final

Consistent with "Aimily Studio". Surface = `aimily.app/strategy`. URL slug for analysis runs: `strategy.aimily.app/runs/{run_id}` (separate subdomain considered for tier-1 dedicated tenants).

Internal: `Aimily Strategy v1` → `Aimily Strategy v2: Color & Architecture` → `Aimily Strategy v3: Plan Bridge` → `Aimily Strategy v4: Mid-Season` → `Aimily Strategy v5: Benchmarks`.

Marketing line: *"Forensic merchandising intelligence. Creative-aware. Evidence-bound."*

---

## 21. The bet

Aimily Strategy succeeds if, in 18 months:

1. ≥ 5 paid pilots completed, ≥ 3 converted to annual at €120K+ ACV
2. ≥ 1 tier-1 reference (Mango or equivalent) named publicly
3. Backtest precision on heroes/dogs ≥ 70% on real customer data
4. Centric / o9 / Heuritech has NOT shipped a fused creative+quant+narrative product (window held)
5. EU AI Act compliance position stands up to a tier-1 procurement audit
6. Aimily Strategy ARR ≥ €500K annualized (year 1), ≥ €2M (year 2)
7. The Mango → Tendam → Bimba y Lola → Adolfo Domínguez beachhead is in motion

Aimily Strategy fails if, in 18 months:

1. Centric ships fused workflow first (acquisition or partnership conversation triggers)
2. Backtest precision < 50% on real customers (engine fundamentally wrong)
3. Pilot conversion < 30% (customers don't see value beyond the diagnostic)
4. Block 2 surface gets dragged into rebuilds because Strategy emission was under-modeled
5. Tier-1 procurement consistently kills deals on data/legal grounds (compliance moat fails)

Mitigation owners and quarterly review cadence: Felipe + product council, every 8 weeks until v3 lands.

---

## 22. Companion docs — reading order for any new contributor

1. **This file** (`business-plan_aimily-strategy-2026-05-15.md`) — synthesis, the source of truth
2. `research_aimily-strategy-data-schema-mapping-2026-05-15.md` — data dimension + schema rationale (partially superseded by §4 of this doc, but useful for the Zara PDF data extraction details)
3. `audit_block-2-for-aimily-strategy-2026-05-15.md` — Block 2 spine, CIS pipeline, integration point recommendation
4. `research_aimily-strategy-competitive-landscape-2026-05-15.md` — 35+ players, sources cited, market context
5. `codex_contra-propuesta-aimily-strategy-2026-05-15.md` — the adversarial review that reshaped this plan

For aimily Studio precedent (architectural pattern): `business-plan_aimily-studio-2026-05-14.md`.

---

## 23. Status

**Day 0**. Research consolidated. Architecture decided. Pricing decided. Wedge decided. Backtesting and taxonomy as billable modules locked. Block 2 integration path identified (parallel anex, single bridge endpoint, v3 milestone). MVP scope is 8 weeks of focused build.

**Next decision** (for Felipe): commit to Day 1 build? If yes — Mango contact research starts in parallel with engineering kickoff. If first reservation — what are the 1-3 things that need to land harder before commit?

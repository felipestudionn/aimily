# Aimily In-Season · Product Spec · 2026-05-17

> **Single source of truth** for the In-Season decision engine. Supersedes `decision-map_aimily-in-season-2026-05-17.md` + all prior synthesis docs (Round 1, Round 2). Locks the product spec post 5-source research + Felipe direction.

> **Status**: spec locked 2026-05-17 night. Code execution against this spec is the next step. Open items in §11.

> **Audience for this doc**: the aimily team building toward production. Not a pitch deck. Not a marketing document.

---

## 0 · What this is

Aimily In-Season is a per-SKU decision engine for fashion buying-merchandising-sales. It ingests a retailer's in-season report (Zara RNK / Mango WSSI / Shopify CSV / any WSSI-shaped data), emits a verdict pack per SKU, and renders it over the retailer's own source artifact (PDF overlay).

The product describes itself as:

> *"Aimily In-Season — daily in-season sales management for fashion buyers and commercials."*

For Zara (daily cadence) the ceremony is the **Daily Trading Meeting** (their canonical name). For Mango / H&M / mass-market the ceremony is the **Monday Trade Meeting** (weekly). The product accommodates both via per-tenant cadence configuration. No invented acronym (no "WeSee", no buzzword). Just descriptive precision.

---

## 1 · Cardinal rules

These trump everything else when there's a conflict:

1. **Output unit = SKU.** Never style. Style is internal context, never the emitted unit. (See `feedback_aimily-output-unit-is-sku.md`.)
2. **Trust retailer's `pdf_rank`** when provided. The retailer is the senior buyer; they already did the ranking work. Do not normalize away.
3. **Graceful degradation**: tenant explicit input → synthetic from patterns → never silent failure. The 6-dim confidence reflects which path was taken. (See `feedback_aimily-graceful-degradation-tenant-input-or-synthetic.md`.)
4. **Discipline = buy-in merchandising and sales.** Not product management. Not visual merchandising. (See `feedback_aimily-discipline-buy-in-merch-and-sales.md`.)
5. **Vocabulary**: style ≠ SKU. Use industry terms, not invented jargon. (See `feedback_aimily-vocabulary-style-vs-sku.md`.)
6. **Scope OUT**: inter-store transfer, push allocation between stores. **Scope IN**: AMPLIFY_DISTRIBUTION (warehouse → more stores). (See `feedback_aimily-scope-no-inter-store-transfer.md`.)

---

## 2 · Inputs — canonical WSSI-shaped schema

Every parser (Zara RNK, Mango WSSI, Shopify, future retailers) produces these fields per SKU. Where the tenant doesn't provide, the system synthesizes — see §10.

### 2.1 · Identity

| Field | Type | Notes |
|---|---|---|
| `model_ref` | string | Retailer's unique SKU code |
| `color_ref` | string | Color code within the style |
| `product_name` | string | Human-readable |
| `family_code` | string | Retailer's category/family |
| `season_tag` | string | e.g. "V26", "I26+V26" |
| `activation_date` | date | First in-store date |
| `days_in_store` | int | Today − activation_date |

### 2.2 · Pricing and margin

| Field | Type | Notes |
|---|---|---|
| `pvp` | money | Retail price |
| `markup_pct` | pct | Cost → pvp markup |
| `cost_estimate` | money | Derived from pvp + markup |
| `margin_pct_list` | pct (0-1) | Margin on pvp |
| `effective_margin_per_unit` | money | `pvp × margen × (1 − returns_pct) − reverse_logistics × returns_pct` |

### 2.3 · Velocity

| Field | Type |
|---|---|
| `velocity_d1` | int (units yesterday) |
| `velocity_d2` | int (units day before) |
| `velocity_7d` | int (last 7 days) |
| `velocity_8_14d` | int (week-over-week comparison) |
| `velocity_per_active_store_per_day` | derived: `total_sold / (stores_active × days_in_store)` |

### 2.4 · Stock

| Field | Type | Notes |
|---|---|---|
| `stock_store` | int | Units in stores |
| `stock_warehouse` | int | Warehouse units |
| `stock_in_transit` | int | Units in transit |
| `stock_pending` | int | Pending PO arrivals |
| `pipeline_total` | int | Sum of above (NOT including `stock_total` — avoid double-count, per audit B.4) |
| `stores_with_stock` | int | Stores currently holding |
| `stores_active` | int | Stores currently selling (subset of `stores_with_stock`) |
| `stores_addressable` | int | Total addressable stores (tenant-provided or synthetic — see §10) |

### 2.5 · Efficiency

| Field | Type | Notes |
|---|---|---|
| `total_bought` | int | Original PO quantity |
| `total_sold` | int | To-date sales |
| `total_shipped` | int | Units sent to stores |
| `sell_through_bought_pct` | pct | `total_sold / total_bought` |
| `sell_through_shipped_pct` | pct | `total_sold / total_shipped` |
| `returns_pct` | pct | Returns rate |
| `emptying_rate` | pct | How fast inventory is being depleted |

### 2.6 · Plan (NEW — was the biggest gap)

| Field | Type | Notes |
|---|---|---|
| `planned_sell_through_curve` | array<{week_of_season, target_str_pct}> | Tenant-provided OR synthetic — see §10 |
| `planned_units` | int | Originally planned buy |
| `planned_buy_budget` | money | Budget allocated |

### 2.7 · Lead time + supply (NEW)

| Field | Type | Notes |
|---|---|---|
| `supplier_lead_time_days` | int | Tenant-provided or retailer-profile default — see §10 |
| `supplier_flex_buffer_days` | int | How much earlier can be requested |
| `category_returns_baseline_pct` | pct | Tenant-provided or Coresight/synthetic — see §10 |
| `marketing_calendar_flags` | array<{date, type}> | Tenant-provided or buyer-manual UI flag — see §10 |

### 2.8 · Rank signals

| Field | Type | Notes |
|---|---|---|
| `pdf_rank` | int | Retailer's own ranking — **TRUST IT** when provided |
| `velocity_rank` | int | Our derived ranking by velocity_7d desc within run |

---

## 3 · Derived signals — what the engine computes

### 3.1 · The 5 headline KPIs (top of UI, what the buyer sees first)

| KPI | Formula | Target / interpretation |
|---|---|---|
| **GMROI** | `gross_margin_$ / avg_inventory_at_cost` | Target fashion **3.0–3.5** (Kincade & Gibson Ch.7). Below 2.5 = problem. |
| **STR vs plan curve** | `actual_STR_today − planned_STR_for_this_week_of_season` | `+5pp` = ramping · `−10pp` = decay |
| **FWOC vs lead time** | `forward_weeks_of_cover / supplier_lead_time_weeks` | `< 1.0` = stockout risk · `> 2.0` = oversupplied |
| **Stock-to-sales ratio** | `stock_value / weekly_sales_value` | Spike = parked stock |
| **Maintained markup %** | `cumulative_margin_after_markdowns / cumulative_sales` | Gap vs `initial_markup_pct` reveals markdown erosion |

### 3.2 · Internal classifiers (feed the decision gates)

- `demand_score` (0-1) — distribution-normalized velocity vs family max
- `margin_score` (0-1) — effective margin relative to category benchmark
- `return_risk_score` (0-1) — `returns_pct / category_baseline` ratio
- `stockout_risk_score` (0-1) — stockout suppression detected
- `markdown_risk_score` (0-1) — `FWOC / season_weeks_remaining` (NEW unit, per Caro & Gallien 2012 canon)
- `distribution_breadth_score` (0-1) — `stores_active / stores_addressable`
- `cannibalization_risk_score` (0-1) — sibling SKU within style stealing demand
- `lifecycle_stage` — enum: new · ramp · peak · mature · decay · exit · insufficient_evidence
- `family_velocity_ratio` — `velocity_7d / avg_family_velocity_7d`
- `seasonal_runway_days` — days left in this SKU's natural window

### 3.3 · 6-dimensional confidence vector

| Dimension | What it measures |
|---|---|
| `confidence_data_completeness` | Fraction of inputs that are tenant-explicit (vs synthetic fallback) |
| `confidence_identity` | How sure we are of the style grouping (post identity-graph fix) |
| `confidence_demand` | How reliable velocity is (capped when stockout suppression detected) |
| `confidence_margin` | How reliable margin is (post normalizeMarkupPct fix) |
| `confidence_creative_fit` | How aligned with moodboard brief (when brief present) |
| `confidence_action` | Composite for the emitted verdict |

---

## 4 · The 13 decision gates

Each gate evaluates independently. A SKU can fire 1-N gates. Stacking rules in §5.

### 4.1 · This-week urgency (Daily Trading Meeting agenda top)

#### **Gate 1 · KILL** (Discontinuar / Matar)
- **Trigger**: `lifecycle = 'exit'` (STR < 10% day 21+ fast-fashion; STR < 5% day 30+ other archetypes) **OR** `effective_margin < 0 AND returns_pct ≥ 30%` **OR** `returns_pct > 2.5× category_baseline_pct`
- **Owner**: Buyer + Merchandiser (joint sign-off)
- **Six Right**: Right Product (no debimos comprarlo; no repetir)
- **Compatible with**: MARKDOWN_ACCELERATE (clear current), INVESTIGATE (diagnose before kill if returns-driven)
- **Blocks**: AMPLIFY_*, REPLENISH, AMPLIFY_DISTRIBUTION, CARRYOVER, PULL_FORWARD_INTAKE
- **Rationale template**: "This SKU is below the threshold where Zara's pull-back rule would automatically retire it. Stop loss now."

#### **Gate 2 · MARKDOWN_ACCELERATE** (Rebajar)
- **Trigger**: `markdown_risk_score > 0.4` where `markdown_risk_score = FWOC / season_weeks_remaining` (NOT `stock_days / 90` — that's the old wrong unit)
- **Multi-step ladder** (Donnellan Ch.12 canon, universal):
  - Stage 1 Initial · **−25% to −30%** · at ~60% time-elapsed
  - Stage 2 Second · **−40% to −60%** · at ~80% time-elapsed (3 weeks after Stage 1)
  - Stage 3 Terminal · **−70%+** · end-of-season (3 weeks after Stage 2)
- **Never-increase ratchet**: once a cluster receives a markdown, it never reverses.
- **Owner**: Merchandiser primary, buyer signs off, sometimes pricing committee
- **Six Right**: Right Price + Right Time
- **Compatible with**: RESIZE_DOWN, INVESTIGATE, KILL (parallel — dying anyway), CARRYOVER (rare)
- **Blocks**: AMPLIFY_*, REPLENISH, AMPLIFY_DISTRIBUTION, PULL_FORWARD_INTAKE

#### **Gate 3 · AMPLIFY_DISTRIBUTION** (Ampliar distribución)
- **Trigger**: STR in stocked stores `> category_target` **AND** `distribution_breadth_score < 0.6` **AND** `stock_warehouse > 0` **AND** no broken-assortment risk in current stores
- **Action**: push warehouse stock to +X archetype-matched stores
- **Owner**: Merchandiser primary
- **Six Right**: Right Place
- **Compatible with**: REPLENISH, AMPLIFY_IN_SEASON, AMPLIFY_NEXT_SEASON, EXTEND_COLORS, PROMOTE_PUSH, CARRYOVER
- **Blocks**: KILL, MARKDOWN, RESIZE_DOWN
- **NOTE**: explicitly NOT inter-store transfer (out of scope). This is warehouse → more stores only.

#### **Gate 4 · PULL_FORWARD_INTAKE** (Acelerar entrada)
- **Trigger**: `family_velocity_ratio > 1.5×` (hero ramping faster than plan) **AND** `pending_arrival_date − today > FWOC` (intake delay causes stockout) **AND** `supplier_flex_buffer_days > 0`
- **Owner**: Buyer + sourcing/supply chain
- **Six Right**: Right Time
- **Compatible with**: AMPLIFY_DISTRIBUTION, REPLENISH (different timing), AMPLIFY_IN_SEASON
- **Blocks**: RESIZE_DOWN, KILL

### 4.2 · This-month tactical

#### **Gate 5 · REPLENISH** (Reponer with distort)
- **Trigger**: `stockout_risk_score > 0.3` AND `velocity_7d > 0` AND no exit signals
- **Quantity**: `velocity_per_day × (target_cover_days + supplier_lead_time_days) − pipeline_total`
- **Distort metadata** (the "Reorder + Distort" verb the classroom teaches): top-3 stores by velocity · top-3 sizes by velocity · top-3 colors within style by velocity. The verdict surfaces these breakdowns.
- **Owner**: Merchandiser primary, buyer signs off
- **Six Right**: Right Quantity + Right Time
- **Compatible with**: AMPLIFY_DISTRIBUTION, PROMOTE_PUSH, AMPLIFY_IN_SEASON, CARRYOVER
- **Blocks**: RESIZE_DOWN (contradictory — higher confidence wins), KILL, MARKDOWN

#### **Gate 6 · RESIZE_DOWN** (Reducir compra próxima)
- **Trigger**: `sell_through_bought_pct < 20% by day 21+` **AND** `total_bought > p75(category_buys_this_season)` **AND** `lifecycle != 'new'`
- **Action**: cut next-season buy by 40% (multiplier 0.6)
- **Owner**: Buyer primary
- **Six Right**: Right Quantity (next-season correction)
- **Compatible with**: MARKDOWN (clear current + reduce next), KILL, INVESTIGATE
- **Blocks**: REPLENISH, AMPLIFY_*, PULL_FORWARD_INTAKE

#### **Gate 7 · PROMOTE_PUSH** (Promocionar — cause KNOWN)
- **Trigger**: velocity below plan **AND** one of:
  - `marketing_calendar_flag = upcoming_campaign within 14 days`
  - `seasonal_lever = upcoming_weather_change OR holiday OR drop`
  - `positioning_issue = identified (low exposure / wrong store mix)`
- **Owner**: Buyer + marketing (joint)
- **Six Right**: Right Promotion
- **Compatible with**: REPLENISH (supply for push), AMPLIFY_DISTRIBUTION
- **Blocks**: KILL, MARKDOWN, RESIZE_DOWN, INVESTIGATE_ROOT_CAUSE (mutually exclusive — either cause is known or unknown, not both)

#### **Gate 8 · INVESTIGATE_ROOT_CAUSE** (Revisar — cause UNKNOWN)
- **Trigger**: `velocity_7d > 0 AND returns_pct > 1.5× category_baseline_pct` **OR** mixed signals (high velocity + high returns; hero by some, dog by other) **OR** sibling SKUs in same style diverging unexpectedly
- **Action**: flag for fit / quality / sizing / tech-pack review
- **Owner**: Buyer + QA / tech-pack team
- **Six Right**: Right Product (revisión)
- **Compatible with**: any (it's a flag, not a stock action) — but caps confidence of AMPLIFY_* to 60% until resolved
- **Blocks**: PROMOTE_PUSH (mutually exclusive)

#### **Gate 9 · AMPLIFY_IN_SEASON** (Reorder + Distort NOW)
- **Trigger** (OR logic — generous; multiple signals collapse to high confidence):
  - `pdf_rank ≤ 10` (TRUST Zara's ranking)
  - **OR** `velocity_rank ≤ 10` in run
  - **OR** `demand_score ≥ 0.7 AND sell_through_bought_pct ≥ 50% AND days_in_store ≥ 14`
  - **OR** `family_velocity_ratio ≥ 1.5×`
  - **AND** `returns_pct ≤ 2.5× category_baseline_pct` (block if returns destroy margin)
- **Action**: re-order with distort (top stores/sizes/colors highlighted)
- **Owner**: Buyer + Merchandiser (joint)
- **Six Right**: Right Quantity + Right Time
- **Compatible with**: AMPLIFY_DISTRIBUTION, REPLENISH, AMPLIFY_NEXT_SEASON, EXTEND_COLORS, PULL_FORWARD_INTAKE, CARRYOVER
- **Blocks**: KILL, MARKDOWN, RESIZE_DOWN
- **Confidence caps**: if only `pdf_rank` fires alone (no internal corroboration) → cap `confidence_action` at 75% (was 60% — Felipe directive: trust Zara more than before)

### 4.3 · Next-season creative direction

#### **Gate 10 · AMPLIFY_NEXT_SEASON** (Sequel brief to design)
- **Trigger**: same conditions as AMPLIFY_IN_SEASON **AND** `days_in_store ≥ 28` (4 weeks of data = canon threshold for sequel decision per BoF + IESE Mango cases)
- **Action**: emit structured design brief — silhouette + materials + colors for 2-3 sequels next season
- **Owner**: Buyer + Design (joint)
- **Six Right**: Right Product (next-season range)
- **Compatible with**: AMPLIFY_IN_SEASON, AMPLIFY_DISTRIBUTION, EXTEND_COLORS, CARRYOVER
- **Blocks**: KILL

#### **Gate 11 · EXTEND_COLORS** (Extender paleta — the defensible wedge)
- **Trigger**: within the style, a winner color is identified (score = `margin × demand × ST − returns`) **AND** moodboard has adjacent swatches available **AND** count_colors_in_style < 5
- **Action**: emit design brief for new colorways with specific moodboard-aligned swatches
- **Owner**: Buyer + Design (joint)
- **Six Right**: Right Product (palette extension)
- **Per-SKU rule** (output-unit cardinal): fires ONLY on the SKU whose color IS the winner. Does NOT propagate to siblings. Rationale references the style's color performance as CONTEXT, but the action verb stays SKU-specific. (This is the fix for the SKU 1 bug class.)
- **Compatible with**: AMPLIFY_NEXT_SEASON, CARRYOVER
- **Blocks**: KILL

#### **Gate 12 · CARRYOVER** (Mantener / Continuidad)
- **Trigger**: `lifecycle ∈ {mature, peak}` AND `isHero` (sell_through ≥ 50% AND returns ≤ category_baseline AND distribution_breadth ≥ 0.5) **OR** basic/staple category with stable multi-season performance
- **Action**: include in next-season basic carryover plan
- **Owner**: Buyer + Merchandiser (joint)
- **Six Right**: Right Product (what works stays)
- **Compatible with**: AMPLIFY_NEXT_SEASON, EXTEND_COLORS, REPLENISH, AMPLIFY_DISTRIBUTION
- **Blocks**: KILL, MARKDOWN, RESIZE_DOWN

### 4.4 · Fallback

#### **Gate 13 · HOLD** (Esperar)
- **Trigger**: no other gate fired AND (`lifecycle = 'new'` (<14 days) OR `insufficient_evidence`)
- **Owner**: (none — re-evaluate next cycle)
- **UX rule**: hidden if any other action present. Visible only when it's the only verdict.

---

## 5 · Stacking + filtering rules

```
KILL                          → exclusive of {AMPLIFY_*, REPLENISH, AMPLIFY_DISTRIBUTION,
                                              CARRYOVER, PULL_FORWARD_INTAKE}
                              → compatible with {MARKDOWN, INVESTIGATE_ROOT_CAUSE}

MARKDOWN_ACCELERATE           → blocks {AMPLIFY_*, REPLENISH, AMPLIFY_DISTRIBUTION,
                                       PULL_FORWARD_INTAKE}
                              → compatible with {RESIZE_DOWN, INVESTIGATE, KILL}

REPLENISH                     ⊥ RESIZE_DOWN  (contradictory; higher confidence wins;
                                              loser noted in evidence)
                              → compatible with {AMPLIFY_*, AMPLIFY_DISTRIBUTION,
                                                PROMOTE_PUSH, CARRYOVER}

AMPLIFY_DISTRIBUTION          → compatible with {REPLENISH, AMPLIFY_*, PROMOTE_PUSH,
                                                EXTEND_COLORS, CARRYOVER}
                              → blocks {KILL, MARKDOWN, RESIZE_DOWN}

INVESTIGATE_ROOT_CAUSE        ⊥ PROMOTE_PUSH  (mutually exclusive — cause is either
                                              known or unknown)
                              → can sit alongside any other gate as a flag
                              → caps confidence_action of AMPLIFY_* at 75%

PROMOTE_PUSH                  ⊥ INVESTIGATE_ROOT_CAUSE (see above)
                              → compatible with {REPLENISH, AMPLIFY_DISTRIBUTION}
                              → blocks {KILL, MARKDOWN, RESIZE_DOWN}

AMPLIFY_IN_SEASON ‖ AMPLIFY_NEXT_SEASON ‖ EXTEND_COLORS  → all compatible
                                                          (different time horizons)

HOLD                          → filtered out if any other action present
```

---

## 6 · Display priority — the Daily/Monday Trading Meeting agenda

Per-tenant cadence (daily for Zara, weekly Monday for others). Display order on screen reflects operational urgency — this IS the trading meeting agenda for any SKU:

```
THIS WEEK / TODAY (urgencia operacional)
1.  KILL                       "Parar la sangría"
2.  MARKDOWN_ACCELERATE        "Bajar precio AHORA — stage X"
3.  AMPLIFY_DISTRIBUTION       "Empujar a +X tiendas"
4.  PULL_FORWARD_INTAKE        "Adelantar entrada N días"

THIS MONTH (decisión táctica)
5.  REPLENISH                  "Reponer N uds + distort"
6.  AMPLIFY_IN_SEASON          "Reorder + Distort para este SKU"
7.  PROMOTE_PUSH               "Marketing lever (causa: X)"
8.  RESIZE_DOWN                "Cortar compra próxima al 60%"
9.  INVESTIGATE_ROOT_CAUSE     "Revisar fit/quality"

NEXT SEASON (creative direction)
10. AMPLIFY_NEXT_SEASON        "Sequel brief al equipo de diseño"
11. EXTEND_COLORS              "Paleta extendida con moodboard"
12. CARRYOVER                  "Producto base, mantener"

FALLBACK
13. HOLD                       "Esperar más datos"
```

---

## 7 · Output structure per SKU

The verdict surface delivered to the buyer / commercial:

```
┌─ HEADER ─────────────────────────────────────────────────────────┐
│ SKU 4786 166 401 · ZW Grandad Collar Shirt · color 401 (blanco) │
│ €29.95 · 64% margin · 6 días en tienda · 1042 tiendas           │
└──────────────────────────────────────────────────────────────────┘

┌─ HEADLINE KPIs (5 buyer must-haves) ─────────────────────────────┐
│ GMROI            4.2 ↑    target 3.0–3.5         ✓ above        │
│ STR vs plan     +18pp ↑   wk 1: actual 30%, plan 12%            │
│ FWOC / LT        6.3      cover cómodo vs lead time              │
│ Stock-to-sales   8.4      alto — pipeline grande pero hero      │
│ Maintained MU    64%      sin markdown                          │
└──────────────────────────────────────────────────────────────────┘

┌─ ACTION STACK (orden = display priority) ────────────────────────┐
│                                                                  │
│ 🟢 AMPLIFY_IN_SEASON     · 92% confidence                       │
│    Owner: Buyer + Merchandiser                                  │
│    Six Right: Right Quantity + Right Time                       │
│    Rationale: "Top 1 del RNK Zara · top 3 velocity del run ·    │
│    1.94× la media de su familia. Reorder + distort hacia        │
│    Madrid/Barcelona/Bilbao · tallas M/L/S · color 401."         │
│    [Distort detail: 3 stores · 3 sizes · same color]            │
│                                                                  │
│ 🟢 AMPLIFY_DISTRIBUTION  · 84% confidence                       │
│    Owner: Merchandiser                                          │
│    Six Right: Right Place                                       │
│    Rationale: "En 1042 / 2900 tiendas · 91% sell-rate ·         │
│    capacidad warehouse para +150 tiendas archetype-matched."    │
│                                                                  │
│ 🟢 EXTEND_COLORS         · 78% confidence                       │
│    Owner: Buyer + Design                                        │
│    Six Right: Right Product                                     │
│    Rationale: "Color 401 (blanco) es el winner del estilo.     │
│    Extender a beige + crudo (del moodboard) próxima temporada." │
│                                                                  │
│ ⏸  AMPLIFY_NEXT_SEASON   gate not met (days_in_store < 28)      │
│    Re-evaluate at day 28.                                       │
└──────────────────────────────────────────────────────────────────┘

┌─ 6-DIM CONFIDENCE (collapsed by default) ────────────────────────┐
│ Data ████████░░ 80%  · Identity ██████████ 100%                 │
│ Demand ██████░░░░ 60% (early — 6 días)                          │
│ Margin ██████████ 100%  · Creative ████████░░ 80%               │
│ Action ███████░░░ 92% (composite)                               │
│ ▸ 2 inputs synthetic (plan curve, stores_addressable)           │
└──────────────────────────────────────────────────────────────────┘

┌─ DRILL-DOWN ─────────────────────────────────────────────────────┐
│ [Per-store breakdown] [Per-size] [Per-color] [Plan vs actual]   │
└──────────────────────────────────────────────────────────────────┘
```

The PDF overlay viewer shows this verdict pack rendered on top of the retailer's source artifact (the RNK PDF for Zara, the WSSI dashboard for Mango).

---

## 8 · Scope rules — explicitly IN and OUT

### IN scope (aimily In-Season emits these)

- KILL, MARKDOWN_ACCELERATE (3-step ladder), REPLENISH (with distort), AMPLIFY_DISTRIBUTION (warehouse → more stores), PULL_FORWARD_INTAKE, RESIZE_DOWN, PROMOTE_PUSH (cause known), INVESTIGATE_ROOT_CAUSE (cause unknown), AMPLIFY_IN_SEASON, AMPLIFY_NEXT_SEASON, EXTEND_COLORS, CARRYOVER, HOLD.

### OUT of scope (aimily does NOT emit these)

- **Inter-store TRANSFER** (move stock from store A to store B) — allocator/operations layer. Mango logistics + retailer-internal systems handle this.
- **PUSH_ALLOCATION between stores** (store-to-store rebalancing) — same as above.
- **Pre-season MFP / Assortment Planning** — o9, Centric, Anaplan layer.
- **Demand forecasting** — we accept the retailer's forecast / model output as INPUT; we don't compete with their forecasting layer.
- **Production scheduling** — out of scope; that's PLM / supply-chain territory.
- **Visual merchandising / planogram** — different discipline entirely.

---

## 9 · Spanish operational vocabulary (ES locale UI)

| English / Classroom | Spanish operational | Notes |
|---|---|---|
| WSSI (Weekly Sales Stock & Intake) | WSSI ("wizzy") | Same pronunciation EN+ES. Do NOT translate. |
| Daily Trading Meeting (Zara) | Daily Trading Meeting | Zara canonical name. |
| Monday Trade Meeting (others) | Comité de Trading / Reunión de Trading | |
| Open-to-Buy (OTB) | Presupuesto de compras / OTB | OTB widely used in Spanish too |
| Six-Month Plan | Plan de Temporada | |
| Buyer | Comprador / Compradora | |
| Merchandiser (commercial sense) | Comercial / Planner Comercial | At Inditex: "Comercial" — HQ-side cross-functional |
| Range plan | Plan de surtido | |
| Replenishment | Reposición | |
| Stockout / size break | Rotura (de stock / de tallas) | |
| Sell-through | Venta plena / Sell-through | |
| Markdown | Rebajas (clearance) / Rebaja (mid-season) | "Rebajas" = bi-annual window; "rebaja" = single price cut |
| Markdown depth | Profundidad de rebaja | |
| Carryover / Continuity | Continuidad / Producto básico | |
| Hero / Bestseller | Producto estrella / Bestseller | |
| Dog / Slow-mover | Producto lento | |
| Distort (a reorder) | Reorientar la reposición | |
| Pull forward intake | Acelerar entrada | |
| Promote / Push | Promocionar / Empujar | |
| Discontinue / Kill | Discontinuar / Matar | "Matar" = industry slang |
| Investigate | Marcar para revisión / Revisar | |
| GMROI | GMROI | English acronym in Spanish docs |
| Weeks of cover (WOC) | Semanas de cobertura | |
| Full-price sell-through (FPST) | Venta plena a precio completo | |
| AMPLIFY_DISTRIBUTION | Ampliar distribución | |

**UI rule**: use Spanish operational vocabulary in ES locale. Drop literal English-to-Spanish translation of internal jargon.

---

## 10 · Data fallback architecture — graceful degradation

Per the universal architecture rule (`feedback_aimily-graceful-degradation-tenant-input-or-synthetic.md`): every input has 3 resolution paths.

### 10.1 · Fallback table per input

| Input | Tenant explicit path | Synthetic fallback | Confidence impact |
|---|---|---|---|
| **planned_sell_through_curve** | Config UI / OTB feed / file upload | Derive from `category × archetype` historical patterns + SKU's own velocity ramp from retailer profile | Caps `confidence_demand` at 80% when synthetic |
| **stores_addressable** | Config: total or archetype-matched count | `stores_with_stock + (chain_typical_distribution_multiplier × stores_active)` from retailer profile | Caps `confidence_data_completeness` |
| **category_returns_baseline_pct** | Internal returns data per category | Coresight 2023 benchmarks (online apparel 24.4%, brick 6-9%, dresses 54%, skirts 47%) + run-observed adjustment from current corpus | Caps `confidence_margin` at 75% when synthetic |
| **marketing_calendar_flags** | Campaign feed integration | None — buyer UI manual flag; without flag, no PROMOTE_PUSH trigger (falls to INVESTIGATE if cause unknown) | No cap (UI surfaces "no campaign data") |
| **supplier_lead_time_days** | Per-SKU or per-category config | Retailer profile default (fast-fashion 15d Zara, mid-market 30-90d Mango) + per-category override | Caps `confidence_data_completeness` |

### 10.2 · Retailer profile = where synthetic defaults live

Per the existing `framework_retailer-agnostic-in-season-engine.md`:

- **Zara profile**: fast-fashion defaults (15d lead time, 6d cover target, brick-heavy 8-10% returns baseline, 5-6 week SKU lifecycle, daily cadence, twice-weekly shipment cycle, broken-assortment pull-back rule respected as input)
- **Mango profile**: mid-market defaults (30-90d lead time, 20-30d cover target, 15-20% returns baseline, longer SKU lifecycle, weekly Monday cadence)
- **Shopify SMB profile**: generic defaults (60-90d lead time, 30d cover target, 20-25% returns baseline online-skewed, longer lifecycle, weekly cadence)

### 10.3 · UX surfacing of synthetic vs explicit

The verdict UI shows:
- A small label per KPI/threshold when its underlying input is synthetic (e.g., "synthetic estimate from category pattern" or "tenant-provided")
- The 6-dim confidence vector reflects synthetic-vs-explicit at the data_completeness dimension
- No silent fallback — the buyer always knows what's a guess

---

## 11 · Open implementation items (resolve before demo)

### P0 — Catastrophic bugs to fix first
- [ ] **Color-scope action propagation filter** by `sku.color_ref === affected_color_code` (bug 8.1)
- [ ] **Identity graph rebuild** with `canonicalPrefix` corrected (bug 8.2)
- [ ] **Smoke test**: SKU 1 emits clean `AMPLIFY_IN_SEASON + EXTEND_COLORS` only, no rogue KILL

### P1 — Spec implementation (the work that follows this doc)
- [ ] Add 3 new verbs: `AMPLIFY_DISTRIBUTION`, `PROMOTE_PUSH`, `PULL_FORWARD_INTAKE`
- [ ] Split `AMPLIFY_WINNER` → `amplify_in_season` + `amplify_next_season`
- [ ] Split `INVESTIGATE` → `investigate_root_cause` + `promote_push`
- [ ] Enrich `REPLENISH` with distort metadata (top stores/sizes/colors)
- [ ] Enrich `MARKDOWN_ACCELERATE` with 3-step ladder explicit
- [ ] Reframe `markdown_risk_score` from `stock_days/90` → `FWOC / season_weeks_remaining`
- [ ] Add 5 headline KPIs to UI (GMROI, ST vs plan, FWOC/LT, S/S, MMU)
- [ ] Implement graceful-degradation pattern for the 5 inputs (synthetic fallback + UI label)
- [ ] Add Six Right anchor to verdict rationale
- [ ] Add owner field per verdict (buyer / merch / both / marketing / design / supply chain)
- [ ] Per-tenant cadence config (daily / weekly Monday)
- [ ] Spanish operational vocabulary in ES locale
- [ ] Add `stores_addressable` to schema (tenant-provided or synthetic)

### P2 — Refactor and rename
- [ ] Rename `lineage → style` everywhere user-facing
- [ ] Rename `Strategy → In-Season` (URL + DB + code + i18n) — full refactor, deferred per existing memory
- [ ] Rename `extend_colors` action remains as-is (the defensible wedge)

### P3 — Backtest engine (pilot gate)
- [ ] 2-period backtest infrastructure: precision/recall on prior-period verdicts vs actual outcomes
- [ ] Confidence-vs-outcome calibration data capture per release
- [ ] Audit H.1 — needs 2-period data from a real tenant or synthetic split of current corpus

---

## 12 · Cross-references

- [`feedback_aimily-output-unit-is-sku.md`](../../.claude/projects/-Users-felipemartinez-aimily/memory/feedback_aimily-output-unit-is-sku.md) — output unit cardinal rule
- [`feedback_aimily-vocabulary-style-vs-sku.md`](../../.claude/projects/-Users-felipemartinez-aimily/memory/feedback_aimily-vocabulary-style-vs-sku.md) — style vs SKU vocabulary
- [`feedback_aimily-discipline-buy-in-merch-and-sales.md`](../../.claude/projects/-Users-felipemartinez-aimily/memory/feedback_aimily-discipline-buy-in-merch-and-sales.md) — discipline framing
- [`feedback_aimily-scope-no-inter-store-transfer.md`](../../.claude/projects/-Users-felipemartinez-aimily/memory/feedback_aimily-scope-no-inter-store-transfer.md) — scope: no inter-store transfer
- [`feedback_aimily-zara-pilot-daily-cadence-no-acronym.md`](../../.claude/projects/-Users-felipemartinez-aimily/memory/feedback_aimily-zara-pilot-daily-cadence-no-acronym.md) — Zara pilot + daily + no acronym
- [`feedback_aimily-graceful-degradation-tenant-input-or-synthetic.md`](../../.claude/projects/-Users-felipemartinez-aimily/memory/feedback_aimily-graceful-degradation-tenant-input-or-synthetic.md) — the universal data resolution rule
- [`framework_retailer-agnostic-in-season-engine.md`](framework_retailer-agnostic-in-season-engine.md) — retailer profile architecture
- [`research_synthesis-in-season-grounding-2026-05-17.md`](research_synthesis-in-season-grounding-2026-05-17.md) — Round 1 synthesis (thresholds + Mango)
- [`research_synthesis-round-2-operational-craft-2026-05-17.md`](research_synthesis-round-2-operational-craft-2026-05-17.md) — Round 2 synthesis (operational craft + IESE channel)
- [`AUDIT.md`](../AUDIT.md) — 8-area audit baseline

/**
 * Block 4 · Sales Strategy types
 *
 * 3 archetypes (modelo de negocio · mutuamente excluyentes)
 *   A · Brand DTC
 *   B · Creator brand
 *   C · Made-to-Order
 *
 * 6 canales de venta (overlay · multi-select)
 *   own_storefront (default ON)
 *   tiktok_shop
 *   community_dm (WhatsApp · IG DM · Telegram)
 *   wholesale_b2b
 *   pop_ups_physical
 *   marketplaces
 *
 * Reference: memory/spec_block-4-sales-strategy-archetypes.md
 */

// ── Archetype identity ─────────────────────────────────────────────────────

export type SalesArchetypeId = 'A' | 'B' | 'C';

export type CapitalIntensity = 'low' | 'medium' | 'medium-high' | 'high';

export interface SalesArchetypeBenchmark {
  brand: string;
  country: string;
  sells: string;
  scale: string;
  tactic: string;
}

export interface SalesArchetypeLevers {
  capital_initial: CapitalIntensity;
  time_to_first_revenue: string;        // human-readable, e.g. "6-12 meses" or "día 1"
  cac_eur: { min: number; max: number };
  typical_pvp_eur: { min: number; max: number };
  typical_margin_pct: { min: number; max: number };
  typical_aov_eur: { min: number; max: number };
  typical_cvr_pct: { min: number; max: number };
  typical_lead_time_days?: { min: number; max: number };  // only for archetype C
}

export interface MarketingBudgetMix {
  paid_social?: number;
  seo_content?: number;
  email_crm?: number;
  pr_collabs?: number;
  owned_content?: number;
  founder_content?: number;
  email_drops?: number;
  paid_amplification?: number;
  web_storefront?: number;
  editorial_press?: number;
  craft_documentary?: number;
  email_waitlist?: number;
  seo_long_tail?: number;
  paid?: number;
}

export interface SalesArchetypeCadence {
  drops: 'continuous_plus_monthly_restock' | 'capsule_every_6_to_12_weeks' | 'on_demand';
  posts_per_day: number;
  emails_per_week: number;
  press_per_year: number;
}

// ── Channel identity ───────────────────────────────────────────────────────

export type SalesChannelId =
  | 'own_storefront'
  | 'tiktok_shop'
  | 'community_dm'
  | 'wholesale_b2b'
  | 'pop_ups_physical'
  | 'marketplaces';

export type SalesPaymentProvider =
  | 'stripe_buy_button'
  | 'shopify_buy'
  | 'lookbook_only'
  | 'tiktok_shop_native'
  | 'preproduct'
  | 'manual_invoice_split'
  | 'manual_invoice_full'
  | 'bizum'
  | 'mercadopago'
  | 'pix'
  | 'whatsapp_pay'
  | 'creator_passthrough_komi'
  | 'creator_passthrough_stan'
  | 'creator_passthrough_linktree'
  | 'creator_passthrough_shopmy';

export type FulfillmentModel = 'in_stock' | 'made_to_order' | 'pre_order';

export type DropMechanic =
  | 'continuous'
  | 'fcfs'
  | 'raffle'
  | 'unlimited_window'
  | 'gated'
  | 'on_demand'
  | 'scheduled_capsule';

export type StorefrontLayout = 'multi_page_full' | 'bio_link_single_page';

export interface SalesArchetypeCascade {
  payment_provider_primary: SalesPaymentProvider;
  payment_options_secondary?: SalesPaymentProvider[];
  fulfillment_model_default: FulfillmentModel;
  deposit_pct_default?: number;          // for archetype C
  lead_time_days_default?: number;       // for archetype C
  drop_mechanic_default: DropMechanic;
  storefront_layout: StorefrontLayout;
  router_layer?: ('linktree' | 'komi' | 'shopmy' | 'stan' | 'beacons')[];
}

// ── Full archetype shape ───────────────────────────────────────────────────

export interface SalesArchetype {
  id: SalesArchetypeId;
  name: string;
  tagline: string;
  narrative: string;
  levers: SalesArchetypeLevers;
  marketing_budget_mix: MarketingBudgetMix;
  cadence: SalesArchetypeCadence;
  kpis: string[];                         // primary KPI codes (5-6)
  failure_mode: string;
  benchmarks: SalesArchetypeBenchmark[];   // 4-7 reference brands
  best_for: string;
  cascade_defaults: SalesArchetypeCascade;
}

// ── Channel definition ─────────────────────────────────────────────────────

export interface ChannelTemplate {
  /** Path or identifier of the template asset (markdown / tsx generator). */
  id: string;
  label: string;
  description: string;
}

export interface SalesChannelDefinition {
  id: SalesChannelId;
  name: string;
  description: string;
  default_on: boolean;                    // own_storefront = true, others false
  payment_providers: SalesPaymentProvider[];
  fulfillment_model_default: FulfillmentModel;
  templates: ChannelTemplate[];           // assets/scripts aimily generates for this channel
  benchmark_brands: string[];             // aspirational brands using this channel
  benchmark_scale_signal: string;         // e.g. "Halara €305K/mes ES"
  archetype_compatibility: SalesArchetypeId[];  // which archetypes can activate this
}

// ── Channel activation (saved per collection) ──────────────────────────────

export interface ChannelActivationConfig {
  // Channel-specific config that the founder fills (subdomain for own_storefront,
  // TikTok seller account for tiktok_shop, etc.). Optional at activation; required
  // before publish.
  [key: string]: unknown;
}

export interface ChannelActivation {
  channel: SalesChannelId;
  enabled: boolean;
  share_pct?: number;                     // expected share of revenue (sum of enabled = 100)
  config?: ChannelActivationConfig;
}

// ── Per-SKU channel availability override ──────────────────────────────────

export interface SkuChannelAvailability {
  channel_id: SalesChannelId;
  enabled: boolean;
  override_payment_provider?: SalesPaymentProvider;
  override_lead_time_days?: number;
  override_deposit_pct?: number;
}

// ── CIS write payload (marketing.sales_strategy.*) ─────────────────────────

export interface SalesStrategyConfirmation {
  archetype_id: SalesArchetypeId;
  archetype_name: string;
  channels_activated: ChannelActivation[];
  fulfillment_model_default: FulfillmentModel;
  drop_mechanic_default: DropMechanic;
  payment_provider_primary: SalesPaymentProvider;
  cadence: {
    drops_frequency_weeks: number;
    restock_policy: string;
  };
  kpi_focus: string[];                    // editable, ordered (drag-to-reorder)
  capital_intensity: CapitalIntensity;
  marketing_budget_mix_pct: Record<string, number>;
  confirmed_at: string;                   // ISO timestamp
}

// ── Editor pre-fill payload (returned by /api/ai/sales-strategy-prefill-editor) ─

export interface SalesStrategyEditorPrefill {
  archetype_id: SalesArchetypeId;
  archetype_name: string;
  /* 3 axis defaults pre-filled with Block 1+2 context */
  volume: {
    skus_per_drop: number;                // pre-fill from merchandising.families count
    catalog_mode: 'permanent' | 'capsule';
  };
  cadence: {
    drops_frequency_weeks: number;
    posts_per_day: number;
    emails_per_week: number;
  };
  kpi_focus: string[];                    // 5-6 KPIs from archetype.kpis + per-channel additions
  /* Optional explanation per axis why these defaults */
  reasoning?: {
    volume?: string;
    cadence?: string;
    kpi_focus?: string;
  };
}

// ── Sales action (timeline task) ───────────────────────────────────────────

export type SalesActionType =
  | 'editorial_press'
  | 'creator_brief'
  | 'email_teaser'
  | 'ig_story_countdown'
  | 'ig_carousel_reveal'
  | 'lookbook_publish'
  | 'live_session'
  | 'press_release'
  | 'ugc_seeding_kit'
  | 'product_feed_export'
  | 'broadcast_dm'
  | 'voice_note_intro'
  | 'line_sheet_export'
  | 'showroom_invite'
  | 'pop_up_announce'
  | 'marketplace_listing'
  | 'drop_announcement'
  | 'storefront_publish'
  | 'restock_alert'
  | 'post_launch_check'
  | 'creative_refresh';

export type SalesActionStatus =
  | 'pending'
  | 'generating'
  | 'generated'
  | 'scheduled'
  | 'live'
  | 'completed'
  | 'skipped'
  | 'cancelled';

export type SalesActionAnchor =
  | 'sku_entry'
  | 'drop_launch'
  | 'drop_window_open'
  | 'drop_window_close';

export interface SalesAction {
  id: string;
  collection_plan_id: string;
  sku_id: string | null;
  drop_id: string | null;
  channel: SalesChannelId;
  action_type: SalesActionType;
  scheduled_at: string;                   // ISO timestamp
  relative_offset_days: number | null;    // T-N (negative) or T+N (positive)
  anchor_event: SalesActionAnchor;
  status: SalesActionStatus;
  target_endpoint: string | null;         // /api/ai/{block}/...
  payload: Record<string, unknown> | null;
  generated_artifact_id: string | null;
  generated_artifact_type: 'copy' | 'image' | 'video' | 'pdf' | 'feed' | 'brief' | null;
  generated_artifact_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Gauss curve representation ─────────────────────────────────────────────

export type CurveShape =
  | 'skewed_right_long_tail'              // archetype A · Brand DTC
  | 'spike_decay_fast'                    // archetype B · Creator brand
  | 'bimodal_deposit_balance';            // archetype C · MTO

export interface GaussCurvePoint {
  day_offset: number;                     // T+N days from anchor
  expected_revenue_eur: number;
  expected_units: number;
}

export interface GaussCurveExpected {
  shape: CurveShape;
  archetype_id: SalesArchetypeId;
  anchor_event: SalesActionAnchor;
  anchor_date: string;                    // ISO
  duration_days: number;
  points: GaussCurvePoint[];
  good_threshold: {
    metric: string;                       // e.g. "tail_at_day_180_pct_of_peak"
    value: number;                        // e.g. 50 (means 50%)
    description: string;                  // e.g. "tail @D+180 ≥ 50% del peak"
  };
}

export interface GaussCurveActual {
  archetype_id: SalesArchetypeId;
  anchor_event: SalesActionAnchor;
  anchor_date: string;
  points: Array<{
    day_offset: number;
    actual_revenue_eur: number;
    actual_units: number;
  }>;
  variance_vs_expected_pct: number;       // -50% means real is half of expected
  status: 'on_track' | 'below_expected' | 'above_expected' | 'no_data';
}

/* ═══════════════════════════════════════════════════════════════════
   Storefront types · Ecom block
   Mirrors supabase/migrations/046_ecom_storefronts.sql

   Plan reference: .planning/ecom/01-ARCHITECTURE.md
   ═══════════════════════════════════════════════════════════════════ */

export type ThemeId =
  | 'editorial-heritage'
  | 'streetwear-drop'
  | 'romantic-feminine'
  | 'minimal-architect'
  | 'performance-tech'
  | 'avant-garde-concept'
  | 'sustainable-craft'
  | 'y2k-digital-native'
  | 'workwear-heritage'
  | 'resort-luxe'
  | 'drop-lookbook'
  | 'linkinbio-plus';

export const ALL_THEME_IDS: readonly ThemeId[] = [
  'editorial-heritage',
  'streetwear-drop',
  'romantic-feminine',
  'minimal-architect',
  'performance-tech',
  'avant-garde-concept',
  'sustainable-craft',
  'y2k-digital-native',
  'workwear-heritage',
  'resort-luxe',
  'drop-lookbook',
  'linkinbio-plus',
] as const;

export type PaymentProvider = 'stripe_buy_button' | 'shopify_buy' | 'lookbook_only';

export type PageId = 'home' | 'plp' | 'pdp' | 'lookbook' | 'about' | 'contact' | 'global';

export type PublishAction =
  | 'publish'
  | 'unpublish'
  | 'rebuild'
  | 'domain_change'
  | 'theme_change';

/** Provider-specific payment config (matches storefronts.payment_config JSONB shape). */
export type StripeBuyButtonConfig = {
  publishableKey: string; // pk_live_... or pk_test_...
};

export type ShopifyBuyConfig = {
  shopDomain: string; // *.myshopify.com or shopify custom domain
  storefrontAccessToken: string;
};

export type PaymentConfig = StripeBuyButtonConfig | ShopifyBuyConfig | Record<string, never>;

/** Per-SKU payment IDs (matches storefronts.sku_payment_map JSONB shape). */
export type SkuPaymentEntry =
  | { provider: 'stripe_buy_button'; buttonId: string }
  | { provider: 'shopify_buy'; productHandle: string };

export type SkuPaymentMap = Record<string, SkuPaymentEntry>;

/** Row from `storefronts` table. */
export interface Storefront {
  id: string;
  user_id: string;
  collection_plan_id: string;

  subdomain: string;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  custom_domain_dns_target: string | null;
  custom_domain_txt_record: string | null;

  theme_id: ThemeId;

  payment_provider: PaymentProvider;
  payment_config: PaymentConfig;
  sku_payment_map: SkuPaymentMap;

  seo_title: string | null;
  seo_description: string | null;
  seo_og_image_url: string | null;
  seo_keywords: string[] | null;

  published_at: string | null;
  unpublished_at: string | null;
  last_built_at: string | null;

  view_count_total: number;
  view_count_30d: number;
  view_count_30d_resetat: string | null;

  created_at: string;
  updated_at: string;
}

/** Row from `storefront_overrides` table. */
export interface StorefrontOverride {
  id: string;
  storefront_id: string;
  page_id: PageId;
  /**
   * Path → value pairs of copy/content overrides for this page.
   * Examples:
   *   { "hero.title": "Custom hero" }
   *   { "about.body": "Custom about" }
   * For PDP page, paths can be SKU-scoped:
   *   { "sku_xyz.description": "..." }
   */
  field_overrides: Record<string, string>;
  updated_by: string;
  updated_at: string;
}

/** Row from `storefront_publishes` table. */
export interface StorefrontPublish {
  id: string;
  storefront_id: string;
  action: PublishAction;
  triggered_by: string | null;
  reason: string | null;
  payload_snapshot: Record<string, unknown> | null;
  created_at: string;
}

/** Insert type — fields the caller must provide for a new storefront. */
export type StorefrontInsert = Pick<
  Storefront,
  'user_id' | 'collection_plan_id' | 'subdomain'
> &
  Partial<
    Pick<
      Storefront,
      | 'theme_id'
      | 'payment_provider'
      | 'payment_config'
      | 'sku_payment_map'
      | 'seo_title'
      | 'seo_description'
      | 'seo_og_image_url'
      | 'seo_keywords'
      | 'custom_domain'
    >
  >;

/** Patch type — fields editable via PATCH endpoint. */
export type StorefrontPatch = Partial<
  Pick<
    Storefront,
    | 'theme_id'
    | 'payment_provider'
    | 'payment_config'
    | 'sku_payment_map'
    | 'seo_title'
    | 'seo_description'
    | 'seo_og_image_url'
    | 'seo_keywords'
  >
>;

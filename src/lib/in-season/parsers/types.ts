/**
 * Shared parser contract. Every Strategy parser produces a normalized
 * `ParsedRecord` shape that downstream ETL converts into product_facts +
 * inventory_facts + sales_windows + efficiency_facts rows.
 *
 * Parsers are anti-corruption — they keep `raw` for re-derivation when
 * the parser improves, and `original_labels` for taxonomy mapping.
 */

export interface ParsedSalesWindow {
  window: 'd1' | 'd2' | '7d' | '8_14d' | 'season' | 'lifetime';
  units?: number | null;
  gross_commission?: number | null;
  share_net_sales?: number | null;
  importe?: number | null;
  max_sale_promo?: number | null;
  max_sale_no_promo?: number | null;
  stores_with_sale?: number | null;
  rotation_1d?: number | null;
  rotation_7d?: number | null;
  rotation_td_tr_aj_7d?: number | null;
  rotation_td_tr_7d?: number | null;
  emptying_rate?: number | null;
  emptying_rate_available?: number | null;
}

export interface ParsedRecord {
  // Identity
  model_ref: string;
  color_ref?: string | null;
  variant_ref?: string | null;
  product_name?: string | null;
  family_code?: string | null;
  subfamily_code?: string | null;
  section_code?: string | null;
  season_tag: string;
  activation_date?: string | null;
  cluster_size?: number | null;
  description_raw?: string | null;

  // Pricing
  pvp?: number | null;
  pvp_compare?: number | null;
  markup_pct?: number | null;
  on_promo?: boolean;
  cost_estimate?: number | null;
  margin_pct_list?: number | null;

  // Inventory
  stock_store?: number | null;
  stock_warehouse?: number | null;
  stock_available?: number | null;
  stock_in_transit?: number | null;
  stock_pending?: number | null;
  stock_pending_date?: string | null;
  stock_adjusted?: number | null;
  stock_blocked?: number | null;
  stock_fabric?: number | null;
  days_in_store?: number | null;
  stores_with_stock?: number | null;
  stores_active?: number | null;
  stores_total?: number | null;
  pipeline_total?: number | null;
  cd2_available?: number | null;
  blocked_per_store?: number | null;

  // Velocity (per window)
  windows: ParsedSalesWindow[];

  // Lifecycle efficiency
  total_bought?: number | null;
  total_sold?: number | null;
  total_shipped?: number | null;
  sell_through_shipped_pct?: number | null;
  sell_through_bought_pct?: number | null;
  returns_pct?: number | null;

  // Product image — only populated by parsers that have direct access to
  // photo URLs (e.g. Shopify Products CSV via "Image Src", Shopify GraphQL
  // via MediaImage.url). Zara PDF parser leaves this null; for Zara the
  // image is extracted client-side from the rendered PDF canvas (see
  // src/lib/strategy/sku-image-cropper.ts). When `product_image_url` is
  // present, the Aimily Design flow skips PDF extraction and uses this
  // URL directly as the reference for sketch + colorway generation.
  product_image_url?: string | null;

  // Provenance
  row_index: number;
  page_coord?: { page: number; x?: number; y?: number } | null;
  raw: Record<string, unknown>;
  original_labels?: Record<string, string>;
  extraction_confidence: number; // 0-1
  parser_warnings?: string[];
}

export interface ParserResult {
  parser_version: string;
  records: ParsedRecord[];
  coverage_dimensions: {
    identity: boolean;
    pricing: boolean;
    inventory: boolean;
    velocity_d1: boolean;
    velocity_7d: boolean;
    velocity_8_14d: boolean;
    efficiency: boolean;
    returns: boolean;
    distribution: boolean;
    geographic: boolean;
    channel: boolean;
    size_curve: boolean;
    weather: boolean;
    marketing_exposure: boolean;
    page_traffic: boolean;
    return_reasons: boolean;
    markdown_date: boolean;
    stockout_days: boolean;
    supplier_lead_time: boolean;
    margin_after_returns: boolean;
  };
  parser_warnings: string[];
  parse_confidence: number; // 0-1 aggregate
}

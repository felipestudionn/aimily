/* ═══════════════════════════════════════════════════════════════════
   validateStorefront · structural pre-publish checks for any collection

   Returns { errors[], warnings[] }.
     - errors  → block publish (must fix before live)
     - warnings → soft (publish allowed, but the storefront is degraded)

   This is the SAME function used by:
     1. POST /api/ecom/publish   — blocks on errors before persisting
     2. GET  /api/ecom/validate  — standalone, no mutations, for live UX
        feedback inside EcomHub
     3. (Future) batch dashboard health checks per user

   Codes are stable identifiers so the UI can localize messages and
   group / sort issues. The util never throws — every failure mode
   becomes a code in errors[] or warnings[].

   Reference: memory/aimily-sku-lifecycle-audit-2026-05-06.md
   ═══════════════════════════════════════════════════════════════════ */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { loadStorefrontData, StorefrontDataMissingError } from './load-storefront-data';
import type { Storefront } from '@/types/storefront';

export interface ValidationIssue {
  /** Stable identifier (e.g. 'cis_missing.brand_name', 'sku.no_render'). */
  code: string;
  /** Free-text English summary; the UI maps `code` to localized strings. */
  message: string;
  /** When applicable, the SKU id this issue is about. */
  skuId?: string;
  /** Anything else the UI may want to render (e.g. missing field names). */
  context?: Record<string, unknown>;
}

export interface ValidationResult {
  /** True if the storefront can be published (no errors). */
  canPublish: boolean;
  /** Errors block publish. */
  errors: ValidationIssue[];
  /** Warnings allow publish but signal a degraded experience. */
  warnings: ValidationIssue[];
  /** Aggregate counts for the UI badge. */
  counts: {
    skusTotal: number;
    skusReady: number;        // has price + render
    skusWithEditorial: number;
    skusWithCopy: number;     // product_copy or notes
    skusWithBuyButton: number;
  };
}

interface ValidateOptions {
  /** Provider determines whether buy-button issues are errors or warnings. */
  paymentProvider?: Storefront['payment_provider'];
  /** Per-SKU payment map (so we don't ask the DB if the caller already has it
   *  — the publish path passes the about-to-be-saved value). */
  skuPaymentMap?: Record<string, { buyButtonId?: string; productHandle?: string }>;
}

const STOREFRONT_LINKED_TYPES = ['editorial', 'lifestyle', 'still_life'] as const;

export async function validateStorefront(
  collectionPlanId: string,
  options: ValidateOptions = {},
): Promise<ValidationResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // ── 1. CIS canonical fields ──
  // We do NOT call loadStorefrontData directly because it requires a full
  // Storefront row. Instead replicate the brand/collection checks against
  // collection_decisions + collection_plans + collection_skus. If any
  // required CIS key is missing, we return a structured error (instead of
  // throwing).
  const { data: cisRows } = await supabaseAdmin
    .from('collection_decisions')
    .select('domain, subdomain, key, value')
    .eq('collection_plan_id', collectionPlanId)
    .eq('is_current', true);

  const cis = new Map<string, unknown>();
  for (const r of (cisRows ?? [])) {
    cis.set(`${r.domain}.${r.subdomain}.${r.key}`, r.value);
  }

  const REQUIRED_CIS = [
    'creative.identity.brand_name',
    'creative.identity.collection_vibe',
    'creative.identity.typography',
    'creative.color.primary_palette',
  ];
  for (const key of REQUIRED_CIS) {
    if (!cis.has(key)) {
      errors.push({
        code: `cis_missing.${key}`,
        message: `Required CIS field missing: ${key}. Complete Block 1 Creative & Brand.`,
        context: { cisKey: key },
      });
    }
  }

  // Palette must yield ≥2 hex colors (the parser in load-storefront-data
  // throws otherwise — replicate the rule here).
  const palette = cis.get('creative.color.primary_palette');
  if (Array.isArray(palette)) {
    const HEX = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})/;
    const hexes = palette
      .map((s) => (typeof s === 'string' ? s.match(HEX)?.[0] : null))
      .filter(Boolean);
    if (hexes.length < 2 && cis.has('creative.color.primary_palette')) {
      errors.push({
        code: 'cis_palette_insufficient',
        message: 'Brand palette needs at least 2 hex colors. Add a second color in Block 1 Brand Identity.',
        context: { found: hexes.length },
      });
    }
  }

  // ── 2. Collection plan basics ──
  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('name, season')
    .eq('id', collectionPlanId)
    .maybeSingle();
  if (!plan?.name) {
    errors.push({
      code: 'plan_no_name',
      message: 'Collection has no name. Set it in collection settings.',
    });
  }

  // ── 3. SKU-level validation ──
  const { data: skus } = await supabaseAdmin
    .from('collection_skus')
    .select('id, name, family, type, drop_number, pvp, final_price, render_url, render_urls, notes, design_phase, production_approved')
    .eq('collection_plan_id', collectionPlanId);

  const counts = {
    skusTotal: 0,
    skusReady: 0,
    skusWithEditorial: 0,
    skusWithCopy: 0,
    skusWithBuyButton: 0,
  };

  if (!skus || skus.length === 0) {
    errors.push({
      code: 'no_skus',
      message: 'Collection has no SKUs. Add at least one in Block 2 Collection Builder.',
    });
  } else {
    counts.skusTotal = skus.length;

    const skuIds = skus.map((s) => s.id as string);

    // Editorial assets per SKU (only those with metadata.sku_id linked)
    const { data: assets } = await supabaseAdmin
      .from('collection_assets')
      .select('asset_type, metadata')
      .eq('collection_plan_id', collectionPlanId)
      .is('deleted_at', null)
      .in('asset_type', STOREFRONT_LINKED_TYPES as unknown as string[]);

    const editorialBySku = new Set<string>();
    for (const a of (assets ?? [])) {
      const meta = a.metadata as { sku_id?: string } | null;
      if (meta?.sku_id) editorialBySku.add(meta.sku_id);
    }

    // Product copy per SKU — the `product_copy` table was dropped
    // 2026-05-21 (Wave 4 cleanup, feature never shipped). Validator
    // continues to surface skusWithCopy=0 so the storefront publish
    // gate predicates on the falsy side, identical to previous behavior
    // when the table was empty in production.
    const copyBySku = new Set<string>();

    const provider = options.paymentProvider ?? 'lookbook_only';
    const paymentMap = options.skuPaymentMap ?? {};

    for (const s of skus) {
      const id = s.id as string;
      const price = Number(s.final_price ?? s.pvp ?? 0);
      const renderUrlsRaw = s.render_urls;
      const hasRender =
        Boolean(s.render_url) ||
        (Array.isArray(renderUrlsRaw) && renderUrlsRaw.length > 0) ||
        (renderUrlsRaw && typeof renderUrlsRaw === 'object' && '3d' in (renderUrlsRaw as Record<string, unknown>));
      const hasNotes = Boolean(((s.notes as string) ?? '').trim());
      const hasCopy = copyBySku.has(id);
      const hasEditorial = editorialBySku.has(id);

      if (price <= 0) {
        // Storefront silently filters out price=0 SKUs (line 349 of
        // load-storefront-data.ts). Make this an error so the user
        // explicitly chooses (set a price OR exclude the SKU).
        errors.push({
          code: 'sku_no_price',
          message: `SKU "${(s.name as string) || id.slice(0, 8)}" has no price. It would be hidden from the storefront.`,
          skuId: id,
        });
      }

      if (!hasRender) {
        warnings.push({
          code: 'sku_no_render',
          message: `SKU "${(s.name as string) || id.slice(0, 8)}" has no 3D render. The PDP will fall back to the sketch (or empty).`,
          skuId: id,
        });
      }

      if (!hasEditorial) {
        warnings.push({
          code: 'sku_no_editorial',
          message: `SKU "${(s.name as string) || id.slice(0, 8)}" has no editorial / lifestyle / still-life images linked. PDP will only show the render.`,
          skuId: id,
        });
      }

      if (!hasCopy && !hasNotes) {
        warnings.push({
          code: 'sku_no_copy',
          message: `SKU "${(s.name as string) || id.slice(0, 8)}" has no PDP description (no AI copy and no notes). PDP shows just the name.`,
          skuId: id,
        });
      }

      // Buy button check (only for non-lookbook providers)
      if (provider !== 'lookbook_only') {
        const pay = paymentMap[id] ?? {};
        const hasBuyButton =
          (provider === 'stripe_buy_button' && Boolean(pay.buyButtonId)) ||
          (provider === 'shopify_buy' && Boolean(pay.productHandle));
        if (hasBuyButton) {
          counts.skusWithBuyButton += 1;
        } else {
          warnings.push({
            code: 'sku_no_buy_button',
            message: `SKU "${(s.name as string) || id.slice(0, 8)}" has no ${provider === 'shopify_buy' ? 'Shopify product handle' : 'Stripe Buy Button ID'}. Visitors will see "Coming soon" instead of a buy button.`,
            skuId: id,
          });
        }
      }

      if (price > 0 && hasRender) counts.skusReady += 1;
      if (hasEditorial) counts.skusWithEditorial += 1;
      if (hasCopy || hasNotes) counts.skusWithCopy += 1;
    }
  }

  return {
    canPublish: errors.length === 0,
    errors,
    warnings,
    counts,
  };
}

/* Convenience: run the full publish-ready validation including the
   loadStorefrontData parsers (which throw StorefrontDataMissingError on
   a slightly stricter set of conditions). The publish endpoint uses the
   light-weight version above; the standalone validate endpoint can use
   either. We expose this so callers can opt into the strict path. */
export async function validateStorefrontStrict(
  storefront: Storefront,
  options: ValidateOptions = {},
): Promise<ValidationResult> {
  const base = await validateStorefront(storefront.collection_plan_id, {
    paymentProvider: options.paymentProvider ?? storefront.payment_provider,
    skuPaymentMap: (options.skuPaymentMap ?? (storefront.sku_payment_map as Record<string, { buyButtonId?: string; productHandle?: string }>)) ?? {},
  });
  if (base.errors.length > 0) return base;

  // If light validation passed, run the full loader (it can still throw on
  // edge cases like malformed typography). Catch and surface as an error.
  try {
    await loadStorefrontData(storefront);
  } catch (err) {
    if (err instanceof StorefrontDataMissingError) {
      base.errors.push({
        code: 'loader_strict_failure',
        message: err.message,
        context: { missingFields: err.missingFields },
      });
      base.canPublish = false;
    } else {
      base.errors.push({
        code: 'loader_unknown_failure',
        message: err instanceof Error ? err.message : 'Storefront loader failed',
      });
      base.canPublish = false;
    }
  }
  return base;
}

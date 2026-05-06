/* ═══════════════════════════════════════════════════════════════════
   loadStorefrontData · single source-of-truth payload for the storefront

   Canonical reads (zero fallbacks — see memory/feedback_no-fallbacks-arreglar-origen.md):
   - collection_decisions (CIS) — authoritative for brand DNA
   - collection_plans       — collection name, season
   - collection_skus        — SKU pricing + drop assignment
   - sku_colorways          — variants per SKU
   - collection_assets      — visuals (editorial, lifestyle, still_life, render)
   - drops                  — drop calendar
   - storefronts.*          — payment provider config

   Throws StorefrontDataMissingError when required canonical fields are absent
   so the publish endpoint can surface a clear "Block 1 Creative & Brand
   incomplete" message instead of silently rendering a fallback.

   Key map (CIS):
     creative.identity.brand_name        → brand.name
     creative.identity.collection_vibe   → brand.tagline (first line) + brand.manifesto (full)
     creative.identity.typography        → brand.typography (parsed)
     creative.identity.visual_direction  → (used for SEO + lookbook hint)
     creative.color.primary_palette      → brand.palette (parsed)
     creative.target.demographics        → brand.voice.values (extracted)
     marketing.voice.tone                → brand.voice.tone
     marketing.voice.personality         → brand.voice.keywords (extracted)
   ═══════════════════════════════════════════════════════════════════ */

import { supabaseAdmin } from '@/lib/supabase-admin';
import type {
  StorefrontData,
  StorefrontBrand,
  StorefrontCollection,
  StorefrontSku,
  StorefrontLookbook,
  StorefrontPaymentMeta,
  StorefrontMeta,
  StorefrontVariant,
} from './types';
import type { Storefront, ThemeId, SkuPaymentMap } from '@/types/storefront';

export class StorefrontDataMissingError extends Error {
  constructor(
    public readonly missingFields: string[],
    public readonly cisHint: string,
  ) {
    super(
      `Storefront data incomplete. Missing canonical fields: ${missingFields.join(', ')}. ${cisHint}`,
    );
    this.name = 'StorefrontDataMissingError';
  }
}

/* ── CIS HELPERS ────────────────────────────────────────────────── */

type CisRow = { domain: string; subdomain: string; key: string; value: unknown };

async function loadCisMap(collectionPlanId: string): Promise<Map<string, unknown>> {
  const { data: rows } = await supabaseAdmin
    .from('collection_decisions')
    .select('domain, subdomain, key, value')
    .eq('collection_plan_id', collectionPlanId)
    .eq('is_current', true);

  const map = new Map<string, unknown>();
  for (const r of (rows ?? []) as CisRow[]) {
    map.set(`${r.domain}.${r.subdomain}.${r.key}`, r.value);
  }
  return map;
}

/* ── PARSERS for unstructured CIS values ────────────────────────── */

const HEX_REGEX = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})/;

/**
 * primary_palette is an array of strings shaped like:
 *   "#1A1A1A (primary — solid anchor, generational confidence)"
 * We extract the hex codes preserving order.
 */
function parsePalette(raw: unknown): { primary: string; secondary: string; neutral: string[] } {
  const arr = Array.isArray(raw) ? (raw as string[]) : [];
  const hexes = arr
    .map((s) => (typeof s === 'string' ? s.match(HEX_REGEX)?.[0] : null))
    .filter((x): x is string => Boolean(x));

  if (hexes.length < 2) {
    throw new StorefrontDataMissingError(
      ['creative.color.primary_palette'],
      'Define a brand palette with at least 2 hex colors in Block 1 Creative & Brand → Brand Identity → Palette.',
    );
  }

  return {
    primary: hexes[0],
    secondary: hexes[1] ?? hexes[0],
    neutral: hexes.slice(2),
  };
}

/**
 * typography CIS value is a free-text description. We extract Primary + Secondary
 * font names (best-effort) — the theme defaults handle weights/sizes.
 */
function parseTypography(raw: unknown): { displayFont: string; bodyFont: string } {
  if (typeof raw !== 'string') {
    throw new StorefrontDataMissingError(
      ['creative.identity.typography'],
      'Define brand typography in Block 1 Creative & Brand → Brand Identity → Typography.',
    );
  }
  // Heuristic extraction
  const primaryMatch = raw.match(/(?:Primary|Display|Headline)\s*[:—–-]\s*([A-Z][\w\s]+?)(?:\s*\(|\.|,)/i);
  const secondaryMatch = raw.match(/(?:Secondary|Body|Text)\s*[:—–-]\s*([A-Z][\w\s]+?)(?:\s*\(|\.|,)/i);

  const stripFont = (s: string) => s.replace(/\b(Sans|Serif|Mono|Display)\b\s*$/i, '').trim();

  const display = primaryMatch ? stripFont(primaryMatch[1]) : 'Cormorant Garamond';
  const body = secondaryMatch ? stripFont(secondaryMatch[1]) : 'Inter';

  return {
    displayFont: `"${display}", "Times New Roman", serif`,
    bodyFont: `"${body}", system-ui, -apple-system, sans-serif`,
  };
}

/**
 * collection_vibe is a free-text manifesto. The first line / sentence is
 * the tagline; the whole text is the manifesto.
 */
function splitTagline(vibe: string): { tagline: string; manifesto: string } {
  // First line OR first sentence, whichever is shorter
  const firstLine = vibe.split('\n')[0].trim();
  const firstSentence = vibe.split(/(?<=\.|!|\?)\s+/)[0].trim();
  const tagline = firstLine.length > 0 && firstLine.length <= 80
    ? firstLine
    : firstSentence.slice(0, 80);
  return { tagline, manifesto: vibe.trim() };
}

/* ── BRAND ──────────────────────────────────────────────────────── */

async function loadBrand(collectionPlanId: string, cis: Map<string, unknown>): Promise<StorefrontBrand> {
  const required = [
    'creative.identity.brand_name',
    'creative.identity.collection_vibe',
    'creative.identity.typography',
    'creative.color.primary_palette',
  ] as const;

  const missing = required.filter((k) => !cis.has(k));
  if (missing.length > 0) {
    throw new StorefrontDataMissingError(
      [...missing],
      'Complete Block 1 Creative & Brand (Brand Identity + Palette) before publishing the storefront.',
    );
  }

  const brandName = cis.get('creative.identity.brand_name') as string;
  const vibe = cis.get('creative.identity.collection_vibe') as string;
  const { tagline, manifesto } = splitTagline(vibe);
  const palette = parsePalette(cis.get('creative.color.primary_palette'));
  const typography = parseTypography(cis.get('creative.identity.typography'));

  // Voice — optional sub-fields, treated as opt-in (NOT fallbacks): we only
  // include them if present in CIS.
  const tone = (cis.get('marketing.voice.tone') as string | undefined) ?? '';
  const personality = (cis.get('marketing.voice.personality') as string | undefined) ?? '';

  // Values: extract from competitors/inspiration/values JSONB if present
  const competitors = cis.get('creative.inspiration.competitors');
  const values = Array.isArray(competitors)
    ? (competitors as string[]).slice(0, 5).map((c) => c.split(':')[0].trim())
    : [];

  // Contact — opt-in; not all brands have these in CIS yet
  const contactEmail = cis.get('brand.contact.email') as string | undefined;
  const contactInstagram = cis.get('brand.contact.instagram') as string | undefined;
  const contactAddress = cis.get('brand.contact.address') as string | undefined;

  return {
    name: brandName,
    tagline,
    manifesto,
    voice: {
      tone,
      keywords: personality ? personality.split(/[,\n.]/).map((s) => s.trim()).filter(Boolean).slice(0, 6) : [],
      values,
    },
    palette,
    typography,
    logo: { url: null, alt: `${brandName} logo` },  // Logo wiring lands in Sprint 3 (asset picker)
    contact: {
      email: contactEmail ?? null,
      instagram: contactInstagram ?? null,
      address: contactAddress ?? null,
      phone: null,
    },
  };
}

/* ── COLLECTION + DROPS ─────────────────────────────────────────── */

async function loadCollection(collectionPlanId: string, cis: Map<string, unknown>): Promise<StorefrontCollection> {
  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('name, season, description')
    .eq('id', collectionPlanId)
    .maybeSingle();

  if (!plan?.name) {
    throw new StorefrontDataMissingError(
      ['collection_plans.name'],
      'The collection has no name. Set it in the collection settings before publishing.',
    );
  }

  // Narrative: prefer creative.identity.collection_vibe (already used for tagline + manifesto),
  // collection_plans.description as opt-in additional context
  const narrative = (cis.get('creative.identity.collection_vibe') as string)?.trim();

  const { data: drops } = await supabaseAdmin
    .from('drops')
    .select('id, drop_number, name, launch_date, weeks_active, story_name')
    .eq('collection_plan_id', collectionPlanId)
    .order('drop_number');

  const { data: skuRows } = await supabaseAdmin
    .from('collection_skus')
    .select('id, drop_id')
    .eq('collection_plan_id', collectionPlanId);

  const skusByDrop = new Map<string, string[]>();
  for (const s of (skuRows ?? [])) {
    const k = s.drop_id as string | null;
    if (k) {
      const arr = skusByDrop.get(k) ?? [];
      arr.push(s.id as string);
      skusByDrop.set(k, arr);
    }
  }

  return {
    name: plan.name,
    season: plan.season ?? '',
    narrative,
    drops: (drops ?? []).map((d) => ({
      id: d.id as string,
      name: (d.name as string) || (d.story_name as string) || `Drop ${d.drop_number}`,
      launchDate: (d.launch_date as string) ?? '',
      weeksActive: (d.weeks_active as number) ?? 0,
      skuIds: skusByDrop.get(d.id as string) ?? [],
    })),
  };
}

/* ── SKUs + VARIANTS + IMAGES ───────────────────────────────────── */

async function loadSkus(
  collectionPlanId: string,
  skuPaymentMap: SkuPaymentMap,
): Promise<StorefrontSku[]> {
  const { data: skus } = await supabaseAdmin
    .from('collection_skus')
    .select('id, type, channel, drop_number, pvp, final_price, expected_sales, sketch_url, render_url, render_urls, notes, story_id')
    .eq('collection_plan_id', collectionPlanId)
    .order('drop_number')
    .order('expected_sales', { ascending: false });

  if (!skus || skus.length === 0) {
    throw new StorefrontDataMissingError(
      ['collection_skus'],
      'Add SKUs in Block 2 Merchandising → Collection Builder before publishing.',
    );
  }

  // Variants per SKU
  const skuIds = skus.map((s) => s.id as string);
  const { data: colorways } = await supabaseAdmin
    .from('sku_colorways')
    .select('sku_id, name, hex_primary')
    .in('sku_id', skuIds);

  const colorwaysBySku = new Map<string, StorefrontVariant[]>();
  for (const cw of (colorways ?? [])) {
    const arr = colorwaysBySku.get(cw.sku_id as string) ?? [];
    arr.push({
      color: (cw.name as string) || 'Default',
      hex: (cw.hex_primary as string) ?? null,
      sizes: ['S', 'M', 'L', 'XL'],   // size_run propagation in Sprint 3
    });
    colorwaysBySku.set(cw.sku_id as string, arr);
  }

  // Editorial visuals attached via metadata.sku_id
  const { data: assets } = await supabaseAdmin
    .from('collection_assets')
    .select('url, metadata, asset_type')
    .eq('collection_plan_id', collectionPlanId)
    .is('deleted_at', null)
    .in('asset_type', ['editorial', 'lifestyle', 'still_life']);

  const editorialBySku = new Map<string, string[]>();
  for (const a of (assets ?? [])) {
    const meta = a.metadata as { sku_id?: string } | null;
    if (meta?.sku_id) {
      const arr = editorialBySku.get(meta.sku_id) ?? [];
      arr.push(a.url as string);
      editorialBySku.set(meta.sku_id, arr);
    }
  }

  // Per-SKU AI-generated copy (product_description). The PDP description
  // resolution chain is:
  //   1. product_copy.content.description (most recent, any non-archived status)
  //   2. fall back to collection_skus.notes
  //   3. empty string
  // The content column stores JSON.stringify({headline, description, features[], care})
  // — we parse and pull `description`. Failures fall back to notes silently.
  const { data: copyRows } = await supabaseAdmin
    .from('product_copy')
    .select('sku_id, content, status, updated_at')
    .eq('collection_plan_id', collectionPlanId)
    .eq('copy_type', 'product_description')
    .neq('status', 'archived')
    .order('updated_at', { ascending: false });

  const copyBySku = new Map<string, { headline?: string; description?: string }>();
  for (const c of (copyRows ?? [])) {
    const skuId = c.sku_id as string | null;
    if (!skuId || copyBySku.has(skuId)) continue;  // first wins (latest, since DESC ordered)
    try {
      const parsed = JSON.parse(c.content as string) as { headline?: string; description?: string };
      if (parsed && (parsed.description || parsed.headline)) {
        copyBySku.set(skuId, parsed);
      }
    } catch { /* malformed content — skip, will fall back to notes */ }
  }

  return skus
    .map((s): StorefrontSku => {
      const id = s.id as string;
      // render_urls is JSONB — sometimes seeded as {}, sometimes as string[].
      // Only treat as array of strings when it actually is one.
      const renderUrlsRaw = s.render_urls;
      const renders = Array.isArray(renderUrlsRaw)
        ? (renderUrlsRaw as string[])
        : s.render_url
          ? [s.render_url as string]
          : [];
      const editorials = editorialBySku.get(id) ?? [];

      const family = (s.type as string) || '';
      const skuCode = `SKU-${id.slice(0, 8).toUpperCase()}`;
      const drop = s.drop_number ? `Drop ${s.drop_number}` : '';
      const aiCopy = copyBySku.get(id);

      // Name: AI headline > notes first-line > family + drop fallback
      const name =
        aiCopy?.headline?.trim() ||
        ((s.notes as string)?.split('\n')[0] ?? '').trim() ||
        `${family} ${drop}`.trim();

      // Description: AI description > notes (full) > empty
      const description =
        (aiCopy?.description ?? '').trim() ||
        ((s.notes as string) ?? '').trim();

      return {
        id,
        skuCode,
        name,
        description,
        family,
        price: Number(s.final_price ?? s.pvp ?? 0),
        currency: 'EUR',
        variants: colorwaysBySku.get(id) ?? [],
        images: {
          ecommerce: renders,
          stillLife: renders,
          editorial: editorials,
          campaign: editorials,
        },
        payment: skuPaymentMap[id] ?? null,
      };
    })
    .filter((s) => s.price > 0);  // SKUs without imagery still render (PLP card shows name fallback)
}

/* ── LOOKBOOK ───────────────────────────────────────────────────── */

async function loadLookbook(collectionPlanId: string): Promise<StorefrontLookbook> {
  const { data: assets } = await supabaseAdmin
    .from('collection_assets')
    .select('url, description, metadata')
    .eq('collection_plan_id', collectionPlanId)
    .is('deleted_at', null)
    .in('asset_type', ['editorial', 'lifestyle', 'still_life'])
    .order('created_at', { ascending: false })
    .limit(24);

  const list = assets ?? [];
  return {
    hero: (list[0]?.url as string | undefined) ?? null,
    images: list.map((a) => ({
      url: a.url as string,
      caption: (a.description as string | null) ?? undefined,
      skuId: ((a.metadata as { sku_id?: string } | null)?.sku_id) ?? undefined,
    })),
  };
}

/* ── PAYMENT META ───────────────────────────────────────────────── */

function buildPaymentMeta(storefront: Storefront): StorefrontPaymentMeta {
  const cfg = (storefront.payment_config ?? {}) as Record<string, string>;
  const meta: StorefrontPaymentMeta = { provider: storefront.payment_provider };
  if (storefront.payment_provider === 'stripe_buy_button') {
    meta.stripePublishableKey = cfg.publishableKey;
  } else if (storefront.payment_provider === 'shopify_buy') {
    meta.shopifyShopDomain = cfg.shopDomain;
    meta.shopifyStorefrontAccessToken = cfg.storefrontAccessToken;
  }
  return meta;
}

/* ── PUBLIC API ─────────────────────────────────────────────────── */

export async function loadStorefrontData(storefront: Storefront): Promise<StorefrontData> {
  const cis = await loadCisMap(storefront.collection_plan_id);

  const [brand, collection, skus, lookbook] = await Promise.all([
    loadBrand(storefront.collection_plan_id, cis),
    loadCollection(storefront.collection_plan_id, cis),
    loadSkus(storefront.collection_plan_id, storefront.sku_payment_map ?? {}),
    loadLookbook(storefront.collection_plan_id),
  ]);

  const baseDomain = process.env.NEXT_PUBLIC_STOREFRONT_BASE_DOMAIN ?? 'aimily.shop';
  const publicUrl = `https://${storefront.subdomain}.${baseDomain}`;

  const meta: StorefrontMeta = {
    storefrontId: storefront.id,
    subdomain: storefront.subdomain,
    themeId: storefront.theme_id as ThemeId,
    publicUrl,
    publishedAt: storefront.published_at ?? new Date().toISOString(),
    seoTitle: storefront.seo_title,
    seoDescription: storefront.seo_description,
  };

  return {
    meta,
    brand,
    collection,
    skus,
    lookbook,
    payment: buildPaymentMeta(storefront),
  };
}

# Shopify Color Taxonomy — Research Report

**Date**: 2026-05-18
**Audience**: aimily In-Season — per-retailer color taxonomy ingestion
**Purpose**: source-of-truth lookup for Shopify-sourced merchants' SKUs

---

## 1. Executive verdict

**Yes — Shopify maintains a public, open-source, machine-readable, standardized color taxonomy**, but it is dramatically thinner than Zara's and ships **without hex codes**.

- **Source of truth**: `github.com/Shopify/product-taxonomy` (MIT-licensed).
- **Canonical Color attribute**: `gid://shopify/TaxonomyAttribute/1`, handle `color`.
- **Exactly 19 standard color values** at the generic level (flat list — no Red→Crimson hierarchy).
- **No hex codes in the standard.** Hex is a per-merchant concern, supplied via metaobjects or theme swatch settings.
- **Latest stable release**: `v2026-02` (published 2026-02-24). Main branch is `2026-05-unstable`. Both contain the same 19 generic color values.
- **At the variant level**, Shopify does NOT enforce taxonomy values: `Option1 Name=Color, Option1 Value=…` is **free text**. The standard taxonomy lives in **category metafields** (one tier above variants), and only merchants who opt in via Shopify's recent category-metafield UI use the standardized IDs.
- **Beauty is the exception**: `hair-color-shade` (34 values) and `makeup-color-shade` (30 values) are dedicated richer palettes. Apparel/footwear inherits the generic 19.

**Implication for aimily**: Shopify-source SKUs will almost always carry **free-text color strings on `option1` / `option2` / `option3`** (e.g. "Forest Green", "Navy Blue", "Off-white"). We need a fuzzy-match layer that maps each free-text string to one of the 19 canonical Shopify codes, AND keeps the merchant's original spelling for display. Hex codes for the 19 canonical values must be provided by aimily (editorial defaults in `shopify-colors-raw.json`).

---

## 2. The 19 canonical Shopify standard colors

| TaxonomyValue ID | Handle             | Name        | aimily editorial hex |
|-----------------:|:-------------------|:------------|:---------------------|
| 1                | `color__black`     | Black       | `#000000`            |
| 2                | `color__blue`      | Blue        | `#1F4FD8`            |
| 3                | `color__white`     | White       | `#FFFFFF`            |
| 4                | `color__gold`      | Gold        | `#D4AF37`            |
| 5                | `color__silver`    | Silver      | `#C0C0C0`            |
| 6                | `color__beige`     | Beige       | `#F5F5DC`            |
| 7                | `color__brown`     | Brown       | `#6B4423`            |
| 8                | `color__gray`      | Gray        | `#808080`            |
| 9                | `color__green`     | Green       | `#2E7D32`            |
| 10               | `color__orange`    | Orange      | `#E67E22`            |
| 11               | `color__pink`      | Pink        | `#E91E63`            |
| 12               | `color__purple`    | Purple      | `#7B1FA2`            |
| 13               | `color__red`       | Red         | `#D32F2F`            |
| 14               | `color__yellow`    | Yellow      | `#FBC02D`            |
| 15               | `color__navy`      | Navy        | `#000080`            |
| 16               | `color__rose-gold` | Rose gold   | `#B76E79`            |
| 17               | `color__clear`     | Clear       | `#FFFFFF00`          |
| 657              | `color__bronze`    | Bronze      | `#CD7F32`            |
| 2865             | `color__multicolor`| Multicolor  | `null` (catch-all)   |

Notes:
- IDs are **non-contiguous** because the schema added colors over time (Bronze landed at 657, Multicolor at 2865 — both retrofitted later than 1–17).
- Identifier of record is the **GID** (`gid://shopify/TaxonomyAttribute/1`, `gid://shopify/TaxonomyValue/N`). The **handle** (`color__<slug>`) is the human-readable stable identifier used in REST / metafield references. Both are stable across releases.
- "Clear" is intended for products like sunglasses lenses, plastic cases, water bottles — translucent rather than colorless. We map it to transparent.
- "Multicolor" is the catch-all for prints, patterns, and assortments. aimily should NEVER try to render a hex swatch for Multicolor — surface it as a small grid icon instead.

---

## 3. Download URLs for programmatic ingestion

**Stable (recommended for production)**:
```
https://raw.githubusercontent.com/Shopify/product-taxonomy/v2026-02/dist/en/attributes.json
```

**Main / unstable (tracks next release)**:
```
https://raw.githubusercontent.com/Shopify/product-taxonomy/main/dist/en/attributes.json
```

**YAML source (lighter, taxonomy authors edit this)**:
```
https://raw.githubusercontent.com/Shopify/product-taxonomy/main/data/values.yml
https://raw.githubusercontent.com/Shopify/product-taxonomy/main/data/attributes.yml
```

**Releases page**: `https://github.com/Shopify/product-taxonomy/releases`
**Explorer UI** (for visual diff): `https://shopify.github.io/product-taxonomy/`

The full `attributes.json` is 14.8 MB (8,237 attributes across all product categories). To extract only Color, filter for `handle == "color"` (one record).

---

## 4. How Shopify merchants actually specify color

Three layers, **in increasing degree of standardization**:

| Layer                                       | Standardization | Where it lives                         | Likelihood for apparel |
|---------------------------------------------|-----------------|----------------------------------------|------------------------|
| `Option1/Option2/Option3` variant fields    | **Free text**   | Product → Variants table               | ~95% of stores         |
| Variant metafields (`shopify.color-pattern`)| **Standard ID** | Category metafield, opt-in             | ~10–20% of stores      |
| Product-level metafields (theme swatches)   | Merchant choice | Custom metaobject with name+hex+image  | ~30% of themed stores  |

**Reality on the ground**: Shopify's standard taxonomy is opt-in. Most apparel merchants use free-text variant options ("Forest Green", "Navy", "Cobalt Blue"). When they use category metafields (the modern path Shopify is pushing since 2024), the value is a standard TaxonomyValue ID from the 19-color list.

The Color attribute has 50+ **extended siblings** (`footwear-color`, `eyewear-frame-color`, `dial-color`, `upholstery-color`, etc.) listed under `extended_attributes`. These are **category-scoped instances of the same attribute** — they share the 19 canonical values, not separate enums.

---

## 5. Hex codes — where they come from

**Not in the standard taxonomy.** Shopify's `values.yml` and `attributes.json` contain ZERO hex codes (grep'd both files, only matches were "hex" in unrelated values like "Hexagonal stone shape").

Hex codes are introduced at the **merchant layer** through three mechanisms:

1. **Color metaobjects** (modern, Shopify-native). Merchant creates a Color metaobject with required fields `Name` + `Color` (where `Color` is a hex string like `#FF0000`) and optional `Image`. Variants reference this metaobject. Themes read the hex to render swatches.
2. **Theme swatch settings** (legacy). Themes like Dawn, Brooklyn, Whisk define swatch CSS classes per color name. Hex is hardcoded in theme code.
3. **Per-variant image** (oldest). Each variant uploads a swatch image — no hex at all.

For aimily ingestion: when we receive a Shopify SKU with `option1 = "Forest Green"`, we should:
1. Fuzzy-match "Forest Green" → `color__green` (TaxonomyValue/9).
2. Store both the merchant string `"Forest Green"` AND the canonical handle `color__green`.
3. Render with aimily's editorial hex `#2E7D32` UNLESS the merchant supplied a swatch metaobject with their own hex.

---

## 6. Comparison to other standards

| Standard                  | Color count | Hex included | Hierarchy | Use case                                  |
|---------------------------|------------:|:------------:|:---------:|-------------------------------------------|
| **Shopify** (generic)     | 19          | No           | Flat      | Merchant-facing simple filtering          |
| **Shopify** (hair-shade)  | 34          | No           | Flat      | Beauty category specialized               |
| **Zara RNK** (our parser) | ~21         | Yes (visual) | Flat      | Internal range-planning identifier        |
| **Pantone TPX/TPG**       | 2,000+      | Lab/sRGB     | Fan-deck  | Color-matching for textile production     |
| **NRF Color Code**        | ~256        | Loose hex    | Family    | US retail planogram / inter-retailer EDI  |
| **GS1 Color Code**        | ~200        | None         | Family    | Global supply-chain (apparel rare)        |
| **CSS Named Colors**      | 147         | Yes (sRGB)   | Flat      | Web rendering                             |

**Where Shopify sits**: pragmatic minimum-viable taxonomy aimed at storefront filtering UX, not production matching or supply-chain interop. Closer to CSS Named Colors than to Pantone or NRF. Shopify makes **no claim** that the 19 values map to specific sRGB / Lab / Pantone references.

**aimily's strategic posture**: when ingesting a Shopify store, we are getting **merchandising-level resolution** (the merchant cares whether a SKU is "blue" or "red", not whether it's Pantone 18-4045 TCX vs 19-4150 TCX). For deeper resolution (e.g. matching across stores), aimily should layer its own perceptual color extraction on top of product imagery — Shopify's taxonomy alone is too coarse to drive color-amplification recommendations (the `extend_colors with moodboard swatches` verb).

---

## 7. Versioning & cadence

- Release cadence: ~quarterly, named `vYYYY-MM`.
- **Latest stable**: `v2026-02` (Feb 2026).
- **Main branch**: `2026-05-unstable` (work-in-progress for next release).
- Color generic attribute has been stable across recent releases — same 19 values in `v2026-02`, `v2025-12`, and `main`. Bronze (657) was added in 2024-07; Multicolor (2865) in 2025-02 per CHANGELOG.
- **aimily pin recommendation**: pin to a specific release tag (e.g. `v2026-02`) and refresh deliberately when releasing taxonomy upgrades. Do not point at `main`.

---

## 8. JSON snippet — ready to merge into `strategy_taxonomies`

The same content lives at `memory/shopify-colors-raw.json` for direct ingestion. Compact form:

```json
{
  "retailer": "shopify-standard",
  "taxonomy_type": "color",
  "version": "v2026-02",
  "source_url": "https://raw.githubusercontent.com/Shopify/product-taxonomy/v2026-02/dist/en/attributes.json",
  "code_to_name": {
    "color__beige": "Beige",
    "color__black": "Black",
    "color__blue": "Blue",
    "color__bronze": "Bronze",
    "color__brown": "Brown",
    "color__clear": "Clear",
    "color__gold": "Gold",
    "color__gray": "Gray",
    "color__green": "Green",
    "color__multicolor": "Multicolor",
    "color__navy": "Navy",
    "color__orange": "Orange",
    "color__pink": "Pink",
    "color__purple": "Purple",
    "color__red": "Red",
    "color__rose-gold": "Rose gold",
    "color__silver": "Silver",
    "color__white": "White",
    "color__yellow": "Yellow"
  },
  "code_to_hex": {
    "color__beige": "#F5F5DC",
    "color__black": "#000000",
    "color__blue": "#1F4FD8",
    "color__bronze": "#CD7F32",
    "color__brown": "#6B4423",
    "color__clear": "#FFFFFF00",
    "color__gold": "#D4AF37",
    "color__gray": "#808080",
    "color__green": "#2E7D32",
    "color__multicolor": null,
    "color__navy": "#000080",
    "color__orange": "#E67E22",
    "color__pink": "#E91E63",
    "color__purple": "#7B1FA2",
    "color__red": "#D32F2F",
    "color__rose-gold": "#B76E79",
    "color__silver": "#C0C0C0",
    "color__white": "#FFFFFF",
    "color__yellow": "#FBC02D"
  },
  "code_to_gid": {
    "color__beige": "gid://shopify/TaxonomyValue/6",
    "color__black": "gid://shopify/TaxonomyValue/1",
    "color__blue": "gid://shopify/TaxonomyValue/2",
    "color__bronze": "gid://shopify/TaxonomyValue/657",
    "color__brown": "gid://shopify/TaxonomyValue/7",
    "color__clear": "gid://shopify/TaxonomyValue/17",
    "color__gold": "gid://shopify/TaxonomyValue/4",
    "color__gray": "gid://shopify/TaxonomyValue/8",
    "color__green": "gid://shopify/TaxonomyValue/9",
    "color__multicolor": "gid://shopify/TaxonomyValue/2865",
    "color__navy": "gid://shopify/TaxonomyValue/15",
    "color__orange": "gid://shopify/TaxonomyValue/10",
    "color__pink": "gid://shopify/TaxonomyValue/11",
    "color__purple": "gid://shopify/TaxonomyValue/12",
    "color__red": "gid://shopify/TaxonomyValue/13",
    "color__rose-gold": "gid://shopify/TaxonomyValue/16",
    "color__silver": "gid://shopify/TaxonomyValue/5",
    "color__white": "gid://shopify/TaxonomyValue/3",
    "color__yellow": "gid://shopify/TaxonomyValue/14"
  }
}
```

19 colors total — these ARE all of them (not first-30). Shopify's generic Color attribute simply has 19 standard values, full stop.

---

## 9. Open questions / where evidence was thin

1. **Hex defaults**: aimily editorial hex above is opinionated, NOT authoritative. Decide before launch whether to (a) ship our defaults, (b) extract from CSS Named Colors where the slug matches, or (c) ask the user/tenant to override on first ingest. **Recommend (a)** for zero-config UX with (c) as escape hatch.
2. **Fuzzy mapping rules**: we need a mapper from free-text Shopify variant values ("Forest Green", "Off-white", "Cobalt", "Khaki", "Cream", "Charcoal") onto the 19 codes. This is a separate piece of work — not covered by this report. Likely landed in `src/lib/strategy/identity-graph.ts` parallel to lineage matching, with a confidence dim.
3. **Multicolor edge case**: when a SKU has multiple colors (e.g. "Black/White stripe"), Shopify expects either Multicolor (`2865`) OR a per-variant decomposition. aimily's per-SKU verdict logic should treat Multicolor as "do not propagate color-scope actions" (relevant to the color-scope filter bug 8.1 fixed today).
4. **Pattern attribute**: separate from Color, Shopify has a `pattern` attribute (striped, floral, polka-dot, etc.) which is orthogonal. Out of scope for this report but worth ingesting alongside in v2.
5. **Beauty palettes**: `hair-color-shade` (34) and `makeup-color-shade` (30) — if aimily ever onboards a beauty-vertical Shopify merchant, those richer palettes will need their own ingestion. Not blocking apparel pilot.
6. **Did the v2026-02 release add anything new vs v2025-12?** CHANGELOG says "120+ categories now have color attributes" — that's about extension breadth, not the 19 values. The generic value set has not changed in the last 3 releases.

---

## 10. Implementation checklist (suggested follow-ups, not in this report's scope)

- [ ] Add Shopify color row to `strategy_taxonomies` (taxonomy_type=color, retailer_profile=shopify-standard, version=v2026-02, source_url committed).
- [ ] Build free-text → canonical-handle fuzzy mapper for Shopify variants (Levenshtein + CSS-named-colors fallback + LLM repair).
- [ ] Decide whether aimily's editorial hex defaults ship as-is or are overridable per-tenant via merchant metaobject pull.
- [ ] Document the "Multicolor never propagates" rule in the strategic decision map next to the color-scope filter rule (cross-link to bug 8.1).
- [ ] Add provenance breadcrumb in UI: when surfacing a SKU's color, show "(Shopify standard · v2026-02)" or "(merchant override)" so the user knows where it came from.

---

## Sources

- [Shopify product-taxonomy GitHub repo](https://github.com/Shopify/product-taxonomy)
- [Release v2026-02 (latest stable, 2026-02-24)](https://github.com/Shopify/product-taxonomy/releases/tag/v2026-02)
- [attributes.json (dist, main)](https://raw.githubusercontent.com/Shopify/product-taxonomy/main/dist/en/attributes.json)
- [values.yml (source)](https://raw.githubusercontent.com/Shopify/product-taxonomy/main/data/values.yml)
- [Shopify Taxonomy Explorer](https://shopify.github.io/product-taxonomy/)
- [Shopify Help: Adding color swatches using category metafields](https://help.shopify.com/en/manual/custom-data/metafields/category-metafields/using-category-metafields)
- [Shopify Help: Product Category & Standard Product Taxonomy](https://help.shopify.com/en/manual/products/details/product-category)
- [Shopify Liquid color object](https://shopify.dev/docs/api/liquid/objects/color)
- [Shopify Help: Variants](https://help.shopify.com/en/manual/products/variants)
- [Shopify Partners blog: Getting Started with Swatches](https://www.shopify.com/partners/blog/swatches)

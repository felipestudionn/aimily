/* ═══════════════════════════════════════════════════════════════════
   Storefront types · shapes for theme rendering + data loading

   Two layers:
   - StorefrontData: the payload every page template receives.
     Built by loadStorefrontData() from CIS + collection_skus + brand DNA.
   - Theme contract: ThemeManifest, ThemeTokens, PageId, PageTemplate.

   Plan: .planning/ecom/01-ARCHITECTURE.md §3-§4
   ═══════════════════════════════════════════════════════════════════ */

import type { ComponentType } from 'react';
import type { PaymentProvider, PageId, ThemeId, SkuPaymentEntry } from '@/types/storefront';

/* ── DATA SHAPES ────────────────────────────────────────────────── */

export interface StorefrontBrand {
  name: string;
  tagline: string;
  manifesto: string;          // 2-4 sentence brand voice manifesto
  voice: {
    tone: string;             // e.g. "editorial, confident, warm"
    keywords: string[];       // adjectives the brand owns
    values: string[];         // 3-5 values (sustainability, craft, etc.)
  };
  palette: {
    primary: string;          // hex (#A8553B etc.)
    secondary: string;
    neutral: string[];        // 2-4 neutrals (bg, fg, muted, line)
  };
  typography: {
    displayFont: string;      // CSS font-family value (with fallback stack)
    bodyFont: string;
    displayWeight?: number;   // default 300
  };
  logo: {
    url: string | null;       // null = render brand.name as text logo
    alt: string;
  };
  contact: {
    email: string | null;
    instagram: string | null; // handle without @
    address: string | null;
    phone: string | null;
  };
}

export interface StorefrontCollection {
  name: string;
  season: string;             // SS27, FW26, etc.
  narrative: string;          // 1-2 paragraph collection story
  drops: StorefrontDrop[];
}

export interface StorefrontDrop {
  id: string;
  name: string;
  launchDate: string;         // ISO
  weeksActive: number;
  skuIds: string[];
  countdown?: boolean;        // show countdown timer if upcoming
}

export interface StorefrontVariant {
  color: string;              // human-readable color name
  hex: string | null;         // optional swatch hex
  sizes: string[];
  inventoryHint?: 'low' | 'available' | 'sold_out';  // placeholder, not real inventory
}

export interface StorefrontSkuImages {
  ecommerce: string[];        // packshot/cutout — used in PLP cards
  stillLife: string[];        // editorial still life — used in PDP gallery
  editorial: string[];        // on-model editorial — used in lookbook + PDP hero
  campaign: string[];         // wide campaign shots — optional
}

export interface StorefrontSku {
  id: string;
  skuCode: string;
  name: string;
  description: string;
  family: string;             // for filtering in PLP (e.g. "Tops", "Outerwear")
  price: number;
  currency: string;
  variants: StorefrontVariant[];
  images: StorefrontSkuImages;
  payment: SkuPaymentEntry | null;  // null = no buy button (lookbook only)
  storyHook?: string;         // 1-line editorial caption from brand voice
}

export interface StorefrontLookbook {
  hero: string | null;        // hero image URL (full-bleed editorial)
  images: Array<{
    url: string;
    caption?: string;
    skuId?: string;           // optional link to a PDP
  }>;
}

export interface StorefrontPaymentMeta {
  provider: PaymentProvider;
  /** Stripe publishable key (for stripe_buy_button) — exposed to client. */
  stripePublishableKey?: string;
  /** Shopify shop domain (for shopify_buy) — exposed to client. */
  shopifyShopDomain?: string;
  /** Shopify storefront access token (read-only — exposed to client). */
  shopifyStorefrontAccessToken?: string;
}

export interface StorefrontMeta {
  storefrontId: string;
  subdomain: string;
  themeId: ThemeId;
  publicUrl: string;
  publishedAt: string;        // ISO
  seoTitle: string | null;
  seoDescription: string | null;
}

/**
 * The single payload object every theme page template receives.
 * Built by loadStorefrontData() and mutated by applyOverrides() before render.
 */
export interface StorefrontData {
  meta: StorefrontMeta;
  brand: StorefrontBrand;
  collection: StorefrontCollection;
  skus: StorefrontSku[];
  lookbook: StorefrontLookbook;
  payment: StorefrontPaymentMeta;
}

/* ── THEME CONTRACT ─────────────────────────────────────────────── */

/**
 * CSS custom properties exposed by every theme. Always the same keys
 * across themes — only values differ. Inject as `style` on <html>.
 */
export interface ThemeTokens {
  // Color
  '--s-bg': string;
  '--s-bg-elev': string;
  '--s-fg': string;
  '--s-fg-muted': string;
  '--s-line': string;
  '--s-accent': string;

  // Typography
  '--s-display-font': string;
  '--s-display-weight': string;
  '--s-display-tracking': string;
  '--s-display-case': string;          // 'none' | 'uppercase' | 'lowercase'
  '--s-body-font': string;
  '--s-body-weight': string;

  // Sizing
  '--s-radius-card': string;
  '--s-radius-image': string;
  '--s-radius-button': string;

  // Layout
  '--s-spacing-section': string;
  '--s-spacing-section-mobile': string;
  '--s-grid-gap': string;
  '--s-image-ratio-pdp': string;
  '--s-image-ratio-plp': string;
  '--s-image-ratio-hero': string;

  // Allow extra tokens per theme without breaking the contract
  [key: `--s-${string}`]: string;
}

export interface ThemeFontFamily {
  /** Display name as it appears in Google Fonts URL (e.g. "PP Editorial New") */
  family: string;
  /** Weights to load (e.g. [300, 400, 700]) */
  weights: number[];
  /** Source — google or bunny (privacy-friendly Google Fonts mirror) */
  source: 'google' | 'bunny' | 'system';
  /** Whether this is a serif/display/sans */
  category: 'serif' | 'sans' | 'display' | 'mono';
}

export interface ThemeManifest {
  id: ThemeId;
  name: string;
  description: string;
  /** Anchor brands for internal reference only — never rendered. */
  anchorBrandsInternal: string[];
  /** Pages this theme implements. Themes 11-12 may omit some. */
  pages: PageId[];
  /** Fonts to load via next/font or Google Fonts <link>. */
  fonts: ThemeFontFamily[];
  /** Preview image used in the theme picker hub UI. */
  previewImage?: string;
}

/**
 * Props every page template receives. Templates are server components;
 * client interactivity happens inside their own children if needed.
 */
export interface PageTemplateProps {
  data: StorefrontData;
  /** Current SKU id when rendering PDP. Undefined for other pages. */
  skuId?: string;
}

export type PageTemplate = ComponentType<PageTemplateProps>;

/**
 * The shape every theme module exports. Imported lazily by theme-registry.
 */
export interface ThemeModule {
  manifest: ThemeManifest;
  tokens: ThemeTokens;
  pages: Partial<Record<PageId, PageTemplate>>;
}

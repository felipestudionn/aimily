/* ═══════════════════════════════════════════════════════════════════
   BuyButton · shared component used by every theme's PdpTemplate

   Renders the right widget based on the storefront's payment provider:
   - stripe_buy_button → official <stripe-buy-button> web component
                         (loads buy-button.js script, props publishable-key + buy-button-id)
   - shopify_buy       → Shopify Buy SDK product button
                         (loads buy-button-storefront.min.js, mounts via init)
   - lookbook_only     → "Coming soon" pill, optional reserve CTA via brand contact

   Aimily NEVER touches money — we only render official widgets that
   open the user's own checkout (Stripe Checkout overlay or Shopify cart).

   Per-SKU config from data.skus[].payment + storefront-level publishable
   key from data.payment.

   Type-safe across providers via discriminated union.
   ═══════════════════════════════════════════════════════════════════ */

'use client';

import { useEffect, useId, useRef } from 'react';
import Script from 'next/script';
import type { StorefrontPaymentMeta, StorefrontSku } from '@/lib/storefront/types';

interface Props {
  sku: StorefrontSku;
  payment: StorefrontPaymentMeta;
  /** When true, render a small editorial "Coming soon" pill instead of CTAs.
   * Used for lookbook_only mode AND when SKU lacks payment config. */
  variant?: 'default' | 'compact';
}

// React 19 JSX runtime — register the Stripe web component element
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'stripe-buy-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'buy-button-id'?: string;
          'publishable-key'?: string;
        },
        HTMLElement
      >;
    }
  }
}

interface ShopifyBuyClient {
  buildClient(opts: { domain: string; storefrontAccessToken: string }): unknown;
  UI: {
    init(client: unknown): {
      createComponent(
        type: 'product',
        opts: { id: string; node: HTMLElement | null; options?: Record<string, unknown> },
      ): void;
    };
  };
}

declare global {
  interface Window {
    ShopifyBuy?: ShopifyBuyClient;
  }
}

export function BuyButton({ sku, payment, variant = 'default' }: Props) {
  const shopifyMountId = useId().replace(/[:]/g, '_');
  const shopifyContainerRef = useRef<HTMLDivElement>(null);
  const skuPayment = sku.payment;

  /* ── lookbook_only or missing per-SKU config → Coming Soon ──────── */
  const noBuy =
    payment.provider === 'lookbook_only' ||
    !skuPayment ||
    (skuPayment.provider !== payment.provider);

  /* ── Shopify Buy SDK · script + mount ──────────────────────────── */
  useEffect(() => {
    if (
      payment.provider !== 'shopify_buy' ||
      !skuPayment ||
      skuPayment.provider !== 'shopify_buy' ||
      !payment.shopifyShopDomain ||
      !payment.shopifyStorefrontAccessToken
    ) {
      return;
    }

    const SCRIPT_ID = 'shopify-buy-sdk-script';
    const productHandle = skuPayment.productHandle;

    function mount() {
      const ShopifyBuy = window.ShopifyBuy;
      if (!ShopifyBuy) return;
      const client = ShopifyBuy.buildClient({
        domain: payment.shopifyShopDomain!,
        storefrontAccessToken: payment.shopifyStorefrontAccessToken!,
      });
      const ui = ShopifyBuy.UI.init(client);
      ui.createComponent('product', {
        id: productHandle,
        node: shopifyContainerRef.current,
        options: {
          product: {
            buttonDestination: 'checkout',
            contents: { img: false, title: false, price: false },
            text: { button: 'Buy now' },
          },
        },
      });
    }

    if (window.ShopifyBuy) {
      mount();
      return;
    }
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js';
      script.async = true;
      script.onload = mount;
      document.body.appendChild(script);
    } else {
      script.addEventListener('load', mount);
    }
  }, [payment, skuPayment, shopifyMountId]);

  if (noBuy) {
    if (variant === 'compact') {
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '0.4rem 0.9rem',
            borderRadius: 'var(--s-radius-button)',
            background: 'color-mix(in oklab, var(--s-fg) 6%, transparent)',
            color: 'var(--s-fg-muted)',
            fontSize: '11px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontFamily: 'var(--s-body-font)',
            fontWeight: 600,
          }}
        >
          Coming soon
        </span>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button
          disabled
          style={{
            width: '100%',
            padding: '1rem 2rem',
            background: 'color-mix(in oklab, var(--s-fg) 6%, transparent)',
            color: 'var(--s-fg-muted)',
            border: 'none',
            borderRadius: 'var(--s-radius-button)',
            fontSize: '13px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontWeight: 600,
            fontFamily: 'var(--s-body-font)',
            cursor: 'not-allowed',
          }}
        >
          Coming soon
        </button>
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: 'var(--s-fg-muted)',
            textAlign: 'center',
            fontFamily: 'var(--s-body-font)',
          }}
        >
          Available when the brand opens checkout
        </p>
      </div>
    );
  }

  /* ── Stripe Buy Button ─────────────────────────────────────────── */
  if (
    payment.provider === 'stripe_buy_button' &&
    skuPayment?.provider === 'stripe_buy_button' &&
    payment.stripePublishableKey
  ) {
    return (
      <>
        <Script src="https://js.stripe.com/v3/buy-button.js" strategy="afterInteractive" async />
        <div style={{ width: '100%' }}>
          {/* The web component reads its own attributes; styling is limited
              by Stripe's iframe shadow root but inherits container width. */}
          <stripe-buy-button
            buy-button-id={skuPayment.buttonId}
            publishable-key={payment.stripePublishableKey}
          />
        </div>
        <p
          style={{
            margin: '0.5rem 0 0',
            fontSize: '11px',
            color: 'var(--s-fg-muted)',
            textAlign: 'center',
            fontFamily: 'var(--s-body-font)',
          }}
        >
          Secure checkout via Stripe
        </p>
      </>
    );
  }

  /* ── Shopify Buy SDK ────────────────────────────────────────────── */
  if (
    payment.provider === 'shopify_buy' &&
    skuPayment?.provider === 'shopify_buy' &&
    payment.shopifyShopDomain
  ) {
    return (
      <>
        <div ref={shopifyContainerRef} id={`shopify-buy-${shopifyMountId}`} />
        <p
          style={{
            margin: '0.5rem 0 0',
            fontSize: '11px',
            color: 'var(--s-fg-muted)',
            textAlign: 'center',
            fontFamily: 'var(--s-body-font)',
          }}
        >
          Cart & checkout via Shopify
        </p>
      </>
    );
  }

  // Provider config incomplete (e.g. publishable key missing) — render coming soon
  return (
    <button
      disabled
      style={{
        width: '100%',
        padding: '1rem 2rem',
        background: 'color-mix(in oklab, var(--s-fg) 6%, transparent)',
        color: 'var(--s-fg-muted)',
        border: 'none',
        borderRadius: 'var(--s-radius-button)',
        fontSize: '13px',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        fontWeight: 600,
        fontFamily: 'var(--s-body-font)',
        cursor: 'not-allowed',
      }}
    >
      Coming soon
    </button>
  );
}

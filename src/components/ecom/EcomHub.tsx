'use client';

/* ═══════════════════════════════════════════════════════════════════
   EcomHub · the visible UI inside the marketing 04.4 Ecom card

   Sprint 3 redesign · production-grade hub:
   - Top status row: subdomain editor (live availability check) + Publish
   - Theme picker: 12 themes as visual cards (active highlighted, hover preview)
   - Payment connect: 3 large editorial cards with inline wizards
   - Live preview iframe (when published)

   Posts to /api/ecom/publish on save. PATCHes payment_config + theme_id
   on /api/ecom/storefront/[id] for non-subdomain edits.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import {
  Loader2,
  Check,
  ExternalLink,
  Copy,
  CreditCard,
  ShoppingBag,
  ImageIcon,
} from 'lucide-react';
import {
  ALL_THEME_IDS,
  type PaymentProvider,
  type ThemeId,
  type Storefront,
} from '@/types/storefront';

interface Props {
  collectionPlanId: string;
  collectionName?: string;
}

type ExistingStorefront = Pick<
  Storefront,
  'id' | 'subdomain' | 'theme_id' | 'payment_provider' | 'payment_config' | 'published_at'
>;

type CheckResp = { ok: boolean; reason?: string; message?: string; normalized?: string };
type PublishResp = {
  storefront?: { id: string; subdomain: string; theme_id: ThemeId; published_at: string | null };
  publicUrl?: string;
  error?: string;
  reason?: string;
  sslPending?: boolean;
  sslWarning?: string;
};

const THEME_META: Record<ThemeId, { name: string; mood: string; tagline: string }> = {
  'editorial-heritage':  { name: 'Editorial Heritage',  mood: 'Magazine premium · serif display', tagline: 'Whitespace and craft.' },
  'streetwear-drop':     { name: 'Streetwear Drop',     mood: 'Drop-driven · countdown hero',      tagline: 'Made for the launch.' },
  'romantic-feminine':   { name: 'Romantic Feminine',   mood: 'Pastel · italic serif lookbook',    tagline: 'Cinematic softness.' },
  'minimal-architect':   { name: 'Minimal Architect',   mood: 'Cero ornamento · grid estricto',    tagline: 'The product speaks.' },
  'performance-tech':    { name: 'Performance Tech',    mood: 'Mono + sans · data visible',        tagline: 'Engineered to move.' },
  'avant-garde-concept': { name: 'Avant-Garde Concept', mood: 'Asimetría · scroll narrative',      tagline: 'Convention is optional.' },
  'sustainable-craft':   { name: 'Sustainable Craft',   mood: 'Tonos tierra · maker focus',        tagline: 'Made by hand, with intent.' },
  'y2k-digital-native':  { name: 'Y2K Digital Native',  mood: 'Color saturado · sans bold',        tagline: 'Internet-native fashion.' },
  'workwear-heritage':   { name: 'Workwear Heritage',   mood: 'Khaki · slab serif · utilitario',   tagline: 'Built to outlast.' },
  'resort-luxe':         { name: 'Resort Luxe',         mood: 'Off-white · luz natural full-bleed',tagline: 'Slow horizons.' },
  'drop-lookbook':       { name: 'Drop Lookbook',       mood: 'Single page · scroll vertical',     tagline: 'A single moment, told well.' },
  'linkinbio-plus':      { name: 'Linkinbio Plus',      mood: 'Mobile-first · bio-link aesthetic', tagline: 'One screen, everything.' },
};

function suggestSubdomain(name?: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 32);
}

export function EcomHub({ collectionPlanId, collectionName }: Props) {
  const baseDomain = process.env.NEXT_PUBLIC_STOREFRONT_BASE_DOMAIN ?? 'aimily.shop';

  const [existing, setExisting] = useState<ExistingStorefront | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  const [subdomain, setSubdomain] = useState(suggestSubdomain(collectionName));
  const [themeId, setThemeId] = useState<ThemeId>('editorial-heritage');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('lookbook_only');
  const [paymentConfig, setPaymentConfig] = useState<Record<string, string>>({});

  const isPublished = Boolean(existing?.published_at);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/ecom/storefront-by-collection/${collectionPlanId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.storefront) return;
        const sf = data.storefront as ExistingStorefront;
        setExisting(sf);
        setSubdomain(sf.subdomain);
        setThemeId(sf.theme_id);
        setPaymentProvider(sf.payment_provider);
        setPaymentConfig((sf.payment_config as Record<string, string>) ?? {});
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [collectionPlanId]);

  const [check, setCheck] = useState<CheckResp | null>(null);
  const [checking, setChecking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResp | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);     // bump to refresh iframe

  useEffect(() => {
    if (!subdomain || subdomain.length < 4) {
      setCheck(null);
      return;
    }
    if (subdomain === existing?.subdomain) {
      setCheck({ ok: true, normalized: subdomain });
      return;
    }
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await fetch(
          `/api/ecom/check-subdomain?subdomain=${encodeURIComponent(subdomain)}${existing?.id ? `&storefrontId=${existing.id}` : ''}`,
        );
        setCheck(await res.json());
      } catch {
        setCheck({ ok: false, message: 'Network error' });
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [subdomain, existing?.id, existing?.subdomain]);

  const handlePublish = async () => {
    if (publishing || !check?.ok) return;
    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await fetch('/api/ecom/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionPlanId, subdomain, themeId, paymentProvider, paymentConfig }),
      });
      const data: PublishResp = await res.json();
      setPublishResult(res.ok ? data : { error: data.error ?? 'Publish failed' });
      if (res.ok) setPreviewKey((k) => k + 1);
    } catch {
      setPublishResult({ error: 'Network error' });
    } finally {
      setPublishing(false);
    }
  };

  const publicUrl = publishResult?.publicUrl ?? (isPublished && existing
    ? `https://${existing.subdomain}.${baseDomain}`
    : null);

  return (
    <div className="space-y-5">
      {/* HERO HEADER */}
      <div className="bg-white rounded-[20px] p-8 md:p-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2.5 mb-3">
              <ShoppingBag className="h-4 w-4 text-carbon/40" strokeWidth={1.75} />
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-carbon/45">
                Storefront generator
              </p>
            </div>
            <h2 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.03em] text-carbon leading-[1.1]">
              Turn this collection into a website that sells.
            </h2>
            <p className="text-[14px] text-carbon/55 mt-3 leading-[1.6]">
              Choose a theme, connect your Stripe or Shopify in one click. Aimily renders the storefront — you keep 100% of every sale.
            </p>
          </div>

          {/* Status pill */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-carbon/[0.04]">
            <span
              className={`w-2 h-2 rounded-full ${
                isPublished ? 'bg-[#5A7847]' : 'bg-carbon/30'
              }`}
            />
            <span className="text-[12px] font-medium text-carbon/65 tracking-[-0.01em]">
              {isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>
      </div>

      {/* SUBDOMAIN */}
      <div className="bg-white rounded-[20px] p-6 md:p-8">
        <div className="flex items-center gap-2.5 mb-4">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45">Subdomain</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={subdomain}
            onChange={(e) =>
              setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
            }
            placeholder="your-brand"
            maxLength={32}
            className="flex-1 text-[14px] text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] px-4 py-3 focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30"
          />
          <span className="text-[13px] text-carbon/45 font-mono whitespace-nowrap">.{baseDomain}</span>
        </div>
        <div className="mt-2 min-h-[20px]">
          {checking && (
            <span className="text-[12px] text-carbon/45 inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking…
            </span>
          )}
          {!checking && check?.ok && (
            <span className="text-[12px] text-[#5A7847] inline-flex items-center gap-1.5">
              <Check className="h-3 w-3" /> Available
            </span>
          )}
          {!checking && check && !check.ok && (
            <span className="text-[12px] text-[#A0463C]">{check.message}</span>
          )}
        </div>
      </div>

      {/* THEME PICKER */}
      <div className="bg-white rounded-[20px] p-6 md:p-8">
        <div className="flex items-center gap-2.5 mb-5">
          <ImageIcon className="h-4 w-4 text-carbon/40" strokeWidth={1.75} />
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45">Theme</p>
          <span className="text-[11px] text-carbon/35">12 editorial worlds · pick one</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {ALL_THEME_IDS.map((id) => {
            const meta = THEME_META[id];
            const active = themeId === id;
            return (
              <button
                key={id}
                onClick={() => setThemeId(id)}
                className={`group text-left p-5 rounded-[16px] transition-all duration-200 border ${
                  active
                    ? 'bg-carbon text-white border-carbon shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
                    : 'bg-carbon/[0.02] text-carbon border-carbon/[0.06] hover:bg-carbon/[0.05] hover:border-carbon/15'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className={`text-[15px] font-semibold tracking-[-0.02em] leading-tight ${active ? 'text-white' : 'text-carbon'}`}>
                    {meta.name}
                  </p>
                  {active && <Check className="h-4 w-4 text-white flex-shrink-0" strokeWidth={2.5} />}
                </div>
                <p className={`text-[11px] leading-[1.5] mb-2 ${active ? 'text-white/65' : 'text-carbon/55'}`}>
                  {meta.mood}
                </p>
                <p className={`text-[11px] italic leading-[1.5] ${active ? 'text-white/45' : 'text-carbon/40'}`}>
                  &ldquo;{meta.tagline}&rdquo;
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* PAYMENT CONNECT */}
      <div className="bg-white rounded-[20px] p-6 md:p-8">
        <div className="flex items-center gap-2.5 mb-5">
          <CreditCard className="h-4 w-4 text-carbon/40" strokeWidth={1.75} />
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45">Payment</p>
          <span className="text-[11px] text-carbon/35">Aimily never touches the money</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {([
            { id: 'lookbook_only' as const,     title: 'Lookbook only', desc: 'Publish without buy buttons. Great for pre-launch or invite-only.' },
            { id: 'stripe_buy_button' as const, title: 'Stripe',        desc: 'Indie default. Free Stripe account in 2 minutes — no code.' },
            { id: 'shopify_buy' as const,       title: 'Shopify',       desc: 'For brands already on Shopify. Catalog stays in your store.' },
          ]).map((p) => {
            const active = paymentProvider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPaymentProvider(p.id)}
                className={`text-left p-5 rounded-[14px] transition-all border ${
                  active
                    ? 'bg-carbon text-white border-carbon'
                    : 'bg-carbon/[0.02] text-carbon border-carbon/[0.06] hover:bg-carbon/[0.05] hover:border-carbon/15'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold tracking-[-0.01em]">{p.title}</span>
                  {active && <Check className="h-4 w-4 flex-shrink-0" strokeWidth={2.5} />}
                </div>
                <p className={`text-[11.5px] leading-[1.55] ${active ? 'text-white/65' : 'text-carbon/55'}`}>{p.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Wizard inline per provider */}
        {paymentProvider === 'stripe_buy_button' && (
          <div className="rounded-[14px] bg-carbon/[0.025] p-5 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-carbon/45 font-semibold">Stripe publishable key</p>
            <input
              value={paymentConfig.publishableKey ?? ''}
              onChange={(e) => setPaymentConfig({ ...paymentConfig, publishableKey: e.target.value })}
              placeholder="pk_live_..."
              className="w-full text-[13px] text-carbon bg-white rounded-[10px] border border-carbon/[0.08] px-3 py-2.5 focus:outline-none focus:border-carbon/25 transition-colors placeholder:text-carbon/30 font-mono"
            />
            <p className="text-[11.5px] text-carbon/55 leading-[1.55]">
              Get yours at <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer noopener" className="underline">dashboard.stripe.com/apikeys</a>. Per-SKU buy button IDs are configured in the SKU table (Sprint 4 inline edit).
            </p>
          </div>
        )}
        {paymentProvider === 'shopify_buy' && (
          <div className="rounded-[14px] bg-carbon/[0.025] p-5 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-carbon/45 font-semibold">Shopify shop domain</p>
            <input
              value={paymentConfig.shopDomain ?? ''}
              onChange={(e) => setPaymentConfig({ ...paymentConfig, shopDomain: e.target.value })}
              placeholder="your-store.myshopify.com"
              className="w-full text-[13px] text-carbon bg-white rounded-[10px] border border-carbon/[0.08] px-3 py-2.5 focus:outline-none focus:border-carbon/25 transition-colors placeholder:text-carbon/30 font-mono"
            />
            <p className="text-[11px] uppercase tracking-[0.18em] text-carbon/45 font-semibold pt-2">Storefront access token</p>
            <input
              value={paymentConfig.storefrontAccessToken ?? ''}
              onChange={(e) => setPaymentConfig({ ...paymentConfig, storefrontAccessToken: e.target.value })}
              placeholder="abcdef..."
              className="w-full text-[13px] text-carbon bg-white rounded-[10px] border border-carbon/[0.08] px-3 py-2.5 focus:outline-none focus:border-carbon/25 transition-colors placeholder:text-carbon/30 font-mono"
            />
            <p className="text-[11.5px] text-carbon/55 leading-[1.55]">
              In your Shopify admin → Apps → Develop apps → create a custom app with Storefront API access. Per-SKU product handles in SKU table.
            </p>
          </div>
        )}
        {paymentProvider === 'lookbook_only' && (
          <div className="rounded-[14px] bg-carbon/[0.025] p-5">
            <p className="text-[12px] text-carbon/65 leading-[1.55]">
              No payment provider needed. Your storefront publishes as a public lookbook with &ldquo;Coming soon&rdquo; CTAs on each PDP. Switch to Stripe or Shopify any time to enable checkout.
            </p>
          </div>
        )}
      </div>

      {/* PUBLISH */}
      <div className="bg-white rounded-[20px] p-6 md:p-8 text-center">
        <button
          onClick={handlePublish}
          disabled={!check?.ok || publishing}
          className={`inline-flex items-center gap-2 px-7 py-3 rounded-full text-[14px] font-semibold tracking-[-0.01em] transition-all ${
            check?.ok && !publishing
              ? 'bg-carbon text-white hover:bg-carbon/90 cursor-pointer'
              : 'bg-carbon/[0.06] text-carbon/30 cursor-not-allowed'
          }`}
        >
          {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
          {publishing ? 'Publishing…' : isPublished ? 'Republish' : 'Publish storefront'}
        </button>

        {publishResult?.error && (
          <p className="text-[13px] text-[#A0463C] mt-4">{publishResult.error}</p>
        )}
        {publishResult?.sslWarning && !publishResult.error && (
          <p className="text-[12px] text-[#A0463C] mt-3 italic">
            {publishResult.sslWarning}
          </p>
        )}

        {publicUrl && !publishResult?.error && (
          <div className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#C5CAA8]/30 text-carbon">
            <Check className="h-4 w-4" />
            <span className="text-[13px] font-medium">Live at</span>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[13px] font-mono underline hover:no-underline"
            >
              {publicUrl.replace('https://', '')}
            </a>
            <button
              onClick={async () => {
                try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
              }}
              className="ml-1 inline-flex items-center text-carbon/55 hover:text-carbon transition-colors"
              aria-label="Copy URL"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="ml-1 inline-flex items-center text-carbon/55 hover:text-carbon transition-colors"
              aria-label="Open"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* LIVE PREVIEW */}
      {publicUrl && !publishResult?.error && (
        <div className="bg-white rounded-[20px] p-3 md:p-4 overflow-hidden">
          <iframe
            key={previewKey}
            src={publicUrl}
            title="Storefront preview"
            className="w-full h-[640px] rounded-[16px] border border-carbon/[0.06]"
          />
        </div>
      )}
    </div>
  );
}

'use client';

/* ═══════════════════════════════════════════════════════════════════
   EcomHub · minimal MVP UI for the Ecom block

   Sprint 1 day 5 scope (intentionally narrow):
   - Subdomain input with live availability check
   - Theme picker (12 themes as labels for now, real previews in Sprint 2)
   - Payment provider radio (Stripe Buy Button / Shopify Buy SDK / Lookbook only)
   - Publish button → POST /api/ecom/publish
   - On success: shows live URL `https://<sub>.aimily.shop` with copy + visit
   - On failure: surfaces error message inline

   Sprint 2 will replace this with:
   - Visual theme picker (preview cards)
   - Inline edit of copy via storefront_overrides
   - Payment provider wizards (per-SKU IDs)
   - PreviewIframe with live theme apply
   - Custom domain config

   Plan: .planning/ecom/05-SPRINTS.md (Sprint 3 day 2-4 + Sprint 4 day 3)
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { ALL_THEME_IDS, type PaymentProvider, type ThemeId } from '@/types/storefront';
import { Loader2, Check, ExternalLink, Copy } from 'lucide-react';

interface Props {
  collectionPlanId: string;
  collectionName?: string;
}

interface CheckSubdomainResponse {
  ok: boolean;
  reason?: string;
  message?: string;
  normalized?: string;
}

interface PublishResponse {
  storefront?: { id: string; subdomain: string; theme_id: ThemeId; published_at: string | null };
  publicUrl?: string;
  error?: string;
  reason?: string;
}

const THEME_LABELS: Record<ThemeId, string> = {
  'editorial-heritage': 'Editorial Heritage',
  'streetwear-drop': 'Streetwear Drop',
  'romantic-feminine': 'Romantic Feminine',
  'minimal-architect': 'Minimal Architect',
  'performance-tech': 'Performance Tech',
  'avant-garde-concept': 'Avant-Garde Concept',
  'sustainable-craft': 'Sustainable Craft',
  'y2k-digital-native': 'Y2K Digital Native',
  'workwear-heritage': 'Workwear Heritage',
  'resort-luxe': 'Resort Luxe',
  'drop-lookbook': 'Drop Lookbook',
  'linkinbio-plus': 'Linkinbio Plus',
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
  const [subdomain, setSubdomain] = useState(() => suggestSubdomain(collectionName));
  const [themeId, setThemeId] = useState<ThemeId>('editorial-heritage');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('lookbook_only');

  const [subdomainCheck, setSubdomainCheck] = useState<CheckSubdomainResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Debounced live check
  useEffect(() => {
    if (!subdomain || subdomain.length < 4) {
      setSubdomainCheck(null);
      return;
    }
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await fetch(`/api/ecom/check-subdomain?subdomain=${encodeURIComponent(subdomain)}`);
        const data: CheckSubdomainResponse = await res.json();
        setSubdomainCheck(data);
      } catch {
        setSubdomainCheck({ ok: false, message: 'Network error' });
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [subdomain]);

  const handlePublish = async () => {
    if (publishing || !subdomainCheck?.ok) return;
    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await fetch('/api/ecom/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPlanId,
          subdomain,
          themeId,
          paymentProvider,
        }),
      });
      const data: PublishResponse = await res.json();
      if (!res.ok) {
        setPublishResult({ error: data.error ?? 'Publish failed' });
      } else {
        setPublishResult(data);
      }
    } catch {
      setPublishResult({ error: 'Network error' });
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!publishResult?.publicUrl) return;
    try {
      await navigator.clipboard.writeText(publishResult.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const canPublish = subdomainCheck?.ok && !publishing;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-[20px] p-6 md:p-8">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-carbon">Publish your storefront</h2>
        <p className="text-[13px] text-carbon/55 mt-2 leading-[1.6] max-w-2xl">
          Turn this collection into a public DTC website at <code className="text-carbon font-mono text-[12px]">&lt;sub&gt;.aimily.shop</code>.
          Connect your Stripe or Shopify in one click — aimily renders the storefront, your payment provider handles the rest.
        </p>
      </div>

      {/* Subdomain input */}
      <div className="bg-white rounded-[20px] p-6 md:p-8">
        <div className="flex items-center gap-2.5 mb-4">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45">Subdomain</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="your-brand"
            maxLength={32}
            className="flex-1 text-[14px] text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] px-4 py-3 focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30"
          />
          <span className="text-[13px] text-carbon/45 font-mono whitespace-nowrap">.aimily.shop</span>
        </div>
        <div className="mt-2 min-h-[20px]">
          {checking && (
            <span className="text-[12px] text-carbon/45 inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking…
            </span>
          )}
          {!checking && subdomainCheck?.ok && (
            <span className="text-[12px] text-[#5A7847] inline-flex items-center gap-1.5">
              <Check className="h-3 w-3" /> Available
            </span>
          )}
          {!checking && subdomainCheck && !subdomainCheck.ok && (
            <span className="text-[12px] text-[#A0463C]">{subdomainCheck.message}</span>
          )}
        </div>
      </div>

      {/* Theme picker */}
      <div className="bg-white rounded-[20px] p-6 md:p-8">
        <div className="flex items-center gap-2.5 mb-4">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45">Theme</p>
          <span className="text-[11px] text-carbon/35">Visual previews ship in Sprint 2</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {ALL_THEME_IDS.map((id) => {
            const active = themeId === id;
            return (
              <button
                key={id}
                onClick={() => setThemeId(id)}
                className={`text-left px-4 py-3 rounded-[12px] text-[13px] transition-all ${
                  active
                    ? 'bg-carbon text-white font-semibold'
                    : 'bg-carbon/[0.03] text-carbon/65 hover:bg-carbon/[0.06]'
                }`}
              >
                {THEME_LABELS[id]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment provider */}
      <div className="bg-white rounded-[20px] p-6 md:p-8">
        <div className="flex items-center gap-2.5 mb-4">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-carbon/45">Payment provider</p>
          <span className="text-[11px] text-carbon/35">aimily never processes payments</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { id: 'lookbook_only' as const, title: 'Lookbook only', desc: 'Publish without buy buttons. Great for pre-launch.' },
            { id: 'stripe_buy_button' as const, title: 'Stripe Buy Button', desc: 'For indie brands. Works with any free Stripe account.' },
            { id: 'shopify_buy' as const, title: 'Shopify Buy SDK', desc: 'For brands that already use Shopify.' },
          ]).map((p) => {
            const active = paymentProvider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPaymentProvider(p.id)}
                className={`text-left p-4 rounded-[14px] transition-all ${
                  active
                    ? 'bg-carbon text-white'
                    : 'bg-carbon/[0.03] text-carbon hover:bg-carbon/[0.06]'
                }`}
              >
                <div className="text-[13px] font-semibold mb-1.5">{p.title}</div>
                <div className={`text-[11.5px] leading-[1.5] ${active ? 'text-white/65' : 'text-carbon/55'}`}>{p.desc}</div>
              </button>
            );
          })}
        </div>
        {paymentProvider !== 'lookbook_only' && (
          <p className="text-[12px] text-carbon/45 mt-4 leading-[1.5]">
            Provider credentials and per-SKU buy buttons are configured in Sprint 2. Until then, the storefront publishes
            with placeholder &ldquo;Coming soon&rdquo; CTAs on each PDP.
          </p>
        )}
      </div>

      {/* Publish */}
      <div className="bg-white rounded-[20px] p-6 md:p-8 text-center">
        <button
          onClick={handlePublish}
          disabled={!canPublish}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-semibold tracking-[-0.01em] transition-all ${
            canPublish
              ? 'bg-carbon text-white hover:bg-carbon/90 cursor-pointer'
              : 'bg-carbon/[0.06] text-carbon/30 cursor-not-allowed'
          }`}
        >
          {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
          {publishing ? 'Publishing…' : publishResult?.publicUrl ? 'Republish' : 'Publish storefront'}
        </button>

        {publishResult?.error && (
          <p className="text-[13px] text-[#A0463C] mt-4">{publishResult.error}</p>
        )}

        {publishResult?.publicUrl && (
          <div className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#C5CAA8]/30 text-carbon">
            <Check className="h-4 w-4" />
            <span className="text-[13px] font-medium">Live at</span>
            <a
              href={publishResult.publicUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[13px] font-mono underline hover:no-underline"
            >
              {publishResult.publicUrl.replace('https://', '')}
            </a>
            <button
              onClick={handleCopyUrl}
              className="ml-1 inline-flex items-center text-carbon/55 hover:text-carbon transition-colors"
              aria-label="Copy URL"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href={publishResult.publicUrl}
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
    </div>
  );
}

'use client';

/**
 * 04.5 Ecom · channel hub (Sprint E)
 *
 * Reads marketing.sales_strategy.channels_activated and renders one card
 * per active channel (gold standard hub-of-cards pattern). Click a card
 * expands into the channel-specific publish flow:
 *
 *   · own_storefront   → existing EcomHub + SeoResearchHub + Overrides
 *   · tiktok_shop      → product feed CSV export + creator brief library (stub)
 *   · community_dm     → WhatsApp Catalog export + Bizum/Pix link gen (stub)
 *   · wholesale_b2b    → line-sheet PDF + order form (stub)
 *   · pop_ups_physical → pop-up calendar + POS setup (stub)
 *   · marketplaces     → Depop/Vinted/Etsy listings (stub)
 *
 * Empty state when no strategy confirmed: CTA to /marketing/creation?block=strategy
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Check,
  Store,
  Smartphone,
  MessageCircle,
  Building2,
  MapPin,
  ShoppingBag,
} from 'lucide-react';
import type { ChannelActivation, SalesChannelId } from '@/types/sales-strategy';
import { EcomHub } from '@/components/ecom/EcomHub';
import { SeoResearchHub } from '@/components/ecom/SeoResearchHub';
import { OverridesEditor } from '@/components/ecom/OverridesEditor';
import { SkuOverridesEditor } from '@/components/ecom/SkuOverridesEditor';
import { OrphanAssetsLinker } from '@/components/ecom/OrphanAssetsLinker';

interface EcomCardProps {
  collectionPlanId: string;
}

interface ChannelDef {
  id: SalesChannelId;
  name: string;
  description: string;
  Icon: React.ElementType;
  ctaLabel: string;
  ready: boolean; // true = full implementation · false = stub view
}

const CHANNEL_DEFS: ChannelDef[] = [
  {
    id: 'own_storefront',
    name: 'Tienda propia',
    description: 'Storefront en *.aimily.shop con 12 themes editoriales · publish flow + SEO research + inline edits.',
    Icon: Store,
    ctaLabel: 'Configurar tienda',
    ready: true,
  },
  {
    id: 'tiktok_shop',
    name: 'TikTok Shop',
    description: 'Product feed sync con TikTok Seller Center · creator brief library · UGC seeding kits per drop.',
    Icon: Smartphone,
    ctaLabel: 'Configurar TikTok Shop',
    ready: false,
  },
  {
    id: 'community_dm',
    name: 'Community DM',
    description: 'WhatsApp Business Catalog export · DM script library · Bizum/Pix link generator por SKU.',
    Icon: MessageCircle,
    ctaLabel: 'Configurar Community DM',
    ready: false,
  },
  {
    id: 'wholesale_b2b',
    name: 'Wholesale B2B',
    description: 'Line-sheet PDF · order form Joor/NuOrder · cost sheet interno · terms boilerplate Net30/60.',
    Icon: Building2,
    ctaLabel: 'Configurar Wholesale',
    ready: false,
  },
  {
    id: 'pop_ups_physical',
    name: 'Pop-ups físicos',
    description: 'Calendario de pop-ups · signage print-ready · POS setup · post-event reconciliation.',
    Icon: MapPin,
    ctaLabel: 'Configurar pop-ups',
    ready: false,
  },
  {
    id: 'marketplaces',
    name: 'Marketplaces',
    description: 'Listings auto-generados por marketplace · Depop · Vinted · Etsy · Grailed · Vestiaire.',
    Icon: ShoppingBag,
    ctaLabel: 'Configurar marketplaces',
    ready: false,
  },
];

interface EcomData {
  hasStrategy: boolean;
  channelsActivated: ChannelActivation[];
}

export function EcomCard({ collectionPlanId }: EcomCardProps) {
  const [data, setData] = useState<EcomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<SalesChannelId | null>(null);
  const [storefrontId, setStorefrontId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/sales-dashboard/data?cpId=${encodeURIComponent(collectionPlanId)}`,
        );
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const j = await res.json();
        const result = j.result as EcomData;
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setData({ hasStrategy: false, channelsActivated: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collectionPlanId]);

  // Storefront fetch (only if own_storefront is enabled)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/ecom/storefront-by-collection/${collectionPlanId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.storefront) setStorefrontId(json.storefront.id);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [collectionPlanId]);

  if (loading) {
    return (
      <div className="max-w-[640px] mx-auto py-20 text-center">
        <Loader2 className="h-6 w-6 mx-auto mb-4 text-carbon/30 animate-spin" />
        <p className="text-[14px] text-carbon/55">Cargando canales…</p>
      </div>
    );
  }

  if (!data || !data.hasStrategy) {
    return (
      <div className="bg-white rounded-[20px] p-16 md:p-20 text-center max-w-[760px] mx-auto">
        <span className="block text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em] mb-6">
          00.
        </span>
        <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-4">
          Primero define tus canales de venta
        </h3>
        <p className="text-[14px] text-carbon/50 leading-[1.7] mb-8 max-w-[480px] mx-auto">
          Cada canal activado en tu Estrategia de Venta aparece aquí como un publish flow específico.
        </p>
        <a
          href="?block=strategy"
          className="inline-flex items-center gap-2 py-2.5 px-7 rounded-full bg-carbon text-white text-[13px] font-semibold hover:bg-carbon/90 transition-all"
        >
          Ir a Estrategia de Venta
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  const enabledIds = new Set(
    data.channelsActivated.filter((c) => c.enabled).map((c) => c.channel),
  );
  const enabledChannels = CHANNEL_DEFS.filter((c) => enabledIds.has(c.id));

  if (enabledChannels.length === 0) {
    return (
      <div className="bg-white rounded-[20px] p-16 md:p-20 text-center max-w-[760px] mx-auto">
        <span className="block text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em] mb-6">
          00.
        </span>
        <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-4">
          No hay canales activados
        </h3>
        <p className="text-[14px] text-carbon/50 leading-[1.7] mb-8 max-w-[480px] mx-auto">
          Activa al menos un canal en tu Estrategia de Venta para empezar a publicar.
        </p>
        <a
          href="?block=strategy"
          className="inline-flex items-center gap-2 py-2.5 px-7 rounded-full bg-carbon text-white text-[13px] font-semibold hover:bg-carbon/90 transition-all"
        >
          Activar canales
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  // ── Channel-specific view ──
  if (activeChannel) {
    const channel = enabledChannels.find((c) => c.id === activeChannel);
    if (!channel) {
      setActiveChannel(null);
      return null;
    }
    return (
      <ChannelLanding
        channel={channel}
        collectionPlanId={collectionPlanId}
        storefrontId={storefrontId}
        onBack={() => setActiveChannel(null)}
      />
    );
  }

  // ── Hub view · grid of activated channel cards ──
  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-[20px] p-7 md:p-9"
      >
        <div className="flex items-baseline gap-4 mb-6">
          <span className="text-[44px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em] shrink-0">
            00.
          </span>
          <div>
            <h3 className="text-[20px] md:text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15]">
              {enabledChannels.length} canal{enabledChannels.length !== 1 ? 'es' : ''} activo{enabledChannels.length !== 1 ? 's' : ''}
            </h3>
            <p className="text-[13px] text-carbon/50 leading-[1.6] mt-1.5">
              Cada canal tiene su propio publish flow · plantillas auto-generadas + acciones T-N de tu Sales Dashboard se aterrizan aquí.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enabledChannels.map((c, i) => (
            <ChannelHubCard
              key={c.id}
              channel={c}
              index={i}
              onSelect={() => setActiveChannel(c.id)}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ── Hub card · gold standard ──────────────────────────────────────────────

function ChannelHubCard({
  channel,
  index,
  onSelect,
}: {
  channel: ChannelDef;
  index: number;
  onSelect: () => void;
}) {
  const Icon = channel.Icon;
  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      type="button"
      onClick={onSelect}
      className="group bg-shade rounded-[16px] p-6 ring-1 ring-carbon/[0.04] hover:ring-carbon/[0.18] hover:scale-[1.01] transition-all text-left flex flex-col min-h-[200px]"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl bg-white ring-1 ring-carbon/[0.06] flex items-center justify-center text-carbon/65">
          <Icon className="h-5 w-5" strokeWidth={1.6} />
        </div>
        {!channel.ready && (
          <span className="text-[9px] tracking-[0.12em] uppercase text-carbon/35 font-medium">
            Próximamente
          </span>
        )}
      </div>
      <h4 className="text-[16px] font-semibold text-carbon tracking-[-0.02em] leading-tight mb-2">
        {channel.name}
      </h4>
      <p className="text-[12px] text-carbon/55 leading-[1.5] mb-5 line-clamp-3">
        {channel.description}
      </p>
      <div className="mt-auto flex items-center justify-between text-[12px] font-semibold text-carbon group-hover:gap-2 transition-all gap-1.5">
        <span>{channel.ctaLabel}</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </motion.button>
  );
}

// ── Channel landing · per-channel view ────────────────────────────────────

function ChannelLanding({
  channel,
  collectionPlanId,
  storefrontId,
  onBack,
}: {
  channel: ChannelDef;
  collectionPlanId: string;
  storefrontId: string | null;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12px] text-carbon/50 hover:text-carbon transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a canales
        </button>
        <div className="text-right">
          <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/35">
            Canal activo
          </div>
          <div className="text-[14px] font-semibold text-carbon tracking-[-0.02em]">
            {channel.name}
          </div>
        </div>
      </div>

      {channel.id === 'own_storefront' && (
        <OwnStorefrontView collectionPlanId={collectionPlanId} storefrontId={storefrontId} />
      )}
      {channel.id === 'tiktok_shop' && <ChannelStubView channel={channel} />}
      {channel.id === 'community_dm' && <ChannelStubView channel={channel} />}
      {channel.id === 'wholesale_b2b' && <ChannelStubView channel={channel} />}
      {channel.id === 'pop_ups_physical' && <ChannelStubView channel={channel} />}
      {channel.id === 'marketplaces' && <ChannelStubView channel={channel} />}
    </div>
  );
}

function OwnStorefrontView({
  collectionPlanId,
  storefrontId,
}: {
  collectionPlanId: string;
  storefrontId: string | null;
}) {
  return (
    <div className="space-y-5">
      <EcomHub collectionPlanId={collectionPlanId} />
      <SeoResearchHub collectionPlanId={collectionPlanId} storefrontId={storefrontId} />
      <OverridesEditor storefrontId={storefrontId} />
      <SkuOverridesEditor collectionPlanId={collectionPlanId} storefrontId={storefrontId} />
      <OrphanAssetsLinker collectionPlanId={collectionPlanId} storefrontId={storefrontId} />
    </div>
  );
}

function ChannelStubView({ channel }: { channel: ChannelDef }) {
  const Icon = channel.Icon;
  return (
    <div className="bg-white rounded-[20px] p-12 md:p-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-carbon/[0.04] flex items-center justify-center mx-auto mb-6 text-carbon/55">
        <Icon className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <h3 className="text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-3">
        {channel.name}
      </h3>
      <p className="text-[13px] text-carbon/55 leading-relaxed mb-6 max-w-[520px] mx-auto">
        {channel.description}
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-carbon/[0.04] text-[11px] font-semibold tracking-[-0.01em] text-carbon/65">
        <Check className="h-3 w-3" />
        Plantillas auto-generadas listas en Sales Dashboard
      </div>
      <p className="text-[11px] text-carbon/40 mt-6 max-w-[520px] mx-auto leading-relaxed italic">
        El publish flow específico para este canal aterrizará aquí en próximas iteraciones. Por ahora, las acciones T-N (creator briefs, DM scripts, line-sheets, etc.) se generan desde el Sales Dashboard y se descargan/copian de cada modal.
      </p>
    </div>
  );
}

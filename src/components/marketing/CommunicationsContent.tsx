'use client';

/**
 * 04.3 Comunicación · gold standard rewrite (Sprint G v2)
 *
 * Felipe feedback: original Comms was basic + form-heavy + boring.
 * Marketing should be VISUAL + EXCITING. This rewrite mirrors the
 * Sales Dashboard pattern with hero sections, big numbers, library
 * of generated artifacts, and ad-hoc generators.
 *
 * Sections:
 *   01. Voz de marca · big card with creative.identity.voice + DNA
 *   02. Pilares de contenido · grid pillars
 *   03. Library de artefactos · scripts/copies generated from Action Timeline
 *   04. Generar ad-hoc · 4 generators one-click
 *
 * Reads from CIS + sales_actions + uses /api/marketing/generate/[type]
 * for one-click generation.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Loader2,
  ArrowRight,
  Wand2,
  Check,
  Mail,
  MessageCircle,
  Megaphone,
  PenTool,
  X as XIcon,
  Copy as CopyIcon,
} from 'lucide-react';
import type { ChannelActivation, SalesArchetypeId } from '@/types/sales-strategy';

interface ContextData {
  hasStrategy: boolean;
  archetype: { id: SalesArchetypeId; name: string } | null;
  channelsActivated: ChannelActivation[];
  brandName: string;
  brandTagline: string | null;
  brandVoice: string | null;
  brandTone: string | null;
  brandDo: string[];
  brandDont: string[];
  brandVocabulary: string[];
  drops: Array<{ id: string; drop_number: number; name: string; launch_date: string }>;
  pillars: Array<{ name: string; description: string }>;
}

interface GeneratedArtifact {
  type: string;
  format: 'json' | 'markdown';
  content: unknown;
  context: { dropName: string; archetype: string };
  title: string;
}

interface Props {
  collectionPlanId: string;
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({
  number,
  title,
  description,
  children,
  delay = 0,
}: {
  number: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="bg-white rounded-[20px] p-7 md:p-9"
    >
      <div className="mb-6 flex items-baseline gap-4">
        <span className="text-[44px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em] shrink-0">
          {number}.
        </span>
        <div>
          <h3 className="text-[20px] md:text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15]">
            {title}
          </h3>
          {description && (
            <p className="text-[13px] text-carbon/50 leading-[1.6] tracking-[-0.02em] mt-1.5 max-w-[640px]">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

// ── Modal preview ─────────────────────────────────────────────────────────

function ArtifactPreviewModal({
  artifact,
  onClose,
}: {
  artifact: GeneratedArtifact;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const contentString =
    artifact.format === 'markdown'
      ? (artifact.content as string)
      : JSON.stringify(artifact.content, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contentString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-carbon/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-[20px] max-w-[860px] w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-4 border-b border-carbon/[0.06]">
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-1">
              {artifact.context.dropName}
            </div>
            <h3 className="text-[20px] font-semibold text-carbon tracking-[-0.03em]">
              {artifact.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full bg-carbon/[0.04] hover:bg-carbon/[0.08] flex items-center justify-center text-carbon/55 transition-colors"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-5">
          <pre className="text-[13px] text-carbon/85 leading-[1.7] font-sans whitespace-pre-wrap break-words tracking-[-0.01em]">
            {contentString}
          </pre>
        </div>
        <div className="flex items-center justify-end gap-2 px-7 py-4 border-t border-carbon/[0.06] bg-shade">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold border border-carbon/[0.12] text-carbon/70 hover:bg-white transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold bg-carbon text-white hover:bg-carbon/90 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Voz de marca card ─────────────────────────────────────────────────────

function VozSection({ data }: { data: ContextData }) {
  const hasVoice = !!(data.brandVoice || data.brandTone);
  return (
    <Section
      number="01"
      title={data.brandName ? `Voz de ${data.brandName}` : 'Voz de marca'}
      description="La voz que aimily usa para auto-generar press releases, scripts, emails y creator briefs. Si la cambias, todo lo que se genere a partir de aquí cambia."
      delay={0.05}
    >
      {hasVoice ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-shade rounded-[14px] p-6">
            <div className="text-[10px] tracking-[0.12em] uppercase text-carbon/40 font-medium mb-3">
              Personalidad
            </div>
            <p className="text-[16px] text-carbon font-medium tracking-[-0.02em] leading-relaxed">
              {data.brandVoice || 'Sin definir'}
            </p>
            {data.brandTone && (
              <p className="text-[12px] text-carbon/55 italic mt-3 leading-relaxed">
                Tono · {data.brandTone}
              </p>
            )}
          </div>
          <div className="bg-shade rounded-[14px] p-6">
            <div className="text-[10px] tracking-[0.12em] uppercase text-carbon/40 font-medium mb-3">
              ✓ Sí decimos
            </div>
            <ul className="space-y-2">
              {data.brandDo.length > 0 ? (
                data.brandDo.slice(0, 6).map((d, i) => (
                  <li key={i} className="text-[12px] text-carbon/75 leading-snug">
                    · {d}
                  </li>
                ))
              ) : (
                <li className="text-[12px] italic text-carbon/35">Sin reglas definidas</li>
              )}
            </ul>
          </div>
          <div className="bg-shade rounded-[14px] p-6">
            <div className="text-[10px] tracking-[0.12em] uppercase text-carbon/40 font-medium mb-3">
              ✗ Nunca decimos
            </div>
            <ul className="space-y-2">
              {data.brandDont.length > 0 ? (
                data.brandDont.slice(0, 6).map((d, i) => (
                  <li key={i} className="text-[12px] text-carbon/75 leading-snug">
                    · {d}
                  </li>
                ))
              ) : (
                <li className="text-[12px] italic text-carbon/35">Sin reglas definidas</li>
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-shade rounded-[14px] p-8 text-center">
          <p className="text-[13px] text-carbon/55 leading-relaxed mb-4">
            La voz de marca de tu colección viene de Block 1 · Identidad de Marca. Confírmala ahí y volverá llena aquí.
          </p>
          <a
            href="../creative?block=brand-dna"
            className="inline-flex items-center gap-2 py-2 px-5 rounded-full bg-carbon text-white text-[12px] font-semibold hover:bg-carbon/90 transition-all"
          >
            Definir voz en Block 1
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      )}

      {data.brandVocabulary.length > 0 && (
        <div className="mt-5 pt-5 border-t border-carbon/[0.06]">
          <div className="text-[10px] tracking-[0.12em] uppercase text-carbon/40 font-medium mb-3">
            Vocabulario clave
          </div>
          <div className="flex flex-wrap gap-2">
            {data.brandVocabulary.map((v, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1 rounded-full bg-carbon/[0.04] text-[12px] font-medium text-carbon/75"
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

// ── Pilares de contenido ──────────────────────────────────────────────────

function PilaresSection({ data }: { data: ContextData }) {
  const hasArchetype = !!data.archetype;
  // Default pillars per archetype
  const defaultPillars: Record<SalesArchetypeId, Array<{ name: string; description: string }>> = {
    A: [
      { name: 'Editorial product', description: 'Lookbook + storytelling editorial · 50% del feed' },
      { name: 'Social proof', description: 'UGC + reviews + retail moments · 25%' },
      { name: 'Voz de marca', description: 'Manifesto + behind-the-scenes · 15%' },
      { name: 'Promociones', description: 'Drops + ediciones limitadas · 10%' },
    ],
    B: [
      { name: 'Founder persona', description: 'Vlogs + IG Stories del founder · 40%' },
      { name: 'Drop teasers', description: 'Countdown + reveals + sold-out posts · 30%' },
      { name: 'Audience interactions', description: 'Q&A + polls + replies · 20%' },
      { name: 'Lifestyle context', description: 'Founder en su vida real · 10%' },
    ],
    C: [
      { name: 'Atelier process', description: 'Behind-the-scenes craft + materiales · 40%' },
      { name: 'Editorial press', description: 'Vogue/BoF features + lookbook · 30%' },
      { name: 'Waitlist anticipation', description: 'Drops + pre-order moments · 20%' },
      { name: 'Founder/atelier story', description: 'Quién hay detrás · 10%' },
    ],
  };
  const pillars = data.pillars.length > 0
    ? data.pillars
    : hasArchetype
    ? defaultPillars[data.archetype!.id]
    : [];

  return (
    <Section
      number="02"
      title="Pilares de contenido"
      description={hasArchetype
        ? `Mix recomendado para ${data.archetype?.name} · cuatro pilares + reparto sugerido del feed.`
        : 'Define tu archetype primero en 04.0 Estrategia de Venta para ver pilares recomendados.'}
      delay={0.1}
    >
      {pillars.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.04 }}
              className="bg-shade rounded-[14px] p-5 ring-1 ring-carbon/[0.04]"
            >
              <div className="text-[10px] tracking-[0.12em] uppercase text-carbon/40 font-semibold mb-2 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </div>
              <h4 className="text-[15px] font-semibold text-carbon tracking-[-0.02em] leading-tight mb-2">
                {p.name}
              </h4>
              <p className="text-[12px] text-carbon/55 leading-relaxed">
                {p.description}
              </p>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-shade rounded-[14px] p-6 text-center">
          <p className="text-[13px] text-carbon/55">
            Confirma tu archetype para ver pilares por defecto.
          </p>
        </div>
      )}
    </Section>
  );
}

// ── Generators ad-hoc · 4 cards ───────────────────────────────────────────

interface QuickGenerator {
  type: 'press-release' | 'creator-brief' | 'email-teaser' | 'dm-announcement';
  title: string;
  description: string;
  Icon: React.ElementType;
  available: (data: ContextData) => boolean;
}

const QUICK_GENERATORS: QuickGenerator[] = [
  {
    type: 'press-release',
    title: 'Press release',
    description: 'Anuncio editorial para prensa · brand voice + lineup + drop date.',
    Icon: Megaphone,
    available: () => true,
  },
  {
    type: 'email-teaser',
    title: 'Email teaser',
    description: 'Subject lines + body + CTA · drop teaser para tu VIP list.',
    Icon: Mail,
    available: () => true,
  },
  {
    type: 'creator-brief',
    title: 'Creator brief',
    description: 'Brief 8-secciones para 10-12 micro-creators TikTok Shop.',
    Icon: PenTool,
    available: (d) => d.channelsActivated.some((c) => c.enabled && c.channel === 'tiktok_shop'),
  },
  {
    type: 'dm-announcement',
    title: 'DM broadcast',
    description: '5 mensajes para WhatsApp/IG DM + voice note 45s.',
    Icon: MessageCircle,
    available: (d) => d.channelsActivated.some((c) => c.enabled && c.channel === 'community_dm'),
  },
];

function QuickGeneratorsSection({
  data,
  generating,
  onGenerate,
}: {
  data: ContextData;
  generating: string | null;
  onGenerate: (gen: QuickGenerator) => void;
}) {
  return (
    <Section
      number="03"
      title="Generar ad-hoc"
      description="Un click → aimily produce el artefacto con tu Brand DNA + drop más cercano. Listos para copiar/editar/publicar."
      delay={0.15}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_GENERATORS.map((g, i) => {
          const Icon = g.Icon;
          const isAvailable = g.available(data);
          const isGenerating = generating === g.type;
          return (
            <motion.button
              key={g.type}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              type="button"
              onClick={() => isAvailable && !isGenerating && onGenerate(g)}
              disabled={!isAvailable || isGenerating}
              className={`bg-shade rounded-[14px] p-5 ring-1 ring-carbon/[0.04] text-left transition-all flex flex-col min-h-[200px] ${
                isAvailable
                  ? 'hover:ring-carbon/[0.18] hover:scale-[1.01] cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-white ring-1 ring-carbon/[0.06] flex items-center justify-center mb-4 text-carbon/65">
                <Icon className="h-5 w-5" strokeWidth={1.6} />
              </div>
              <h4 className="text-[15px] font-semibold text-carbon tracking-[-0.02em] leading-tight mb-2">
                {g.title}
              </h4>
              <p className="text-[12px] text-carbon/55 leading-relaxed mb-4 flex-1">
                {g.description}
              </p>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-carbon/55" />
                    <span className="text-carbon/55">Generando…</span>
                  </>
                ) : !isAvailable ? (
                  <span className="text-carbon/35 text-[11px]">
                    Activa el canal en 04.0
                  </span>
                ) : (
                  <>
                    <Wand2 className="h-3 w-3 text-carbon" />
                    <span className="text-carbon">Generar</span>
                  </>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </Section>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="bg-white rounded-[20px] p-16 md:p-20 text-center max-w-[760px] mx-auto">
      <span className="block text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em] mb-6">
        00.
      </span>
      <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-4">
        Primero define tu estrategia
      </h3>
      <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em] mb-8 max-w-[480px] mx-auto">
        La comunicación se construye desde tu archetype + canales activos. Confirma 04.0 Estrategia de Venta y vuelve aquí.
      </p>
      <a
        href="?block=strategy"
        className="inline-flex items-center gap-2 py-2.5 px-7 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 transition-all"
      >
        Ir a Estrategia de Venta
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export function CommunicationsContent({ collectionPlanId }: Props) {
  const [data, setData] = useState<ContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<GeneratedArtifact | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Sales-dashboard data API has hasStrategy + archetype + channels + drops
        const dashRes = await fetch(`/api/sales-dashboard/data?cpId=${encodeURIComponent(collectionPlanId)}`);
        if (!dashRes.ok) throw new Error(`Error ${dashRes.status}`);
        const dashJson = await dashRes.json();
        const d = dashJson.result;

        // Brand profile (Block 1 identity)
        const brandRes = await fetch(`/api/brand-profiles?planId=${encodeURIComponent(collectionPlanId)}`);
        const brandData = brandRes.ok ? await brandRes.json() : null;

        // Voice config (brand_voice_config table)
        const voiceRes = await fetch(`/api/brand-voice-config?planId=${encodeURIComponent(collectionPlanId)}`);
        const voiceData = voiceRes.ok ? await voiceRes.json() : null;

        const ctx: ContextData = {
          hasStrategy: !!d.hasStrategy,
          archetype: d.archetype,
          channelsActivated: d.channelsActivated || [],
          brandName: brandData?.brand_name || d.archetype?.name || 'Tu marca',
          brandTagline: brandData?.tagline || null,
          brandVoice: voiceData?.personality || brandData?.voice_personality || null,
          brandTone: voiceData?.tone || brandData?.voice_tone || null,
          brandDo: voiceData?.do_rules || [],
          brandDont: voiceData?.dont_rules || [],
          brandVocabulary: voiceData?.vocabulary || [],
          drops: d.drops || [],
          pillars: [],
        };

        if (!cancelled) setData(ctx);
      } catch (err) {
        console.error('[Comms] load failed', err);
        if (!cancelled) setData({
          hasStrategy: false,
          archetype: null,
          channelsActivated: [],
          brandName: 'Tu marca',
          brandTagline: null,
          brandVoice: null,
          brandTone: null,
          brandDo: [],
          brandDont: [],
          brandVocabulary: [],
          drops: [],
          pillars: [],
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collectionPlanId]);

  const handleGenerate = useCallback(
    async (gen: QuickGenerator) => {
      if (!data) return;
      setGenerating(gen.type);
      try {
        const dropTarget = data.drops.find((d) => new Date(d.launch_date).getTime() >= Date.now()) || data.drops[0];
        const res = await fetch(`/api/marketing/generate/${gen.type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collectionPlanId,
            dropId: dropTarget?.id,
            language: 'es',
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Error ${res.status}`);
        }
        const j = await res.json();
        setArtifact({
          type: j.result.type,
          format: j.result.format,
          content: j.result.content,
          context: {
            dropName: j.result.context?.dropName || 'Drop',
            archetype: j.result.context?.archetype || '',
          },
          title: gen.title,
        });
      } catch (err) {
        console.error('[Comms generate]', err);
        alert(err instanceof Error ? err.message : 'Error al generar');
      } finally {
        setGenerating(null);
      }
    },
    [collectionPlanId, data],
  );

  if (loading) {
    return (
      <div className="max-w-[640px] mx-auto py-20 text-center">
        <Loader2 className="h-6 w-6 mx-auto mb-4 text-carbon/30 animate-spin" />
        <p className="text-[14px] text-carbon/55">Cargando comunicación…</p>
      </div>
    );
  }

  if (!data || !data.hasStrategy) return <EmptyState />;

  return (
    <div className="space-y-4 pb-12">
      <VozSection data={data} />
      <PilaresSection data={data} />
      <QuickGeneratorsSection data={data} generating={generating} onGenerate={handleGenerate} />

      {artifact && <ArtifactPreviewModal artifact={artifact} onClose={() => setArtifact(null)} />}
    </div>
  );
}

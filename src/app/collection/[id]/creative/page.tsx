'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check, User, Sparkles, Image, Fingerprint, Globe, Microscope, Radio, Building2, X, Loader2, Upload, ExternalLink, Palette, Type, Mic } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════
   Creative & Brand Block — 3-Step Flow
   Vision → Research → Synthesis
   Expand/Collapse animation: click START → block fills grid,
   others collapse to icons. Confirm → back to 2x2.
   ═══════════════════════════════════════════════════════════ */

interface MiniBlock {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  icon: React.ElementType;
  available: boolean;
}

type InputMode = 'free' | 'assisted' | 'ai';

interface BlockData {
  [blockId: string]: {
    mode: InputMode;
    confirmed: boolean;
    data: Record<string, unknown>;
  };
}

const STEPS = [
  {
    id: 'vision',
    name: 'Creative Vision',
    nameEs: 'Visión Creativa',
    description: 'Define your consumer, collection vibe, moodboard, and brand DNA',
    blocks: [
      { id: 'consumer', name: 'Consumer Definition', nameEs: 'Definición de Consumidor', description: 'Define your target consumer profiles with AI-assisted personas', icon: User, available: true },
      { id: 'vibe', name: 'Collection Vibe', nameEs: 'Vibe de la Colección', description: 'Set the spirit and creative direction of the collection', icon: Sparkles, available: true },
      { id: 'moodboard', name: 'Moodboard', nameEs: 'Moodboard', description: 'Upload photos or connect Pinterest for visual references', icon: Image, available: true },
      { id: 'brand-dna', name: 'Brand DNA', nameEs: 'Identidad de Marca', description: 'Extract or create your brand identity — logo, colors, typography, tone', icon: Fingerprint, available: true },
    ] as MiniBlock[],
  },
  {
    id: 'research',
    name: 'Market Research',
    nameEs: 'Investigación de Mercado',
    description: 'Explore trends, signals, and competitive landscape',
    blocks: [
      { id: 'global-trends', name: 'Global Trends', nameEs: 'Tendencias Globales', description: 'Macro-trends from runways for your season', icon: Globe, available: true },
      { id: 'deep-dive', name: 'Deep Dive', nameEs: 'Deep Dive', description: 'Micro-trends by product type, market, and season', icon: Microscope, available: true },
      { id: 'live-signals', name: 'Live Signals', nameEs: 'Señales en Vivo', description: 'Viral trends from social media right now', icon: Radio, available: true },
      { id: 'competitors', name: 'Competitors & References', nameEs: 'Competencia y Referencia', description: 'Analyze competitor brands and positioning', icon: Building2, available: true },
    ] as MiniBlock[],
  },
  {
    id: 'synthesis',
    name: 'Creative Synthesis',
    nameEs: 'Síntesis Creativa',
    description: 'Consolidated creative input — vision + selected trends ready for the next block',
    blocks: [] as MiniBlock[],
  },
];

const INPUT_MODES: { id: InputMode; label: string; description: string }[] = [
  { id: 'free', label: 'Libre', description: 'You fill everything manually' },
  { id: 'assisted', label: 'Asistido', description: 'Give direction, AI complements' },
  { id: 'ai', label: 'Propuesta IA', description: 'Minimal input, AI generates proposals' },
];

/* ─── Expanded Block Content Components ─── */

function ConsumerContent({ mode, data, onChange }: { mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const [generating, setGenerating] = useState(false);

  return (
    <div className="space-y-6">
      {/* Mode-specific UI */}
      {mode === 'free' && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
              Target Consumer Profile
            </label>
            <textarea
              value={(data.profile as string) || ''}
              onChange={(e) => onChange({ ...data, profile: e.target.value })}
              placeholder="Describe your target consumer — demographics, lifestyle, preferences, buying behavior..."
              className="w-full h-40 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed placeholder:text-carbon/40"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
              Age Range
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                value={(data.ageMin as string) || ''}
                onChange={(e) => onChange({ ...data, ageMin: e.target.value })}
                placeholder="Min"
                className="w-24 px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
              />
              <span className="text-carbon/20 self-center">—</span>
              <input
                type="number"
                value={(data.ageMax as string) || ''}
                onChange={(e) => onChange({ ...data, ageMax: e.target.value })}
                placeholder="Max"
                className="w-24 px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
              Key Markets
            </label>
            <input
              type="text"
              value={(data.markets as string) || ''}
              onChange={(e) => onChange({ ...data, markets: e.target.value })}
              placeholder="e.g. Southern Europe, Urban professionals, Gen Z..."
              className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
            />
          </div>
        </div>
      )}

      {mode === 'assisted' && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
              Direction & Keywords
            </label>
            <textarea
              value={(data.keywords as string) || ''}
              onChange={(e) => onChange({ ...data, keywords: e.target.value })}
              placeholder="Give direction — e.g. 'urban millennials, sustainability-conscious, mid-range luxury, European market'..."
              className="w-full h-28 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed placeholder:text-carbon/40"
            />
          </div>
          <button
            onClick={() => {
              setGenerating(true);
              setTimeout(() => {
                onChange({
                  ...data,
                  profile: `Based on your direction "${(data.keywords as string) || '...'}", your target consumer is a 28-38 year old urban professional who values quality over quantity. They shop consciously, prefer brands with a clear identity, and are willing to invest in pieces that last. Active on Instagram, follows fashion micro-influencers, and discovers brands through curated content rather than mass advertising.`,
                });
                setGenerating(false);
              }, 1500);
            }}
            disabled={generating || !(data.keywords as string)?.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Expand with AI
          </button>
          {(data.profile as string) && (
            <div className="mt-4">
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
                AI-Generated Profile <span className="text-carbon/40">(editable)</span>
              </label>
              <textarea
                value={(data.profile as string) || ''}
                onChange={(e) => onChange({ ...data, profile: e.target.value })}
                className="w-full h-32 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed"
              />
            </div>
          )}
        </div>
      )}

      {mode === 'ai' && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
              Minimal Reference
            </label>
            <input
              type="text"
              value={(data.reference as string) || ''}
              onChange={(e) => onChange({ ...data, reference: e.target.value })}
              placeholder="e.g. 'young professionals in Spain' or 'streetwear enthusiasts'..."
              className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
            />
          </div>
          <button
            onClick={() => {
              setGenerating(true);
              setTimeout(() => {
                onChange({
                  ...data,
                  proposals: [
                    { title: 'The Urban Creative', desc: 'Ages 25-35, urban professionals in creative industries. Values unique design and sustainable production. Shops online and in curated boutiques. €150-400 average basket.' },
                    { title: 'The Conscious Minimalist', desc: 'Ages 28-40, values quality over quantity. Capsule wardrobe approach, earth tones, natural materials. Willing to pay premium for ethical brands. €200-500 average basket.' },
                    { title: 'The Trend-Aware Professional', desc: 'Ages 22-32, follows fashion closely but adapts trends to their lifestyle. Active on social media, influenced by micro-influencers. €100-300 average basket.' },
                    { title: 'The Heritage Seeker', desc: 'Ages 30-45, appreciates craftsmanship and brand story. Loyal to brands, buys seasonally. Prefers physical stores and personal attention. €250-600 average basket.' },
                  ],
                  selectedProposal: null,
                });
                setGenerating(false);
              }, 2000);
            }}
            disabled={generating || !(data.reference as string)?.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate Consumer Profiles
          </button>
          {(data.proposals as Array<{ title: string; desc: string }>)?.map((p, i) => (
            <button
              key={i}
              onClick={() => onChange({ ...data, selectedProposal: i, profile: p.desc })}
              className={`w-full text-left p-5 border transition-all ${
                (data.selectedProposal as number) === i
                  ? 'border-carbon bg-carbon/[0.03]'
                  : 'border-carbon/[0.08] hover:border-carbon/20'
              }`}
            >
              <div className="text-sm font-medium text-carbon mb-1">{p.title}</div>
              <div className="text-xs text-carbon/80 leading-relaxed">{p.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VibeContent({ mode, data, onChange }: { mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const [generating, setGenerating] = useState(false);

  return (
    <div className="space-y-6">
      {mode === 'free' && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
              Collection Spirit & Direction
            </label>
            <textarea
              value={(data.vibe as string) || ''}
              onChange={(e) => onChange({ ...data, vibe: e.target.value })}
              placeholder="Describe the spirit of your collection — what feeling should it evoke? What world does it live in?..."
              className="w-full h-40 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed placeholder:text-carbon/40"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
              Keywords
            </label>
            <input
              type="text"
              value={(data.keywords as string) || ''}
              onChange={(e) => onChange({ ...data, keywords: e.target.value })}
              placeholder="e.g. raw, industrial, feminine, deconstructed, nostalgic..."
              className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
            />
          </div>
        </div>
      )}

      {mode === 'assisted' && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
              Direction & Keywords
            </label>
            <textarea
              value={(data.direction as string) || ''}
              onChange={(e) => onChange({ ...data, direction: e.target.value })}
              placeholder="Give a few keywords or a brief direction — e.g. '90s minimalism meets Mediterranean warmth'..."
              className="w-full h-24 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed placeholder:text-carbon/40"
            />
          </div>
          <button
            onClick={() => {
              setGenerating(true);
              setTimeout(() => {
                onChange({
                  ...data,
                  vibe: `Rooted in ${(data.direction as string) || '...'} — the collection channels a quiet confidence. Think sun-bleached linen against terracotta, the effortless elegance of a late afternoon on the coast. Each piece tells a story of understated luxury, where craftsmanship speaks louder than logos. The palette is muted but warm, the silhouettes relaxed but intentional.`,
                  keywords: 'Mediterranean, understated luxury, sun-bleached, linen, warmth, craftsmanship, effortless',
                });
                setGenerating(false);
              }, 1500);
            }}
            disabled={generating || !(data.direction as string)?.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Build Narrative
          </button>
          {(data.vibe as string) && (
            <div>
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
                AI-Generated Narrative <span className="text-carbon/40">(editable)</span>
              </label>
              <textarea
                value={(data.vibe as string) || ''}
                onChange={(e) => onChange({ ...data, vibe: e.target.value })}
                className="w-full h-32 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed"
              />
            </div>
          )}
        </div>
      )}

      {mode === 'ai' && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
              Minimal Reference
            </label>
            <input
              type="text"
              value={(data.reference as string) || ''}
              onChange={(e) => onChange({ ...data, reference: e.target.value })}
              placeholder="e.g. 'sporty elegance' or 'coastal Italian summer'..."
              className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
            />
          </div>
          <button
            onClick={() => {
              setGenerating(true);
              setTimeout(() => {
                onChange({
                  ...data,
                  proposals: [
                    { title: 'Coastal Serenity', vibe: 'A sun-drenched palette of sand, sky, and sea salt. Relaxed silhouettes in natural fabrics. The feeling of bare feet on warm stone.', keywords: 'coastal, serene, natural, Mediterranean, warm neutrals' },
                    { title: 'Urban Poetry', vibe: 'The rhythm of the city captured in fabric. Structured yet fluid, dark yet luminous. For the person who finds beauty in concrete and rain.', keywords: 'urban, poetic, structured, dark palette, contemporary' },
                    { title: 'Botanical Luxe', vibe: 'Where garden party meets art gallery. Rich botanical prints on luxurious fabrics. A celebration of nature through sophisticated lenses.', keywords: 'botanical, luxe, prints, rich colors, sophisticated' },
                  ],
                  selectedProposal: null,
                });
                setGenerating(false);
              }, 2000);
            }}
            disabled={generating || !(data.reference as string)?.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate Vibes
          </button>
          {(data.proposals as Array<{ title: string; vibe: string; keywords: string }>)?.map((p, i) => (
            <button
              key={i}
              onClick={() => onChange({ ...data, selectedProposal: i, vibe: p.vibe, keywords: p.keywords })}
              className={`w-full text-left p-5 border transition-all ${
                (data.selectedProposal as number) === i
                  ? 'border-carbon bg-carbon/[0.03]'
                  : 'border-carbon/[0.08] hover:border-carbon/20'
              }`}
            >
              <div className="text-sm font-medium text-carbon mb-1">{p.title}</div>
              <div className="text-xs text-carbon/80 leading-relaxed">{p.vibe}</div>
              <div className="text-[10px] text-carbon/50 mt-2 tracking-wide">{p.keywords}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MoodboardContent({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const images = (data.images as string[]) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-carbon/[0.1] hover:border-carbon/20 transition-colors min-h-[180px]"
        >
          <Upload className="h-6 w-6 text-carbon/30" />
          <span className="text-[11px] font-medium tracking-[0.1em] uppercase text-carbon/70">Upload Photos</span>
          <span className="text-[10px] text-carbon/50">Drag & drop or click</span>
        </button>
        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => {
          const files = e.target.files;
          if (!files) return;
          const newImages = Array.from(files).map((f) => URL.createObjectURL(f));
          onChange({ ...data, images: [...images, ...newImages] });
        }} />

        {/* Pinterest */}
        <button className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-carbon/[0.1] hover:border-carbon/20 transition-colors min-h-[180px]">
          <ExternalLink className="h-6 w-6 text-carbon/30" />
          <span className="text-[11px] font-medium tracking-[0.1em] uppercase text-carbon/70">Connect Pinterest</span>
          <span className="text-[10px] text-carbon/50">Select from boards</span>
        </button>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative aspect-square bg-carbon/[0.04] overflow-hidden group">
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => onChange({ ...data, images: images.filter((_, j) => j !== i) })}
                className="absolute top-1 right-1 w-5 h-5 bg-carbon/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <p className="text-xs text-carbon/60 text-center py-4">No images yet. Upload photos or connect Pinterest to build your moodboard.</p>
      )}
    </div>
  );
}

function BrandDNAContent({ mode, data, onChange }: { mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const [generating, setGenerating] = useState(false);
  const hasBrand = data.hasBrand as boolean | undefined;

  if (hasBrand === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-6">
        <p className="text-sm text-carbon text-center max-w-sm">
          Do you already have a brand, or would you like to start from scratch?
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => onChange({ ...data, hasBrand: true })}
            className="px-6 py-3 text-[11px] font-medium tracking-[0.1em] uppercase border border-carbon text-carbon hover:bg-carbon hover:text-crema transition-colors"
          >
            I have a brand
          </button>
          <button
            onClick={() => onChange({ ...data, hasBrand: false })}
            className="px-6 py-3 text-[11px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.12] text-carbon/50 hover:border-carbon/30 hover:text-carbon transition-colors"
          >
            Start from scratch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasBrand ? (
        /* Existing Brand */
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
                Instagram
              </label>
              <input
                type="text"
                value={(data.instagram as string) || ''}
                onChange={(e) => onChange({ ...data, instagram: e.target.value })}
                placeholder="@yourbrand"
                className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
                Website
              </label>
              <input
                type="text"
                value={(data.website as string) || ''}
                onChange={(e) => onChange({ ...data, website: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
              />
            </div>
          </div>
          <button
            onClick={() => {
              setGenerating(true);
              setTimeout(() => {
                onChange({
                  ...data,
                  extracted: true,
                  brandName: 'Your Brand',
                  colors: ['#2C2C2C', '#F5E6D3', '#8B7355', '#D4C5B2'],
                  tone: 'Sophisticated, warm, understated luxury',
                  typography: 'Serif headlines, sans-serif body — classic editorial',
                });
                setGenerating(false);
              }, 2000);
            }}
            disabled={generating || (!(data.instagram as string)?.trim() && !(data.website as string)?.trim())}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Extract Brand DNA
          </button>

          {(data.extracted as boolean) && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-medium tracking-[0.1em] uppercase text-carbon/40 w-20">Colors</label>
                <div className="flex gap-2">
                  {(data.colors as string[])?.map((c, i) => (
                    <div key={i} className="w-8 h-8 border border-carbon/[0.08]" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <label className="text-[11px] font-medium tracking-[0.1em] uppercase text-carbon/40 w-20 pt-0.5">Tone</label>
                <input
                  value={(data.tone as string) || ''}
                  onChange={(e) => onChange({ ...data, tone: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-start gap-3">
                <label className="text-[11px] font-medium tracking-[0.1em] uppercase text-carbon/40 w-20 pt-0.5">Type</label>
                <input
                  value={(data.typography as string) || ''}
                  onChange={(e) => onChange({ ...data, typography: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}
          <button
            onClick={() => onChange({ ...data, hasBrand: undefined })}
            className="text-[10px] text-carbon/50 hover:text-carbon/70 transition-colors tracking-wide uppercase"
          >
            ← Change option
          </button>
        </div>
      ) : (
        /* New Brand */
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
              Brand Name Ideas
            </label>
            <input
              type="text"
              value={(data.brandName as string) || ''}
              onChange={(e) => onChange({ ...data, brandName: e.target.value })}
              placeholder="Your brand name or let AI suggest options..."
              className="w-full px-3 py-2.5 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/40"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
              Brand Direction
            </label>
            <textarea
              value={(data.direction as string) || ''}
              onChange={(e) => onChange({ ...data, direction: e.target.value })}
              placeholder="Describe the personality of your brand — what does it stand for, who is it for?..."
              className="w-full h-28 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed placeholder:text-carbon/40"
            />
          </div>
          <button
            onClick={() => {
              setGenerating(true);
              setTimeout(() => {
                onChange({
                  ...data,
                  colors: ['#1A1A2E', '#E8DDD3', '#C9A96E', '#F0EBE3'],
                  tone: 'Bold yet refined, contemporary with heritage nods',
                  typography: 'Geometric sans-serif, high contrast weights',
                  generated: true,
                });
                setGenerating(false);
              }, 2000);
            }}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate Brand Identity
          </button>

          {(data.generated as boolean) && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-medium tracking-[0.1em] uppercase text-carbon/40 w-20">Colors</label>
                <div className="flex gap-2">
                  {(data.colors as string[])?.map((c, i) => (
                    <div key={i} className="w-8 h-8 border border-carbon/[0.08]" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <label className="text-[11px] font-medium tracking-[0.1em] uppercase text-carbon/40 w-20 pt-0.5">Tone</label>
                <input
                  value={(data.tone as string) || ''}
                  onChange={(e) => onChange({ ...data, tone: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-start gap-3">
                <label className="text-[11px] font-medium tracking-[0.1em] uppercase text-carbon/40 w-20 pt-0.5">Type</label>
                <input
                  value={(data.typography as string) || ''}
                  onChange={(e) => onChange({ ...data, typography: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}
          <button
            onClick={() => onChange({ ...data, hasBrand: undefined })}
            className="text-[10px] text-carbon/50 hover:text-carbon/70 transition-colors tracking-wide uppercase"
          >
            ← Change option
          </button>
        </div>
      )}
    </div>
  );
}

/* Placeholder content for Step 2 blocks */
function ResearchBlockContent({ blockId, mode, data, onChange }: { blockId: string; mode: InputMode; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const [generating, setGenerating] = useState(false);

  const config: Record<string, { label: string; placeholder: string; generateLabel: string }> = {
    'global-trends': {
      label: 'Season & Category',
      placeholder: 'e.g. SS27 footwear, FW26 outerwear...',
      generateLabel: 'Analyze Global Trends',
    },
    'deep-dive': {
      label: 'Product Type & Market',
      placeholder: 'e.g. running shoes, European urban market, mid-range...',
      generateLabel: 'Deep Dive Analysis',
    },
    'live-signals': {
      label: 'Categories to Monitor',
      placeholder: 'e.g. sneakers, sustainable fashion, Gen Z trends...',
      generateLabel: 'Scan Live Signals',
    },
    'competitors': {
      label: 'Reference Brands',
      placeholder: 'e.g. Veja, Sézane, COS, Axel Arigato...',
      generateLabel: 'Analyze Competitors',
    },
  };

  const c = config[blockId] || { label: 'Input', placeholder: '', generateLabel: 'Generate' };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon mb-2 block">
          {c.label}
        </label>
        <textarea
          value={(data.input as string) || ''}
          onChange={(e) => onChange({ ...data, input: e.target.value })}
          placeholder={c.placeholder}
          className="w-full h-24 px-4 py-3 text-sm text-carbon bg-carbon/[0.02] border border-carbon/[0.08] focus:border-carbon/20 focus:outline-none transition-colors resize-none leading-relaxed placeholder:text-carbon/40"
        />
      </div>
      <button
        onClick={() => {
          setGenerating(true);
          setTimeout(() => {
            onChange({
              ...data,
              results: [
                { title: 'Trend Insight 1', desc: 'AI-generated insight based on your input. Select the trends you want to incorporate into your collection.', selected: false },
                { title: 'Trend Insight 2', desc: 'Another relevant insight. Toggle to include or exclude from your Creative Input.', selected: false },
                { title: 'Trend Insight 3', desc: 'A third insight with specific relevance to your product category and target market.', selected: false },
              ],
            });
            setGenerating(false);
          }, 1800);
        }}
        disabled={generating || !(data.input as string)?.trim()}
        className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.1em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {c.generateLabel}
      </button>

      {/* Results with selection */}
      {(data.results as Array<{ title: string; desc: string; selected: boolean }>)?.map((r, i) => (
        <button
          key={i}
          onClick={() => {
            const results = [...(data.results as Array<{ title: string; desc: string; selected: boolean }>)];
            results[i] = { ...results[i], selected: !results[i].selected };
            onChange({ ...data, results });
          }}
          className={`w-full text-left p-5 border transition-all ${
            r.selected
              ? 'border-carbon bg-carbon/[0.03]'
              : 'border-carbon/[0.08] hover:border-carbon/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-carbon">{r.title}</span>
            <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${
              r.selected ? 'bg-carbon border-carbon' : 'border-carbon/20'
            }`}>
              {r.selected && <Check className="h-2.5 w-2.5 text-crema" />}
            </div>
          </div>
          <div className="text-xs text-carbon/80 leading-relaxed">{r.desc}</div>
        </button>
      ))}
    </div>
  );
}

/* ─── Expanded Block Content Router ─── */
function ExpandedBlockContent({ blockId, stepId, mode, data, onChange }: {
  blockId: string;
  stepId: string;
  mode: InputMode;
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  if (stepId === 'vision') {
    switch (blockId) {
      case 'consumer': return <ConsumerContent mode={mode} data={data} onChange={onChange} />;
      case 'vibe': return <VibeContent mode={mode} data={data} onChange={onChange} />;
      case 'moodboard': return <MoodboardContent data={data} onChange={onChange} />;
      case 'brand-dna': return <BrandDNAContent mode={mode} data={data} onChange={onChange} />;
    }
  }
  if (stepId === 'research') {
    return <ResearchBlockContent blockId={blockId} mode={mode} data={data} onChange={onChange} />;
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════ */

export default function CreativeBrandPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [blockData, setBlockData] = useState<BlockData>({});
  const [isAnimating, setIsAnimating] = useState(false);

  const step = STEPS[activeStep];

  const getBlockState = useCallback((blockId: string) => {
    return blockData[blockId] || { mode: 'free' as InputMode, confirmed: false, data: {} };
  }, [blockData]);

  const updateBlockData = useCallback((blockId: string, updates: Partial<BlockData[string]>) => {
    setBlockData((prev) => ({
      ...prev,
      [blockId]: { ...getBlockState(blockId), ...updates },
    }));
  }, [getBlockState]);

  const handleExpand = useCallback((blockId: string) => {
    setIsAnimating(true);
    setExpandedBlock(blockId);
    setTimeout(() => setIsAnimating(false), 400);
  }, []);

  const handleCollapse = useCallback(() => {
    setIsAnimating(true);
    setExpandedBlock(null);
    setTimeout(() => setIsAnimating(false), 400);
  }, []);

  const handleConfirm = useCallback((blockId: string) => {
    updateBlockData(blockId, { confirmed: true });
    handleCollapse();
  }, [updateBlockData, handleCollapse]);

  const isMoodboard = expandedBlock === 'moodboard';

  return (
    <div className="min-h-[80vh]">
      <div className="px-8 md:px-12 lg:px-16 py-12">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => router.push(`/collection/${id}`)}
            className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3 hover:text-carbon/50 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-3 w-3" /> Overview
          </button>
          <h2 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
            Creative & <span className="italic">Brand</span>
          </h2>
          <p className="text-sm text-carbon/60 mt-2 max-w-lg">
            Define your creative vision, research the market, and synthesize everything into a unified creative input.
          </p>
        </div>

        {/* Step Navigation */}
        <div className="flex items-center gap-0 mb-10 border border-carbon/[0.06] w-fit">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { if (!expandedBlock) setActiveStep(i); }}
              className={`flex items-center gap-3 px-6 py-3 text-[11px] font-medium tracking-[0.08em] uppercase transition-all ${
                activeStep === i
                  ? 'bg-carbon text-crema'
                  : expandedBlock
                    ? 'bg-white text-carbon/15 cursor-not-allowed'
                    : 'bg-white text-carbon/40 hover:text-carbon/60'
              }`}
            >
              <span className={`w-5 h-5 flex items-center justify-center text-[10px] ${
                activeStep === i ? 'bg-white/20' : 'bg-carbon/[0.06]'
              }`}>
                {i + 1}
              </span>
              {s.name}
            </button>
          ))}
        </div>

        {/* Step Content */}
        {step.blocks.length > 0 ? (
          <div className="relative">
            {/* ─── EXPANDED VIEW ─── */}
            {expandedBlock && (
              <div className="flex gap-4">
                {/* Collapsed sidebar icons */}
                <div className="flex flex-col gap-3 pt-1 w-14 shrink-0">
                  {step.blocks.map((block) => {
                    if (block.id === expandedBlock) return null;
                    const Icon = block.icon;
                    const state = getBlockState(block.id);
                    return (
                      <button
                        key={block.id}
                        onClick={() => {
                          handleCollapse();
                          setTimeout(() => handleExpand(block.id), 350);
                        }}
                        className={`group/icon relative w-12 h-12 flex items-center justify-center border transition-all duration-300 ${
                          state.confirmed
                            ? 'bg-carbon/[0.04] border-carbon/[0.12]'
                            : 'bg-white border-carbon/[0.08] hover:border-carbon/20 hover:shadow-sm'
                        }`}
                        title={block.name}
                      >
                        {state.confirmed ? (
                          <Check className="h-4 w-4 text-carbon/60" />
                        ) : (
                          <Icon className="h-4.5 w-4.5 text-carbon/35 group-hover/icon:text-carbon/60 transition-colors" />
                        )}
                        {/* Tooltip */}
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-carbon text-crema text-[10px] tracking-wide whitespace-nowrap opacity-0 group-hover/icon:opacity-100 transition-opacity pointer-events-none z-10">
                          {block.name}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Expanded content */}
                <div
                  className="flex-1 bg-white border border-carbon/[0.06] overflow-hidden flex flex-col"
                  style={{
                    animation: 'expandIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    minHeight: 'calc(100vh - 260px)',
                  }}
                >
                  {(() => {
                    const block = step.blocks.find((b) => b.id === expandedBlock);
                    if (!block) return null;
                    const Icon = block.icon;
                    const state = getBlockState(block.id);
                    return (
                      <div className="p-10 lg:p-12 flex flex-col h-full min-h-[inherit]">
                        {/* Header row */}
                        <div className="flex items-start justify-between mb-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center">
                              <Icon className="h-5 w-5 text-carbon/50" />
                            </div>
                            <div>
                              <h3 className="text-xl font-light text-carbon tracking-tight">
                                {block.name}
                              </h3>
                              <p className="text-xs text-carbon/70 mt-0.5">{block.description}</p>
                            </div>
                          </div>
                          <button
                            onClick={handleCollapse}
                            className="w-9 h-9 flex items-center justify-center text-carbon/30 hover:text-carbon/60 hover:bg-carbon/[0.04] transition-all"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Mode Pills (not for moodboard) */}
                        {!isMoodboard && (
                          <div className="flex items-center gap-2 mb-8">
                            {INPUT_MODES.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => updateBlockData(block.id, { mode: m.id })}
                                className={`px-4 py-2 text-[10px] font-medium tracking-[0.1em] uppercase border transition-all ${
                                  state.mode === m.id
                                    ? 'border-carbon bg-carbon text-crema'
                                    : 'border-carbon/[0.08] text-carbon/50 hover:text-carbon/70 hover:border-carbon/20'
                                }`}
                              >
                                {m.label}
                              </button>
                            ))}
                            <span className="text-[10px] text-carbon/60 ml-2">
                              {INPUT_MODES.find((m) => m.id === state.mode)?.description}
                            </span>
                          </div>
                        )}

                        {/* Dynamic Content */}
                        <div className="flex-1">
                          <ExpandedBlockContent
                            blockId={block.id}
                            stepId={step.id}
                            mode={state.mode}
                            data={state.data}
                            onChange={(newData) => updateBlockData(block.id, { data: newData })}
                          />
                        </div>

                        {/* Confirm — pinned to bottom */}
                        <div className="mt-auto flex items-center justify-between pt-6 border-t border-carbon/[0.06]">
                          <button
                            onClick={handleCollapse}
                            className="text-[11px] font-medium tracking-[0.08em] uppercase text-carbon/50 hover:text-carbon transition-colors"
                          >
                            ← Back to grid
                          </button>
                          <button
                            onClick={() => handleConfirm(block.id)}
                            className="flex items-center gap-2 px-8 py-3 text-[11px] font-medium tracking-[0.15em] uppercase bg-carbon text-crema hover:bg-carbon/90 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Confirm & Continue
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ─── GRID VIEW (2x2) ─── */}
            {!expandedBlock && (
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
                style={isAnimating ? { animation: 'gridIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards' } : undefined}
              >
                {step.blocks.map((block) => {
                  const Icon = block.icon;
                  const state = getBlockState(block.id);
                  return (
                    <div
                      key={block.id}
                      onClick={() => handleExpand(block.id)}
                      className={`group relative bg-white p-10 lg:p-12 hover:shadow-lg transition-all duration-300 overflow-hidden border flex flex-col min-h-[320px] cursor-pointer ${
                        state.confirmed
                          ? 'border-carbon/[0.12] bg-carbon/[0.01]'
                          : 'border-carbon/[0.06]'
                      }`}
                    >
                      {/* Confirmed badge */}
                      {state.confirmed && (
                        <div className="absolute top-5 right-5 w-7 h-7 bg-carbon flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 text-crema" />
                        </div>
                      )}

                      {/* Icon + Title */}
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center mb-4">
                            <Icon className="h-5 w-5 text-carbon/50" />
                          </div>
                          <h3 className="text-xl font-light text-carbon tracking-tight">
                            {block.name}
                          </h3>
                        </div>
                      </div>

                      <p className="text-sm text-carbon/70 leading-relaxed flex-1">
                        {block.description}
                      </p>

                      {/* Input Mode Pills (preview) */}
                      {block.id !== 'moodboard' && (
                        <div className="mt-6 flex items-center gap-2">
                          {INPUT_MODES.map((mode) => (
                            <span
                              key={mode.id}
                              className="px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.08] text-carbon/50"
                            >
                              {mode.label}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* CTA */}
                      <div className={`mt-6 flex items-center justify-center gap-2 py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em] transition-colors ${
                        state.confirmed
                          ? 'bg-carbon/[0.06] text-carbon/40 group-hover:bg-carbon/[0.1]'
                          : 'bg-carbon text-crema group-hover:bg-carbon/90'
                      }`}>
                        {state.confirmed ? (
                          <>Edit <ArrowRight className="h-3.5 w-3.5" /></>
                        ) : (
                          <>Start <ArrowRight className="h-3.5 w-3.5" /></>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Synthesis Step — Consolidated View */
          <div className="bg-white border border-carbon/[0.06] p-12 lg:p-16 min-h-[400px] flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-carbon/[0.04] flex items-center justify-center mb-6">
              <Check className="h-6 w-6 text-carbon/30" />
            </div>
            <h3 className="text-2xl font-light text-carbon tracking-tight mb-3">
              Creative Synthesis
            </h3>
            <p className="text-sm text-carbon/60 max-w-md leading-relaxed mb-8">
              Once you complete Vision and Research, this step consolidates everything into a unified Creative Input that feeds the next block.
            </p>
            <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.1em] uppercase text-carbon/25">
              <span className="w-5 h-5 bg-carbon/[0.06] flex items-center justify-center text-[10px]">1</span>
              Vision
              <ArrowRight className="h-3 w-3 text-carbon/15" />
              <span className="w-5 h-5 bg-carbon/[0.06] flex items-center justify-center text-[10px]">2</span>
              Research
              <ArrowRight className="h-3 w-3 text-carbon/15" />
              <span className="w-5 h-5 bg-carbon text-crema flex items-center justify-center text-[10px]">3</span>
              Synthesis
            </div>
          </div>
        )}

        {/* Step Navigation Footer */}
        {!expandedBlock && (
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.08em] uppercase transition-all border ${
                activeStep === 0
                  ? 'border-carbon/[0.06] text-carbon/20 cursor-not-allowed'
                  : 'border-carbon/[0.12] text-carbon/60 hover:text-carbon hover:border-carbon/30'
              }`}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              onClick={() => setActiveStep(Math.min(STEPS.length - 1, activeStep + 1))}
              disabled={activeStep === STEPS.length - 1}
              className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium tracking-[0.08em] uppercase transition-all border ${
                activeStep === STEPS.length - 1
                  ? 'border-carbon/[0.06] text-carbon/20 cursor-not-allowed'
                  : 'border-carbon text-carbon hover:bg-carbon hover:text-crema'
              }`}
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes expandIn {
          0% {
            opacity: 0;
            transform: scale(0.92) translateY(-8px);
            max-height: 400px;
          }
          40% {
            opacity: 1;
            transform: scale(1) translateY(0);
            max-height: 400px;
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
            max-height: 2000px;
          }
        }
        @keyframes gridIn {
          0% {
            opacity: 0;
            transform: scale(1.02);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

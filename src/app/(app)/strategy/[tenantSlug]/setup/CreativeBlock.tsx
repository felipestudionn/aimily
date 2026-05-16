'use client';

/**
 * CreativeBlock — Strategy Creative Direction & Market Trends
 *
 * Single integrated workspace · everything Aimily reads as creative
 * direction lives here, no split between "trends" and "moodboard".
 *
 * Layout (top → bottom):
 *   1. Market trends · auto-loaded from /api/strategy/market-trends, grouped
 *      by 6 dimensions (silhouette · pattern · color · material ·
 *      reference_brand · category_direction). Each section opens with an
 *      "+ Añadir manualmente" card so the user can inject their own pills.
 *   2. Add more context · Pinterest connect + drag/upload + explicit
 *      "Analizar moodboard" CTA (no silent auto-analysis). Analysis
 *      results inject new pills into the trend sections above.
 *   3. Confirm CTA · synthesises brief via /api/strategy/briefs/discover
 *      and persists to /api/strategy/briefs.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles as _Sparkles,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import type {
  StrategyTrend,
  StrategyTrendDimension,
} from '@/lib/strategy/market-trends-prompt';

interface Tenant {
  id: string;
  slug: string;
  display_name: string;
}

interface ExistingBrief {
  id: string;
  name: string;
  description: string | null;
  color_story: string[] | null;
  archetypes_focus: string[] | null;
  family_pivot: Record<string, number> | null;
  creative_narrative: string | null;
}

interface Props {
  tenant: Tenant;
  existingBrief: ExistingBrief | null;
  gatingBlocked: boolean;
  onSaved: () => void;
}

interface PinterestBoard {
  id: string;
  name: string;
  pin_count?: number;
  image_thumbnail_url?: string;
}

interface PinterestPin {
  id: string;
  imageUrl: string;
  title?: string;
  url?: string;
  dominantColor?: string;
}

interface UITrend extends StrategyTrend {
  origin: 'market' | 'manual' | 'moodboard';
}

const DIMENSION_META: Record<StrategyTrendDimension, { label: string; description: string; addLabel: string }> = {
  silhouette: { label: 'Siluetas', description: 'Cortes y formas a considerar.', addLabel: 'Añadir silueta' },
  pattern: { label: 'Estampados', description: 'Patrones y técnicas de print.', addLabel: 'Añadir estampado' },
  color: { label: 'Color', description: 'Paleta que adoptarás.', addLabel: 'Añadir color' },
  material: { label: 'Materiales', description: 'Tejidos y construcciones.', addLabel: 'Añadir material' },
  reference_brand: { label: 'Marcas a vigilar', description: 'Brands que marcan el ritmo.', addLabel: 'Añadir marca' },
  category_direction: { label: 'Macro de categoría', description: 'Cambios estructurales en tu categoría.', addLabel: 'Añadir macro' },
};

const DIMENSION_ORDER: StrategyTrendDimension[] = [
  'silhouette',
  'pattern',
  'color',
  'material',
  'reference_brand',
  'category_direction',
];

export function CreativeBlock({ tenant, existingBrief: _existingBrief, gatingBlocked, onSaved }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const FILE_INPUT_ID = 'strategy-moodboard-file-input';

  // Moodboard
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedKey, setAnalyzedKey] = useState('');
  const [moodboardAnalyzeMsg, setMoodboardAnalyzeMsg] = useState('');

  // Pinterest
  const [pinterestStep, setPinterestStep] = useState<'idle' | 'boards' | 'pins'>('idle');
  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [pins, setPins] = useState<PinterestPin[]>([]);
  const [selectedPins, setSelectedPins] = useState<Set<string>>(new Set());
  const [selectedBoard, setSelectedBoard] = useState<PinterestBoard | null>(null);
  const [pinterestLoading, setPinterestLoading] = useState(false);
  const [pinterestError, setPinterestError] = useState('');
  const [importingPins, setImportingPins] = useState(false);

  // Market trends — single stack with origin tagging
  const [trends, setTrends] = useState<UITrend[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState('');
  const [selectedTrendTitles, setSelectedTrendTitles] = useState<Set<string>>(new Set());

  // Manual add state — which dimension is open + the form values.
  const [manualOpen, setManualOpen] = useState<StrategyTrendDimension | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [manualSpec, setManualSpec] = useState('');
  const [manualHex, setManualHex] = useState('');
  const [manualBrands, setManualBrands] = useState('');

  // Confirm
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  // ── Load Market Trends ─────────────────────────────────────────────────
  const loadMarketTrends = useCallback(async () => {
    setTrendsLoading(true);
    setTrendsError('');
    try {
      const res = await fetch('/api/strategy/market-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_slug: tenant.slug, language: 'es' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Market trends fetch failed (${res.status})`);
      }
      const data = await res.json();
      const incoming: UITrend[] = (Array.isArray(data.trends) ? data.trends : []).map((t: StrategyTrend) => ({
        ...t,
        origin: 'market' as const,
      }));
      // Replace only market-origin trends; preserve manual + moodboard.
      setTrends((prev) => [
        ...prev.filter((t) => t.origin !== 'market'),
        ...incoming,
      ]);
    } catch (err) {
      setTrendsError(err instanceof Error ? err.message : 'Market trends fetch failed');
    } finally {
      setTrendsLoading(false);
    }
  }, [tenant.slug]);

  useEffect(() => {
    if (gatingBlocked) return;
    if (trends.length > 0 || trendsLoading) return;
    loadMarketTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTrend = (title: string) => {
    setSelectedTrendTitles((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  // Group for sectioned rendering.
  const trendsByDim = useMemo(() => {
    const map = new Map<StrategyTrendDimension, UITrend[]>();
    for (const t of trends) {
      const bucket = map.get(t.dimension) ?? [];
      bucket.push(t);
      map.set(t.dimension, bucket);
    }
    return map;
  }, [trends]);

  // ── Manual add ─────────────────────────────────────────────────────────
  const openManual = (dim: StrategyTrendDimension) => {
    setManualOpen(dim);
    setManualTitle('');
    setManualSpec('');
    setManualHex('');
    setManualBrands('');
  };

  const cancelManual = () => {
    setManualOpen(null);
  };

  const submitManual = () => {
    if (!manualOpen) return;
    const title = manualTitle.trim();
    if (!title) return;
    const dim = manualOpen;
    const brandsList = manualBrands
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
    const newTrend: UITrend = {
      origin: 'manual',
      dimension: dim,
      title,
      product_spec: manualSpec.trim() || 'Añadido manualmente',
      reference_brands: brandsList,
    };
    if (dim === 'color') {
      const hex = manualHex.trim();
      if (/^#?[0-9a-fA-F]{6}$/.test(hex)) {
        newTrend.color_hex = (hex.startsWith('#') ? hex : `#${hex}`).toUpperCase();
        newTrend.color_name = title;
      }
    }
    setTrends((prev) => [...prev, newTrend]);
    setSelectedTrendTitles((prev) => {
      const next = new Set(prev);
      next.add(title);
      return next;
    });
    setManualOpen(null);
  };

  // ── Moodboard upload · base64 JSON (mirrors Block 1's pattern verbatim) ─
  const [uploadError, setUploadError] = useState('');
  const handleUpload = async (files: FileList) => {
    setUploading(true);
    setUploadError('');
    const newUrls: string[] = [];
    const failed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Subiendo ${i + 1}/${files.length}…`);
      const file = files[i];
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('FileReader failed'));
          reader.readAsDataURL(file);
        });
        const res = await fetch('/api/strategy/moodboard/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_slug: tenant.slug,
            name: file.name,
            base64: base64.split(',')[1],
            mimeType: file.type,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const detail = err.detail ? ` — ${err.detail}` : '';
          failed.push(`${file.name}: ${err.error || `HTTP ${res.status}`}${detail}`);
          console.error('[CreativeBlock upload]', err);
          continue;
        }
        const data = await res.json();
        const url = data.signed_url || data.publicUrl;
        if (url) newUrls.push(url);
        else failed.push(`${file.name}: missing signed_url in response`);
      } catch (err) {
        failed.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`);
        console.error('[CreativeBlock upload exception]', err);
      }
    }
    if (newUrls.length > 0) setImages((prev) => [...prev, ...newUrls]);
    if (failed.length > 0) setUploadError(`No se pudieron subir ${failed.length}: ${failed.join(' · ')}`);
    setUploading(false);
    setUploadProgress('');
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleUpload(e.dataTransfer.files);
  };

  // ── Pinterest · Block 1 pattern verbatim ──────────────────────────────
  const handlePinterestConnect = async () => {
    setPinterestLoading(true);
    setPinterestError('');
    try {
      const res = await fetch('/api/pinterest/boards');
      if (res.status === 401) {
        const clientId = process.env.NEXT_PUBLIC_PINTEREST_CLIENT_ID || '';
        const redirectUri =
          process.env.NEXT_PUBLIC_PINTEREST_REDIRECT_URI ||
          `${window.location.origin}/api/auth/pinterest/callback`;
        const scope = 'boards:read,pins:read';
        // Encode the current page URL as the return path so the callback
        // can redirect back here when window.opener is null (Pinterest's
        // COOP policy can sever the opener reference on some browsers).
        const returnPath = `${window.location.pathname}${window.location.search}`;
        const stateNonce = Math.random().toString(36).substring(2, 15);
        const state = `${stateNonce}_return_${encodeURIComponent(returnPath)}`;
        const url = `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;
        const popup = window.open(url, '_blank', 'width=600,height=700');
        if (!popup) {
          setPinterestError('El navegador bloqueó el popup. Permite popups para aimily.app y reinténtalo.');
        }
        setPinterestLoading(false);
        return;
      }
      const boardsData = await res.json();
      setBoards(boardsData.items || []);
      setPinterestStep('boards');
    } catch (err) {
      console.error('[CreativeBlock pinterest]', err);
      setPinterestError('No se pudo conectar a Pinterest');
    }
    setPinterestLoading(false);
  };

  // Listen for postMessage from popup (window.opener path).
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'pinterest_connected') {
        handlePinterestConnect();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback path: if Pinterest's COOP severed the opener, the callback
  // redirects the popup to <returnPath>?pinterest_connected=true. When
  // CreativeBlock mounts with that query param, we fetch boards directly
  // (the cookie is already set) and clean the URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('pinterest_connected') === 'true') {
      // Clean param so a refresh doesn't loop.
      params.delete('pinterest_connected');
      const newQs = params.toString();
      const cleanUrl = `${window.location.pathname}${newQs ? `?${newQs}` : ''}`;
      window.history.replaceState({}, '', cleanUrl);
      handlePinterestConnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectBoard = async (board: PinterestBoard) => {
    setSelectedBoard(board);
    setPinterestLoading(true);
    setPinterestError('');
    try {
      const res = await fetch(`/api/pinterest/boards/${board.id}/pins`);
      if (!res.ok) throw new Error('Failed to load pins');
      const data = await res.json();
      setPins(data.items || []);
      setSelectedPins(new Set());
      setPinterestStep('pins');
    } catch {
      setPinterestError('No se pudieron cargar los pins de este tablero');
    }
    setPinterestLoading(false);
  };

  const togglePin = (pinId: string) => {
    setSelectedPins((prev) => {
      const next = new Set(prev);
      if (next.has(pinId)) next.delete(pinId);
      else next.add(pinId);
      return next;
    });
  };

  const handleImportPins = async () => {
    const selected = pins.filter((p) => selectedPins.has(p.id));
    if (selected.length === 0) return;
    setImportingPins(true);
    const newUrls: string[] = [];
    for (let i = 0; i < selected.length; i++) {
      setUploadProgress(`Importando ${i + 1}/${selected.length}…`);
      try {
        const res = await fetch('/api/strategy/moodboard/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_slug: tenant.slug,
            source_url: selected[i].imageUrl,
            source_name: `pinterest-${selected[i].id}.jpg`,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.signed_url) newUrls.push(data.signed_url);
        }
      } catch {
        /* skip */
      }
    }
    if (newUrls.length > 0) setImages((prev) => [...prev, ...newUrls]);
    setImportingPins(false);
    setUploadProgress('');
    setPinterestStep('idle');
    setSelectedPins(new Set());
  };

  const closePinterest = () => {
    setPinterestStep('idle');
    setBoards([]);
    setPins([]);
    setSelectedPins(new Set());
    setSelectedBoard(null);
    setPinterestError('');
  };

  // ── Explicit moodboard analysis · injects pills into trend sections ────
  const handleAnalyzeMoodboard = async () => {
    if (images.length === 0 || analyzing) return;
    const key = images.join('|');
    if (key === analyzedKey) {
      setMoodboardAnalyzeMsg('Esas imágenes ya fueron analizadas.');
      return;
    }
    setAnalyzing(true);
    setMoodboardAnalyzeMsg('');
    try {
      const res = await fetch('/api/ai/analyze-moodboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls: images, language: 'es' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Analysis failed (${res.status})`);
      }
      const result = await res.json();
      setAnalyzedKey(key);

      const added: UITrend[] = [];

      // Silhouettes (analysis returns plain strings)
      for (const s of (result.keySilhouettes as string[] | undefined) || []) {
        added.push({
          origin: 'moodboard',
          dimension: 'silhouette',
          title: s,
          product_spec: 'Detectada en tu moodboard.',
          reference_brands: [],
        });
      }
      // Materials
      for (const m of (result.keyMaterials as string[] | undefined) || []) {
        added.push({
          origin: 'moodboard',
          dimension: 'material',
          title: m,
          product_spec: 'Detectado en tu moodboard.',
          reference_brands: [],
        });
      }
      // Colors — analyze-moodboard returns strings like "Dusty Rose (#DCAE96)"
      for (const c of (result.keyColors as string[] | undefined) || []) {
        const match = c.match(/^(.+?)\s*\(?(#[0-9a-fA-F]{6})\)?\s*$/);
        if (match) {
          added.push({
            origin: 'moodboard',
            dimension: 'color',
            title: match[1].trim(),
            product_spec: 'Detectado en tu moodboard.',
            reference_brands: [],
            color_hex: match[2].toUpperCase(),
            color_name: match[1].trim(),
          });
        } else {
          added.push({
            origin: 'moodboard',
            dimension: 'color',
            title: c,
            product_spec: 'Detectado en tu moodboard.',
            reference_brands: [],
            color_name: c,
          });
        }
      }
      // Brand references
      for (const b of (result.detectedBrandReferences as string[] | undefined) || []) {
        added.push({
          origin: 'moodboard',
          dimension: 'reference_brand',
          title: b,
          product_spec: 'Detectada en tu moodboard.',
          reference_brands: [b],
        });
      }
      // Archetype → category direction
      for (const a of (result.keyArchetypes as string[] | undefined) || []) {
        added.push({
          origin: 'moodboard',
          dimension: 'category_direction',
          title: a,
          product_spec: 'Arquetipo detectado en tu moodboard.',
          reference_brands: [],
        });
      }

      // Append, dedupe by (title, dimension).
      setTrends((prev) => {
        const seen = new Set(prev.map((t) => `${t.dimension}::${t.title.toLowerCase()}`));
        const fresh = added.filter((t) => !seen.has(`${t.dimension}::${t.title.toLowerCase()}`));
        return [...prev, ...fresh];
      });
      // Auto-select the moodboard pills so they flow into synthesis.
      setSelectedTrendTitles((prev) => {
        const next = new Set(prev);
        for (const t of added) next.add(t.title);
        return next;
      });
      setMoodboardAnalyzeMsg(`Añadidos ${added.length} pills desde tu moodboard.`);
    } catch (err) {
      setMoodboardAnalyzeMsg(err instanceof Error ? err.message : 'No se pudo analizar el moodboard');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Confirm ────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setConfirming(true);
    setError('');
    try {
      const selectedList = Array.from(selectedTrendTitles);
      const res = await fetch('/api/strategy/briefs/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenant.slug,
          language: 'es',
          moodboard: images.length > 0 ? { imageUrls: images } : undefined,
          selected_trends: selectedList,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Discover failed (${res.status})`);
      }
      const data = await res.json();
      const draft = data.draft ?? data;

      const saveRes = await fetch('/api/strategy/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          name: draft.name ?? 'Creative direction',
          description: draft.description ?? null,
          color_story: Array.isArray(draft.color_story) ? draft.color_story : [],
          archetypes_focus: Array.isArray(draft.archetypes_focus) ? draft.archetypes_focus : [],
          family_pivot:
            draft.family_pivot && typeof draft.family_pivot === 'object' ? draft.family_pivot : {},
          silhouette_preferences:
            draft.silhouette_preferences && typeof draft.silhouette_preferences === 'object'
              ? draft.silhouette_preferences
              : {},
          material_direction:
            draft.material_direction && typeof draft.material_direction === 'object'
              ? draft.material_direction
              : {},
          customer_segment_shift: draft.customer_segment_shift ?? null,
          creative_narrative: draft.creative_narrative ?? null,
        }),
      });
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error(err.error || `Save failed (${saveRes.status})`);
      }
      router.refresh();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm failed');
    } finally {
      setConfirming(false);
    }
  };

  const totalSelected = selectedTrendTitles.size;
  const canConfirm = totalSelected > 0;

  // ── Render ─────────────────────────────────────────────────────────────
  // All content shares the same max-w-7xl container so headers + cards
  // align flush on the left.
  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* MORE CONTEXT · Pinterest + upload */}
      <section className="bg-white rounded-[20px] p-8 md:p-12">
        <header className="mb-6">
          <h2 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15]">
            Añadir contexto creativo
          </h2>
          <p className="text-[13px] text-carbon/50 mt-1">
            Conecta Pinterest o sube imágenes antes de revisar las tendencias. Al analizar,
            Aimily añade pills nuevos a las secciones de Market Trends.
          </p>
        </header>

        <input
          ref={fileInputRef}
          id={FILE_INPUT_ID}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleUpload(e.target.files);
            e.target.value = '';
          }}
        />

        {(pinterestError || uploadError) && (
          <div className="bg-red-50 border border-red-200 rounded-[14px] p-4 text-[13px] text-red-800 mb-6 space-y-1">
            {pinterestError && <p>· {pinterestError}</p>}
            {uploadError && <p>· {uploadError}</p>}
          </div>
        )}

        {images.length === 0 && pinterestStep === 'idle' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mx-auto">
            <button
              type="button"
              onClick={handlePinterestConnect}
              disabled={pinterestLoading || gatingBlocked}
              className={`flex flex-col items-center justify-center gap-4 py-14 px-6 rounded-[20px] bg-carbon/[0.04] hover:bg-carbon/[0.07] transition-all disabled:opacity-40 ${
                pinterestLoading ? 'cursor-wait' : 'cursor-pointer'
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-carbon/[0.06] flex items-center justify-center">
                {pinterestLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-carbon/50" />
                ) : (
                  <ExternalLink className="h-6 w-6 text-carbon/50" />
                )}
              </div>
              <p className="text-[15px] font-medium text-carbon/75">
                {pinterestLoading ? 'Conectando…' : 'Conectar Pinterest'}
              </p>
            </button>

            <label
              htmlFor={FILE_INPUT_ID}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-4 py-14 px-6 rounded-[20px] border-2 border-dashed transition-all cursor-pointer ${
                dragActive
                  ? 'border-carbon/50 bg-carbon/[0.05]'
                  : 'border-carbon/[0.15] hover:border-carbon/30 hover:bg-carbon/[0.02]'
              } ${uploading || gatingBlocked ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <div className="w-14 h-14 rounded-full bg-carbon/[0.04] flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-carbon/50" />
                ) : (
                  <Upload className="h-6 w-6 text-carbon/50" />
                )}
              </div>
              <p className="text-[15px] font-medium text-carbon/75">
                {uploading ? uploadProgress : 'Arrastra imágenes o haz click'}
              </p>
            </label>
          </div>
        )}

        {pinterestStep === 'boards' && (
          <div className="bg-shade rounded-[16px] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/60">
                Elige un tablero
              </p>
              <button type="button" onClick={closePinterest} className="text-carbon/40 hover:text-carbon/70">
                <X className="h-4 w-4" />
              </button>
            </div>
            {pinterestError && <p className="text-xs text-red-600">{pinterestError}</p>}
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {boards.map((board) => (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => handleSelectBoard(board)}
                    className="flex flex-col items-start gap-2 p-3 rounded-[12px] bg-white hover:ring-1 hover:ring-carbon/20 transition-all text-left"
                  >
                    {board.image_thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={board.image_thumbnail_url} alt="" className="w-full aspect-square object-cover rounded-[8px]" />
                    )}
                    <span className="text-[12px] font-medium text-carbon/80 truncate w-full">{board.name}</span>
                    {board.pin_count != null && <span className="text-[11px] text-carbon/45">{board.pin_count} pins</span>}
                  </button>
                ))}
              </div>
            </div>
            {boards.length === 0 && !pinterestLoading && (
              <p className="text-xs text-carbon/50 text-center py-4">No se encontraron tableros</p>
            )}
          </div>
        )}

        {pinterestStep === 'pins' && (
          <div className="bg-shade rounded-[16px] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setPinterestStep('boards')} className="text-xs text-carbon/50 hover:text-carbon/80">
                  <ArrowLeft className="h-3.5 w-3.5 inline mr-1" />
                  Tableros
                </button>
                <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/60">{selectedBoard?.name}</p>
              </div>
              <button type="button" onClick={closePinterest} className="text-carbon/40 hover:text-carbon/70">
                <X className="h-4 w-4" />
              </button>
            </div>
            {pinterestError && <p className="text-xs text-red-600">{pinterestError}</p>}
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {pins.map((pin) => (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={() => togglePin(pin.id)}
                    className={`relative aspect-square overflow-hidden rounded-[8px] transition-all ${
                      selectedPins.has(pin.id) ? 'ring-2 ring-carbon' : 'ring-1 ring-transparent hover:ring-carbon/20'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pin.imageUrl} alt={pin.title || ''} className="w-full h-full object-cover" />
                    {selectedPins.has(pin.id) && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-carbon text-white flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            {selectedPins.size > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-carbon/[0.1]">
                <span className="text-xs text-carbon/60">{selectedPins.size} seleccionados</span>
                <button
                  type="button"
                  onClick={handleImportPins}
                  disabled={importingPins}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-carbon text-white text-[13px] font-semibold hover:bg-carbon/90 disabled:opacity-50 transition-colors"
                >
                  {importingPins ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {importingPins ? uploadProgress : `Importar ${selectedPins.size} pins`}
                </button>
              </div>
            )}
            {pins.length === 0 && !pinterestLoading && (
              <p className="text-xs text-carbon/50 text-center py-4">No se encontraron pins</p>
            )}
          </div>
        )}

        {/* Image grid + explicit Analyze CTA */}
        {images.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square bg-carbon/[0.04] rounded-[10px] overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-carbon/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Quitar imagen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleAnalyzeMoodboard}
                disabled={analyzing || images.length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold hover:bg-carbon/90 disabled:opacity-50 transition-colors"
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {analyzing ? 'Analizando moodboard…' : 'Analizar moodboard y añadir pills'}
              </button>
              {moodboardAnalyzeMsg && (
                <p className="text-[12px] text-carbon/55 italic">{moodboardAnalyzeMsg}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mx-auto pt-2">
              <button
                type="button"
                onClick={handlePinterestConnect}
                disabled={pinterestLoading}
                className="flex flex-col items-center justify-center gap-3 py-8 px-6 rounded-[20px] bg-carbon/[0.04] hover:bg-carbon/[0.07] transition-all disabled:opacity-40 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-carbon/[0.06] flex items-center justify-center">
                  {pinterestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4 text-carbon/50" />}
                </div>
                <p className="text-[13px] font-medium text-carbon/70">Conectar Pinterest</p>
              </button>

              <label
                htmlFor={FILE_INPUT_ID}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-3 py-8 px-6 rounded-[20px] border-2 border-dashed transition-all cursor-pointer ${
                  dragActive ? 'border-carbon/50 bg-carbon/[0.05]' : 'border-carbon/[0.15] hover:border-carbon/30 hover:bg-carbon/[0.02]'
                } ${uploading ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-carbon/[0.04] flex items-center justify-center">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 text-carbon/50" />}
                </div>
                <p className="text-[13px] font-medium text-carbon/70">
                  {uploading ? uploadProgress : 'Añadir más'}
                </p>
              </label>
            </div>
          </div>
        )}
      </section>

      {/* MARKET TRENDS · primary surface, pre-populated */}
      <section>
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h2 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15]">
              Market trends
            </h2>
            <p className="text-[13px] text-carbon/50 mt-1">
              Aimily ya propuso tendencias relevantes para tu producto. Selecciona las que
              quieres adoptar — añade las tuyas con "+" en cada sección.
            </p>
          </div>
          <button
            type="button"
            onClick={loadMarketTrends}
            disabled={trendsLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium border border-carbon/[0.12] text-carbon/70 hover:bg-carbon/[0.04] disabled:opacity-50 transition-colors shrink-0"
          >
            {trendsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refrescar
          </button>
        </div>

        {trendsError && (
          <div className="bg-red-50 border border-red-200 rounded-[14px] p-4 text-[13px] text-red-800 mb-6">
            {trendsError}
          </div>
        )}

        {trendsLoading && trends.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-16 text-carbon/45">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-[13px]">Aimily está leyendo el mercado…</span>
          </div>
        )}

        <div className="space-y-10">
          {DIMENSION_ORDER.map((dim) => {
            const cards = trendsByDim.get(dim) ?? [];
            // We always render the section (even empty) so the manual-add
            // card is always visible — Felipe's explicit ask.
            const meta = DIMENSION_META[dim];
            const isManualOpen = manualOpen === dim;
            const isColorDim = dim === 'color';
            return (
              <div key={dim}>
                <div className="flex items-baseline justify-between mb-3">
                  <div>
                    <h3 className="text-[16px] font-semibold text-carbon tracking-[-0.02em]">
                      {meta.label}
                    </h3>
                    <p className="text-[12px] text-carbon/45">{meta.description}</p>
                  </div>
                  <span className="text-[11px] text-carbon/35 tabular-nums">{cards.length}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Manual-add card · always first */}
                  {isManualOpen ? (
                    <ManualAddForm
                      label={meta.addLabel}
                      isColor={isColorDim}
                      title={manualTitle}
                      setTitle={setManualTitle}
                      spec={manualSpec}
                      setSpec={setManualSpec}
                      hex={manualHex}
                      setHex={setManualHex}
                      brands={manualBrands}
                      setBrands={setManualBrands}
                      onSubmit={submitManual}
                      onCancel={cancelManual}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => openManual(dim)}
                      className="group bg-white rounded-[16px] p-5 ring-1 ring-dashed ring-carbon/15 hover:ring-carbon/40 hover:bg-carbon/[0.02] transition-all flex flex-col items-center justify-center min-h-[160px] text-center"
                    >
                      <div className="w-10 h-10 rounded-full bg-carbon/[0.05] flex items-center justify-center mb-3 group-hover:bg-carbon/[0.1] transition-colors">
                        <Plus className="h-4 w-4 text-carbon/55" />
                      </div>
                      <p className="text-[13px] font-medium text-carbon/70 leading-tight">
                        {meta.addLabel}
                      </p>
                      <p className="text-[11px] text-carbon/40 mt-1">
                        Manual — la añades tú
                      </p>
                    </button>
                  )}

                  {/* Auto cards (market + moodboard origin) */}
                  {cards.map((trend, i) => (
                    <TrendCard
                      key={`${dim}-${i}-${trend.title}`}
                      trend={trend}
                      selected={selectedTrendTitles.has(trend.title)}
                      onToggle={() => toggleTrend(trend.title)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Confirm */}
      <div className="flex flex-col items-center gap-3 pt-2">
        {error && (
          <p className="text-[13px] text-red-700 bg-red-50 px-4 py-2.5 rounded-[12px] max-w-xl text-center">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirming || !canConfirm}
          className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-carbon text-white text-[14px] font-semibold hover:bg-carbon/90 disabled:opacity-40 transition-colors"
        >
          {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Validar dirección creativa y continuar
        </button>
        <p className="text-[12px] text-carbon/45">
          {totalSelected} pills seleccionadas · {images.length} imágenes
        </p>
      </div>
    </div>
  );
}

// ── TrendCard ─────────────────────────────────────────────────────────────

function TrendCard({
  trend,
  selected,
  onToggle,
}: {
  trend: UITrend;
  selected: boolean;
  onToggle: () => void;
}) {
  const isColor = trend.dimension === 'color' && trend.color_hex;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group relative bg-white rounded-[16px] p-5 text-left transition-all duration-200 min-h-[160px] flex flex-col ${
        selected
          ? 'ring-2 ring-carbon shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
          : 'ring-1 ring-carbon/[0.06] hover:ring-carbon/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]'
      }`}
    >
      <div
        className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
          selected ? 'bg-carbon text-white' : 'bg-carbon/[0.05] text-transparent group-hover:bg-carbon/[0.1]'
        }`}
      >
        <Check className="h-3.5 w-3.5" />
      </div>

      {trend.origin !== 'market' && (
        <span className="absolute top-3 left-3 text-[9px] tracking-[0.1em] uppercase font-semibold text-carbon/40 bg-carbon/[0.04] px-2 py-0.5 rounded-full">
          {trend.origin === 'manual' ? 'Tuyo' : 'Moodboard'}
        </span>
      )}

      {isColor && (
        <div className="flex items-center gap-3 mb-3 mt-2">
          <span
            className="w-14 h-14 rounded-[10px] ring-1 ring-black/10 shrink-0"
            style={{ backgroundColor: trend.color_hex }}
          />
          <div className="flex-1 min-w-0 pr-6">
            <p className="text-[14px] font-semibold text-carbon leading-tight">
              {trend.color_name || trend.title}
            </p>
            <p className="text-[11px] text-carbon/45 font-mono mt-0.5">
              {trend.color_hex?.toUpperCase()}
            </p>
          </div>
        </div>
      )}

      {!isColor && (
        <h4 className="text-[14px] font-semibold text-carbon tracking-[-0.01em] leading-tight mb-2 pr-8 mt-2">
          {trend.title}
        </h4>
      )}

      <p className="text-[12px] text-carbon/65 leading-[1.5] mb-3 flex-1">
        {trend.product_spec}
      </p>

      {trend.reference_brands.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {trend.reference_brands.slice(0, 4).map((brand, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-full bg-carbon/[0.04] text-[10px] font-medium text-carbon/65 tracking-[-0.01em]"
            >
              {brand}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ── ManualAddForm ────────────────────────────────────────────────────────

function ManualAddForm({
  label,
  isColor,
  title,
  setTitle,
  spec,
  setSpec,
  hex,
  setHex,
  brands,
  setBrands,
  onSubmit,
  onCancel,
}: {
  label: string;
  isColor: boolean;
  title: string;
  setTitle: (v: string) => void;
  spec: string;
  setSpec: (v: string) => void;
  hex: string;
  setHex: (v: string) => void;
  brands: string;
  setBrands: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-white rounded-[16px] p-4 ring-2 ring-carbon flex flex-col gap-2 min-h-[160px]">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] tracking-[0.1em] uppercase font-semibold text-carbon/55">{label}</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-carbon/40 hover:text-carbon/70"
          aria-label="Cancelar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título"
        className="w-full px-2.5 py-1.5 text-[13px] text-carbon bg-carbon/[0.03] rounded-[8px] border border-carbon/[0.06] focus:border-carbon/30 focus:outline-none placeholder:text-carbon/30"
        autoFocus
      />

      {isColor && (
        <input
          type="text"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          placeholder="#RRGGBB"
          className="w-full px-2.5 py-1.5 text-[12px] font-mono text-carbon bg-carbon/[0.03] rounded-[8px] border border-carbon/[0.06] focus:border-carbon/30 focus:outline-none placeholder:text-carbon/30"
        />
      )}

      <textarea
        value={spec}
        onChange={(e) => setSpec(e.target.value)}
        rows={2}
        placeholder="Descripción rápida (opcional)"
        className="w-full px-2.5 py-1.5 text-[12px] text-carbon bg-carbon/[0.03] rounded-[8px] border border-carbon/[0.06] focus:border-carbon/30 focus:outline-none placeholder:text-carbon/30 resize-none"
      />

      <input
        type="text"
        value={brands}
        onChange={(e) => setBrands(e.target.value)}
        placeholder="Marcas (separadas por coma, opcional)"
        className="w-full px-2.5 py-1.5 text-[12px] text-carbon bg-carbon/[0.03] rounded-[8px] border border-carbon/[0.06] focus:border-carbon/30 focus:outline-none placeholder:text-carbon/30"
      />

      <button
        type="button"
        onClick={onSubmit}
        disabled={!title.trim()}
        className="mt-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-carbon text-white text-[12px] font-semibold hover:bg-carbon/90 disabled:opacity-40 transition-colors"
      >
        <Plus className="h-3 w-3" />
        Añadir
      </button>
    </div>
  );
}

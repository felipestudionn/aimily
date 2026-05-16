'use client';

/**
 * CreativeBlock — Block 1 MoodboardContent verbatim, adapted to tenant context.
 *
 * Layout (top → bottom):
 *   1. Moodboard (Pinterest connect + direct upload side-by-side · image grid
 *      with silent auto-analysis at ≥5 images)
 *   2. Market trends — 4 research mini-blocks: Global · Deep dive · Live
 *      signals · Competitors. Trends-global auto-runs on mount so the user
 *      enters with pre-proposed pills already on screen.
 *   3. Confirm CTA — calls /api/strategy/briefs/discover with the validated
 *      trend set + uploaded moodboard analysis, which synthesises the brief
 *      and writes it to strategy_creative_briefs.
 *
 * Endpoints reused (NO new ones):
 *   · /api/strategy/moodboard/upload (file + source_url JSON modes)
 *   · /api/pinterest/boards · /api/pinterest/boards/[id]/pins · /api/auth/pinterest/callback
 *   · /api/ai/analyze-moodboard (collectionPlanId is optional)
 *   · /api/ai/creative-generate (collectionPlanId is optional · types
 *     trends-global · trends-deep-dive · trends-live-signals · trends-competitors)
 *   · /api/strategy/briefs/discover (synthesises brief from inputs)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  ExternalLink,
  FlaskConical,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────

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

interface TrendCard {
  title: string;
  desc: string;
  brands?: string;
  hex?: string;
  dimension?: string;
  sources?: string[];
}

type TrendType = 'global' | 'deep-dive' | 'live-signals' | 'competitors';

const TREND_META: Record<TrendType, {
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  needsInput: boolean;
  apiType: string;
}> = {
  'global': {
    label: 'Global trends',
    hint: 'Macro fashion signals for the upcoming season.',
    icon: Globe,
    needsInput: false,
    apiType: 'trends-global',
  },
  'deep-dive': {
    label: 'Deep dive',
    hint: 'Drill into one direction or category.',
    icon: Compass,
    needsInput: true,
    apiType: 'trends-deep-dive',
  },
  'live-signals': {
    label: 'Live signals',
    hint: 'Real-time runway, retail and street.',
    icon: RefreshCw,
    needsInput: false,
    apiType: 'trends-live-signals',
  },
  'competitors': {
    label: 'Competitors',
    hint: 'What peers are doing right now.',
    icon: FlaskConical,
    needsInput: true,
    apiType: 'trends-competitors',
  },
};

// ── Component ───────────────────────────────────────────────────────────

export function CreativeBlock({ tenant, existingBrief: _existingBrief, gatingBlocked, onSaved }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const FILE_INPUT_ID = 'strategy-moodboard-file-input';

  // Moodboard state
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedKey, setAnalyzedKey] = useState('');
  const [moodboardKeywords, setMoodboardKeywords] = useState<string[]>([]);

  // Pinterest state
  const [pinterestStep, setPinterestStep] = useState<'idle' | 'boards' | 'pins'>('idle');
  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [pins, setPins] = useState<PinterestPin[]>([]);
  const [selectedPins, setSelectedPins] = useState<Set<string>>(new Set());
  const [selectedBoard, setSelectedBoard] = useState<PinterestBoard | null>(null);
  const [pinterestLoading, setPinterestLoading] = useState(false);
  const [pinterestError, setPinterestError] = useState('');
  const [importingPins, setImportingPins] = useState(false);

  // Trends state — one bucket per type, plus selected set across all 4
  const [trends, setTrends] = useState<Record<TrendType, TrendCard[]>>({
    'global': [],
    'deep-dive': [],
    'live-signals': [],
    'competitors': [],
  });
  const [trendLoading, setTrendLoading] = useState<TrendType | null>(null);
  const [trendInputs, setTrendInputs] = useState<Record<TrendType, string>>({
    'global': '',
    'deep-dive': '',
    'live-signals': '',
    'competitors': '',
  });
  const [selectedTrendTitles, setSelectedTrendTitles] = useState<Set<string>>(new Set());

  // Confirm state
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  // ── Trend research ─────────────────────────────────────────────────────
  const runTrendResearch = useCallback(async (type: TrendType) => {
    setTrendLoading(type);
    setError('');
    try {
      const meta = TREND_META[type];
      const userInput = trendInputs[type] || '';

      const res = await fetch('/api/ai/creative-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: meta.apiType,
          language: 'es',
          input: {
            input: userInput,
            collectionName: tenant.display_name,
            season: deriveCurrentSeason(),
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Trend research failed (${res.status})`);
      }
      const data = await res.json();
      const results = (data?.result?.results ?? []) as TrendCard[];
      setTrends((prev) => ({ ...prev, [type]: results }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trend research failed');
    } finally {
      setTrendLoading(null);
    }
  }, [trendInputs, tenant.display_name]);

  // Auto-run trends-global on first mount so the user lands on trends.
  useEffect(() => {
    if (gatingBlocked) return;
    if (trends.global.length > 0) return;
    if (trendLoading != null) return;
    runTrendResearch('global');
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

  // ── Moodboard · direct upload ──────────────────────────────────────────
  const handleUpload = async (files: FileList) => {
    setUploading(true);
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Subiendo ${i + 1}/${files.length}…`);
      try {
        const form = new FormData();
        form.append('file', files[i]);
        form.append('tenant_slug', tenant.slug);
        const res = await fetch('/api/strategy/moodboard/upload', {
          method: 'POST',
          body: form,
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

  // ── Pinterest · OAuth + boards + pins import ───────────────────────────
  const handlePinterestConnect = useCallback(async () => {
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
        const state = Math.random().toString(36).substring(2, 15);
        const url = `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;
        window.open(url, '_blank', 'width=600,height=700');
        setPinterestLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Pinterest fetch failed');
      const data = await res.json();
      setBoards(data.items || []);
      setPinterestStep('boards');
    } catch {
      setPinterestError('No se pudo conectar a Pinterest');
    }
    setPinterestLoading(false);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'pinterest_connected') {
        handlePinterestConnect();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handlePinterestConnect]);

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
        /* skip failed */
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

  // ── Silent moodboard analysis at ≥5 images ─────────────────────────────
  useEffect(() => {
    if (images.length < 5 || analyzing) return;
    const key = images.join('|');
    if (key === analyzedKey) return;

    const timer = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const res = await fetch('/api/ai/analyze-moodboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrls: images, language: 'es' }),
        });
        if (res.ok) {
          const result = await res.json();
          const keywords = [
            ...((result.keyColors as string[]) || []),
            ...((result.keyStyles as string[]) || []),
            ...((result.keyMaterials as string[]) || []),
            ...((result.keyArchetypes as string[]) || []),
          ].slice(0, 30);
          setMoodboardKeywords(keywords);
          setAnalyzedKey(key);

          // Auto-add visual keywords as selected trends so they flow into
          // synthesis alongside the user-picked Sonar trends.
          if (keywords.length > 0) {
            setSelectedTrendTitles((prev) => {
              const next = new Set(prev);
              for (const k of keywords.slice(0, 8)) next.add(k);
              return next;
            });
          }
        }
      } catch {
        /* silent — analysis is a hint */
      } finally {
        setAnalyzing(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.join('|')]);

  // ── Confirm · synthesise brief from inputs ─────────────────────────────
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

      // Persist the discovered brief to strategy_creative_briefs.
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
  const canConfirm = totalSelected > 0 || images.length >= 5;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-12">
      {/* Moodboard section */}
      <section className="bg-white rounded-[20px] p-8 md:p-12">
        <header className="mb-6">
          <h2 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15]">
            Moodboard
          </h2>
          <p className="text-[13px] text-carbon/50 mt-1">
            Conecta Pinterest o sube imágenes. Aimily lee los códigos visuales en silencio
            a partir de 5 imágenes.
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

        {/* ENTRY phase — Pinterest + drag/upload side-by-side */}
        {images.length === 0 && pinterestStep === 'idle' && (
          <div className="flex flex-col items-center py-6 md:py-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
              <button
                type="button"
                onClick={handlePinterestConnect}
                disabled={pinterestLoading || gatingBlocked}
                className={`flex flex-col items-center justify-center gap-4 py-16 md:py-20 px-6 rounded-[20px] bg-carbon/[0.04] hover:bg-carbon/[0.07] transition-all disabled:opacity-40 ${
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
                <p className="text-[16px] font-medium text-carbon/75">
                  {pinterestLoading ? 'Conectando…' : 'Conectar Pinterest'}
                </p>
                <p className="text-[13px] text-carbon/35 max-w-[240px] text-center leading-relaxed">
                  Importa pines directamente desde tus tableros.
                </p>
              </button>

              <label
                htmlFor={FILE_INPUT_ID}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-4 py-16 md:py-20 px-6 rounded-[20px] border-2 border-dashed transition-all cursor-pointer ${
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
                <p className="text-[16px] font-medium text-carbon/75">
                  {uploading ? uploadProgress : 'Arrastra imágenes o haz click'}
                </p>
                <p className="text-[13px] text-carbon/35 max-w-[240px] text-center leading-relaxed">
                  JPG · PNG · WEBP · HEIC — máx 25 MB.
                </p>
              </label>
            </div>

            <p className="mt-8 text-[13px] text-carbon/35 max-w-md text-center leading-relaxed">
              Necesitamos al menos 5 imágenes para captar el tono.
            </p>
          </div>
        )}

        {/* Pinterest · boards modal */}
        {pinterestStep === 'boards' && (
          <div className="bg-shade rounded-[16px] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/60">
                Elige un tablero
              </p>
              <button
                type="button"
                onClick={closePinterest}
                className="text-carbon/40 hover:text-carbon/70"
              >
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
                      <img
                        src={board.image_thumbnail_url}
                        alt=""
                        className="w-full aspect-square object-cover rounded-[8px]"
                      />
                    )}
                    <span className="text-[12px] font-medium text-carbon/80 truncate w-full">
                      {board.name}
                    </span>
                    {board.pin_count != null && (
                      <span className="text-[11px] text-carbon/45">{board.pin_count} pins</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            {boards.length === 0 && !pinterestLoading && (
              <p className="text-xs text-carbon/50 text-center py-4">No se encontraron tableros</p>
            )}
          </div>
        )}

        {/* Pinterest · pins modal */}
        {pinterestStep === 'pins' && (
          <div className="bg-shade rounded-[16px] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPinterestStep('boards')}
                  className="text-xs text-carbon/50 hover:text-carbon/80"
                >
                  <ArrowLeft className="h-3.5 w-3.5 inline mr-1" />
                  Tableros
                </button>
                <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-carbon/60">
                  {selectedBoard?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closePinterest}
                className="text-carbon/40 hover:text-carbon/70"
              >
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
                      selectedPins.has(pin.id)
                        ? 'ring-2 ring-carbon'
                        : 'ring-1 ring-transparent hover:ring-carbon/20'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pin.imageUrl}
                      alt={pin.title || ''}
                      className="w-full h-full object-cover"
                    />
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

        {/* Image grid + add-more */}
        {images.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-square bg-carbon/[0.04] rounded-[10px] overflow-hidden group"
                >
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

            <div className="flex items-center justify-center gap-2 text-[12px] text-carbon/45 min-h-[18px]">
              {images.length < 5 ? (
                <span>{images.length}/5 — añade {5 - images.length} más para leer el tono.</span>
              ) : analyzing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Analizando señales visuales…</span>
                </>
              ) : moodboardKeywords.length > 0 ? (
                <span className="italic">
                  Tono captado · {moodboardKeywords.length} señales añadidas a la dirección
                </span>
              ) : null}
            </div>

            {/* Add-more row · Pinterest + drag, same layout as entry but compact */}
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
                  dragActive
                    ? 'border-carbon/50 bg-carbon/[0.05]'
                    : 'border-carbon/[0.15] hover:border-carbon/30 hover:bg-carbon/[0.02]'
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

      {/* Market trends · 4 research mini-blocks */}
      <section>
        <div className="text-center mb-6">
          <h2 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15]">
            Market trends
          </h2>
          <p className="text-[13px] text-carbon/50 mt-1">
            Aimily ya propuso tendencias macro para tu temporada. Activa las que quieras
            mantener y profundiza en lo que necesites.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {(['global', 'deep-dive', 'live-signals', 'competitors'] as const).map((type) => {
            const meta = TREND_META[type];
            const Icon = meta.icon;
            const cards = trends[type];
            const isLoading = trendLoading === type;
            return (
              <div key={type} className="bg-white rounded-[20px] p-6 md:p-8">
                <header className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-carbon/55" />
                      <h3 className="text-[16px] font-semibold text-carbon tracking-[-0.02em]">
                        {meta.label}
                      </h3>
                    </div>
                    <p className="text-[12px] text-carbon/50 mt-1">{meta.hint}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => runTrendResearch(type)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-carbon/[0.12] text-carbon/70 hover:bg-carbon/[0.04] disabled:opacity-50 transition-colors shrink-0"
                  >
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    {cards.length > 0 ? 'Refrescar' : 'Cargar'}
                  </button>
                </header>

                {meta.needsInput && (
                  <input
                    type="text"
                    value={trendInputs[type]}
                    onChange={(e) =>
                      setTrendInputs((prev) => ({ ...prev, [type]: e.target.value }))
                    }
                    placeholder={
                      type === 'deep-dive'
                        ? 'tema (e.g. "renacer del tailoring de bouclé")'
                        : 'marcas a analizar (e.g. "Toteme, Khaite, Lemaire")'
                    }
                    className="w-full mb-3 px-3 py-2 text-[13px] bg-carbon/[0.03] rounded-[10px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none placeholder:text-carbon/30"
                  />
                )}

                {cards.length === 0 && !isLoading && (
                  <p className="text-[12px] text-carbon/40 italic py-2">
                    {meta.needsInput
                      ? 'Escribe un tema y pulsa Cargar.'
                      : 'Aún no se ha cargado.'}
                  </p>
                )}

                <div className="space-y-2">
                  {cards.map((card, i) => {
                    const selected = selectedTrendTitles.has(card.title);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleTrend(card.title)}
                        className={`w-full text-left p-3 rounded-[12px] transition-all flex items-start gap-3 ${
                          selected
                            ? 'bg-carbon text-white'
                            : 'bg-carbon/[0.03] hover:bg-carbon/[0.06] text-carbon/85'
                        }`}
                      >
                        {card.hex && (
                          <span
                            className="w-8 h-8 rounded-[8px] shrink-0 ring-1 ring-black/10"
                            style={{ backgroundColor: card.hex }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium leading-tight">{card.title}</p>
                          {card.desc && (
                            <p
                              className={`text-[12px] mt-1 leading-snug ${
                                selected ? 'text-white/70' : 'text-carbon/50'
                              }`}
                            >
                              {card.desc}
                            </p>
                          )}
                          {card.brands && (
                            <p
                              className={`text-[11px] mt-1 italic ${
                                selected ? 'text-white/55' : 'text-carbon/40'
                              }`}
                            >
                              {card.brands}
                            </p>
                          )}
                        </div>
                        {selected && (
                          <span className="shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Confirm bar */}
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
          {totalSelected} tendencias seleccionadas · {images.length} imágenes
        </p>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function deriveCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // Pre-Sep = SS following year; Sep+ = AW following year.
  if (month >= 8) return `${year + 1} AW`;
  return `${year + 1} SS`;
}

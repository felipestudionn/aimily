'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Star,
  Loader2,
  Upload,
  Image as ImageIcon,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';

interface Asset {
  id: string;
  asset_type: string;
  name: string;
  url: string;
  metadata: Record<string, unknown> | null;
  is_style_memory: boolean;
  style_memory_role: string | null;
  created_at: string;
}

interface AimilyModel {
  id: string;
  name: string;
  headshot_url: string;
  gender: string | null;
  complexion: string | null;
  hair_style: string | null;
  hair_color: string | null;
  description: string | null;
}

interface Project {
  id: string;
  brand_name: string;
  brand_logo_url: string | null;
  brand_palette: string[] | null;
}

interface Props {
  project: Project;
  assets: Asset[];
  models: AimilyModel[];
  outputs_remaining: number;
  pack_count: number;
  isAdmin?: boolean;
}

type OutputType = 'still_life' | 'editorial' | 'tryon';

const STILL_LIFE_SCENES = [
  { key: 'sun_on_stone', label: 'Sun on Stone' },
  { key: 'still_breakfast', label: 'Still Breakfast' },
  { key: 'atelier_floor', label: 'Atelier Floor' },
  { key: 'gallery_plinth', label: 'Gallery Plinth' },
  { key: 'window_light', label: 'Window Light' },
  { key: 'sand_and_shell', label: 'Sand & Shell' },
  { key: 'color_wall', label: 'Color Wall' },
  { key: 'ceramic_still', label: 'Ceramic Still' },
];

const EDITORIAL_SCENES = [
  { key: 'street', label: 'Street' },
  { key: 'cafe', label: 'Café' },
  { key: 'beach', label: 'Beach' },
  { key: 'office', label: 'Office' },
  { key: 'runway', label: 'Runway' },
  { key: 'nature', label: 'Nature' },
  { key: 'urban', label: 'Urban' },
  { key: 'white-studio', label: 'White Studio' },
  { key: 'marble', label: 'Marble' },
  { key: 'gradient', label: 'Gradient' },
];

export default function ProjectWorkspaceClient(props: Props) {
  const router = useRouter();
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [type, setType] = useState<OutputType>('editorial');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [modelId, setModelId] = useState<string | null>(null);
  const [scene, setScene] = useState('');
  const [category, setCategory] = useState<'ROPA' | 'CALZADO' | 'ACCESORIO'>('ROPA');
  const [productName, setProductName] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentAssets, setRecentAssets] = useState<Asset[]>(props.assets);
  const [outputsRemaining, setOutputsRemaining] = useState(props.outputs_remaining);

  const scenes = type === 'still_life' ? STILL_LIFE_SCENES : type === 'editorial' ? EDITORIAL_SCENES : [];

  const handleGenerate = async () => {
    if (!productImageUrl) {
      setError('Sube una foto del producto');
      return;
    }
    if ((type === 'editorial' || type === 'tryon') && !modelId) {
      setError('Selecciona un modelo del casting');
      return;
    }
    // Admin bypass: skip the local budget check. The endpoint will also
    // bypass consume_studio_output for admin, so this is just the UI
    // matching the backend reality.
    if (!props.isAdmin && outputsRemaining <= 0) {
      setError('No tienes outputs disponibles. Compra otro pack.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studio_project_id: props.project.id,
          type,
          product_image_url: productImageUrl,
          reference_image_url: referenceImageUrl || undefined,
          model_id: modelId || undefined,
          scene: scene || undefined,
          category,
          product_name: productName || undefined,
          user_prompt: userPrompt || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');

      // Optimistic add to recent
      setRecentAssets([
        {
          id: json.asset_id,
          asset_type: type,
          name: `${type} — ${productName || 'output'}`,
          url: json.master_url,
          metadata: { provider: json.provider, formats: json.formats },
          is_style_memory: false,
          style_memory_role: null,
          created_at: new Date().toISOString(),
        },
        ...recentAssets,
      ]);
      setOutputsRemaining(json.outputs_remaining);
      setGeneratorOpen(false);
      // Reset some form fields
      setProductImageUrl('');
      setReferenceImageUrl('');
      setUserPrompt('');
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const toggleStyleMemory = async (assetId: string, currentlyMarked: boolean) => {
    try {
      const res = currentlyMarked
        ? await fetch(`/api/studio/style-memory?asset_id=${assetId}`, { method: 'DELETE' })
        : await fetch('/api/studio/style-memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ asset_id: assetId, marked: true, role: 'principal' }),
          });
      if (!res.ok) throw new Error();
      setRecentAssets(
        recentAssets.map((a) => (a.id === assetId ? { ...a, is_style_memory: !currentlyMarked } : a))
      );
    } catch {
      // silent fail
    }
  };

  return (
    <main className="min-h-screen bg-shade px-6 py-12 md:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Back */}
        <Link
          href="/studio"
          className="inline-flex items-center gap-2 text-[13px] text-carbon/50 hover:text-carbon mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Studio
        </Link>

        {/* Header */}
        <header className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-2">
              {props.project.brand_name}
            </p>
            <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.05]">
              Campañas
            </h1>
            <p className="mt-3 text-[14px] text-carbon/50">
              {props.isAdmin
                ? 'Admin · outputs ilimitados (sin descuento de pack)'
                : outputsRemaining > 0
                  ? `${outputsRemaining} outputs disponibles · ${props.pack_count} ${props.pack_count === 1 ? 'pack' : 'packs'}`
                  : '0 outputs · compra un pack para generar'}
            </p>
          </div>

          {props.isAdmin || outputsRemaining > 0 ? (
            <button
              onClick={() => setGeneratorOpen(!generatorOpen)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
            >
              <Plus className="h-4 w-4" />
              Nueva foto
            </button>
          ) : (
            <Link
              href="/studio/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
            >
              <ShoppingBag className="h-4 w-4" />
              Comprar pack
            </Link>
          )}
        </header>

        {/* Generator panel (inline) */}
        {generatorOpen && (
          <div className="bg-white rounded-[20px] p-10 mb-10">
            <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.03em] mb-6">
              Nuevo output
            </h2>

            {error && (
              <div className="mb-6 rounded-[12px] bg-red-50 text-red-800 px-4 py-3 text-[13px]">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Type selector */}
              <div>
                <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                  Tipo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['still_life', 'editorial', 'tryon'] as OutputType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`px-3 py-2.5 rounded-[12px] text-[12px] font-medium transition-colors ${
                        type === t
                          ? 'bg-carbon text-white'
                          : 'bg-carbon/[0.03] text-carbon/60 hover:bg-carbon/[0.06]'
                      }`}
                    >
                      {t === 'still_life' ? 'Still life' : t === 'editorial' ? 'Editorial' : 'Try-on'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                  Categoría
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ROPA', 'CALZADO', 'ACCESORIO'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`px-3 py-2.5 rounded-[12px] text-[12px] font-medium transition-colors ${
                        category === c
                          ? 'bg-carbon text-white'
                          : 'bg-carbon/[0.03] text-carbon/60 hover:bg-carbon/[0.06]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product upload URL */}
              <div className="md:col-span-2">
                <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                  Foto del producto (URL pública)
                </label>
                <input
                  type="url"
                  value={productImageUrl}
                  onChange={(e) => setProductImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30"
                />
                <p className="mt-1.5 text-[11px] text-carbon/40">
                  Para mejor resultado: fondo limpio, buena iluminación. Sin fondo desordenado.
                </p>
              </div>

              {/* Reference (optional, only editorial) */}
              {type === 'editorial' && (
                <div className="md:col-span-2">
                  <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                    Foto de referencia (mood / composición) — opcional
                  </label>
                  <input
                    type="url"
                    value={referenceImageUrl}
                    onChange={(e) => setReferenceImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30"
                  />
                </div>
              )}

              {/* Product name (optional) */}
              <div>
                <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                  Nombre del producto (opcional)
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Vestido Mira / Bolso Nudo / etc."
                  className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30"
                />
              </div>

              {/* Scene */}
              {scenes.length > 0 && (
                <div>
                  <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                    Escena
                  </label>
                  <select
                    value={scene}
                    onChange={(e) => setScene(e.target.value)}
                    className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors"
                  >
                    <option value="">— Elige una —</option>
                    {scenes.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Model casting selector */}
              {(type === 'editorial' || type === 'tryon') && (
                <div className="md:col-span-2">
                  <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                    Modelo del casting Aimily ({props.models.length} disponibles)
                  </label>
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-2 max-h-72 overflow-y-auto p-2 bg-carbon/[0.02] rounded-[12px]">
                    {props.models.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModelId(m.id)}
                        className={`group relative aspect-[3/4] rounded-[10px] overflow-hidden transition-all ${
                          modelId === m.id ? 'ring-2 ring-carbon ring-offset-2 ring-offset-shade scale-105' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.headshot_url} alt={m.name} className="h-full w-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] py-1 px-1.5 text-center truncate">
                          {m.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* User prompt */}
              <div className="md:col-span-2">
                <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                  Dirección artística (opcional)
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  rows={2}
                  placeholder="Toques específicos: mood, paleta, atmósfera..."
                  className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30 resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center pt-6 border-t border-carbon/[0.06]">
              <button
                onClick={() => setGeneratorOpen(false)}
                disabled={generating}
                className="px-5 py-2 text-[13px] font-medium text-carbon/60 hover:text-carbon disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || !productImageUrl}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando (~30s)...
                  </>
                ) : (
                  <>
                    Generar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Empty gallery state */}
        {recentAssets.length === 0 && !generatorOpen && (
          <div className="mx-auto max-w-2xl rounded-[20px] bg-white p-12 md:p-16 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-carbon/[0.04] flex items-center justify-center mb-6">
              <ImageIcon className="h-7 w-7 text-carbon/40" />
            </div>
            <h2 className="text-[24px] md:text-[28px] font-medium text-carbon tracking-[-0.03em] mb-4">
              Tu primera campaña te espera
            </h2>
            <p className="text-[14px] text-carbon/55 leading-[1.7] mb-8">
              Sube una foto de tu producto, elige un modelo del casting Aimily,
              y recibe el editorial en minutos.
            </p>
            {props.isAdmin || outputsRemaining > 0 ? (
              <button
                onClick={() => setGeneratorOpen(true)}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-carbon text-white text-[14px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
              >
                Generar primera foto
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/studio/new"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-carbon text-white text-[14px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
              >
                Comprar pack
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}

        {/* Gallery */}
        {recentAssets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {recentAssets.map((a) => (
              <div key={a.id} className="group relative bg-white rounded-[16px] overflow-hidden">
                <div className="relative aspect-[3/4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                  <button
                    onClick={() => toggleStyleMemory(a.id, a.is_style_memory)}
                    className={`absolute top-3 right-3 h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                      a.is_style_memory
                        ? 'bg-carbon text-white'
                        : 'bg-white/80 text-carbon/40 hover:text-carbon opacity-0 group-hover:opacity-100'
                    }`}
                    title={a.is_style_memory ? 'Quitar de Style Memory' : 'Marcar como brand-correcto'}
                  >
                    <Star className={`h-4 w-4 ${a.is_style_memory ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-[12px] font-medium text-carbon truncate">{a.name}</p>
                  <p className="text-[11px] text-carbon/40 capitalize">{a.asset_type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

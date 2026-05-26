'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2, Link2 } from 'lucide-react';

interface PackTier {
  id: 'capsule' | 'editorial' | 'full_campaign';
  label: string;
  outputs: number;
  priceEur: number;
  description: string;
  highlight: string[];
}

const PACK_TIERS: PackTier[] = [
  {
    id: 'capsule',
    label: 'Capsule',
    outputs: 10,
    priceEur: 49,
    description: 'Tu primer test. 10 fotos editoriales brand-locked.',
    highlight: ['10 fotos editoriales', '12 formatos por foto', '2-3 regens gratis por foto', 'Casting Aimily completo'],
  },
  {
    id: 'editorial',
    label: 'Editorial',
    outputs: 25,
    priceEur: 99,
    description: 'Sesión editorial completa para una campaña.',
    highlight: ['25 fotos editoriales', '12 formatos por foto', '2-3 regens gratis por foto', 'Casting Aimily completo'],
  },
  {
    id: 'full_campaign',
    label: 'Full Campaign',
    outputs: 50,
    priceEur: 199,
    description: 'Campaña + ecommerce + social + variaciones. Para todo.',
    highlight: ['50 fotos editoriales multi-uso', '12 formatos por foto', '2-3 regens gratis por foto', 'Casting Aimily completo'],
  },
];

interface NewProjectClientProps {
  isAdmin?: boolean;
}

interface UserCollection {
  id: string;
  name: string;
  season: string | null;
  brand_name: string | null;
}

type BrandMode = 'new' | 'inherit';

export default function NewProjectClient({ isAdmin = false }: NewProjectClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [brandMode, setBrandMode] = useState<BrandMode>('new');
  const [brandName, setBrandName] = useState('');
  const [palette, setPalette] = useState<string[]>([]);
  const [paletteInput, setPaletteInput] = useState('');
  const [collections, setCollections] = useState<UserCollection[] | null>(null);
  const [sourceCollectionId, setSourceCollectionId] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<PackTier['id'] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the user's collections lazily — only when the inherit option is
  // first opened. Avoids paying for the round-trip if every user picked the
  // default "Brand nuevo" path.
  useEffect(() => {
    if (brandMode !== 'inherit' || collections !== null) return;
    fetch('/api/user/collections')
      .then((r) => (r.ok ? r.json() : { collections: [] }))
      .then((j) => setCollections(j.collections ?? []))
      .catch(() => setCollections([]));
  }, [brandMode, collections]);

  // When the user picks a collection from the dropdown, prefill the visible
  // brand_name field with its name. The CIS-resolved name overrides this at
  // read time on the server (see lib/studio/effective-brand.ts), so this is
  // just the snapshot the project stores as fallback.
  useEffect(() => {
    if (brandMode !== 'inherit' || !sourceCollectionId || !collections) return;
    const col = collections.find((c) => c.id === sourceCollectionId);
    if (col?.brand_name && !brandName) setBrandName(col.brand_name);
  }, [brandMode, sourceCollectionId, collections, brandName]);

  const addColor = () => {
    const c = paletteInput.trim();
    if (!c) return;
    if (!/^#[0-9a-fA-F]{3,8}$/.test(c)) {
      setError('Color must be a hex (e.g. #1a1a1a)');
      return;
    }
    if (palette.length >= 5) {
      setError('Max 5 colors');
      return;
    }
    setPalette([...palette, c]);
    setPaletteInput('');
    setError(null);
  };

  const handleCreateAndCheckout = async () => {
    if (!brandName.trim()) return;
    if (brandMode === 'inherit' && !sourceCollectionId) return;
    // For non-admin users we require a tier (they must pay). Admin can skip.
    if (!isAdmin && !selectedTier) return;
    setSubmitting(true);
    setError(null);

    try {
      // 1. Create project
      const projectRes = await fetch('/api/studio/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: brandName.trim(),
          brand_palette: palette,
          brand_source_collection_id:
            brandMode === 'inherit' && sourceCollectionId
              ? sourceCollectionId
              : undefined,
        }),
      });
      const projectJson = await projectRes.json();
      if (!projectRes.ok || !projectJson.project?.id) {
        throw new Error(projectJson.error || 'Failed to create project');
      }
      const projectId = projectJson.project.id;

      // 2a. Admin path: skip checkout entirely, go straight to workspace
      if (isAdmin) {
        router.push(`/studio/${projectId}`);
        return;
      }

      // 2b. Regular path: create Stripe checkout session
      const checkoutRes = await fetch('/api/studio/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studio_project_id: projectId,
          tier: selectedTier,
        }),
      });
      const checkoutJson = await checkoutRes.json();
      if (!checkoutRes.ok || !checkoutJson.url) {
        throw new Error(checkoutJson.error || 'Failed to create checkout');
      }

      // 3. Redirect to Stripe-hosted checkout
      window.location.href = checkoutJson.url;
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-shade px-6 py-12 md:px-12">
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <Link
          href="/studio"
          className="inline-flex items-center gap-2 text-[13px] text-carbon/50 hover:text-carbon mb-8 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Studio
        </Link>

        {/* Header */}
        <header className="mb-10">
          <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-2">
            Aimily Studio · {step === 1 ? 'Nuevo proyecto' : 'Elige pack'}
          </p>
          <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.05]">
            {step === 1 ? 'Tu marca' : 'Tu primer pack'}
          </h1>
        </header>

        {error && (
          <div className="mb-6 rounded-[12px] bg-red-50 text-red-800 px-4 py-3 text-[13px]">
            {error}
          </div>
        )}

        {/* Step 1: Brand info */}
        {step === 1 && (
          <div className="bg-white rounded-[20px] p-10 md:p-14 max-w-2xl">
            <div className="space-y-6">
              {/* Brand source toggle — pick a fresh brand, or inherit live
                  from one of the user's collections. Hidden if the user
                  has no collections (Studio-only subscribers stay on the
                  current standalone flow without seeing dead UI). */}
              {(collections === null || collections.length > 0) && (
                <div>
                  <label className="block text-[13px] font-medium text-carbon/70 mb-3 tracking-[-0.02em]">
                    De dónde sale el brand
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBrandMode('new')}
                      className={`text-left rounded-[12px] border p-4 transition-all ${
                        brandMode === 'new'
                          ? 'border-carbon bg-carbon/[0.02]'
                          : 'border-carbon/[0.08] hover:border-carbon/30'
                      }`}
                    >
                      <div className="text-[13px] font-semibold text-carbon mb-1">
                        Brand nuevo
                      </div>
                      <div className="text-[12px] text-carbon/55 leading-[1.5]">
                        Empieza limpio. Tú escribes el nombre y la paleta para este proyecto.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrandMode('inherit')}
                      className={`text-left rounded-[12px] border p-4 transition-all ${
                        brandMode === 'inherit'
                          ? 'border-carbon bg-carbon/[0.02]'
                          : 'border-carbon/[0.08] hover:border-carbon/30'
                      }`}
                    >
                      <div className="text-[13px] font-semibold text-carbon mb-1 inline-flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5" />
                        Heredar de mi colección
                      </div>
                      <div className="text-[12px] text-carbon/55 leading-[1.5]">
                        El brand del proyecto se sincroniza en vivo con el de una de tus colecciones aimily 360.
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {brandMode === 'inherit' && (
                <div>
                  <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                    Colección fuente
                  </label>
                  {collections === null ? (
                    <div className="text-[12px] text-carbon/45 px-4 py-3 bg-carbon/[0.03] rounded-[12px]">
                      Cargando tus colecciones…
                    </div>
                  ) : (
                    <select
                      value={sourceCollectionId}
                      onChange={(e) => setSourceCollectionId(e.target.value)}
                      className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors"
                    >
                      <option value="">— Elige una colección —</option>
                      {collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.brand_name && c.brand_name !== c.name ? ` · ${c.brand_name}` : ''}
                          {c.season ? ` (${c.season})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {sourceCollectionId && (
                    <p className="mt-2 text-[12px] text-carbon/50 leading-[1.5]">
                      El nombre y la paleta de esta colección se aplicarán en vivo. Si cambias el brand en la colección, este Studio se actualiza.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                  Nombre de la marca
                  {brandMode === 'inherit' && sourceCollectionId && (
                    <span className="ml-2 text-[11px] text-carbon/40 font-normal">(snapshot — el servidor sirve el de la colección)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  maxLength={200}
                  placeholder="Mi marca"
                  className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                  Paleta de marca <span className="text-carbon/40">(opcional, max 5)</span>
                </label>
                <div className="flex gap-2 flex-wrap mb-3">
                  {palette.map((c, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-carbon/[0.05] text-[12px]"
                    >
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />
                      <span className="font-mono">{c}</span>
                      <button
                        onClick={() => setPalette(palette.filter((_, j) => j !== i))}
                        className="text-carbon/40 hover:text-carbon"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={paletteInput}
                    onChange={(e) => setPaletteInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                    placeholder="#1a1a1a"
                    className="flex-1 px-4 py-3 text-sm font-mono text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30"
                  />
                  <button
                    onClick={addColor}
                    disabled={!paletteInput.trim() || palette.length >= 5}
                    className="px-5 py-3 rounded-full bg-carbon/[0.04] text-[13px] font-medium text-carbon/70 hover:bg-carbon/[0.08] disabled:opacity-50"
                  >
                    Añadir
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                {isAdmin ? (
                  <button
                    onClick={handleCreateAndCheckout}
                    disabled={!brandName.trim() || (brandMode === 'inherit' && !sourceCollectionId) || submitting}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        Crear proyecto (admin)
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => brandName.trim() && !(brandMode === 'inherit' && !sourceCollectionId) && setStep(2)}
                    disabled={!brandName.trim() || (brandMode === 'inherit' && !sourceCollectionId)}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90 disabled:opacity-50"
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Pack selector */}
        {step === 2 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
              {PACK_TIERS.map((pack) => {
                const selected = selectedTier === pack.id;
                return (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedTier(pack.id)}
                    className={`relative text-left rounded-[20px] p-10 transition-all ${
                      selected
                        ? 'bg-white ring-2 ring-carbon scale-[1.02]'
                        : 'bg-white hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]'
                    }`}
                  >
                    <div className="flex items-baseline justify-between mb-6">
                      <h3 className="text-[24px] font-semibold text-carbon tracking-[-0.03em]">
                        {pack.label}
                      </h3>
                      {selected && (
                        <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-carbon text-white">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    <p className="text-[36px] font-semibold text-carbon tracking-[-0.03em] mb-1">
                      €{pack.priceEur}
                    </p>
                    <p className="text-[13px] text-carbon/40 mb-6">pago único</p>

                    <p className="text-[13px] text-carbon/60 mb-6 leading-[1.6]">
                      {pack.description}
                    </p>

                    <ul className="space-y-2">
                      {pack.highlight.map((h) => (
                        <li key={h} className="flex items-start gap-2 text-[13px] text-carbon/70">
                          <Check className="h-3.5 w-3.5 text-carbon/40 mt-1 flex-shrink-0" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium text-carbon/60 hover:bg-carbon/[0.04] disabled:opacity-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Atrás
              </button>
              <button
                onClick={handleCreateAndCheckout}
                disabled={!selectedTier || submitting}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    Comprar y empezar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

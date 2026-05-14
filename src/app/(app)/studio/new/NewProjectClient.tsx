'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';

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

export default function NewProjectClient() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [brandName, setBrandName] = useState('');
  const [palette, setPalette] = useState<string[]>([]);
  const [paletteInput, setPaletteInput] = useState('');
  const [selectedTier, setSelectedTier] = useState<PackTier['id'] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!brandName.trim() || !selectedTier) return;
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
        }),
      });
      const projectJson = await projectRes.json();
      if (!projectRes.ok || !projectJson.project?.id) {
        throw new Error(projectJson.error || 'Failed to create project');
      }
      const projectId = projectJson.project.id;

      // 2. Create checkout session
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
              <div>
                <label className="block text-[13px] font-medium text-carbon/70 mb-2 tracking-[-0.02em]">
                  Nombre de la marca
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
                <button
                  onClick={() => brandName.trim() && setStep(2)}
                  disabled={!brandName.trim()}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90 disabled:opacity-50"
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </button>
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

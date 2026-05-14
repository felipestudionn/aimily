/* ═══════════════════════════════════════════════════════════════════════════
   /[locale]/studio — Aimily Studio public landing.

   Wedge product landing — focused on content creation only (no full-collection
   pitch). Sells the 3 packs (Capsule / Editorial / Full Campaign), the
   curated casting, and brand-locked outputs.
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/server-session';
import { ArrowRight, Check, Sparkles, Camera, Layers, Globe } from 'lucide-react';

export default async function StudioLandingPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { user } = await getServerSession();
  // If already authenticated, go straight into the app. Match the home
  // page redirect pattern.
  if (user) {
    redirect('/studio');
  }

  const { locale } = await props.params;

  return (
    <main className="min-h-screen bg-shade">
      {/* Hero */}
      <section className="px-6 py-20 md:px-12 md:py-32">
        <div className="mx-auto max-w-5xl text-center">
          <p className="inline-flex items-center gap-2 text-[13px] font-medium text-carbon/50 tracking-[-0.02em] mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Aimily Studio
          </p>
          <h1 className="text-[44px] md:text-[64px] lg:text-[80px] font-medium text-carbon tracking-[-0.04em] leading-[1.02] mb-6">
            AI fashion content,<br />
            brand-locked,<br />
            <span className="text-carbon/40">en minutos.</span>
          </h1>
          <p className="text-[16px] md:text-[18px] text-carbon/55 max-w-2xl mx-auto leading-[1.6] mb-10">
            Casting curado, producto preservado, 12 formatos por foto.
            Lista para Instagram, TikTok, web, ecommerce y print —
            sin shoot, sin retoque, sin compromiso.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href={`/auth/sign-up?next=/studio`}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-carbon text-white text-[14px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
            >
              Empezar
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white border border-carbon/[0.1] text-[14px] font-semibold text-carbon hover:bg-carbon/[0.04] transition-all"
            >
              Ver precios
            </a>
          </div>
        </div>
      </section>

      {/* Features 3-col gold standard */}
      <section className="px-6 py-12 md:px-12 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Camera,
                title: 'Casting curado',
                desc: 'Modelos seleccionados como una agencia real: archetypes contemporary, raw, editorial, commercial, avant-garde. Acceso completo desde el primer pack.',
              },
              {
                icon: Layers,
                title: 'Producto preservado',
                desc: 'Subes una foto de tu producto. El sistema lo respeta píxel a píxel — silueta, materiales, colorway. Cero invenciones.',
              },
              {
                icon: Globe,
                title: '12 formatos por foto',
                desc: 'Instagram cuadrado / portrait / story · TikTok · Pinterest · Facebook · LinkedIn · Twitter · web · ecommerce · print A4 · email. Sin coste extra.',
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-white rounded-[20px] p-10 md:p-14 min-h-[300px]">
                  <Icon className="h-7 w-7 text-carbon/30 mb-8" />
                  <h3 className="text-[24px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-4">
                    {f.title}
                  </h3>
                  <p className="text-[14px] text-carbon/55 leading-[1.7]">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-12 md:px-12 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">
              Pago único · sin suscripción
            </p>
            <h2 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.1]">
              Tres packs, una decisión.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                tier: 'capsule',
                label: 'Capsule',
                price: 49,
                outputs: 10,
                description: 'Tu primer test.',
                highlight: ['10 fotos editoriales', '12 formatos por foto', 'Brand-locked', 'Casting completo'],
              },
              {
                tier: 'editorial',
                label: 'Editorial',
                price: 99,
                outputs: 25,
                description: 'Una campaña completa.',
                highlight: ['25 fotos editoriales', '12 formatos por foto', 'Brand-locked', 'Casting completo'],
                featured: true,
              },
              {
                tier: 'full_campaign',
                label: 'Full Campaign',
                price: 199,
                outputs: 50,
                description: 'Multi-uso: campaña + ecom + social.',
                highlight: ['50 fotos editoriales multi-uso', '12 formatos por foto', 'Brand-locked', 'Casting completo'],
              },
            ].map((p) => (
              <div
                key={p.tier}
                className={`relative bg-white rounded-[20px] p-10 transition-all hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] ${
                  p.featured ? 'ring-2 ring-carbon' : ''
                }`}
              >
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-1 rounded-full bg-carbon text-white text-[11px] font-semibold tracking-[0.05em] uppercase">
                    Más popular
                  </div>
                )}
                <h3 className="text-[24px] font-semibold text-carbon tracking-[-0.03em] mb-6">
                  {p.label}
                </h3>
                <p className="text-[40px] font-semibold text-carbon tracking-[-0.03em] leading-none mb-1">
                  €{p.price}
                </p>
                <p className="text-[13px] text-carbon/40 mb-6">pago único</p>
                <p className="text-[13px] text-carbon/60 mb-6 leading-[1.6]">{p.description}</p>
                <ul className="space-y-2 mb-8">
                  {p.highlight.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-[13px] text-carbon/70">
                      <Check className="h-3.5 w-3.5 text-carbon/40 mt-1 flex-shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/auth/sign-up?next=/studio/new&tier=${p.tier}`}
                  className="inline-flex items-center gap-2 w-full justify-center px-5 py-3 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
                >
                  Empezar con {p.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-[12px] text-carbon/40 mt-10">
            Hecho en Europa · EU AI Act ready · Sin suscripción · Sin compromiso
          </p>
        </div>
      </section>

      {/* Bridge to Aimily 360 (discreet, no invasive) */}
      <section className="px-6 py-20 md:px-12 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[28px] md:text-[36px] font-medium text-carbon tracking-[-0.03em] leading-[1.1] mb-4">
            ¿Lanzas marca completa?
          </h2>
          <p className="text-[14px] text-carbon/55 max-w-xl mx-auto leading-[1.7] mb-8">
            Aimily 360 planifica tu colección entera — assortment, pricing,
            tech pack, proveedores, producción, marketing y storefront. Studio
            es solo el primer paso.
          </p>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-[14px] font-medium text-carbon hover:text-carbon/80 transition-colors"
          >
            Conoce Aimily 360
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

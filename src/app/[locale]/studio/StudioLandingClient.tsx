'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   StudioLandingClient — the visible part of /[locale]/studio.

   Inline i18n dictionary (one place, no globals to maintain) for the 9
   locales. Tier names and price numbers stay literal — they're product SKU
   labels, not translatable copy.

   CTAs open the shared AuthModal in signup mode. We persist the chosen
   tier in localStorage so the post-signup in-product router can route the
   user straight to /studio/new?tier=…
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, Camera, Layers, Globe } from 'lucide-react';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { AuthModal } from '@/components/auth/AuthModal';

type StudioCopy = {
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  titleLine3: string;
  subtitle: string;
  ctaStart: string;
  ctaPricing: string;
  featureCastingTitle: string;
  featureCastingBody: string;
  featureProductTitle: string;
  featureProductBody: string;
  featureFormatsTitle: string;
  featureFormatsBody: string;
  pricingEyebrow: string;
  pricingTitle: string;
  capsuleDesc: string;
  editorialDesc: string;
  fullCampaignDesc: string;
  paymentOnce: string;
  mostPopular: string;
  bulletPhotos: (n: number) => string;
  bulletFormats: string;
  bulletBrandLocked: string;
  bulletCasting: string;
  startWith: string;
  footerNote: string;
  bridgeTitle: string;
  bridgeBody: string;
  bridgeCta: string;
};

const STUDIO_COPY: Record<Language, StudioCopy> = {
  en: {
    eyebrow: 'Aimily Studio',
    titleLine1: 'AI fashion content,',
    titleLine2: 'brand-locked,',
    titleLine3: 'in minutes.',
    subtitle: 'Curated casting, product preserved, 12 formats per photo. Ready for Instagram, TikTok, web, e-commerce and print — no shoot, no retouching, no commitment.',
    ctaStart: 'Get started',
    ctaPricing: 'See pricing',
    featureCastingTitle: 'Curated casting',
    featureCastingBody: 'Models picked like a real agency: contemporary, raw, editorial, commercial, avant-garde archetypes. Full access from the first pack.',
    featureProductTitle: 'Product preserved',
    featureProductBody: 'Upload a product photo. The system respects it pixel by pixel — silhouette, materials, colorway. Zero inventions.',
    featureFormatsTitle: '12 formats per photo',
    featureFormatsBody: 'Instagram square / portrait / story · TikTok · Pinterest · Facebook · LinkedIn · X · web · e-commerce · print A4 · email. No extra cost.',
    pricingEyebrow: 'One-time payment · no subscription',
    pricingTitle: 'Three packs, one decision.',
    capsuleDesc: 'Your first test.',
    editorialDesc: 'A complete campaign.',
    fullCampaignDesc: 'Multi-use: campaign + ecom + social.',
    paymentOnce: 'one-time payment',
    mostPopular: 'Most popular',
    bulletPhotos: (n) => `${n} editorial photos`,
    bulletFormats: '12 formats per photo',
    bulletBrandLocked: 'Brand-locked',
    bulletCasting: 'Full casting access',
    startWith: 'Start with',
    footerNote: 'Made in Europe · EU AI Act ready · No subscription · No commitment',
    bridgeTitle: 'Launching a full brand?',
    bridgeBody: 'aimily 360 plans your whole collection — assortment, pricing, tech pack, suppliers, production, marketing and storefront. Studio is only the first step.',
    bridgeCta: 'Discover aimily 360',
  },
  es: {
    eyebrow: 'Aimily Studio',
    titleLine1: 'Contenido de moda con IA,',
    titleLine2: 'brand-locked,',
    titleLine3: 'en minutos.',
    subtitle: 'Casting curado, producto preservado, 12 formatos por foto. Listo para Instagram, TikTok, web, ecommerce y print — sin shoot, sin retoque, sin compromiso.',
    ctaStart: 'Empezar',
    ctaPricing: 'Ver precios',
    featureCastingTitle: 'Casting curado',
    featureCastingBody: 'Modelos seleccionados como una agencia real: archetypes contemporary, raw, editorial, commercial, avant-garde. Acceso completo desde el primer pack.',
    featureProductTitle: 'Producto preservado',
    featureProductBody: 'Subes una foto de tu producto. El sistema lo respeta píxel a píxel — silueta, materiales, colorway. Cero invenciones.',
    featureFormatsTitle: '12 formatos por foto',
    featureFormatsBody: 'Instagram cuadrado / portrait / story · TikTok · Pinterest · Facebook · LinkedIn · X · web · ecommerce · print A4 · email. Sin coste extra.',
    pricingEyebrow: 'Pago único · sin suscripción',
    pricingTitle: 'Tres packs, una decisión.',
    capsuleDesc: 'Tu primer test.',
    editorialDesc: 'Una campaña completa.',
    fullCampaignDesc: 'Multi-uso: campaña + ecom + social.',
    paymentOnce: 'pago único',
    mostPopular: 'Más popular',
    bulletPhotos: (n) => `${n} fotos editoriales`,
    bulletFormats: '12 formatos por foto',
    bulletBrandLocked: 'Brand-locked',
    bulletCasting: 'Acceso completo al casting',
    startWith: 'Empezar con',
    footerNote: 'Hecho en Europa · EU AI Act ready · Sin suscripción · Sin compromiso',
    bridgeTitle: '¿Lanzas marca completa?',
    bridgeBody: 'aimily 360 planifica tu colección entera — assortment, pricing, tech pack, proveedores, producción, marketing y storefront. Studio es solo el primer paso.',
    bridgeCta: 'Conoce aimily 360',
  },
  fr: {
    eyebrow: 'Aimily Studio',
    titleLine1: 'Contenu mode IA,',
    titleLine2: 'brand-locked,',
    titleLine3: 'en minutes.',
    subtitle: 'Casting curé, produit préservé, 12 formats par photo. Prêt pour Instagram, TikTok, web, e-commerce et print — sans shoot, sans retouche, sans engagement.',
    ctaStart: 'Commencer',
    ctaPricing: 'Voir les prix',
    featureCastingTitle: 'Casting curé',
    featureCastingBody: 'Mannequins sélectionnés comme une vraie agence : archétypes contemporary, raw, editorial, commercial, avant-garde. Accès complet dès le premier pack.',
    featureProductTitle: 'Produit préservé',
    featureProductBody: 'Téléverse une photo de ton produit. Le système la respecte pixel par pixel — silhouette, matières, colorway. Zéro invention.',
    featureFormatsTitle: '12 formats par photo',
    featureFormatsBody: 'Instagram carré / portrait / story · TikTok · Pinterest · Facebook · LinkedIn · X · web · e-commerce · print A4 · email. Sans coût supplémentaire.',
    pricingEyebrow: 'Paiement unique · sans abonnement',
    pricingTitle: 'Trois packs, une décision.',
    capsuleDesc: 'Ton premier test.',
    editorialDesc: 'Une campagne complète.',
    fullCampaignDesc: 'Multi-usage : campagne + ecom + social.',
    paymentOnce: 'paiement unique',
    mostPopular: 'Le plus populaire',
    bulletPhotos: (n) => `${n} photos éditoriales`,
    bulletFormats: '12 formats par photo',
    bulletBrandLocked: 'Brand-locked',
    bulletCasting: 'Accès complet au casting',
    startWith: 'Commencer avec',
    footerNote: 'Made in Europe · EU AI Act ready · Sans abonnement · Sans engagement',
    bridgeTitle: 'Tu lances une marque complète ?',
    bridgeBody: 'aimily 360 planifie toute ta collection — assortment, pricing, tech pack, fournisseurs, production, marketing et storefront. Studio n\'est que le premier pas.',
    bridgeCta: 'Découvrir aimily 360',
  },
  it: {
    eyebrow: 'Aimily Studio',
    titleLine1: 'Contenuti di moda con IA,',
    titleLine2: 'brand-locked,',
    titleLine3: 'in minuti.',
    subtitle: 'Casting curato, prodotto preservato, 12 formati per foto. Pronto per Instagram, TikTok, web, e-commerce e print — senza shoot, senza ritocco, senza impegno.',
    ctaStart: 'Inizia',
    ctaPricing: 'Vedi i prezzi',
    featureCastingTitle: 'Casting curato',
    featureCastingBody: 'Modelli scelti come una vera agenzia: archetipi contemporary, raw, editorial, commercial, avant-garde. Accesso completo dal primo pack.',
    featureProductTitle: 'Prodotto preservato',
    featureProductBody: 'Carichi una foto del tuo prodotto. Il sistema lo rispetta pixel per pixel — silhouette, materiali, colorway. Zero invenzioni.',
    featureFormatsTitle: '12 formati per foto',
    featureFormatsBody: 'Instagram quadrato / portrait / story · TikTok · Pinterest · Facebook · LinkedIn · X · web · e-commerce · print A4 · email. Senza costo aggiuntivo.',
    pricingEyebrow: 'Pagamento unico · senza abbonamento',
    pricingTitle: 'Tre pack, una decisione.',
    capsuleDesc: 'Il tuo primo test.',
    editorialDesc: 'Una campagna completa.',
    fullCampaignDesc: 'Multi-uso: campagna + ecom + social.',
    paymentOnce: 'pagamento unico',
    mostPopular: 'Più popolare',
    bulletPhotos: (n) => `${n} foto editoriali`,
    bulletFormats: '12 formati per foto',
    bulletBrandLocked: 'Brand-locked',
    bulletCasting: 'Accesso completo al casting',
    startWith: 'Inizia con',
    footerNote: 'Made in Europe · EU AI Act ready · Senza abbonamento · Senza impegno',
    bridgeTitle: 'Lanci un brand completo?',
    bridgeBody: 'aimily 360 pianifica l\'intera collezione — assortment, pricing, tech pack, fornitori, produzione, marketing e storefront. Studio è solo il primo passo.',
    bridgeCta: 'Scopri aimily 360',
  },
  de: {
    eyebrow: 'Aimily Studio',
    titleLine1: 'KI-Mode-Content,',
    titleLine2: 'brand-locked,',
    titleLine3: 'in Minuten.',
    subtitle: 'Kuratiertes Casting, Produkt erhalten, 12 Formate pro Foto. Bereit für Instagram, TikTok, Web, E-Commerce und Print — kein Shoot, kein Retouching, keine Bindung.',
    ctaStart: 'Loslegen',
    ctaPricing: 'Preise ansehen',
    featureCastingTitle: 'Kuratiertes Casting',
    featureCastingBody: 'Modelle wie bei einer echten Agentur: contemporary, raw, editorial, commercial, avant-garde Archetypen. Voller Zugang ab dem ersten Pack.',
    featureProductTitle: 'Produkt erhalten',
    featureProductBody: 'Lade ein Produktfoto hoch. Das System respektiert es Pixel für Pixel — Silhouette, Materialien, Colorway. Null Erfindungen.',
    featureFormatsTitle: '12 Formate pro Foto',
    featureFormatsBody: 'Instagram quadratisch / Portrait / Story · TikTok · Pinterest · Facebook · LinkedIn · X · Web · E-Commerce · Print A4 · E-Mail. Ohne Aufpreis.',
    pricingEyebrow: 'Einmalzahlung · kein Abo',
    pricingTitle: 'Drei Packs, eine Entscheidung.',
    capsuleDesc: 'Dein erster Test.',
    editorialDesc: 'Eine komplette Kampagne.',
    fullCampaignDesc: 'Multi-Use: Kampagne + E-Com + Social.',
    paymentOnce: 'Einmalzahlung',
    mostPopular: 'Am beliebtesten',
    bulletPhotos: (n) => `${n} Editorial-Fotos`,
    bulletFormats: '12 Formate pro Foto',
    bulletBrandLocked: 'Brand-locked',
    bulletCasting: 'Voller Casting-Zugang',
    startWith: 'Starte mit',
    footerNote: 'Made in Europe · EU AI Act ready · Kein Abo · Keine Bindung',
    bridgeTitle: 'Du startest eine ganze Marke?',
    bridgeBody: 'aimily 360 plant deine gesamte Kollektion — Assortment, Pricing, Tech Pack, Lieferanten, Produktion, Marketing und Storefront. Studio ist nur der erste Schritt.',
    bridgeCta: 'aimily 360 entdecken',
  },
  pt: {
    eyebrow: 'Aimily Studio',
    titleLine1: 'Conteúdo de moda com IA,',
    titleLine2: 'brand-locked,',
    titleLine3: 'em minutos.',
    subtitle: 'Casting curado, produto preservado, 12 formatos por foto. Pronto para Instagram, TikTok, web, e-commerce e print — sem shoot, sem retoque, sem compromisso.',
    ctaStart: 'Começar',
    ctaPricing: 'Ver preços',
    featureCastingTitle: 'Casting curado',
    featureCastingBody: 'Modelos escolhidos como uma agência real: arquétipos contemporary, raw, editorial, commercial, avant-garde. Acesso completo desde o primeiro pack.',
    featureProductTitle: 'Produto preservado',
    featureProductBody: 'Carregas uma foto do teu produto. O sistema respeita-a píxel a píxel — silhueta, materiais, colorway. Zero invenções.',
    featureFormatsTitle: '12 formatos por foto',
    featureFormatsBody: 'Instagram quadrado / portrait / story · TikTok · Pinterest · Facebook · LinkedIn · X · web · e-commerce · print A4 · email. Sem custo extra.',
    pricingEyebrow: 'Pagamento único · sem assinatura',
    pricingTitle: 'Três packs, uma decisão.',
    capsuleDesc: 'O teu primeiro teste.',
    editorialDesc: 'Uma campanha completa.',
    fullCampaignDesc: 'Multi-uso: campanha + ecom + social.',
    paymentOnce: 'pagamento único',
    mostPopular: 'Mais popular',
    bulletPhotos: (n) => `${n} fotos editoriais`,
    bulletFormats: '12 formatos por foto',
    bulletBrandLocked: 'Brand-locked',
    bulletCasting: 'Acesso completo ao casting',
    startWith: 'Começar com',
    footerNote: 'Feito na Europa · EU AI Act ready · Sem assinatura · Sem compromisso',
    bridgeTitle: 'Lanças uma marca completa?',
    bridgeBody: 'aimily 360 planifica a tua coleção inteira — assortment, pricing, tech pack, fornecedores, produção, marketing e storefront. Studio é só o primeiro passo.',
    bridgeCta: 'Conhecer aimily 360',
  },
  nl: {
    eyebrow: 'Aimily Studio',
    titleLine1: 'AI-mode-content,',
    titleLine2: 'brand-locked,',
    titleLine3: 'in minuten.',
    subtitle: 'Gecureerd casting, product behouden, 12 formaten per foto. Klaar voor Instagram, TikTok, web, e-commerce en print — geen shoot, geen retouche, geen verplichting.',
    ctaStart: 'Beginnen',
    ctaPricing: 'Prijzen bekijken',
    featureCastingTitle: 'Gecureerd casting',
    featureCastingBody: 'Modellen gekozen als een echte agency: contemporary, raw, editorial, commercial, avant-garde archetypes. Volledige toegang vanaf het eerste pack.',
    featureProductTitle: 'Product behouden',
    featureProductBody: 'Upload een productfoto. Het systeem respecteert het pixel voor pixel — silhouet, materialen, colorway. Nul verzinsels.',
    featureFormatsTitle: '12 formaten per foto',
    featureFormatsBody: 'Instagram vierkant / portrait / story · TikTok · Pinterest · Facebook · LinkedIn · X · web · e-commerce · print A4 · e-mail. Zonder extra kosten.',
    pricingEyebrow: 'Eenmalige betaling · geen abonnement',
    pricingTitle: 'Drie packs, één beslissing.',
    capsuleDesc: 'Jouw eerste test.',
    editorialDesc: 'Een complete campagne.',
    fullCampaignDesc: 'Multi-use: campagne + ecom + social.',
    paymentOnce: 'eenmalige betaling',
    mostPopular: 'Meest populair',
    bulletPhotos: (n) => `${n} editoriale foto's`,
    bulletFormats: '12 formaten per foto',
    bulletBrandLocked: 'Brand-locked',
    bulletCasting: 'Volledige casting-toegang',
    startWith: 'Beginnen met',
    footerNote: 'Made in Europe · EU AI Act ready · Geen abonnement · Geen verplichting',
    bridgeTitle: 'Lanceer je een volledig merk?',
    bridgeBody: 'aimily 360 plant je hele collectie — assortment, pricing, tech pack, leveranciers, productie, marketing en storefront. Studio is alleen de eerste stap.',
    bridgeCta: 'Ontdek aimily 360',
  },
  no: {
    eyebrow: 'Aimily Studio',
    titleLine1: 'AI-motekontent,',
    titleLine2: 'brand-locked,',
    titleLine3: 'på minutter.',
    subtitle: 'Kuratert casting, produkt bevart, 12 formater per bilde. Klar for Instagram, TikTok, web, e-handel og print — uten shoot, uten retusj, uten forpliktelse.',
    ctaStart: 'Kom i gang',
    ctaPricing: 'Se priser',
    featureCastingTitle: 'Kuratert casting',
    featureCastingBody: 'Modeller plukket ut som et ekte byrå: contemporary, raw, editorial, commercial, avant-garde arketyper. Full tilgang fra første pack.',
    featureProductTitle: 'Produkt bevart',
    featureProductBody: 'Last opp et produktbilde. Systemet respekterer det piksel for piksel — silhuett, materialer, colorway. Null oppfinnelser.',
    featureFormatsTitle: '12 formater per bilde',
    featureFormatsBody: 'Instagram kvadrat / portrait / story · TikTok · Pinterest · Facebook · LinkedIn · X · web · e-handel · print A4 · e-post. Uten ekstra kostnad.',
    pricingEyebrow: 'Engangsbetaling · ingen abonnement',
    pricingTitle: 'Tre packs, én beslutning.',
    capsuleDesc: 'Din første test.',
    editorialDesc: 'En komplett kampanje.',
    fullCampaignDesc: 'Multi-bruk: kampanje + e-com + social.',
    paymentOnce: 'engangsbetaling',
    mostPopular: 'Mest populær',
    bulletPhotos: (n) => `${n} redaksjonelle bilder`,
    bulletFormats: '12 formater per bilde',
    bulletBrandLocked: 'Brand-locked',
    bulletCasting: 'Full casting-tilgang',
    startWith: 'Start med',
    footerNote: 'Laget i Europa · EU AI Act ready · Ingen abonnement · Ingen forpliktelse',
    bridgeTitle: 'Lanserer du et helt merke?',
    bridgeBody: 'aimily 360 planlegger hele kolleksjonen din — assortment, pricing, tech pack, leverandører, produksjon, markedsføring og storefront. Studio er bare første steg.',
    bridgeCta: 'Oppdag aimily 360',
  },
  sv: {
    eyebrow: 'Aimily Studio',
    titleLine1: 'AI-modeinnehåll,',
    titleLine2: 'brand-locked,',
    titleLine3: 'på minuter.',
    subtitle: 'Kurerad casting, produkt bevarad, 12 format per foto. Redo för Instagram, TikTok, webb, e-handel och print — utan shoot, utan retusch, utan åtagande.',
    ctaStart: 'Kom igång',
    ctaPricing: 'Se priser',
    featureCastingTitle: 'Kurerad casting',
    featureCastingBody: 'Modeller utvalda som en riktig byrå: contemporary, raw, editorial, commercial, avant-garde arketyper. Full åtkomst från första pack.',
    featureProductTitle: 'Produkt bevarad',
    featureProductBody: 'Ladda upp ett produktfoto. Systemet respekterar det pixel för pixel — siluett, material, colorway. Noll uppfinningar.',
    featureFormatsTitle: '12 format per foto',
    featureFormatsBody: 'Instagram kvadrat / portrait / story · TikTok · Pinterest · Facebook · LinkedIn · X · webb · e-handel · print A4 · e-post. Utan extra kostnad.',
    pricingEyebrow: 'Engångsbetalning · inget abonnemang',
    pricingTitle: 'Tre packs, ett beslut.',
    capsuleDesc: 'Ditt första test.',
    editorialDesc: 'En komplett kampanj.',
    fullCampaignDesc: 'Multi-användning: kampanj + e-com + social.',
    paymentOnce: 'engångsbetalning',
    mostPopular: 'Mest populär',
    bulletPhotos: (n) => `${n} redaktionella bilder`,
    bulletFormats: '12 format per foto',
    bulletBrandLocked: 'Brand-locked',
    bulletCasting: 'Full casting-åtkomst',
    startWith: 'Börja med',
    footerNote: 'Tillverkad i Europa · EU AI Act ready · Inget abonnemang · Inget åtagande',
    bridgeTitle: 'Lanserar du ett helt varumärke?',
    bridgeBody: 'aimily 360 planerar hela din kollektion — assortment, pricing, tech pack, leverantörer, produktion, marknadsföring och storefront. Studio är bara första steget.',
    bridgeCta: 'Upptäck aimily 360',
  },
};

const TIERS = [
  { tier: 'capsule', label: 'Capsule', price: 49, outputs: 10 },
  { tier: 'editorial', label: 'Editorial', price: 99, outputs: 25, featured: true },
  { tier: 'full_campaign', label: 'Full Campaign', price: 199, outputs: 50 },
];

export default function StudioLandingClient() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = STUDIO_COPY[language] ?? STUDIO_COPY.en;
  const [authOpen, setAuthOpen] = useState(false);

  const openSignup = (tier?: string) => {
    // Persist intent so the post-signup router can land users on
    // /studio/new?tier=X with the right pack pre-selected.
    if (tier && typeof window !== 'undefined') {
      try {
        localStorage.setItem('aimily.studio.intentTier', tier);
      } catch {
        // Storage blocked (private mode / iframe) — silent. The user lands
        // on /my-collections instead and picks the tier in-product.
      }
    }
    setAuthOpen(true);
  };

  return (
    <main className="min-h-screen bg-shade">
      {/* Hero */}
      <section className="px-6 pt-32 pb-20 md:px-12 md:pt-40 md:pb-32">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-[13px] font-medium text-carbon/50 tracking-[-0.02em] mb-6">
            {t.eyebrow}
          </p>
          <h1 className="text-[44px] md:text-[64px] lg:text-[80px] font-medium text-carbon tracking-[-0.04em] leading-[1.02] mb-6">
            {t.titleLine1}<br />
            {t.titleLine2}<br />
            <span className="text-carbon/40">{t.titleLine3}</span>
          </h1>
          <p className="text-[16px] md:text-[18px] text-carbon/55 max-w-2xl mx-auto leading-[1.6] mb-10">
            {t.subtitle}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => openSignup()}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-carbon text-white text-[14px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
            >
              {t.ctaStart}
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white border border-carbon/[0.1] text-[14px] font-semibold text-carbon hover:bg-carbon/[0.04] transition-all"
            >
              {t.ctaPricing}
            </a>
          </div>
        </div>
      </section>

      {/* Features 3-col gold standard */}
      <section className="px-6 py-12 md:px-12 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Camera, title: t.featureCastingTitle, desc: t.featureCastingBody },
              { icon: Layers, title: t.featureProductTitle, desc: t.featureProductBody },
              { icon: Globe, title: t.featureFormatsTitle, desc: t.featureFormatsBody },
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
              {t.pricingEyebrow}
            </p>
            <h2 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.1]">
              {t.pricingTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TIERS.map((tier) => {
              const desc =
                tier.tier === 'capsule' ? t.capsuleDesc :
                tier.tier === 'editorial' ? t.editorialDesc :
                t.fullCampaignDesc;
              return (
                <div
                  key={tier.tier}
                  className={`relative bg-white rounded-[20px] p-10 transition-all hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] ${
                    tier.featured ? 'ring-2 ring-carbon' : ''
                  }`}
                >
                  {tier.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-1 rounded-full bg-carbon text-white text-[11px] font-semibold tracking-[0.05em] uppercase">
                      {t.mostPopular}
                    </div>
                  )}
                  <h3 className="text-[24px] font-semibold text-carbon tracking-[-0.03em] mb-6">
                    {tier.label}
                  </h3>
                  <p className="text-[40px] font-semibold text-carbon tracking-[-0.03em] leading-none mb-1">
                    €{tier.price}
                  </p>
                  <p className="text-[13px] text-carbon/40 mb-6">{t.paymentOnce}</p>
                  <p className="text-[13px] text-carbon/60 mb-6 leading-[1.6]">{desc}</p>
                  <ul className="space-y-2 mb-8">
                    {[t.bulletPhotos(tier.outputs), t.bulletFormats, t.bulletBrandLocked, t.bulletCasting].map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-[13px] text-carbon/70">
                        <Check className="h-3.5 w-3.5 text-carbon/40 mt-1 flex-shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => openSignup(tier.tier)}
                    className="inline-flex items-center gap-2 w-full justify-center px-5 py-3 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
                  >
                    {t.startWith} {tier.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-center text-[12px] text-carbon/40 mt-10">
            {t.footerNote}
          </p>
        </div>
      </section>

      {/* Bridge to aimily 360 */}
      <section className="px-6 py-20 md:px-12 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[28px] md:text-[36px] font-medium text-carbon tracking-[-0.03em] leading-[1.1] mb-4">
            {t.bridgeTitle}
          </h2>
          <p className="text-[14px] text-carbon/55 max-w-xl mx-auto leading-[1.7] mb-8">
            {t.bridgeBody}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-carbon hover:text-carbon/80 transition-colors"
          >
            {t.bridgeCta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => router.push('/studio')}
        defaultMode="signup"
      />
    </main>
  );
}

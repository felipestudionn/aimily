'use client';

/* ═══════════════════════════════════════════════════════════════════
   PoweredBy — "Built on the frontier of AI"

   Marketing transparency block: shows the actual AI providers and
   models orchestrated by aimily, plus a cost-comparison block.

   All copy from useHomeTranslation() for full 9-locale support.
   Provider names + model names are rendered as plain text — no logos
   (avoids hot-linking external assets and keeps the editorial feel).
   ═══════════════════════════════════════════════════════════════════ */

import { useHomeTranslation } from '@/i18n/home';
import { Check } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  models: string;  // pre-formatted, locale-independent
  use: keyof PoweredByUseStrings;  // i18n key for "use case" copy
}

type PoweredByUseStrings = {
  useAnthropic: string;
  useOpenAI: string;
  useGoogle: string;
  usePerplexity: string;
  useKling: string;
  useFreepik: string;
};

const PROVIDERS: Provider[] = [
  { id: 'anthropic',  name: 'Anthropic Claude',     models: 'Sonnet 4.5 · Haiku 4.5',                    use: 'useAnthropic' },
  { id: 'openai',     name: 'OpenAI',               models: 'gpt-image-1.5 · text-embedding-3',          use: 'useOpenAI' },
  { id: 'google',     name: 'Google Gemini',        models: '2.5 Flash · 2.5 Flash Image',               use: 'useGoogle' },
  { id: 'perplexity', name: 'Perplexity',           models: 'Sonar',                                     use: 'usePerplexity' },
  { id: 'kling',      name: 'Kling AI',             models: 'Kling 2.1 Pro',                             use: 'useKling' },
  { id: 'freepik',    name: 'Freepik',              models: 'Mystic',                                    use: 'useFreepik' },
];

export function PoweredBy() {
  const h = useHomeTranslation();
  const pb = h.poweredBy;

  return (
    <section className="bg-crema text-carbon px-6 py-32 md:py-44 border-t border-carbon/[0.06]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-6">
            {pb.eyebrow}
          </div>
          <h2 className="text-[40px] md:text-[56px] font-light tracking-[-0.03em] leading-[1.05] max-w-[780px] mx-auto mb-6">
            {pb.titleStart}<span className="italic">{pb.titleItalic}</span>{pb.titleEnd}
          </h2>
          <p className="max-w-[640px] mx-auto text-[15px] text-carbon/65 leading-[1.7]">
            {pb.subtitle}
          </p>
        </div>

        {/* Provider grid — 3 cols × 2 rows on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-carbon/[0.08] border border-carbon/[0.08] rounded-[20px] overflow-hidden mb-20">
          {PROVIDERS.map((provider) => (
            <div key={provider.id} className="bg-crema p-8 md:p-10 flex flex-col">
              <div className="text-[10px] tracking-[0.2em] uppercase text-carbon/40 font-semibold mb-3">
                {pb.providerLabel}
              </div>
              <h3 className="text-[22px] font-light tracking-[-0.02em] leading-tight text-carbon mb-2">
                {provider.name}
              </h3>
              <div className="text-[12px] text-carbon/55 font-mono tracking-[0.01em] mb-4">
                {provider.models}
              </div>
              <p className="text-[13.5px] italic text-carbon/65 leading-[1.6] mt-auto">
                {pb[provider.use]}
              </p>
            </div>
          ))}
        </div>

        {/* Cost comparison block */}
        <div className="bg-white border border-carbon/[0.08] rounded-[20px] p-8 md:p-12">
          <div className="text-center mb-10">
            <div className="text-[10px] tracking-[0.22em] uppercase text-carbon/40 font-semibold mb-4">
              {pb.compareLabel}
            </div>
            <h3 className="text-[26px] md:text-[32px] font-light tracking-[-0.02em] leading-[1.15] max-w-[680px] mx-auto">
              {pb.compareTitleStart}<span className="italic">{pb.compareTitleItalic}</span>{pb.compareTitleEnd}
            </h3>
          </div>

          {/* Two-column comparison — mirror structure: same categories,
              left side itemized prices, right side checkmarks. Both
              totals end at the same Y level for visual impact. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-5xl mx-auto">
            {/* LEFT — Stack separately */}
            <div className="bg-carbon/[0.03] border border-carbon/[0.06] rounded-[16px] p-7 flex flex-col">
              <div className="text-[11px] tracking-[0.18em] uppercase text-carbon/55 font-semibold mb-1">
                {pb.optionA}
              </div>
              <h4 className="text-[24px] font-light tracking-[-0.02em] leading-tight text-carbon mb-6">
                {pb.optionATitle}
              </h4>

              {/* CATEGORY 1 — IA subscriptions */}
              <div className="mb-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[13.5px] text-carbon/85 font-medium">{pb.category1}</span>
                  <span className="text-carbon font-mono tabular-nums text-[14px]">€133</span>
                </div>
                <p className="text-[11.5px] italic text-carbon/45 leading-[1.4]">
                  Claude Pro €18 · ChatGPT Plus €18 · Gemini Advanced €18 · Perplexity Pro €18 · Freepik Premium+ €27 · Kling AI Pro €34.
                </p>
              </div>

              {/* CATEGORY 2 — Productivity / creative */}
              <div className="border-t border-carbon/[0.08] pt-3 mb-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[13.5px] text-carbon/85 font-medium">{pb.category2}</span>
                  <span className="text-carbon font-mono tabular-nums text-[14px]">€124</span>
                </div>
                <p className="text-[11.5px] italic text-carbon/45 leading-[1.4]">
                  {pb.productivityCaveat}
                </p>
              </div>

              {/* CATEGORY 3 — Web */}
              <div className="border-t border-carbon/[0.08] pt-3 mb-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[13.5px] text-carbon/85 font-medium">{pb.category3}</span>
                  <span className="text-carbon font-mono tabular-nums text-[14px]">~€400</span>
                </div>
                <p className="text-[11.5px] italic text-carbon/45 leading-[1.4]">
                  {pb.webCaveat}
                </p>
              </div>

              {/* CATEGORY 4 — SEO */}
              <div className="border-t border-carbon/[0.08] pt-3 mb-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[13.5px] text-carbon/85 font-medium">{pb.category4}</span>
                  <span className="text-carbon font-mono tabular-nums text-[14px]">~€100</span>
                </div>
                <p className="text-[11.5px] italic text-carbon/45 leading-[1.4]">
                  {pb.seoCaveat}
                </p>
              </div>

              {/* CATEGORY 5 — Photoshoot */}
              <div className="border-t border-carbon/[0.08] pt-3 mb-4 flex-1">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[13.5px] text-carbon/85 font-medium">{pb.category5}</span>
                  <span className="text-carbon font-mono tabular-nums text-[14px]">~€500</span>
                </div>
                <p className="text-[11.5px] italic text-carbon/45 leading-[1.4]">
                  {pb.photoshootCaveat}
                </p>
              </div>

              {/* TOTAL */}
              <div className="border-t-2 border-carbon/15 pt-5 flex items-baseline justify-between">
                <span className="text-[13px] text-carbon/55 uppercase tracking-[0.15em] font-semibold">{pb.totalLabel}</span>
                <span className="flex items-baseline tabular-nums">
                  <span className="text-[20px] font-light text-carbon/55 mr-1.5">€</span>
                  <span className="text-[40px] font-light tracking-[-0.03em] text-carbon leading-none">1.257</span>
                  <span className="text-[13px] text-carbon/55 ml-1">/mes</span>
                </span>
              </div>
            </div>

            {/* RIGHT — With aimily, mirror structure */}
            <div className="bg-carbon text-crema rounded-[16px] p-7 flex flex-col">
              <div className="text-[11px] tracking-[0.18em] uppercase text-crema/60 font-semibold mb-1">
                {pb.optionB}
              </div>
              <h4 className="text-[24px] font-light tracking-[-0.02em] leading-tight mb-6">
                Founder
              </h4>

              {/* CATEGORY 1 — IA orchestrated */}
              <div className="mb-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[13.5px] text-crema font-medium flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-moss" /> {pb.aimilyAi}
                  </span>
                  <span className="text-crema/55 font-mono tabular-nums text-[12px]">incluido</span>
                </div>
                <p className="text-[11.5px] italic text-crema/55 leading-[1.4] pl-5">
                  {pb.aimilyAiCaveat}
                </p>
              </div>

              {/* CATEGORY 2 — Productivity */}
              <div className="border-t border-crema/15 pt-3 mb-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[13.5px] text-crema font-medium flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-moss" /> {pb.aimilyProductivity}
                  </span>
                  <span className="text-crema/55 font-mono tabular-nums text-[12px]">incluido</span>
                </div>
                <p className="text-[11.5px] italic text-crema/55 leading-[1.4] pl-5">
                  {pb.aimilyProductivityCaveat}
                </p>
              </div>

              {/* CATEGORY 3 — Web */}
              <div className="border-t border-crema/15 pt-3 mb-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[13.5px] text-crema font-medium flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-moss" /> {pb.aimilyWeb}
                  </span>
                  <span className="text-crema/55 font-mono tabular-nums text-[12px]">incluido</span>
                </div>
                <p className="text-[11.5px] italic text-crema/55 leading-[1.4] pl-5">
                  {pb.aimilyWebCaveat}
                </p>
              </div>

              {/* CATEGORY 4 — SEO */}
              <div className="border-t border-crema/15 pt-3 mb-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[13.5px] text-crema font-medium flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-moss" /> {pb.aimilySeo}
                  </span>
                  <span className="text-crema/55 font-mono tabular-nums text-[12px]">incluido</span>
                </div>
                <p className="text-[11.5px] italic text-crema/55 leading-[1.4] pl-5">
                  {pb.aimilySeoCaveat}
                </p>
              </div>

              {/* CATEGORY 5 — Editorial AI */}
              <div className="border-t border-crema/15 pt-3 mb-4 flex-1">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[13.5px] text-crema font-medium flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-moss" /> {pb.aimilyEditorial}
                  </span>
                  <span className="text-crema/55 font-mono tabular-nums text-[12px]">incluido</span>
                </div>
                <p className="text-[11.5px] italic text-crema/55 leading-[1.4] pl-5">
                  {pb.aimilyEditorialCaveat}
                </p>
              </div>

              {/* PRICE — same Y level as left TOTAL */}
              <div className="border-t-2 border-crema/20 pt-5 flex items-baseline justify-between">
                <span className="text-[13px] text-crema/60 uppercase tracking-[0.15em] font-semibold">{pb.priceLabel}</span>
                <span className="flex items-baseline tabular-nums">
                  <span className="text-[20px] font-light text-crema/60 mr-1.5">€</span>
                  <span className="text-[40px] font-light tracking-[-0.03em] leading-none">99</span>
                  <span className="text-[13px] text-crema/60 ml-1">/mes</span>
                </span>
              </div>
            </div>
          </div>

          <p className="text-center text-[12px] italic text-carbon/55 mt-8 max-w-2xl mx-auto leading-[1.6]">
            {pb.optionACaveat}
          </p>

          <p className="text-center text-[12px] text-carbon/45 mt-8 italic max-w-2xl mx-auto leading-[1.6]">
            {pb.footnote}
          </p>
        </div>
      </div>
    </section>
  );
}

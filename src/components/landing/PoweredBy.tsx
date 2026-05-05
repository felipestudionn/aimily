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

          {/* Two-column comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 max-w-3xl mx-auto">
            {/* Stack separately */}
            <div className="bg-carbon/[0.03] border border-carbon/[0.06] rounded-[16px] p-7">
              <div className="text-[11px] tracking-[0.18em] uppercase text-carbon/55 font-semibold mb-5">
                {pb.optionA}
              </div>
              <ul className="space-y-2.5 text-[14px] text-carbon/75 mb-5">
                <li className="flex items-baseline justify-between"><span>Claude Pro</span><span className="text-carbon/55 font-mono tabular-nums">€18</span></li>
                <li className="flex items-baseline justify-between"><span>ChatGPT Plus</span><span className="text-carbon/55 font-mono tabular-nums">€18</span></li>
                <li className="flex items-baseline justify-between"><span>Gemini Advanced</span><span className="text-carbon/55 font-mono tabular-nums">€18</span></li>
                <li className="flex items-baseline justify-between"><span>Perplexity Pro</span><span className="text-carbon/55 font-mono tabular-nums">€18</span></li>
                <li className="flex items-baseline justify-between"><span>Midjourney basic</span><span className="text-carbon/55 font-mono tabular-nums">€10</span></li>
                <li className="flex items-baseline justify-between"><span>Freepik Premium+</span><span className="text-carbon/55 font-mono tabular-nums">€27</span></li>
                <li className="flex items-baseline justify-between"><span>Kling AI Pro</span><span className="text-carbon/55 font-mono tabular-nums">€27</span></li>
              </ul>

              <div className="border-t border-carbon/[0.08] pt-4 mb-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13.5px] text-carbon/75">{pb.productivityLabel}</span>
                  <span className="text-carbon/55 font-mono tabular-nums text-[14px]">~€112</span>
                </div>
                <p className="text-[11.5px] italic text-carbon/45 mt-1.5 leading-[1.4]">
                  {pb.productivityCaveat}
                </p>
              </div>

              <div className="pt-3 mb-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13.5px] text-carbon/75">{pb.webLabel}</span>
                  <span className="text-carbon/55 font-mono tabular-nums text-[14px]">~€30</span>
                </div>
                <p className="text-[11.5px] italic text-carbon/45 mt-1.5 leading-[1.4]">
                  {pb.webCaveat}
                </p>
              </div>

              <div className="pt-3 mb-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13.5px] text-carbon/75">{pb.seoLabel}</span>
                  <span className="text-carbon/55 font-mono tabular-nums text-[14px]">~€100</span>
                </div>
                <p className="text-[11.5px] italic text-carbon/45 mt-1.5 leading-[1.4]">
                  {pb.seoCaveat}
                </p>
              </div>

              <div className="pt-3 mb-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13.5px] text-carbon/75">{pb.photoshootLabel}</span>
                  <span className="text-carbon/55 font-mono tabular-nums text-[14px]">~€500</span>
                </div>
                <p className="text-[11.5px] italic text-carbon/45 mt-1.5 leading-[1.4]">
                  {pb.photoshootCaveat}
                </p>
              </div>

              <div className="border-t border-carbon/[0.08] pt-4 flex items-baseline justify-between">
                <span className="text-[13px] text-carbon/55 uppercase tracking-[0.1em]">{pb.totalLabel}</span>
                <span className="flex items-baseline tabular-nums">
                  <span className="text-[16px] font-light text-carbon/55 mr-1">€</span>
                  <span className="text-[28px] font-light tracking-[-0.02em] text-carbon">878</span>
                  <span className="text-[13px] text-carbon/55 ml-1">/mes</span>
                </span>
              </div>
              <p className="text-[12px] italic text-carbon/55 mt-4 leading-[1.5]">
                {pb.optionACaveat}
              </p>
            </div>

            {/* aimily */}
            <div className="bg-carbon text-crema rounded-[16px] p-7 flex flex-col">
              <div className="text-[11px] tracking-[0.18em] uppercase text-crema/60 font-semibold mb-5">
                {pb.optionB}
              </div>
              <div className="flex-1 mb-6">
                <h4 className="text-[24px] font-light tracking-[-0.02em] leading-tight mb-2">
                  aimily Founder
                </h4>
                <p className="text-[14px] text-crema/70 leading-[1.6]">
                  {pb.optionBDesc}
                </p>
              </div>
              <div className="border-t border-crema/[0.15] pt-4 flex items-baseline justify-between">
                <span className="text-[13px] text-crema/60 uppercase tracking-[0.1em]">{pb.priceLabel}</span>
                <span className="flex items-baseline tabular-nums">
                  <span className="text-[16px] font-light text-crema/60 mr-1">€</span>
                  <span className="text-[28px] font-light tracking-[-0.02em]">99</span>
                  <span className="text-[13px] text-crema/60 ml-1">/mes</span>
                </span>
              </div>
            </div>
          </div>

          <p className="text-center text-[12px] text-carbon/45 mt-8 italic max-w-2xl mx-auto leading-[1.6]">
            {pb.footnote}
          </p>
        </div>
      </div>
    </section>
  );
}

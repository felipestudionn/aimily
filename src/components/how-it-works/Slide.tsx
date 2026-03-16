'use client';

import { type SlideDefinition, TOOL_ICONS } from './slides-data';
import { ScreenshotPlaceholder } from './ScreenshotPlaceholder';
import { ArrowRight, Sparkles, Hand, Zap } from 'lucide-react';
import type { Dictionary } from '@/i18n';

const GRID_PATTERN = `repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.03) 59px, rgba(255,255,255,0.03) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.03) 59px, rgba(255,255,255,0.03) 60px)`;

interface SlideProps {
  slide: SlideDefinition;
  index: number;
  t: Dictionary['howItWorksPage'];
  isActive: boolean;
}

export function Slide({ slide, index, t, isActive }: SlideProps) {
  const isDark = slide.theme === 'dark';
  const bg = isDark ? 'bg-carbon' : 'bg-crema';
  const textMain = isDark ? 'text-crema' : 'text-carbon';
  const textSub = isDark ? 'text-gris/60' : 'text-carbon/60';
  const textLabel = isDark ? 'text-gris/50' : 'text-carbon/40';
  const borderColor = isDark ? 'border-gris/10' : 'border-carbon/10';

  const anim = isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6';
  const transition = 'transition-all duration-700 ease-out';

  // Get slide-specific text from i18n using slide.id
  const getText = (suffix: string): string => {
    const key = `${slide.id.replace(/-/g, '_')}_${suffix}` as keyof typeof t;
    return (t[key] as string) || '';
  };

  // Hero layout (intro + cta)
  if (slide.layout === 'hero') {
    return (
      <div className={`min-w-[100vw] w-screen h-screen flex items-center justify-center ${bg} relative`}>
        {isDark && <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: GRID_PATTERN }} />}
        <div className={`relative z-10 max-w-4xl text-center px-6 ${anim} ${transition}`}>
          <p className={`${textLabel} text-xs font-medium tracking-[0.25em] uppercase mb-8`}>
            {getText('label')}
          </p>
          <h2 className={`${textMain} text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1] mb-6`}>
            {getText('title')} <span className="italic">{getText('titleItalic')}</span>
          </h2>
          <p className={`${textSub} text-lg sm:text-xl md:text-2xl font-light leading-relaxed max-w-2xl mx-auto`}>
            {getText('desc')}
          </p>
          {slide.id === 'cta' && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
              <a href="/pricing" className="px-8 py-3.5 bg-crema text-carbon text-sm font-medium tracking-[0.1em] uppercase hover:bg-crema/90 transition-colors">
                {t.ctaButton}
              </a>
              <a href="/pricing" className={`px-8 py-3.5 border ${borderColor} ${textMain} text-sm font-medium tracking-[0.1em] uppercase hover:bg-white/5 transition-colors`}>
                {t.ctaSecondary}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // AI Modes (centered, 3-column)
  if (slide.id === 'ai-modes') {
    const modes = [
      { icon: Hand, nameKey: 'modeManualTitle' as const, descKey: 'modeManualDesc' as const },
      { icon: Sparkles, nameKey: 'modeAssistedTitle' as const, descKey: 'modeAssistedDesc' as const },
      { icon: Zap, nameKey: 'modeProposalTitle' as const, descKey: 'modeProposalDesc' as const },
    ];
    return (
      <div className={`min-w-[100vw] w-screen h-screen flex items-center justify-center ${bg} relative`}>
        {isDark && <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: GRID_PATTERN }} />}
        <div className={`relative z-10 max-w-5xl w-full px-6 ${anim} ${transition}`}>
          <div className="text-center mb-12 md:mb-16">
            <p className={`${textLabel} text-xs font-medium tracking-[0.25em] uppercase mb-6`}>
              {t.ai_modes_label}
            </p>
            <h2 className={`${textMain} text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15]`}>
              {t.ai_modes_title} <span className="italic">{t.ai_modes_titleItalic}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gris/10">
            {modes.map((mode) => {
              const Icon = mode.icon;
              return (
                <div key={mode.nameKey} className={`${bg} p-8 md:p-10`}>
                  <Icon className={`h-8 w-8 ${isDark ? 'text-gris/30' : 'text-carbon/30'} mb-6`} />
                  <h3 className={`${textMain} text-lg font-medium tracking-tight mb-3`}>
                    {t[mode.nameKey]}
                  </h3>
                  <p className={`${textSub} text-sm font-light leading-relaxed`}>
                    {t[mode.descKey]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Split layout (overview slides)
  if (slide.layout === 'split') {
    const isEven = index % 2 === 0;
    return (
      <div className={`min-w-[100vw] w-screen h-screen flex items-center justify-center ${bg} relative`}>
        {isDark && <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: GRID_PATTERN }} />}
        <div className={`relative z-10 max-w-6xl w-full px-6 flex flex-col lg:flex-row gap-12 lg:gap-20 items-center ${isEven ? '' : 'lg:flex-row-reverse'} ${anim} ${transition}`}>
          {/* Text side */}
          <div className="flex-1 max-w-xl">
            {slide.blockNumber && (
              <span className={`${isDark ? 'text-gris/20' : 'text-carbon/15'} text-7xl md:text-8xl font-light tracking-tight block mb-4`}>
                {slide.blockNumber}
              </span>
            )}
            <p className={`${textLabel} text-xs font-medium tracking-[0.25em] uppercase mb-4`}>
              {getText('label')}
            </p>
            <h2 className={`${textMain} text-2xl sm:text-3xl md:text-4xl font-light tracking-tight leading-[1.15] mb-6`}>
              {getText('title')} <span className="italic">{getText('titleItalic')}</span>
            </h2>
            <p className={`${textSub} text-base font-light leading-relaxed`}>
              {getText('desc')}
            </p>
          </div>
          {/* Visual side */}
          <div className="flex-1 w-full max-w-xl">
            <ScreenshotPlaceholder label={getText('screenshotLabel')} dark={isDark} />
          </div>
        </div>
      </div>
    );
  }

  // Centered layout (deep dive slides with tool cards)
  if (slide.layout === 'centered' && slide.tools) {
    return (
      <div className={`min-w-[100vw] w-screen h-screen flex items-center justify-center ${bg} relative overflow-y-auto`}>
        <div className={`relative z-10 max-w-5xl w-full px-6 py-12 ${anim} ${transition}`}>
          <div className="text-center mb-10 md:mb-14">
            {slide.blockNumber && (
              <p className={`${textLabel} text-xs font-medium tracking-[0.25em] uppercase mb-4`}>
                {getText('label')}
              </p>
            )}
            <h2 className={`${textMain} text-2xl sm:text-3xl md:text-4xl font-light tracking-tight leading-[1.15]`}>
              {getText('title')} <span className="italic">{getText('titleItalic')}</span>
            </h2>
          </div>
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${slide.tools.length > 4 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-px ${isDark ? 'bg-gris/10' : 'bg-carbon/5'}`}>
            {slide.tools.map((tool) => {
              const Icon = TOOL_ICONS[tool.iconKey];
              return (
                <div key={tool.nameKey} className={`${bg} p-6 md:p-8`}>
                  {Icon && <Icon className={`h-6 w-6 ${isDark ? 'text-gris/40' : 'text-carbon/30'} mb-4`} />}
                  <h3 className={`${textMain} text-base font-medium tracking-tight mb-2`}>
                    {t[tool.nameKey as keyof typeof t] as string}
                  </h3>
                  <p className={`${textSub} text-sm font-light leading-relaxed`}>
                    {t[tool.descKey as keyof typeof t] as string}
                  </p>
                </div>
              );
            })}
          </div>
          {slide.id === 'merch-deep' && (
            <div className={`mt-8 text-center p-6 border ${borderColor}`}>
              <ArrowRight className={`h-5 w-5 ${textLabel} mx-auto mb-3`} />
              <p className={`${textMain} text-sm font-medium tracking-[0.1em] uppercase`}>
                {t.merchBuilderTeaser}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Diagram layout (Collection Builder + Calendar)
  if (slide.layout === 'diagram') {
    return (
      <div className={`min-w-[100vw] w-screen h-screen flex items-center justify-center ${bg} relative`}>
        <div className={`relative z-10 max-w-5xl w-full px-6 ${anim} ${transition}`}>
          <div className="text-center mb-10 md:mb-14">
            <p className={`${textLabel} text-xs font-medium tracking-[0.25em] uppercase mb-6`}>
              {getText('label')}
            </p>
            <h2 className={`${textMain} text-2xl sm:text-3xl md:text-4xl font-light tracking-tight leading-[1.15] mb-6`}>
              {getText('title')} <span className="italic">{getText('titleItalic')}</span>
            </h2>
            <p className={`${textSub} text-base font-light leading-relaxed max-w-2xl mx-auto mb-10`}>
              {getText('desc')}
            </p>
          </div>
          {/* Flow diagram */}
          {slide.id === 'collection-builder' ? (
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
              <div className={`flex flex-col gap-2 items-center px-6 py-4 border ${borderColor}`}>
                <p className={`text-xs font-medium tracking-[0.15em] uppercase ${textLabel}`}>{t.builderFrom1}</p>
              </div>
              <ArrowRight className={`h-5 w-5 ${textLabel} rotate-90 md:rotate-0`} />
              <div className={`px-8 py-6 border-2 ${isDark ? 'border-gris/30' : 'border-carbon/20'} text-center`}>
                <p className={`text-lg font-medium tracking-tight ${textMain}`}>{t.builderCenter}</p>
                <p className={`text-xs ${textSub} mt-1`}>{t.builderCenterDesc}</p>
              </div>
              <ArrowRight className={`h-5 w-5 ${textLabel} rotate-90 md:rotate-0`} />
              <div className={`flex flex-col gap-2 items-center px-6 py-4 border ${borderColor}`}>
                <p className={`text-xs font-medium tracking-[0.15em] uppercase ${textLabel}`}>{t.builderTo1}</p>
              </div>
            </div>
          ) : (
            /* Calendar diagram */
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-px ${isDark ? 'bg-gris/10' : 'bg-carbon/5'}`}>
              {['calBlock1', 'calBlock2', 'calBlock3', 'calBlock4'].map((key) => (
                <div key={key} className={`${bg} p-6 md:p-8 text-center`}>
                  <p className={`text-2xl md:text-3xl font-light ${textMain} mb-2`}>
                    {t[`${key}Count` as keyof typeof t] as string}
                  </p>
                  <p className={`text-xs font-medium tracking-[0.15em] uppercase ${textLabel}`}>
                    {t[`${key}Label` as keyof typeof t] as string}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return <div className={`min-w-[100vw] w-screen h-screen ${bg}`} />;
}

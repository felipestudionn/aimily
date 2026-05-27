import { SlideShell } from '../SlideShell';

export default function Slide01Cover() {
  return (
    <SlideShell>
      <div className="flex-1 flex flex-col justify-center max-w-[1200px] mx-auto w-full">
        <div className="text-[11px] tracking-[0.22em] uppercase text-carbon/35 mb-12">
          Investor & partner deck · 2026
        </div>

        <h1 className="text-[120px] md:text-[160px] lg:text-[200px] font-medium text-carbon tracking-[-0.05em] leading-[0.9]">
          aimily
        </h1>

        <div className="mt-12 max-w-[800px]">
          <p
            className="text-[34px] md:text-[42px] leading-[1.2] tracking-[-0.025em] text-carbon"
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400 }}
          >
            La inteligencia que protege<br />el contexto creativo.
          </p>
        </div>

        <div className="mt-20 flex items-end justify-between gap-12 border-t border-carbon/[0.08] pt-8">
          <div className="text-[14px] text-carbon/60 max-w-[560px] leading-[1.6] tracking-[-0.01em]">
            End-to-end intelligence for fashion collections — from moodboard
            to sell-through to the next season's seeds.
          </div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-carbon/30 whitespace-nowrap">
            v1 · sala · 2026
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

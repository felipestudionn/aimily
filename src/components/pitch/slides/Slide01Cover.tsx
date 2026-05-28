import { SlideShell } from '../SlideShell';

export default function Slide01Cover() {
  return (
    <SlideShell variant="dark">
      <div className="flex-1 flex flex-col justify-center max-w-[1200px] mx-auto w-full">
        <div className="text-[11px] tracking-[0.3em] uppercase text-crema/55 mb-12 font-medium">
          Investor & partner deck · 2026
        </div>

        <h1 className="text-[120px] md:text-[160px] lg:text-[200px] font-light text-crema tracking-[-0.05em] leading-[0.9]">
          aimily
        </h1>

        <div className="mt-12 max-w-[900px]">
          <p className="text-[32px] md:text-[44px] lg:text-[52px] font-light text-crema tracking-[-0.035em] leading-[1.05]">
            La inteligencia que{' '}
            <span className="font-extrabold text-crema">protege</span>{' '}
            el contexto creativo.
          </p>
        </div>

        <div className="mt-20 flex items-end justify-between gap-12 border-t border-crema/15 pt-8">
          <div className="text-[14px] md:text-[16px] text-crema/70 max-w-[600px] leading-[1.7] font-light tracking-[-0.01em]">
            End-to-end intelligence for fashion collections — from moodboard
            to sell-through to the next season&apos;s seeds.
          </div>
          <div className="text-[11px] tracking-[0.22em] uppercase text-crema/40 whitespace-nowrap font-medium">
            v1 · sala · 2026
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

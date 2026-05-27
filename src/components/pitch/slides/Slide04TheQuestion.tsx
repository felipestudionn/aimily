import { SlideShell } from '../SlideShell';

export default function Slide04TheQuestion() {
  return (
    <SlideShell eyebrow="Acto II · La pregunta" accentColor="midnight">
      <div className="flex-1 flex flex-col justify-center items-center text-center max-w-[1200px] mx-auto w-full">
        <div className="text-[13px] tracking-[0.2em] uppercase text-carbon/35 mb-12">
          Y entonces uno se pregunta
        </div>

        <h2 className="text-[64px] md:text-[88px] lg:text-[112px] text-carbon tracking-[-0.045em] leading-[1.02] max-w-[1100px]">
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400 }}>
            ¿Y si el contexto
          </span>
          <br />
          <span className="font-medium">nunca se derramara?</span>
        </h2>

        <div className="mt-20 max-w-[640px] text-[15px] text-carbon/45 leading-[1.7] tracking-[-0.005em]">
          Si pudiéramos guardar cada decisión, cada matiz, cada porqué — y
          hacer que viajara intacto desde la primera intuición creativa hasta
          el último gesto comercial.
        </div>

        <div className="mt-16 inline-flex items-center gap-2 text-[12px] tracking-[0.15em] uppercase text-carbon/45">
          <div className="h-px w-12 bg-carbon/20" />
          Esa es la pregunta que dio origen a aimily
          <div className="h-px w-12 bg-carbon/20" />
        </div>
      </div>
    </SlideShell>
  );
}

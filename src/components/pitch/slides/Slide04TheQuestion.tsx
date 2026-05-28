import { SlideShell } from '../SlideShell';

export default function Slide04TheQuestion() {
  return (
    <SlideShell variant="dark" eyebrow="Acto II · La pregunta">
      <div className="flex-1 flex flex-col justify-center items-center text-center max-w-[1200px] mx-auto w-full">
        <div className="text-[11px] tracking-[0.3em] uppercase text-crema/45 mb-14 font-medium">
          Y entonces uno se pregunta
        </div>

        <h2 className="text-[56px] md:text-[88px] lg:text-[120px] font-light text-crema tracking-[-0.05em] leading-[1.02] max-w-[1200px]">
          ¿Y si el contexto{' '}
          <span className="font-extrabold text-crema">nunca</span>
          <br />
          se derramara?
        </h2>

        <div className="mt-20 max-w-[680px] text-[16px] md:text-[18px] font-light text-crema/65 leading-[1.75] tracking-[-0.005em]">
          Si pudiéramos guardar cada decisión, cada matiz, cada porqué — y
          hacer que viajara intacto desde la primera intuición creativa hasta
          el último gesto comercial.
        </div>

        <div className="mt-20 inline-flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase text-crema/50 font-medium">
          <div className="h-px w-12 bg-crema/25" />
          Esa es la pregunta que dio origen a aimily
          <div className="h-px w-12 bg-crema/25" />
        </div>
      </div>
    </SlideShell>
  );
}

import { SlideShell } from '../SlideShell';

const BLOCKS = [
  { label: 'Creative & Brand', color: '#b6c8c7' },
  { label: 'Merchandising', color: '#c5caa8' },
  { label: 'Design & Development', color: '#d8baa0' },
  { label: 'Marketing & Sales', color: '#fff4ce' },
] as const;

const PROPERTIES = [
  {
    title: 'Cada decisión queda indexada.',
    body: 'Color, silueta, target consumer, precio, canal. Granular, estructurado, recuperable.',
  },
  {
    title: 'Cada bloque hereda del anterior.',
    body: 'Merchandising no empieza de cero — empieza sabiendo qué prometió Creative. Design conoce el plan. Marketing conoce ambos.',
  },
  {
    title: 'La IA pre-rellena escenarios.',
    body: 'No reemplaza al humano: le entrega propuestas pre-formadas. Editar, añadir, confirmar — y el CIS aprende del resultado.',
  },
];

export default function Slide05CISIntro() {
  return (
    <SlideShell eyebrow="Acto II · La tesis">
      <div className="flex-1 flex flex-col max-w-[1400px] mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-[1100px] mx-auto mb-16">
          <div className="text-[12px] tracking-[0.22em] uppercase text-carbon/40 mb-6 font-medium">
            CIS · Context Intelligence System
          </div>
          <h2 className="text-[48px] md:text-[64px] font-medium text-carbon tracking-[-0.035em] leading-[1.05]">
            Una capa que vive{' '}
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
              debajo
            </span>{' '}
            de los cuatro bloques
            <br />y los mantiene conectados.
          </h2>
        </div>

        {/* CIS spine diagram */}
        <div className="relative mb-16 mx-auto w-full max-w-[1100px]">
          <div className="relative h-[200px]">
            {/* The 4 block nodes */}
            <div className="absolute top-0 left-0 right-0 grid grid-cols-4 gap-6">
              {BLOCKS.map((b, i) => (
                <div key={b.label} className="flex flex-col items-center">
                  <div
                    className="bg-white rounded-[14px] px-5 py-3.5 border border-carbon/[0.06] text-[13px] font-semibold text-carbon tracking-[-0.015em] text-center min-w-[160px] shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                  >
                    <span className="text-carbon/30 text-[11px] tracking-[0.1em] uppercase block mb-0.5">
                      0{i + 1}
                    </span>
                    {b.label}
                  </div>
                  {/* Vertical connector */}
                  <div className="h-10 w-px bg-carbon/15" />
                  {/* Color dot on spine */}
                  <div
                    className="h-3 w-3 rounded-full -mt-1.5 ring-4 ring-shade"
                    style={{ backgroundColor: b.color }}
                  />
                </div>
              ))}
            </div>

            {/* The spine itself */}
            <div className="absolute top-[114px] left-[80px] right-[80px] h-[2px] bg-carbon" />

            {/* CIS label on the spine */}
            <div className="absolute top-[126px] left-1/2 -translate-x-1/2 flex items-center gap-3">
              <div className="text-[11px] tracking-[0.18em] uppercase text-carbon/60 font-medium">
                Collection Intelligence Spine
              </div>
            </div>

            {/* In-Season feedback arc */}
            <div className="absolute bottom-0 left-[15%] right-[15%] flex items-center">
              <div className="flex-1 h-px bg-carbon/15 relative">
                <svg className="absolute -left-2 -top-1.5 text-carbon/30" width="8" height="14" viewBox="0 0 8 14">
                  <path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                </svg>
              </div>
              <div className="px-4 text-[10px] tracking-[0.15em] uppercase text-carbon/40 whitespace-nowrap">
                In-Season → semillas → próxima temporada
              </div>
              <div className="flex-1 h-px bg-carbon/15" />
            </div>
          </div>
        </div>

        {/* 3 properties */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PROPERTIES.map((p, i) => (
            <div
              key={p.title}
              className="bg-white rounded-[20px] p-8 border border-carbon/[0.04]"
            >
              <div className="text-[11px] tracking-[0.15em] uppercase text-carbon/35 mb-4">
                Propiedad 0{i + 1}
              </div>
              <h4 className="text-[18px] font-semibold text-carbon tracking-[-0.02em] leading-[1.25] mb-3">
                {p.title}
              </h4>
              <p className="text-[13px] text-carbon/55 leading-[1.65] tracking-[-0.005em]">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

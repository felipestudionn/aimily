import { SlideShell } from '../SlideShell';

const STAGES = [
  { label: 'Creative & Brand', context: 100, color: 'sea-foam' },
  { label: 'Merchandising', context: 72, color: 'moss' },
  { label: 'Design & Development', context: 48, color: 'clay' },
  { label: 'Marketing & Sales', context: 26, color: 'citronella' },
] as const;

const COLOR_BG: Record<typeof STAGES[number]['color'], string> = {
  'sea-foam': 'bg-sea-foam',
  moss: 'bg-moss',
  clay: 'bg-clay',
  citronella: 'bg-citronella',
};

export default function Slide02RelayRace() {
  return (
    <SlideShell eyebrow="Acto I · El problema">
      <div className="flex-1 flex flex-col justify-center max-w-[1400px] mx-auto w-full">
        <div className="max-w-[1000px] mb-20">
          <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-carbon/40 mb-6">
            La realidad operativa hoy
          </p>
          <h2 className="text-[48px] md:text-[64px] lg:text-[72px] font-light text-carbon tracking-[-0.04em] leading-[1.05]">
            La moda se construye como{' '}
            <span className="font-extrabold">una carrera de relevos.</span>
          </h2>
          <p className="mt-8 text-[17px] md:text-[19px] font-light text-carbon/65 leading-[1.7] tracking-[-0.01em] max-w-[680px]">
            Cada departamento pasa el contexto al siguiente como un cubo de agua.
            Y en cada paso, algo se derrama.
          </p>
        </div>

        {/* The relay visual */}
        <div className="relative">
          {/* Connecting stream — tapers as it goes */}
          <svg
            className="absolute top-[52px] left-0 right-0 h-[6px] w-full -z-0"
            preserveAspectRatio="none"
            viewBox="0 0 100 6"
          >
            <defs>
              <linearGradient id="stream" x1="0%" x2="100%">
                <stop offset="0%" stopColor="#282a29" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#282a29" stopOpacity="0.04" />
              </linearGradient>
            </defs>
            <path d="M 4 1 L 96 5 L 96 5 L 4 5 Z" fill="url(#stream)" />
          </svg>

          <div className="relative z-10 grid grid-cols-4 gap-6">
            {STAGES.map((stage, i) => (
              <div key={stage.label} className="flex flex-col items-center">
                {/* The bucket — circle that shrinks proportionally */}
                <div className="relative h-[104px] w-[104px] flex items-center justify-center">
                  <div
                    className={`${COLOR_BG[stage.color]} rounded-full transition-all duration-1000`}
                    style={{
                      width: `${40 + stage.context * 0.6}px`,
                      height: `${40 + stage.context * 0.6}px`,
                    }}
                  />
                </div>

                {/* Stage label */}
                <div className="mt-6 text-center">
                  <div className="text-[11px] font-medium text-carbon/35 tracking-[0.15em] uppercase mb-2">
                    0{i + 1}
                  </div>
                  <div className="text-[15px] font-semibold text-carbon tracking-[-0.02em] mb-1">
                    {stage.label}
                  </div>
                </div>

                {/* Context retained number */}
                <div className="mt-8 text-center">
                  <div
                    className="text-[44px] font-light text-carbon tracking-[-0.035em] tabular-nums leading-none"
                    style={{ opacity: 0.3 + (stage.context / 100) * 0.7 }}
                  >
                    <span className="font-extrabold">{stage.context}</span>
                    <span className="text-[28px] font-light">%</span>
                  </div>
                  <div className="mt-2 text-[10px] font-medium tracking-[0.18em] uppercase text-carbon/35">
                    Contexto retenido
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 max-w-[720px] text-[15px] font-light text-carbon/55 leading-[1.75] tracking-[-0.005em]">
          Briefs reescritos. Decisiones perdidas en hilos de Slack. Por qué se
          eligió aquel color ya nadie lo recuerda en marketing. El moodboard
          inicial no llega entero a ningún sitio.
        </div>
      </div>
    </SlideShell>
  );
}

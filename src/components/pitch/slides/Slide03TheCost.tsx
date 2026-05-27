import { SlideShell } from '../SlideShell';

const CONSEQUENCES = [
  {
    n: '01',
    title: 'La idea inicial se diluye.',
    body:
      'El moodboard que enamoró a creative no es el mismo que llega a producción. Cada traducción pierde matices que nadie volverá a recuperar.',
  },
  {
    n: '02',
    title: 'Las decisiones pierden su porqué.',
    body:
      'Marketing recibe productos sin saber qué historia contar. Compras propone reposiciones sin contexto creativo. Cada equipo trabaja sobre síntomas, no causas.',
  },
  {
    n: '03',
    title: 'La colección rinde por debajo de su potencial.',
    body:
      'No por falta de talento — sino porque el sistema no preserva la coherencia entre la visión y la ejecución. El delta entre lo posible y lo real es enorme.',
  },
];

export default function Slide03TheCost() {
  return (
    <SlideShell eyebrow="Acto I · El coste">
      <div className="flex-1 flex flex-col justify-center max-w-[1400px] mx-auto w-full">
        <div className="max-w-[900px] mb-16">
          <h2 className="text-[56px] md:text-[72px] font-medium text-carbon tracking-[-0.035em] leading-[1.05]">
            Y el coste no es<br />
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
              solo creativo.
            </span>
          </h2>
          <p className="mt-8 text-[18px] md:text-[20px] text-carbon/55 leading-[1.55] tracking-[-0.01em] max-w-[680px]">
            Tres consecuencias que viven en cada colección, en cada marca,
            cada temporada.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {CONSEQUENCES.map((c) => (
            <div
              key={c.n}
              className="bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[420px] transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]"
            >
              <div className="mb-10">
                <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
                  {c.n}.
                </span>
              </div>

              <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-5">
                {c.title}
              </h3>

              <p className="text-[14px] text-carbon/55 leading-[1.7] tracking-[-0.01em]">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

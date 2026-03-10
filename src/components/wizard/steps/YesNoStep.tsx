'use client';

interface YesNoStepProps {
  title: string;
  subtitle?: string;
  onAnswer: (yes: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}

export function YesNoStep({
  title,
  subtitle,
  onAnswer,
  yesLabel = 'Yes',
  noLabel = 'Not yet',
}: YesNoStepProps) {
  return (
    <div className="flex flex-col items-center animate-fade-in-up">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2 text-center max-w-lg">
        {title}
      </h1>
      {subtitle && (
        <p className="text-texto/40 text-sm mb-14 text-center max-w-md">
          {subtitle}
        </p>
      )}
      <div className="flex gap-4 w-full max-w-xs">
        <button
          onClick={() => onAnswer(true)}
          className="flex-1 py-8 text-sm font-medium tracking-[0.15em] uppercase border border-gris/30 text-texto hover:bg-carbon hover:text-crema transition-all"
        >
          {yesLabel}
        </button>
        <button
          onClick={() => onAnswer(false)}
          className="flex-1 py-8 text-sm font-medium tracking-[0.15em] uppercase border border-gris/30 text-texto hover:bg-carbon hover:text-crema transition-all"
        >
          {noLabel}
        </button>
      </div>
    </div>
  );
}

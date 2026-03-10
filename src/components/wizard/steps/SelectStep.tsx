'use client';

interface SelectOption {
  id?: string;
  value?: string;
  label: string;
  sublabel?: string;
}

interface SelectStepProps {
  title: string;
  subtitle?: string;
  options: SelectOption[];
  value: string;
  onSelect: (id: string) => void;
  columns?: 2 | 3 | 4 | 5;
}

export function SelectStep({
  title,
  subtitle,
  options,
  value,
  onSelect,
  columns = 2,
}: SelectStepProps) {
  const gridClasses: Record<number, string> = {
    2: 'grid grid-cols-2 gap-3 w-full max-w-xs',
    3: 'grid grid-cols-3 gap-3 w-full max-w-sm',
    4: 'grid grid-cols-4 gap-3 w-full max-w-md',
    5: 'grid grid-cols-5 gap-3 w-full max-w-lg',
  };
  const gridClass = gridClasses[columns] || gridClasses[2];

  return (
    <div className="flex flex-col items-center animate-fade-in-up">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-texto/40 text-sm mb-14">{subtitle}</p>
      )}
      <div className={gridClass}>
        {options.map((o) => {
          const optId = o.id || o.value || o.label;
          return (
          <button
            key={optId}
            onClick={() => onSelect(optId)}
            className={`py-6 text-sm font-medium tracking-[0.15em] uppercase transition-all ${
              value === optId
                ? 'bg-carbon text-crema'
                : 'border border-gris/30 text-texto hover:border-carbon'
            }`}
          >
            <span>{o.label}</span>
            {o.sublabel && (
              <span className="block text-[10px] mt-1 font-normal tracking-normal normal-case opacity-50">
                {o.sublabel}
              </span>
            )}
          </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { Check } from 'lucide-react';

interface MultiSelectOption {
  id: string;
  label: string;
}

interface MultiSelectStepProps {
  title: string;
  subtitle?: string;
  options: MultiSelectOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  columns?: 2 | 3;
}

export function MultiSelectStep({
  title,
  subtitle,
  options,
  selected,
  onToggle,
  columns = 2,
}: MultiSelectStepProps) {
  const gridClass =
    columns === 3
      ? 'grid grid-cols-3 gap-3 w-full max-w-md'
      : 'grid grid-cols-2 gap-3 w-full max-w-xs';

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
          const isSelected = selected.has(o.id);
          return (
            <button
              key={o.id}
              onClick={() => onToggle(o.id)}
              className={`relative py-6 text-sm font-medium tracking-[0.15em] uppercase transition-all ${
                isSelected
                  ? 'bg-carbon text-crema'
                  : 'border border-gris/30 text-texto hover:border-carbon'
              }`}
            >
              {isSelected && (
                <Check className="absolute top-2 right-2 h-3.5 w-3.5 text-crema/60" />
              )}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

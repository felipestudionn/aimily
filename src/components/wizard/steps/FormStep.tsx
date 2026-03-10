'use client';

import { ReactNode } from 'react';

interface FormStepProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function FormStep({ title, subtitle, children }: FormStepProps) {
  return (
    <div className="flex flex-col items-center animate-fade-in-up">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-texto/40 text-sm mb-14">{subtitle}</p>
      )}
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

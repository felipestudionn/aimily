'use client';

import { useState, useEffect } from 'react';

interface TextStepProps {
  title: string;
  subtitle?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function TextStep({
  title,
  subtitle,
  placeholder,
  value,
  onChange,
  onNext,
}: TextStepProps) {
  return (
    <div className="flex flex-col items-center animate-fade-in-up">
      <h1 className="text-3xl font-light text-texto tracking-tight mb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-texto/40 text-sm mb-14">{subtitle}</p>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full max-w-md text-center text-2xl font-light text-texto bg-transparent border-b-2 border-gris/30 focus:border-carbon outline-none pb-3 placeholder:text-texto/20 transition-colors"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && value.trim() && onNext()}
      />
    </div>
  );
}

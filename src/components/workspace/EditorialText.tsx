'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: 'md' | 'lg';
  align?: 'left' | 'center';
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-carbon text-white text-[0.72em] leading-none align-middle mx-0.5 font-medium tracking-[-0.01em]">
      {children}
    </span>
  );
}

function renderEditorial(text: string): ReactNode[] {
  if (!text) return [];
  const nodes: ReactNode[] = [];
  const regex = /(\([^)]+\)|\b[A-Z][a-zA-Z]*(?:\s[A-Z][a-zA-Z]*){0,3}\b)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const word = match[0];
    const prevTwo = text.slice(Math.max(0, start - 2), start);
    const isSentenceStart = start === 0 || /[.!?\n]\s?$/.test(prevTwo);
    const isParenthetical = word.startsWith('(');
    const isAllCaps = /^[A-Z]{2,}$/.test(word);

    if (isSentenceStart && !isAllCaps && !isParenthetical) continue;

    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));

    if (isParenthetical) {
      const inner = word.slice(1, -1);
      const items = inner.split(/\s*(?:,|\sor\s|\/)\s*/).filter(Boolean);
      items.forEach((item, idx) => {
        if (item.length > 0 && item.length <= 22) {
          nodes.push(<Pill key={`p${key++}`}>{item}</Pill>);
          if (idx < items.length - 1) nodes.push(' ');
        } else {
          nodes.push(item + (idx < items.length - 1 ? ', ' : ''));
        }
      });
    } else if (word.length <= 22) {
      nodes.push(<Pill key={`p${key++}`}>{word}</Pill>);
    } else {
      nodes.push(word);
    }
    lastIndex = start + word.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function EditorialText({ value, onChange, placeholder, size = 'md', align = 'left' }: Props) {
  const [editing, setEditing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      const len = taRef.current.value.length;
      taRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  const sizeClass =
    size === 'lg'
      ? 'text-[22px] md:text-[24px] leading-[1.4]'
      : 'text-[18px] md:text-[20px] leading-[1.45]';
  const alignClass = align === 'center' ? 'text-center' : 'text-left';

  const baseClass = `w-full font-medium tracking-[-0.02em] text-carbon ${sizeClass} ${alignClass}`;

  if (editing) {
    return (
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        placeholder={placeholder}
        rows={4}
        className={`${baseClass} bg-transparent border-0 resize-none focus:outline-none placeholder:text-carbon/20`}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={`${baseClass} cursor-text whitespace-pre-wrap`}
    >
      {value ? renderEditorial(value) : <span className="text-carbon/20">{placeholder}</span>}
    </div>
  );
}

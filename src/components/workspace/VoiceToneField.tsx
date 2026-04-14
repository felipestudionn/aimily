'use client';

import { EditorialText } from './EditorialText';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function VoiceToneField({ value, onChange, placeholder }: Props) {
  return <EditorialText value={value} onChange={onChange} placeholder={placeholder} size="lg" />;
}

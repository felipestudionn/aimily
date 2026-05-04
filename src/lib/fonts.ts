import { Geist, Instrument_Serif } from 'next/font/google';

// Shared font instances. Imported by both (app)/layout.tsx and
// [locale]/layout.tsx so next/font emits a single CSS module per font
// instead of duplicating downloads + bundle entries per route group.
export const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

/* ═══════════════════════════════════════════════════════════════════
   Root layout — pass-through.

   Next.js 16 supports multiple root layouts via route groups. The two
   real roots live at:
   - src/app/[locale]/layout.tsx — marketing pages (dynamic html lang)
   - src/app/(app)/layout.tsx    — authenticated app (English shell)

   This file only exists because Next requires app/layout.tsx to exist.
   It returns children unchanged; the actual <html>/<body> is provided
   by whichever child layout matches the request.

   Reference: SEO-GEO-STRATEGY §3.3.
   ═══════════════════════════════════════════════════════════════════ */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.aimily.app'),
  title: 'aimily — the only AI-native end-to-end fashion platform',
  description:
    'Brand DNA, range plan, tech packs and campaigns in one continuous data flow. The only AI-native fashion software that connects every block. 30-day free trial.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

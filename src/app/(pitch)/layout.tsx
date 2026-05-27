/* ═══════════════════════════════════════════════════════════════════
   (pitch)/layout.tsx — minimal shell for the investor / Zara deck.

   Lives outside (app) so it carries none of the app chrome (GlobalNav,
   StudioSwitcher, CreditMeter, AssistantMount). The deck owns the
   viewport completely — a single canvas for the presentation.
   ═══════════════════════════════════════════════════════════════════ */

import '@/styles/globals.css';
import { geist, instrumentSerif } from '@/lib/fonts';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'aimily · pitch',
  robots: { index: false, follow: false },
};

export default function PitchLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn(geist.variable, instrumentSerif.variable)}>
      <body className="bg-shade text-carbon antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}

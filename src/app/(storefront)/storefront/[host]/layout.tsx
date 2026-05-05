/* ═══════════════════════════════════════════════════════════════════
   Storefront route group · root layout

   Resolves the host once and:
   - Loads the matching theme module
   - Injects theme tokens (CSS variables) into <html style>
   - Loads Google Fonts via <link> tags (one per font family in manifest)
   - Provides a clean editorial body baseline (cero CSS reset shipped from
     the aimily app — this is a fully isolated render surface)

   notFound() if the host doesn't resolve — Next.js will render the
   nearest not-found.tsx in this same folder.
   ═══════════════════════════════════════════════════════════════════ */

import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { loadStorefrontByHost } from '@/lib/storefront/load-storefront';
import { loadTheme } from '@/lib/storefront/theme-registry';
import { GdprBanner } from '@/components/ecom/shared/GdprBanner';

interface Props {
  children: ReactNode;
  params: Promise<{ host: string }>;
}

function googleFontsHref(families: { family: string; weights: number[] }[]): string {
  // Build a single Google Fonts URL for all required families
  const familyParams = families.map((f) => {
    const weights = f.weights.length > 0 ? `:wght@${f.weights.join(';')}` : '';
    return `family=${encodeURIComponent(f.family)}${weights}`;
  });
  return `https://fonts.googleapis.com/css2?${familyParams.join('&')}&display=swap`;
}

export default async function StorefrontLayout({ children, params }: Props) {
  const { host } = await params;
  const storefront = await loadStorefrontByHost(host);
  if (!storefront) notFound();

  const theme = await loadTheme(storefront.theme_id);

  const tokenStyle = Object.entries(theme.tokens)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');

  const fontFamilies = theme.manifest.fonts.filter((f) => f.source === 'google');
  const fontsHref = fontFamilies.length > 0 ? googleFontsHref(fontFamilies) : null;

  return (
    <html lang="en" style={{ background: 'var(--s-bg)' }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {fontsHref && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={fontsHref} />
          </>
        )}
        <style
          // Inject theme tokens at :root so CSS variables cascade
          dangerouslySetInnerHTML={{
            __html: `:root{${tokenStyle}}html,body{margin:0;padding:0}body{background:var(--s-bg);color:var(--s-fg);font-family:var(--s-body-font);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}*,*::before,*::after{box-sizing:border-box}img{max-width:100%;height:auto}a{color:inherit}`,
          }}
        />
      </head>
      <body data-storefront-host={host} data-theme={storefront.theme_id}>
        {children}
        <GdprBanner />
      </body>
    </html>
  );
}

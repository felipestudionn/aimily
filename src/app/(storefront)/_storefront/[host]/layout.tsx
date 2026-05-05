/* ═══════════════════════════════════════════════════════════════════
   Storefront route group · root layout

   Multi-tenant DTC storefront layout. Each request to *.aimily.shop or
   a registered custom domain is rewritten by middleware to this route
   group with the host as the first dynamic segment.

   This layout is INTENTIONALLY ISOLATED from the main aimily app:
   - Its own <html>/<body>
   - Its own font loading (theme-driven, see Sprint 2)
   - No aimily app providers (auth, sidebar, presentation, etc.)
   - No CIS / loadFullContext (the SSR loader handles that)

   The host param is forwarded to children pages via React's params API.

   Plan: .planning/ecom/01-ARCHITECTURE.md
   ═══════════════════════════════════════════════════════════════════ */

import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  params: Promise<{ host: string }>;
}

export default async function StorefrontLayout({ children, params }: Props) {
  const { host } = await params;

  return (
    <html lang="en" data-storefront-host={host}>
      <body>
        {children}
      </body>
    </html>
  );
}

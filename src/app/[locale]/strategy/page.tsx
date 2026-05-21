/* ═══════════════════════════════════════════════════════════════════════════
   /[locale]/strategy → /[locale]/in-season — 308 permanent redirect.

   The wedge formerly known as "Aimily Strategy" is canonically "aimily
   In-Season" since 2026-05-20. URLs renamed across DB, app routes, locales,
   and now this marketing landing. We keep the file as a permanent redirect
   so external links and indexed Google results don't 404.
   ═══════════════════════════════════════════════════════════════════════════ */

import { permanentRedirect } from 'next/navigation';

export default async function StrategyToInSeasonRedirect(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  permanentRedirect(`/${locale}/in-season`);
}

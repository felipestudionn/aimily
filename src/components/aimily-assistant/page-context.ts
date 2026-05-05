/**
 * page-context — derive { pathname, collectionId, miniBlockId, blockCoord }
 * from the active URL.
 *
 * The mapping mirrors SIDEBAR_BLOCKS in WizardSidebar.tsx. It is intentionally
 * a small lookup table rather than a heavy regex — the canonical set of routes
 * is finite and stable.
 */

import type { ReadonlyURLSearchParams } from 'next/navigation';

export interface PageContextLite {
  pathname: string;
  collectionId?: string | null;
  miniBlockId?: string | null;
  miniBlockTitle?: string | null;
  blockCoord?: string | null;
}

/**
 * Map of (route base, query key, query value) → { miniBlockId, blockCoord, title }
 */
const ROUTE_MAP: Array<{
  base: RegExp;
  query?: { key: string; value: string };
  miniBlockId: string;
  blockCoord: string;
  title: string;
}> = [
  // Block 01
  { base: /\/creative$/, query: { key: 'block', value: 'consumer' }, miniBlockId: 'consumer', blockCoord: '01.1', title: 'Consumer Definition' },
  { base: /\/creative$/, query: { key: 'block', value: 'moodboard' }, miniBlockId: 'moodboard', blockCoord: '01.2', title: 'Moodboard & Research' },
  { base: /\/creative$/, query: { key: 'block', value: 'research' }, miniBlockId: 'market-research', blockCoord: '01.3', title: 'Market Research' },
  { base: /\/creative$/, query: { key: 'block', value: 'brand-dna' }, miniBlockId: 'brand-identity', blockCoord: '01.4', title: 'Brand Identity' },
  { base: /\/creative$/, query: { key: 'block', value: 'synthesis' }, miniBlockId: 'creative-overview', blockCoord: '01.5', title: 'Creative Overview' },
  { base: /\/creative$/, miniBlockId: 'creative', blockCoord: '01', title: 'Block 01 · Creative & Brand Direction' },

  // Block 02
  { base: /\/merchandising$/, query: { key: 'block', value: 'scenarios' }, miniBlockId: 'scenarios', blockCoord: '02.1', title: 'Buying Strategy' },
  { base: /\/merchandising$/, query: { key: 'block', value: 'families' }, miniBlockId: 'families-pricing', blockCoord: '02.2', title: 'Assortment & Pricing' },
  { base: /\/merchandising$/, query: { key: 'block', value: 'channels' }, miniBlockId: 'channels', blockCoord: '02.3', title: 'Distribution' },
  { base: /\/merchandising$/, query: { key: 'block', value: 'budget' }, miniBlockId: 'budget', blockCoord: '02.4', title: 'Financial Plan' },
  { base: /\/merchandising$/, miniBlockId: 'merchandising', blockCoord: '02', title: 'Block 02 · Merchandising & Planning' },

  // Block 03
  { base: /\/product$/, query: { key: 'phase', value: 'sketch' }, miniBlockId: 'sketch', blockCoord: '03.1', title: 'Sketch & Color' },
  { base: /\/product$/, query: { key: 'phase', value: 'techpack' }, miniBlockId: 'tech-pack', blockCoord: '03.2', title: 'Tech Pack' },
  { base: /\/product$/, query: { key: 'phase', value: 'prototyping' }, miniBlockId: 'prototyping', blockCoord: '03.3', title: 'Prototyping' },
  { base: /\/product$/, query: { key: 'phase', value: 'production' }, miniBlockId: 'production', blockCoord: '03.4', title: 'Production' },
  { base: /\/product$/, query: { key: 'phase', value: 'selection' }, miniBlockId: 'final-selection', blockCoord: '03.5', title: 'Final Selection' },
  { base: /\/product$/, miniBlockId: 'product', blockCoord: '03', title: 'Block 03 · Design & Development' },

  // Block 04
  { base: /\/marketing\/creation$/, query: { key: 'block', value: 'gtm' }, miniBlockId: 'gtm-launch', blockCoord: '04.1', title: 'GTM & Launch Plan' },
  { base: /\/marketing\/creation$/, query: { key: 'block', value: 'content' }, miniBlockId: 'content-studio', blockCoord: '04.2', title: 'Content Studio' },
  { base: /\/marketing\/creation$/, query: { key: 'block', value: 'comms' }, miniBlockId: 'communications', blockCoord: '04.3', title: 'Communications' },
  { base: /\/marketing\/creation$/, query: { key: 'block', value: 'sales' }, miniBlockId: 'sales', blockCoord: '04.4', title: 'Sales Dashboard' },
  { base: /\/marketing\/creation$/, query: { key: 'block', value: 'ecom' }, miniBlockId: 'ecom', blockCoord: '04.5', title: 'Ecom' },
  { base: /\/marketing\/creation$/, miniBlockId: 'marketing', blockCoord: '04', title: 'Block 04 · Marketing & Sales' },

  // Calendar / Presentation
  { base: /\/calendar$/, miniBlockId: 'calendar', blockCoord: 'calendar', title: 'Calendar' },
  { base: /\/presentation$/, miniBlockId: 'presentation', blockCoord: 'presentation', title: 'Presentation' },
];

/** Extract collectionId from /collection/{uuid}/... */
function extractCollectionId(pathname: string): string | null {
  const m = pathname.match(/^\/collection\/([0-9a-fA-F-]{36})/);
  return m ? m[1]! : null;
}

export function derivePageContext(
  pathname: string,
  searchParams: ReadonlyURLSearchParams | null,
): PageContextLite {
  const collectionId = extractCollectionId(pathname);
  if (!collectionId) {
    return { pathname, collectionId: null };
  }

  for (const entry of ROUTE_MAP) {
    if (!entry.base.test(pathname)) continue;
    if (entry.query) {
      const v = searchParams?.get(entry.query.key);
      if (v !== entry.query.value) continue;
    }
    return {
      pathname,
      collectionId,
      miniBlockId: entry.miniBlockId,
      miniBlockTitle: entry.title,
      blockCoord: entry.blockCoord,
    };
  }

  return { pathname, collectionId };
}

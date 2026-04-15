/* ═══════════════════════════════════════════════════════════════════
   /presentation/export/[id]?token=<signed> — internal print route

   Server component rendered by headless Chrome to produce the PDF.
   Renders all 21 slides stacked vertically in A4-landscape format,
   theme tokens injected at each slide root. No chrome — just canvases.

   Auth: signed short-lived JWT in ?token (see export-token.ts).
   ═══════════════════════════════════════════════════════════════════ */

import { notFound } from 'next/navigation';
import { verifyExportToken } from '@/lib/presentation/export-token';
import { loadPresentationData } from '@/lib/presentation/load-presentation-data';
import { SPINE } from '@/lib/presentation/spine';
import { getTheme, themeStyle } from '@/lib/presentation/themes';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CoverTemplate } from '@/components/presentation/templates/CoverTemplate';
import { HeroTemplate } from '@/components/presentation/templates/HeroTemplate';
import { EditorialStatTemplate } from '@/components/presentation/templates/EditorialStatTemplate';
import { NarrativePortraitTemplate } from '@/components/presentation/templates/NarrativePortraitTemplate';
import { GridTileTemplate } from '@/components/presentation/templates/GridTileTemplate';
import { TimelineStripTemplate } from '@/components/presentation/templates/TimelineStripTemplate';
import { PlaceholderTemplate } from '@/components/presentation/templates/PlaceholderTemplate';
import type { MicroBlockSlide, DeckMeta } from '@/lib/presentation/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; theme?: string; subtitle?: string }>;
}

/* Hardcoded English defaults for the cover subtitle — export tokens
   carry no locale, so we accept it via ?subtitle= and fall back here. */
const DEFAULT_SUBTITLE = 'A collection presentation';

/* Resolve the correct template component per slide — same dispatch as
   the client SlideRenderer, but no null-slide branch because we render
   the cover as its own first entry in the loop below. */
function renderSlide(slide: MicroBlockSlide, meta: DeckMeta, title: string, data: Awaited<ReturnType<typeof loadPresentationData>>) {
  switch (slide.template) {
    case 'hero':
      return <HeroTemplate slide={slide} meta={meta} title={title} />;
    case 'editorial-stat':
      return <EditorialStatTemplate slide={slide} meta={meta} title={title} />;
    case 'narrative-portrait':
      return <NarrativePortraitTemplate slide={slide} meta={meta} title={title} data={data.narratives[slide.id]} />;
    case 'grid-tile':
      return <GridTileTemplate slide={slide} meta={meta} title={title} data={data.grids[slide.id]} />;
    case 'timeline-strip':
      return <TimelineStripTemplate slide={slide} meta={meta} title={title} data={data.timelines[slide.id]} />;
    default:
      return <PlaceholderTemplate slide={slide} meta={meta} title={title} />;
  }
}

export default async function PresentationExportPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const token = sp.token;
  const themeId = sp.theme ?? 'editorial-heritage';
  const coverSubtitle = sp.subtitle ?? DEFAULT_SUBTITLE;

  if (!token) notFound();
  const payload = verifyExportToken(token);
  if (!payload || payload.collectionId !== id) notFound();

  // Load the same data the client renders
  const data = await loadPresentationData(id);
  const theme = getTheme(themeId);

  // Fetch the English sidebar labels server-side for slide titles.
  // Hardcoded English for now since export is primarily for PDF/print.
  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('name, season, launch_date')
    .eq('id', id)
    .single();

  const meta: DeckMeta = {
    collectionName: data.cover.brandName ?? plan?.name ?? 'Collection',
    brandName: data.cover.brandName ?? plan?.name ?? undefined,
    season: data.cover.season ?? plan?.season ?? undefined,
    launchDate: data.cover.launchDate ?? plan?.launch_date ?? null,
  };

  // Slide title labels — matches SidebarSubItem labels in English.
  const TITLE_MAP: Record<string, string> = {
    consumer: 'Consumer',
    moodboard: 'Moodboard',
    marketResearch: 'Market Research',
    brandIdentity: 'Brand Identity',
    creativeOverview: 'Creative Overview',
    buyingStrategy: 'Buying Strategy',
    assortmentPricing: 'Assortment & Pricing',
    distribution: 'Distribution',
    financialPlan: 'Financial Plan',
    collectionBuilder: 'Collection Builder',
    sketchColor: 'Sketch & Color',
    techPack: 'Tech Pack',
    prototyping: 'Prototyping',
    production: 'Production',
    finalSelection: 'Final Selection',
    gtmLaunchPlan: 'GTM & Launch Plan',
    contentStudio: 'Content Studio',
    communications: 'Communications',
    salesDashboard: 'Sales Dashboard',
    pointOfSale: 'Point of Sale',
  };

  return (
    <div className="w-full" style={{ background: '#fff' }}>
      {/* Cover */}
      <div
        className="pdf-slide"
        style={{
          ...themeStyle(theme),
          width: '1600px',
          aspectRatio: '297 / 210',  // A4 landscape ratio
          pageBreakAfter: 'always',
          breakAfter: 'page',
          overflow: 'hidden',
        }}
      >
        <CoverTemplate meta={meta} subtitle={coverSubtitle} />
      </div>

      {/* 20 mini-block slides */}
      {SPINE.map((slide) => (
        <div
          key={slide.id}
          className="pdf-slide"
          style={{
            ...themeStyle(theme),
            width: '1600px',
            aspectRatio: '297 / 210',
            pageBreakAfter: 'always',
            breakAfter: 'page',
            overflow: 'hidden',
          }}
        >
          {renderSlide(slide, meta, TITLE_MAP[slide.titleKey] ?? slide.titleKey, data)}
        </div>
      ))}

      {/* Global print CSS — guarantees each slide lands on its own A4 page */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }
        @media print {
          html, body { margin: 0; padding: 0; }
          .pdf-slide {
            width: 297mm !important;
            height: 210mm !important;
            aspect-ratio: unset !important;
            page-break-after: always;
            break-after: page;
          }
          .pdf-slide:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}

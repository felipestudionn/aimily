/* ═══════════════════════════════════════════════════════════════════
   /presentation/export/[id]?token=<signed> — internal print route

   Server component rendered by headless Chrome to produce the PDF.
   Renders all 21 slides stacked vertically in A4-landscape format,
   theme tokens injected at each slide root. No chrome — just canvases.

   Auth: signed short-lived JWT in ?token (see export-token.ts).
   ═══════════════════════════════════════════════════════════════════ */

import * as React from 'react';
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
import { RangeWallTemplate } from '@/components/presentation/templates/RangeWallTemplate';
import { ChannelMapTemplate } from '@/components/presentation/templates/ChannelMapTemplate';
import { PaletteTemplate } from '@/components/presentation/templates/PaletteTemplate';
import { ScenarioCompareTemplate } from '@/components/presentation/templates/ScenarioCompareTemplate';
import { MaterialZonesTemplate } from '@/components/presentation/templates/MaterialZonesTemplate';
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
/* Render a single slide and force any synchronous throw inside the template
   body to surface here. Server components don't have ErrorBoundaries — once
   React reaches the render phase a throw bubbles up to the page boundary and
   you get the generic Next "Application error". By INVOKING the template as
   a function (not via JSX), its body executes inline so we can try/catch the
   actual computation. The returned JSX is then handed to React as a static
   element tree. */
function renderSlide(slide: MicroBlockSlide, meta: DeckMeta, title: string, data: Awaited<ReturnType<typeof loadPresentationData>>): React.ReactNode {
  type AnyProps = Record<string, unknown>;
  const Templates = {
    hero: HeroTemplate as (p: AnyProps) => React.ReactNode,
    'editorial-stat': EditorialStatTemplate as (p: AnyProps) => React.ReactNode,
    'narrative-portrait': NarrativePortraitTemplate as (p: AnyProps) => React.ReactNode,
    'grid-tile': GridTileTemplate as (p: AnyProps) => React.ReactNode,
    'timeline-strip': TimelineStripTemplate as (p: AnyProps) => React.ReactNode,
    'range-wall': RangeWallTemplate as (p: AnyProps) => React.ReactNode,
    'channel-map': ChannelMapTemplate as (p: AnyProps) => React.ReactNode,
    palette: PaletteTemplate as (p: AnyProps) => React.ReactNode,
    'scenario-compare': ScenarioCompareTemplate as (p: AnyProps) => React.ReactNode,
    'material-zones': MaterialZonesTemplate as (p: AnyProps) => React.ReactNode,
  } as const;
  const propsFor = (): AnyProps => {
    switch (slide.template) {
      case 'hero': return { slide, meta, title };
      case 'editorial-stat': return { slide, meta, title, data: data.stats[slide.id] };
      case 'narrative-portrait': return { slide, meta, title, data: data.narratives[slide.id] };
      case 'grid-tile': return { slide, meta, title, data: data.grids[slide.id] };
      case 'timeline-strip': return { slide, meta, title, data: data.timelines[slide.id] };
      case 'range-wall': return { slide, meta, title, data: data.ranges[slide.id] };
      case 'channel-map': return { slide, meta, title, data: data.channels[slide.id] };
      case 'palette': return { slide, meta, title, data: data.palettes[slide.id] };
      case 'scenario-compare': return { slide, meta, title, data: data.scenarioCompares[slide.id] };
      case 'material-zones': return { slide, meta, title, data: data.materialZones[slide.id] };
      default: return { slide, meta, title };
    }
  };
  try {
    const fn = Templates[slide.template as keyof typeof Templates];
    if (!fn) return <PlaceholderTemplate slide={slide} meta={meta} title={title} />;
    return fn(propsFor());
  } catch (err) {
    const e = err as Error;
    console.error(`[presentation/export] slide ${slide.id} (${slide.template}) threw:`, e);
    return (
      <div data-slide-error data-slide-id={slide.id} style={{ padding: 40, fontFamily: 'monospace', fontSize: 12, background: '#fff' }}>
        <p style={{ color: '#900', fontWeight: 700, marginBottom: 8 }}>SLIDE_RENDER_ERROR · {slide.id} ({slide.template})</p>
        <p style={{ marginBottom: 6 }}><b>{e.name}</b>: {e.message}</p>
        {e.stack ? <pre style={{ whiteSpace: 'pre-wrap', fontSize: 10, color: '#444' }}>{e.stack.split('\n').slice(0, 6).join('\n')}</pre> : null}
      </div>
    );
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

  // Load the same data the client renders. If the loader throws, render
  // a structured error page (not Next.js's generic "Application error")
  // so the API route can extract the actual stack and surface it.
  let data: Awaited<ReturnType<typeof loadPresentationData>>;
  try {
    data = await loadPresentationData(id);
  } catch (err) {
    const e = err as Error;
    console.error('[presentation/export] loadPresentationData threw:', e);
    return (
      <div data-export-error style={{ padding: 40, fontFamily: 'monospace', fontSize: 12 }}>
        <h1>EXPORT_LOAD_ERROR</h1>
        <p><b>{e.name}</b>: {e.message}</p>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{e.stack}</pre>
      </div>
    );
  }
  const theme = getTheme(themeId);

  // Fetch the English sidebar labels server-side for slide titles.
  // Hardcoded English for now since export is primarily for PDF/print.
  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('name, season')
    .eq('id', id)
    .single();

  const meta: DeckMeta = {
    collectionName: data.cover.brandName ?? plan?.name ?? 'Collection',
    brandName: data.cover.brandName ?? plan?.name ?? undefined,
    season: data.cover.season ?? plan?.season ?? undefined,
    launchDate: data.cover.launchDate ?? null,
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

  // Render the cover via function call so any throw inside CoverTemplate's
  // body lands here instead of bubbling up as a generic Next error page.
  let coverNode: React.ReactNode;
  try {
    coverNode = (CoverTemplate as (p: { meta: DeckMeta; subtitle: string }) => React.ReactNode)({ meta, subtitle: coverSubtitle });
  } catch (err) {
    const e = err as Error;
    console.error('[presentation/export] cover threw:', e);
    coverNode = (
      <div data-slide-error data-slide-id="cover" style={{ padding: 40, fontFamily: 'monospace', fontSize: 12 }}>
        <p style={{ color: '#900', fontWeight: 700 }}>COVER_RENDER_ERROR</p>
        <p>{e.name}: {e.message}</p>
      </div>
    );
  }

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
        {coverNode}
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

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import PptxGenJS from 'pptxgenjs';

/* ═══════════════════════════════════════════════════════════════════════════
   PPTX Export — Generates a PowerPoint presentation matching the slide deck
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Design tokens ──
const CARBON = '282A29';
const CREMA = 'F5F1E8';
const GOLD = '9c7c4c';
const WHITE = 'FFFFFF';

function safe<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined || val === '') return fallback;
  return val as T;
}

function currency(n: number | undefined | null): string {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function pct(n: number | undefined | null): string {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `${Math.round(n * (n < 1 ? 100 : 1))}%`;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return d; }
}

interface SKU {
  id: string; name: string; family: string; type: string;
  pvp: number; cost: number; margin: number; buy_units: number; expected_sales: number;
  sketch_url?: string;
}

export async function GET(req: NextRequest) {
  // Auth
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  const userId = user!.id;

  const collectionId = req.nextUrl.searchParams.get('collectionId');
  if (!collectionId) {
    return NextResponse.json({ error: 'Missing collectionId' }, { status: 400 });
  }

  // Fetch data (same as presentation page)
  const [planRes, timelineRes, skusRes, creativeRes, merchRes] = await Promise.all([
    supabaseAdmin.from('collection_plans').select('*').eq('id', collectionId).single(),
    supabaseAdmin.from('collection_timelines').select('*').eq('collection_plan_id', collectionId).single(),
    supabaseAdmin.from('collection_skus').select('*').eq('collection_plan_id', collectionId),
    supabaseAdmin.from('collection_workspace_data').select('data').eq('collection_plan_id', collectionId).eq('workspace', 'creative').single(),
    supabaseAdmin.from('collection_workspace_data').select('data').eq('collection_plan_id', collectionId).eq('workspace', 'merchandising').single(),
  ]);

  if (planRes.error || !planRes.data) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  }
  if (planRes.data.user_id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const plan = planRes.data;
  const timeline = timelineRes.data;
  const skus = (skusRes.data || []) as SKU[];
  const creative = (creativeRes.data?.data || {}) as Record<string, unknown>;
  const merch = (merchRes.data?.data || {}) as Record<string, unknown>;
  const setup = plan.setup_data || {};
  const launchDate = timeline?.launch_date;

  // ── Extract creative data ──
  const blockData = (creative?.blockData || {}) as Record<string, { confirmed?: boolean; data?: Record<string, unknown> }>;
  const vibeData = blockData?.vibe?.data || {};
  const vibeTitle = safe<string>(vibeData.vibeTitle, '');
  const vibeNarrative = safe<string>(vibeData.vibe, '');
  const vibeKeywords = safe<string>(vibeData.keywords, '');

  const consumerData = blockData?.consumer?.data || {};
  const consumerProposals = (safe<Array<{ title: string; desc: string; status: string }>>(consumerData.proposals, []))
    .filter(p => p.status === 'liked');

  const brandData = blockData?.['brand-dna']?.data || {};
  const brandName = safe<string>(brandData.brandName, '');
  const brandColors = safe<string[]>(brandData.colors, []);
  const brandTone = safe<string>(brandData.tone, '');

  // ── Extract merch data ──
  const merchBlock = (merch?.blockData || {}) as Record<string, { confirmed?: boolean; data?: Record<string, unknown> }>;
  const channelsData = merchBlock?.channels?.data || {};
  const channels = safe<string[]>(channelsData.channels, []);
  const markets = safe<string[]>(channelsData.markets, []);

  // ── SKU metrics ──
  const totalSkus = skus.length || setup.expectedSkus || 0;
  const skuPrices = skus.map(s => s.pvp).filter(p => p > 0);
  const avgPrice = skuPrices.length > 0 ? skuPrices.reduce((a, b) => a + b, 0) / skuPrices.length : (setup.avgPriceTarget || 0);
  const minPrice = skuPrices.length > 0 ? Math.min(...skuPrices) : (setup.minPrice || 0);
  const maxPrice = skuPrices.length > 0 ? Math.max(...skuPrices) : (setup.maxPrice || 0);
  const skuMargins = skus.filter(s => s.margin > 0).map(s => s.margin);
  const avgMargin = skuMargins.length > 0 ? skuMargins.reduce((a, b) => a + b, 0) / skuMargins.length : (setup.targetMargin || 0);
  const totalRevenue = skus.reduce((sum, s) => sum + (s.expected_sales || 0), 0) || (setup.totalSalesTarget || 0);
  const totalUnits = skus.reduce((sum, s) => sum + (s.buy_units || 0), 0);
  const totalCogs = skus.reduce((sum, s) => sum + ((s.cost || 0) * (s.buy_units || 0)), 0);
  const grossProfit = totalRevenue - totalCogs;

  // ── Family breakdown ──
  const familyMap: Record<string, { count: number; avgRetail: number; avgCogs: number; avgMargin: number }> = {};
  for (const sku of skus) {
    const f = sku.family || 'Other';
    if (!familyMap[f]) familyMap[f] = { count: 0, avgRetail: 0, avgCogs: 0, avgMargin: 0 };
    familyMap[f].count++;
  }
  for (const [name, info] of Object.entries(familyMap)) {
    const famSkus = skus.filter(s => (s.family || 'Other') === name);
    info.avgRetail = famSkus.length > 0 ? famSkus.reduce((s, k) => s + (k.pvp || 0), 0) / famSkus.length : 0;
    info.avgCogs = famSkus.length > 0 ? famSkus.reduce((s, k) => s + (k.cost || 0), 0) / famSkus.length : 0;
    const withMargin = famSkus.filter(s => s.margin > 0);
    info.avgMargin = withMargin.length > 0 ? withMargin.reduce((s, k) => s + k.margin, 0) / withMargin.length : 0;
  }
  const families = Object.entries(familyMap).sort((a, b) => b[1].count - a[1].count);

  // ═══════════════════════════════════════════════════════
  //  BUILD PPTX
  // ═══════════════════════════════════════════════════════

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'aimily';
  pptx.title = `${plan.name || 'Collection'} — Presentation`;

  // ── Helper: dark slide ──
  function darkSlide() {
    const slide = pptx.addSlide();
    slide.background = { color: CARBON };
    return slide;
  }

  // ── Helper: light slide ──
  function lightSlide() {
    const slide = pptx.addSlide();
    slide.background = { color: CREMA };
    return slide;
  }

  // ═══ SLIDE 1: COVER ═══
  const s1 = darkSlide();
  // Gold top line
  s1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.02, fill: { color: GOLD } });
  // Season
  if (plan.season) {
    s1.addText(plan.season, { x: 1, y: 2, w: 8, h: 0.4, fontSize: 10, fontFace: 'Helvetica Neue', color: GOLD, charSpacing: 3, isTextBox: true });
  }
  // Collection name
  s1.addText(plan.name || 'Untitled Collection', { x: 1, y: 2.5, w: 8, h: 1.5, fontSize: 48, fontFace: 'Helvetica Neue', color: CREMA, bold: false, isTextBox: true });
  // Vibe subtitle
  if (vibeTitle) {
    s1.addText(vibeTitle, { x: 1, y: 4, w: 6, h: 0.6, fontSize: 16, fontFace: 'Helvetica Neue', color: 'FAEFE080', italic: true, isTextBox: true });
  }
  // Gold separator
  s1.addShape(pptx.ShapeType.rect, { x: 1, y: 4.8, w: 1, h: 0.01, fill: { color: GOLD } });
  // Key metrics
  const coverMetrics: string[] = [];
  if (totalSkus > 0) coverMetrics.push(`${totalSkus} Products`);
  if (totalRevenue > 0) coverMetrics.push(`${currency(totalRevenue)} Target`);
  if (launchDate) coverMetrics.push(`Launch: ${formatDate(launchDate)}`);
  if (coverMetrics.length > 0) {
    s1.addText(coverMetrics.join('   ·   '), { x: 1, y: 5.1, w: 8, h: 0.4, fontSize: 11, fontFace: 'Helvetica Neue', color: 'FAEFE070', isTextBox: true });
  }
  // aimily branding
  s1.addText('aimily', { x: 1, y: 6.8, w: 2, h: 0.3, fontSize: 10, fontFace: 'Helvetica Neue', color: 'FAEFE030', charSpacing: 2, isTextBox: true });

  // ═══ SLIDE 2: CREATIVE DIRECTION ═══
  const s2 = darkSlide();
  s2.addText('Creative Direction', { x: 1, y: 0.8, w: 6, h: 0.3, fontSize: 9, fontFace: 'Helvetica Neue', color: GOLD, charSpacing: 3, isTextBox: true });
  if (vibeNarrative) {
    s2.addText(`"${vibeNarrative}"`, { x: 1, y: 1.5, w: 8, h: 2.5, fontSize: 22, fontFace: 'Helvetica Neue', color: CREMA, bold: false, isTextBox: true, paraSpaceAfter: 6 });
  }
  if (vibeKeywords) {
    s2.addText(vibeKeywords.split(',').map(k => k.trim().toUpperCase()).join('   ·   '), { x: 1, y: 4.2, w: 8, h: 0.4, fontSize: 9, fontFace: 'Helvetica Neue', color: 'FAEFE050', charSpacing: 1.5, isTextBox: true });
  }
  // Brand colors
  if (brandColors.length > 0) {
    brandColors.slice(0, 6).forEach((color, i) => {
      const hex = color.startsWith('#') ? color.slice(1) : color;
      s2.addShape(pptx.ShapeType.ellipse, { x: 1 + i * 0.8, y: 5, w: 0.5, h: 0.5, fill: { color: hex } });
      s2.addText(color, { x: 0.7 + i * 0.8, y: 5.55, w: 1, h: 0.25, fontSize: 7, fontFace: 'Helvetica Neue', color: 'FAEFE040', align: 'center', isTextBox: true });
    });
  }
  // Brand info
  const brandInfoParts: string[] = [];
  if (brandName) brandInfoParts.push(`Brand: ${brandName}`);
  if (brandTone) brandInfoParts.push(`Tone: ${brandTone}`);
  if (brandInfoParts.length > 0) {
    s2.addText(brandInfoParts.join('   |   '), { x: 1, y: 6.3, w: 8, h: 0.3, fontSize: 9, fontFace: 'Helvetica Neue', color: 'FAEFE040', isTextBox: true });
  }

  // ═══ SLIDE 3: TARGET CONSUMER ═══
  const s3 = darkSlide();
  s3.addText('Target Consumer', { x: 1, y: 0.8, w: 6, h: 0.3, fontSize: 9, fontFace: 'Helvetica Neue', color: GOLD, charSpacing: 3, isTextBox: true });
  if (consumerProposals.length > 0) {
    consumerProposals.slice(0, 4).forEach((profile, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 1 + col * 4.5;
      const y = 1.5 + row * 2.5;
      s3.addShape(pptx.ShapeType.rect, { x, y, w: 4, h: 2.2, line: { color: 'FAEFE015', width: 0.5 } });
      s3.addText(`${String(i + 1).padStart(2, '0')}`, { x: x + 0.2, y: y + 0.2, w: 0.5, h: 0.3, fontSize: 8, fontFace: 'Helvetica Neue', color: 'FAEFE040', isTextBox: true });
      s3.addText(profile.title, { x: x + 0.7, y: y + 0.15, w: 3, h: 0.35, fontSize: 14, fontFace: 'Helvetica Neue', color: CREMA, bold: false, isTextBox: true });
      s3.addText(profile.desc, { x: x + 0.3, y: y + 0.6, w: 3.4, h: 1.4, fontSize: 9, fontFace: 'Helvetica Neue', color: 'FAEFE060', isTextBox: true, paraSpaceAfter: 4 });
    });
  } else {
    s3.addText('No consumer profiles defined yet', { x: 1, y: 3, w: 8, h: 0.5, fontSize: 18, fontFace: 'Helvetica Neue', color: 'FAEFE040', italic: true, isTextBox: true });
  }

  // ═══ SLIDE 4: MARKET OPPORTUNITY ═══
  const s4 = lightSlide();
  s4.addText('Market Opportunity', { x: 1, y: 0.8, w: 6, h: 0.3, fontSize: 9, fontFace: 'Helvetica Neue', color: GOLD, charSpacing: 3, isTextBox: true });
  const marketMetrics = [
    { label: 'Target Revenue', value: currency(totalRevenue) },
    { label: 'Avg Price Point', value: currency(avgPrice) },
    { label: 'Target Margin', value: pct(avgMargin) },
  ];
  marketMetrics.forEach((m, i) => {
    s4.addText(m.label.toUpperCase(), { x: 1 + i * 3, y: 1.5, w: 2.5, h: 0.25, fontSize: 8, fontFace: 'Helvetica Neue', color: `${CARBON}50`, charSpacing: 1.5, isTextBox: true });
    s4.addText(m.value, { x: 1 + i * 3, y: 1.8, w: 2.5, h: 0.6, fontSize: 28, fontFace: 'Helvetica Neue', color: CARBON, bold: false, isTextBox: true });
  });
  // Channels & Markets
  if (channels.length > 0) {
    s4.addText('DISTRIBUTION CHANNELS', { x: 1, y: 3.2, w: 4, h: 0.25, fontSize: 8, fontFace: 'Helvetica Neue', color: `${CARBON}50`, charSpacing: 2, isTextBox: true });
    s4.addText(channels.map(c => `•  ${c}`).join('\n'), { x: 1, y: 3.6, w: 4, h: 2, fontSize: 11, fontFace: 'Helvetica Neue', color: `${CARBON}90`, isTextBox: true, paraSpaceAfter: 4 });
  }
  if (markets.length > 0) {
    s4.addText('TARGET MARKETS', { x: 5.5, y: 3.2, w: 4, h: 0.25, fontSize: 8, fontFace: 'Helvetica Neue', color: `${CARBON}50`, charSpacing: 2, isTextBox: true });
    s4.addText(markets.map(m => `•  ${m}`).join('\n'), { x: 5.5, y: 3.6, w: 4, h: 2, fontSize: 11, fontFace: 'Helvetica Neue', color: `${CARBON}90`, isTextBox: true, paraSpaceAfter: 4 });
  }

  // ═══ SLIDE 5: COLLECTION ARCHITECTURE ═══
  const s5 = darkSlide();
  s5.addText('Collection Architecture', { x: 1, y: 0.8, w: 6, h: 0.3, fontSize: 9, fontFace: 'Helvetica Neue', color: GOLD, charSpacing: 3, isTextBox: true });
  s5.addText(String(totalSkus), { x: 1, y: 1.5, w: 3, h: 1, fontSize: 54, fontFace: 'Helvetica Neue', color: CREMA, bold: false, isTextBox: true });
  s5.addText('PRODUCTS', { x: 3.5, y: 2.1, w: 2, h: 0.3, fontSize: 10, fontFace: 'Helvetica Neue', color: 'FAEFE040', charSpacing: 2, isTextBox: true });
  // Family bars
  families.slice(0, 8).forEach(([name, info], i) => {
    const y = 3 + i * 0.45;
    const barWidth = Math.max((info.count / (totalSkus || 1)) * 5, 0.3);
    s5.addText(name, { x: 1, y, w: 2, h: 0.35, fontSize: 10, fontFace: 'Helvetica Neue', color: CREMA, isTextBox: true });
    s5.addShape(pptx.ShapeType.rect, { x: 3.2, y: y + 0.05, w: barWidth, h: 0.22, fill: { color: GOLD }, rectRadius: 0 });
    s5.addText(`${info.count}`, { x: 3.3 + barWidth, y, w: 1, h: 0.35, fontSize: 9, fontFace: 'Helvetica Neue', color: 'FAEFE040', isTextBox: true });
  });

  // ═══ SLIDE 6: PRICE ARCHITECTURE ═══
  const s6 = darkSlide();
  s6.addText('Price Architecture', { x: 1, y: 0.8, w: 6, h: 0.3, fontSize: 9, fontFace: 'Helvetica Neue', color: GOLD, charSpacing: 3, isTextBox: true });
  s6.addText(`${currency(minPrice)} — ${currency(maxPrice)}`, { x: 1, y: 1.5, w: 8, h: 0.8, fontSize: 32, fontFace: 'Helvetica Neue', color: CREMA, bold: false, isTextBox: true });
  s6.addText('PRICE RANGE', { x: 1, y: 2.3, w: 3, h: 0.25, fontSize: 8, fontFace: 'Helvetica Neue', color: 'FAEFE040', charSpacing: 1.5, isTextBox: true });
  s6.addText(currency(avgPrice), { x: 1, y: 3.2, w: 3, h: 0.6, fontSize: 24, fontFace: 'Helvetica Neue', color: CREMA, isTextBox: true });
  s6.addText('AVERAGE PRICE', { x: 1, y: 3.8, w: 3, h: 0.25, fontSize: 8, fontFace: 'Helvetica Neue', color: 'FAEFE040', charSpacing: 1.5, isTextBox: true });
  s6.addText(pct(avgMargin), { x: 4.5, y: 3.2, w: 3, h: 0.6, fontSize: 24, fontFace: 'Helvetica Neue', color: CREMA, isTextBox: true });
  s6.addText('AVERAGE MARGIN', { x: 4.5, y: 3.8, w: 3, h: 0.25, fontSize: 8, fontFace: 'Helvetica Neue', color: 'FAEFE040', charSpacing: 1.5, isTextBox: true });
  // Family pricing table
  if (families.length > 0) {
    const tableY = 4.5;
    const headers = ['Family', 'SKUs', 'Avg Retail', 'Avg COGS', 'Avg Margin'];
    headers.forEach((h, i) => {
      s6.addText(h.toUpperCase(), { x: 1 + i * 1.6, y: tableY, w: 1.5, h: 0.25, fontSize: 7, fontFace: 'Helvetica Neue', color: 'FAEFE030', charSpacing: 1.5, align: i === 0 ? 'left' : 'right', isTextBox: true });
    });
    families.slice(0, 6).forEach(([name, info], i) => {
      const y = tableY + 0.35 + i * 0.3;
      const vals = [name, String(info.count), currency(info.avgRetail), currency(info.avgCogs), pct(info.avgMargin)];
      vals.forEach((v, j) => {
        s6.addText(v, { x: 1 + j * 1.6, y, w: 1.5, h: 0.25, fontSize: 9, fontFace: 'Helvetica Neue', color: 'FAEFE060', align: j === 0 ? 'left' : 'right', isTextBox: true });
      });
    });
  }

  // ═══ SLIDE 7: FINANCIAL OVERVIEW ═══
  const s7 = lightSlide();
  s7.addText('Financial Overview', { x: 1, y: 0.8, w: 6, h: 0.3, fontSize: 9, fontFace: 'Helvetica Neue', color: GOLD, charSpacing: 3, isTextBox: true });
  const finMetrics = [
    { label: 'Revenue Target', value: currency(totalRevenue) },
    { label: 'Total Units', value: totalUnits > 0 ? totalUnits.toLocaleString() : '—' },
    { label: 'Average Price', value: currency(avgPrice) },
    { label: 'Average Margin', value: pct(avgMargin) },
    { label: 'Total COGS', value: totalCogs > 0 ? currency(totalCogs) : '—' },
    { label: 'Gross Profit', value: grossProfit > 0 ? currency(grossProfit) : '—' },
  ];
  finMetrics.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 1 + col * 3;
    const y = 1.5 + row * 2;
    s7.addText(m.label.toUpperCase(), { x, y, w: 2.5, h: 0.25, fontSize: 8, fontFace: 'Helvetica Neue', color: `${CARBON}40`, charSpacing: 1.5, isTextBox: true });
    s7.addText(m.value, { x, y: y + 0.3, w: 2.5, h: 0.7, fontSize: 28, fontFace: 'Helvetica Neue', color: CARBON, bold: false, isTextBox: true });
  });

  // ═══ SLIDE 8: CLOSE ═══
  const s8 = darkSlide();
  s8.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.01, fill: { color: GOLD } });
  s8.addText('Designed with', { x: 0, y: 2.5, w: '100%', h: 0.3, fontSize: 9, fontFace: 'Helvetica Neue', color: 'FAEFE030', charSpacing: 2, align: 'center', isTextBox: true });
  s8.addText('aimily', { x: 0, y: 2.9, w: '100%', h: 0.6, fontSize: 24, fontFace: 'Helvetica Neue', color: 'FAEFE070', charSpacing: 2, align: 'center', isTextBox: true });
  s8.addShape(pptx.ShapeType.rect, { x: 4.5, y: 3.7, w: 1, h: 0.01, fill: { color: GOLD } });
  s8.addText(plan.name || '', { x: 0, y: 4, w: '100%', h: 0.7, fontSize: 32, fontFace: 'Helvetica Neue', color: CREMA, bold: false, align: 'center', isTextBox: true });
  const closeInfo = [plan.season, launchDate ? formatDate(launchDate) : ''].filter(Boolean).join(' — ');
  if (closeInfo) {
    s8.addText(closeInfo.toUpperCase(), { x: 0, y: 4.8, w: '100%', h: 0.3, fontSize: 9, fontFace: 'Helvetica Neue', color: 'FAEFE040', charSpacing: 1.5, align: 'center', isTextBox: true });
  }
  s8.addText('Confidential — prepared for internal use', { x: 0, y: 6.5, w: '100%', h: 0.25, fontSize: 7, fontFace: 'Helvetica Neue', color: 'FAEFE020', charSpacing: 2, align: 'center', isTextBox: true });
  s8.addShape(pptx.ShapeType.rect, { x: 0, y: 7.49, w: '100%', h: 0.01, fill: { color: GOLD } });

  // ── Generate buffer ──
  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;

  const filename = `${(plan.name || 'Collection').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}_Presentation.pptx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

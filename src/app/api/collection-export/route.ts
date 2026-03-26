import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import ExcelJS from 'exceljs';
import {
  PHASES,
  PHASE_ORDER,
  getMilestoneDate,
  getMilestoneEndDate,
} from '@/lib/timeline-template';
import type { TimelineMilestone, TimelinePhase } from '@/types/timeline';

// ── Helpers (reused from export-timeline-excel.ts) ──

function hexToArgb(hex: string): string {
  return 'FF' + hex.replace('#', '');
}

function lightenHex(hex: string, factor = 0.7): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return (
    lr.toString(16).padStart(2, '0') +
    lg.toString(16).padStart(2, '0') +
    lb.toString(16).padStart(2, '0')
  );
}

// ── Styles ──

const DARK_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF282A29' },
};
const CREAM_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF5F1E8' },
};
const WHITE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFFFF' },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 10,
  color: { argb: 'FFFFFFFF' },
};
const BODY_FONT: Partial<ExcelJS.Font> = {
  size: 10,
  color: { argb: 'FF333333' },
};
const THIN_BORDER_BOTTOM: Partial<ExcelJS.Borders> = {
  bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
};

const DESIGN_PHASE_LABELS: Record<string, string> = {
  range_plan: 'Range Plan',
  sketch: 'Sketch',
  prototyping: 'Prototyping',
  production: 'Production',
  completed: 'Completed',
};

// ── SKU type (matches DB shape) ──

interface SkuRow {
  id: string;
  name: string;
  family: string;
  category: string;
  drop_number: number;
  type: string;
  channel: string;
  pvp: number;
  cost: number;
  margin: number;
  buy_units: number;
  expected_sales: number;
  design_phase: string;
  notes?: string;
  sketch_url?: string | null;
  reference_image_url?: string | null;
  production_sample_url?: string | null;
}

interface PlanRow {
  id: string;
  name: string;
  season: string;
  user_id: string;
}

interface TimelineRow {
  id: string;
  collection_plan_id: string;
  launch_date: string;
  milestones: TimelineMilestone[];
}

// ══════════════════════════════════════════════════════════════
// GET /api/collection-export?planId=xxx
// ══════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const planId = req.nextUrl.searchParams.get('planId');
    if (!planId) {
      return NextResponse.json({ error: 'planId required' }, { status: 400 });
    }

    const { authorized, error: ownerError } = await verifyCollectionOwnership(user!.id, planId);
    if (!authorized) return ownerError;

    // ── Fetch data in parallel ──

    const [planResult, skuResult, timelineResult] = await Promise.all([
      supabaseAdmin
        .from('collection_plans')
        .select('id, name, season, user_id')
        .eq('id', planId)
        .single(),
      supabaseAdmin
        .from('collection_skus')
        .select('*')
        .eq('collection_plan_id', planId)
        .order('family', { ascending: true })
        .order('drop_number', { ascending: true })
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('collection_timelines')
        .select('*')
        .eq('collection_plan_id', planId)
        .single(),
    ]);

    if (planResult.error || !planResult.data) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const plan = planResult.data as PlanRow;
    const skus = (skuResult.data || []) as SkuRow[];
    const timeline = timelineResult.data as TimelineRow | null;

    // ── Build workbook ──

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Aimily';
    wb.created = new Date();

    buildCardsSheet(wb, plan, skus, timeline);
    buildRangePlanSheet(wb, skus);
    if (timeline) {
      buildCalendarSheet(wb, timeline, plan);
    }

    // ── Return as download ──

    const arrayBuffer = await wb.xlsx.writeBuffer();
    const uint8 = new Uint8Array(arrayBuffer as ArrayBuffer);
    const safeName = plan.name.replace(/[^a-zA-Z0-9 _-]/g, '_');

    return new Response(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeName}_collection.xlsx"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Collection export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════
// SHEET 1: Range Plan
// ══════════════════════════════════════════════════════════════

function buildRangePlanSheet(wb: ExcelJS.Workbook, skus: SkuRow[]) {
  const ws = wb.addWorksheet('Range Plan', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // ── Columns match Builder's List View: Product | Type | COGS | PVP | Units | Sales | Margin ──
  // Plus extra columns useful in Excel: Family, Channel, Drop, Phase, Notes
  const COL = {
    product: 1, type: 2, cogs: 3, pvp: 4, units: 5, sales: 6, margin: 7,
    family: 8, channel: 9, drop: 10, phase: 11, notes: 12,
  };
  const TOTAL_COLS = 12;

  ws.getColumn(COL.product).width = 30;
  ws.getColumn(COL.type).width = 12;
  ws.getColumn(COL.cogs).width = 12;
  ws.getColumn(COL.pvp).width = 12;
  ws.getColumn(COL.units).width = 10;
  ws.getColumn(COL.sales).width = 16;
  ws.getColumn(COL.margin).width = 10;
  ws.getColumn(COL.family).width = 16;
  ws.getColumn(COL.channel).width = 11;
  ws.getColumn(COL.drop).width = 7;
  ws.getColumn(COL.phase).width = 14;
  ws.getColumn(COL.notes).width = 30;

  // Type badge colors (match Builder exactly)
  const TYPE_BADGE: Record<string, string> = {
    REVENUE: 'FF9c7c4c', IMAGE: 'FF7d5a8c', IMAGEN: 'FF7d5a8c', ENTRY: 'FF4c7c6c',
  };

  // ── Header row (same order as Builder) ──
  const headers = ['Product', 'Type', 'COGS', 'PVP', 'Units', 'Sales', 'Margin', 'Family', 'Channel', 'Drop', 'Phase', 'Notes'];
  const headerRow = ws.getRow(1);
  headerRow.height = 24;
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    cell.fill = DARK_FILL;
    cell.alignment = {
      vertical: 'middle',
      horizontal: i >= COL.cogs - 1 && i <= COL.margin - 1 ? 'right' : 'left',
    };
    cell.border = THIN_BORDER_BOTTOM;
  });

  // ── AutoFilter on all columns (enables filtering in Excel) ──
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: TOTAL_COLS } };

  // ── Data rows grouped by family (like Builder) ──
  const families = Array.from(new Set(skus.map(s => s.family)));
  let rowNum = 2;
  let globalIdx = 0;

  for (const fam of families) {
    const famSkus = skus.filter(s => s.family === fam);
    const famRevenue = famSkus.reduce((s, sk) => s + (sk.expected_sales || 0), 0);

    // ── Family header row (like Builder's pill + count + revenue) ──
    const famRow = ws.getRow(rowNum);
    famRow.height = 26;
    ws.mergeCells(rowNum, COL.product, rowNum, COL.type);
    const famCell = famRow.getCell(COL.product);
    famCell.value = `${fam}`;
    famCell.font = { bold: true, size: 11, color: { argb: 'FF282A29' } };
    famCell.alignment = { vertical: 'middle' };
    famCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F1E8' } };

    const countCell = famRow.getCell(COL.cogs);
    countCell.value = `${famSkus.length} SKUs`;
    countCell.font = { size: 9, color: { argb: 'FF999999' } };
    countCell.alignment = { vertical: 'middle' };
    countCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F1E8' } };

    const revCell = famRow.getCell(COL.sales);
    revCell.value = famRevenue;
    revCell.numFmt = '€#,##0';
    revCell.font = { size: 9, color: { argb: 'FF999999' } };
    revCell.alignment = { vertical: 'middle', horizontal: 'right' };
    revCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F1E8' } };

    // Fill remaining cells with family bg
    for (let c = 1; c <= TOTAL_COLS; c++) {
      const cell = famRow.getCell(c);
      if (!cell.fill || (cell.fill as ExcelJS.FillPattern).fgColor === undefined) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F1E8' } };
      }
    }
    rowNum++;

    // ── SKU rows ──
    famSkus.forEach((sku) => {
      const row = ws.getRow(rowNum);
      row.height = 22;
      const isEven = globalIdx % 2 === 0;
      const fill = isEven ? WHITE_FILL : CREAM_FILL;

      // Product name
      row.getCell(COL.product).value = sku.name;
      row.getCell(COL.product).font = { size: 10, color: { argb: 'FF282A29' } };
      row.getCell(COL.product).alignment = { vertical: 'middle' };

      // Type badge with color
      const typeLabel = (sku.type === 'IMAGEN' ? 'IMAGE' : sku.type || 'REVENUE').toUpperCase();
      row.getCell(COL.type).value = typeLabel;
      row.getCell(COL.type).font = { bold: true, size: 9, color: { argb: TYPE_BADGE[typeLabel] || 'FF9c7c4c' } };
      row.getCell(COL.type).alignment = { vertical: 'middle' };

      // COGS
      row.getCell(COL.cogs).value = sku.cost || 0;
      row.getCell(COL.cogs).numFmt = '€#,##0.00';
      row.getCell(COL.cogs).font = { size: 10, color: { argb: 'FF666666' } };
      row.getCell(COL.cogs).alignment = { vertical: 'middle', horizontal: 'right' };

      // PVP
      row.getCell(COL.pvp).value = sku.pvp || 0;
      row.getCell(COL.pvp).numFmt = '€#,##0.00';
      row.getCell(COL.pvp).font = { size: 10, color: { argb: 'FF282A29' } };
      row.getCell(COL.pvp).alignment = { vertical: 'middle', horizontal: 'right' };

      // Units
      row.getCell(COL.units).value = sku.buy_units || 0;
      row.getCell(COL.units).numFmt = '#,##0';
      row.getCell(COL.units).font = { size: 10, color: { argb: 'FF666666' } };
      row.getCell(COL.units).alignment = { vertical: 'middle', horizontal: 'right' };

      // Sales
      row.getCell(COL.sales).value = sku.expected_sales || 0;
      row.getCell(COL.sales).numFmt = '€#,##0';
      row.getCell(COL.sales).font = { size: 10, color: { argb: 'FF282A29' } };
      row.getCell(COL.sales).alignment = { vertical: 'middle', horizontal: 'right' };

      // Margin
      row.getCell(COL.margin).value = (sku.margin || 0) / 100;
      row.getCell(COL.margin).numFmt = '0%';
      row.getCell(COL.margin).font = { size: 10, color: { argb: 'FF666666' } };
      row.getCell(COL.margin).alignment = { vertical: 'middle', horizontal: 'right' };

      // Extra columns
      row.getCell(COL.family).value = sku.family || '';
      row.getCell(COL.family).font = BODY_FONT;
      row.getCell(COL.channel).value = sku.channel || '';
      row.getCell(COL.channel).font = BODY_FONT;
      row.getCell(COL.channel).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(COL.drop).value = sku.drop_number || '';
      row.getCell(COL.drop).font = BODY_FONT;
      row.getCell(COL.drop).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(COL.phase).value = DESIGN_PHASE_LABELS[sku.design_phase] || sku.design_phase || 'Range Plan';
      row.getCell(COL.phase).font = BODY_FONT;
      row.getCell(COL.notes).value = sku.notes || '';
      row.getCell(COL.notes).font = { size: 9, color: { argb: 'FF999999' } };

      // Apply row fill
      for (let c = 1; c <= TOTAL_COLS; c++) {
        const cell = row.getCell(c);
        if (!cell.fill || (cell.fill as ExcelJS.FillPattern).fgColor === undefined) {
          cell.fill = fill;
        }
        cell.alignment = { ...cell.alignment, vertical: 'middle' };
      }

      // Bottom border (subtle divider like Builder)
      for (let c = 1; c <= TOTAL_COLS; c++) {
        row.getCell(c).border = {
          bottom: { style: 'hair', color: { argb: 'FFEEEEEE' } },
        };
      }

      rowNum++;
      globalIdx++;
    });
  }

  // ── Grand total row ──
  if (skus.length > 0) {
    rowNum++; // blank separator
    const avgPvp = skus.reduce((s, sk) => s + (sk.pvp || 0), 0) / skus.length;
    const avgMargin = skus.reduce((s, sk) => s + (sk.margin || 0), 0) / skus.length;
    const totalUnits = skus.reduce((s, sk) => s + (sk.buy_units || 0), 0);
    const totalSales = skus.reduce((s, sk) => s + (sk.expected_sales || 0), 0);

    const totalRow = ws.getRow(rowNum);
    totalRow.height = 26;

    totalRow.getCell(COL.product).value = `TOTAL (${skus.length} SKUs)`;
    totalRow.getCell(COL.pvp).value = avgPvp;
    totalRow.getCell(COL.pvp).numFmt = '€#,##0.00';
    totalRow.getCell(COL.margin).value = avgMargin / 100;
    totalRow.getCell(COL.margin).numFmt = '0%';
    totalRow.getCell(COL.units).value = totalUnits;
    totalRow.getCell(COL.units).numFmt = '#,##0';
    totalRow.getCell(COL.sales).value = totalSales;
    totalRow.getCell(COL.sales).numFmt = '€#,##0';

    for (let c = 1; c <= TOTAL_COLS; c++) {
      const cell = totalRow.getCell(c);
      cell.font = { bold: true, size: 10, color: { argb: 'FF282A29' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E4DA' } };
      cell.border = { top: { style: 'medium', color: { argb: 'FF282A29' } } };
      cell.alignment = { ...cell.alignment, vertical: 'middle' };
    }
  }
}

// ══════════════════════════════════════════════════════════════
// SHEET 2: Calendar (Gantt) — mirrors export-timeline-excel.ts
// ══════════════════════════════════════════════════════════════

function buildCalendarSheet(
  wb: ExcelJS.Workbook,
  timeline: TimelineRow,
  plan: PlanRow
) {
  const milestones = timeline.milestones || [];
  const launchDateStr = timeline.launch_date;
  const launchDate = new Date(launchDateStr);

  const ws = wb.addWorksheet('Calendar', {
    views: [{ state: 'frozen', xSplit: 5, ySplit: 3 }],
  });

  // ── Date range ──
  let earliestDate = new Date(launchDate);
  let latestDate = new Date(launchDate);

  milestones.forEach((m) => {
    const start = getMilestoneDate(launchDateStr, m.startWeeksBefore);
    const end = getMilestoneEndDate(launchDateStr, m.startWeeksBefore, m.durationWeeks);
    if (start < earliestDate) earliestDate = new Date(start);
    if (end > latestDate) latestDate = new Date(end);
  });

  earliestDate.setDate(earliestDate.getDate() - earliestDate.getDay());
  latestDate.setDate(latestDate.getDate() + ((7 - latestDate.getDay()) % 7) + 7);

  // ── Weeks ──
  const weeks: { start: Date; end: Date; label: string; month: string }[] = [];
  const cur = new Date(earliestDate);
  while (cur < latestDate) {
    const weekEnd = new Date(cur);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weeks.push({
      start: new Date(cur),
      end: weekEnd,
      label: `${cur.getDate()}/${cur.getMonth() + 1}`,
      month: cur.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    });
    cur.setDate(cur.getDate() + 7);
  }

  // ── Columns ──
  const FIXED_COLS = 5;
  const totalCols = FIXED_COLS + weeks.length;

  ws.columns = [
    { key: 'status', width: 4 },
    { key: 'milestone', width: 38 },
    { key: 'responsible', width: 10 },
    { key: 'start_date', width: 12 },
    { key: 'duration', width: 8 },
    ...weeks.map((_, i) => ({ key: `w${i}`, width: 3.5 })),
  ];

  // ── Row 1: Title ──
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = `${plan.name} \u2014 ${plan.season || ''}`;
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF000000' } };
  ws.mergeCells(1, 1, 1, FIXED_COLS);
  titleRow.getCell(FIXED_COLS + 1).value = `Launch: ${launchDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  titleRow.getCell(FIXED_COLS + 1).font = { bold: true, size: 11, color: { argb: 'FFFF0000' } };
  titleRow.height = 24;

  // ── Row 2: Month headers ──
  const monthRow = ws.getRow(2);
  monthRow.height = 18;
  let prevMonth = '';
  let monthStartCol = FIXED_COLS + 1;
  weeks.forEach((week, i) => {
    const col = FIXED_COLS + 1 + i;
    if (week.month !== prevMonth) {
      if (prevMonth && col > monthStartCol + 1) {
        ws.mergeCells(2, monthStartCol, 2, col - 1);
      }
      monthStartCol = col;
      monthRow.getCell(col).value = week.month.toUpperCase();
      monthRow.getCell(col).font = { bold: true, size: 9, color: { argb: 'FF555555' } };
      monthRow.getCell(col).alignment = { horizontal: 'center' };
      prevMonth = week.month;
    }
  });
  if (monthStartCol < totalCols) {
    ws.mergeCells(2, monthStartCol, 2, totalCols);
  }

  // ── Row 3: Week headers ──
  const weekHeaderRow = ws.getRow(3);
  weekHeaderRow.height = 16;
  weekHeaderRow.getCell(1).value = '';
  weekHeaderRow.getCell(2).value = 'Milestone';
  weekHeaderRow.getCell(3).value = 'Resp.';
  weekHeaderRow.getCell(4).value = 'Start';
  weekHeaderRow.getCell(5).value = 'Wk.';
  for (let i = 1; i <= FIXED_COLS; i++) {
    weekHeaderRow.getCell(i).font = { bold: true, size: 9, color: { argb: 'FF666666' } };
    weekHeaderRow.getCell(i).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' },
    };
    weekHeaderRow.getCell(i).border = {
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
  }

  weeks.forEach((week, i) => {
    const cell = weekHeaderRow.getCell(FIXED_COLS + 1 + i);
    cell.value = week.label;
    cell.font = { size: 7, color: { argb: 'FF999999' } };
    cell.alignment = { horizontal: 'center', textRotation: 90 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' },
    };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'hair', color: { argb: 'FFEEEEEE' } },
    };
  });

  // ── Today / Launch markers ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let todayWeekIdx = -1;
  let launchWeekIdx = -1;
  weeks.forEach((week, i) => {
    if (today >= week.start && today <= week.end) todayWeekIdx = i;
    if (launchDate >= week.start && launchDate <= week.end) launchWeekIdx = i;
  });

  // ── Data rows (grouped by phase) ──
  let rowIdx = 4;

  const grouped: Record<TimelinePhase, TimelineMilestone[]> = {} as Record<TimelinePhase, TimelineMilestone[]>;
  PHASE_ORDER.forEach((phase) => {
    grouped[phase] = milestones
      .filter((m) => m.phase === phase)
      .sort((a, b) => b.startWeeksBefore - a.startWeeksBefore);
  });

  PHASE_ORDER.forEach((phaseKey) => {
    const phase = PHASES[phaseKey];
    const phaseMilestones = grouped[phaseKey];
    if (!phaseMilestones || phaseMilestones.length === 0) return;

    // Phase header row
    const phaseRow = ws.getRow(rowIdx);
    phaseRow.height = 22;
    ws.mergeCells(rowIdx, 1, rowIdx, FIXED_COLS);
    const phaseCell = phaseRow.getCell(1);
    phaseCell.value = `${phase.name.toUpperCase()} (${phaseMilestones.filter((m) => m.status === 'completed').length}/${phaseMilestones.length})`;
    phaseCell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    phaseCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: hexToArgb(phase.color) },
    };
    phaseCell.alignment = { vertical: 'middle' };

    for (let i = 0; i < weeks.length; i++) {
      const cell = phaseRow.getCell(FIXED_COLS + 1 + i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF' + lightenHex(phase.color, 0.85) },
      };
    }
    rowIdx++;

    // Milestone rows
    phaseMilestones.forEach((m) => {
      const row = ws.getRow(rowIdx);
      row.height = 20;

      // Status
      const statusSymbol = m.status === 'completed' ? '\u2713' : m.status === 'in-progress' ? '\u25D4' : '\u25CB';
      const statusCell = row.getCell(1);
      statusCell.value = statusSymbol;
      statusCell.font = {
        size: 10,
        color: {
          argb:
            m.status === 'completed'
              ? 'FF22C55E'
              : m.status === 'in-progress'
                ? 'FFF59E0B'
                : 'FFCCCCCC',
        },
      };
      statusCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Name
      const nameCell = row.getCell(2);
      nameCell.value = m.name;
      nameCell.font = {
        size: 10,
        color: { argb: m.status === 'completed' ? 'FF999999' : 'FF333333' },
        strike: m.status === 'completed',
      };
      nameCell.alignment = { vertical: 'middle' };

      // Responsible
      const respCell = row.getCell(3);
      respCell.value = m.responsible;
      respCell.font = { size: 8, bold: true, color: { argb: 'FF666666' } };
      respCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Start date
      const startDate = getMilestoneDate(launchDateStr, m.startWeeksBefore);
      const startCell = row.getCell(4);
      startCell.value = startDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      startCell.font = { size: 9, color: { argb: 'FF666666' } };
      startCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Duration
      const durCell = row.getCell(5);
      durCell.value = `${m.durationWeeks}w`;
      durCell.font = { size: 9, color: { argb: 'FF888888' } };
      durCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Gantt bars
      const endDate = getMilestoneEndDate(launchDateStr, m.startWeeksBefore, m.durationWeeks);
      weeks.forEach((week, i) => {
        const cell = row.getCell(FIXED_COLS + 1 + i);
        if (startDate <= week.end && endDate >= week.start) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
              argb:
                m.status === 'completed'
                  ? 'FF' + lightenHex(m.color, 0.5)
                  : hexToArgb(m.color),
            },
          };
        }
        cell.border = {
          left: { style: 'hair', color: { argb: 'FFEEEEEE' } },
          bottom: { style: 'hair', color: { argb: 'FFF0F0F0' } },
        };
        if (i === todayWeekIdx && !cell.fill) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF0F0' },
          };
        }
        if (i === launchWeekIdx && !cell.fill) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF5E5' },
          };
        }
      });

      for (let i = 1; i <= FIXED_COLS; i++) {
        row.getCell(i).border = {
          bottom: { style: 'hair', color: { argb: 'FFF0F0F0' } },
        };
      }

      rowIdx++;
    });
  });

  // ── Today / Launch column header markers ──
  if (todayWeekIdx >= 0) {
    const cell = weekHeaderRow.getCell(FIXED_COLS + 1 + todayWeekIdx);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF4444' },
    };
    cell.font = { size: 7, color: { argb: 'FFFFFFFF' }, bold: true };
    cell.value = 'TODAY';
  }
  if (launchWeekIdx >= 0) {
    const cell = weekHeaderRow.getCell(FIXED_COLS + 1 + launchWeekIdx);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF000000' },
    };
    cell.font = { size: 7, color: { argb: 'FFFFFFFF' }, bold: true };
    cell.value = 'LAUNCH';
  }

  // ── Summary ──
  rowIdx++;
  const summaryRow = ws.getRow(rowIdx);
  summaryRow.getCell(2).value = 'Summary';
  summaryRow.getCell(2).font = { bold: true, size: 10 };

  rowIdx++;
  const completed = milestones.filter((m) => m.status === 'completed').length;
  const inProgress = milestones.filter((m) => m.status === 'in-progress').length;
  const pending = milestones.length - completed - inProgress;
  const percent = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;

  const statsRow = ws.getRow(rowIdx);
  statsRow.getCell(2).value = `${completed} completed | ${inProgress} in progress | ${pending} pending | ${percent}% total`;
  statsRow.getCell(2).font = { size: 10, color: { argb: 'FF666666' } };
}

// ══════════════════════════════════════════════════════════════
// SHEET 3: Collection Overview + Cards View (merged)
// ══════════════════════════════════════════════════════════════

const CARD_ROWS = 12;
const CARDS_PER_ROW = 4;
const GAP_ROW = 1;

const CARD_IMAGE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF5F1E8' },
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  REVENUE: 'FF9c7c4c',
  IMAGE: 'FF7d5a8c',
  ENTRY: 'FF4c7c6c',
};

const CARD_THIN_BORDER: Partial<ExcelJS.Border> = {
  style: 'thin',
  color: { argb: 'FFE0E0E0' },
};

function buildCardsSheet(wb: ExcelJS.Workbook, plan: PlanRow, skus: SkuRow[], timeline: TimelineRow | null) {
  const ws = wb.addWorksheet('Collection Overview');

  const LABEL_FONT: Partial<ExcelJS.Font> = { size: 8, color: { argb: 'FF999999' } };
  const VALUE_FONT: Partial<ExcelJS.Font> = { size: 10, color: { argb: 'FF282A29' } };
  const PHASE_COLORS: Record<string, string> = {
    range_plan: 'FF9c7c4c', sketch: 'FF7d5a8c', prototyping: 'FF4c7c6c',
    production: 'FF282A29', completed: 'FF282A29',
  };
  const PHASE_LABELS: Record<string, string> = {
    range_plan: 'CONCEPT', sketch: 'SKETCH', prototyping: 'PROTO',
    production: 'PRODUCTION', completed: 'COMPLETE',
  };

  // ── Column layout: A=margin, then 4 cards × 3 cols + 3 gap cols = 15 data cols ──
  // So columns B..P for cards (cols 2..16)
  const MARGIN_COL = 1;
  const DATA_START = 2; // cards start at column B
  const colsPerCard = 3;
  const gapCol = 1;
  const totalDataCols = CARDS_PER_ROW * colsPerCard + (CARDS_PER_ROW - 1) * gapCol;
  const LAST_COL = DATA_START + totalDataCols - 1;

  // Column A: narrow margin
  ws.getColumn(MARGIN_COL).width = 3;

  // Card columns
  for (let i = 0; i < totalDataCols; i++) {
    const colIdx = DATA_START + i;
    // Figure out if this is a gap column
    const cardBlock = colsPerCard + gapCol; // 4
    const posInBlock = i % cardBlock;
    if (posInBlock === colsPerCard) {
      // Gap column
      ws.getColumn(colIdx).width = 1.5;
    } else {
      ws.getColumn(colIdx).width = 11;
    }
  }

  // ── Row 1: empty (top margin) ──
  ws.getRow(1).height = 12;

  // ══════════════════════════════════════════════
  // HEADER: Collection name + Season/Launch
  // ══════════════════════════════════════════════
  const titleRow = 2;
  ws.mergeCells(titleRow, DATA_START, titleRow, DATA_START + 6);
  const titleCell = ws.getRow(titleRow).getCell(DATA_START);
  titleCell.value = plan.name;
  titleCell.font = { bold: true, size: 20, color: { argb: 'FF282A29' } };
  titleCell.alignment = { vertical: 'middle' };
  ws.getRow(titleRow).height = 36;

  // Season + Launch on row 3
  const metaRow = 3;
  const seasonCell = ws.getRow(metaRow).getCell(DATA_START);
  seasonCell.value = plan.season || '';
  seasonCell.font = { size: 10, color: { argb: 'FF999999' } };
  const launchCell = ws.getRow(metaRow).getCell(DATA_START + 3);
  launchCell.value = timeline?.launch_date
    ? `Launch: ${new Date(timeline.launch_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : '';
  launchCell.font = { size: 10, color: { argb: 'FF999999' } };
  ws.getRow(metaRow).height = 18;

  // Row 4: blank separator
  ws.getRow(4).height = 10;

  // ══════════════════════════════════════════════
  // FAMILIES (left) + FINANCIAL OVERVIEW (right)
  // ══════════════════════════════════════════════

  // Build family data
  const familyMap = new Map<string, SkuRow[]>();
  skus.forEach((sku) => {
    const fam = sku.family || 'Unassigned';
    if (!familyMap.has(fam)) familyMap.set(fam, []);
    familyMap.get(fam)!.push(sku);
  });

  // Compute financials
  const totalUnits = skus.reduce((s, sk) => s + (sk.buy_units || 0), 0);
  const totalSales = skus.reduce((s, sk) => s + (sk.expected_sales || 0), 0);
  const totalCost = skus.reduce((s, sk) => s + (sk.cost || 0) * (sk.buy_units || 0), 0);
  const avgPrice = skus.length > 0 ? skus.reduce((s, sk) => s + (sk.pvp || 0), 0) / skus.length : 0;
  const avgMargin = skus.length > 0 ? skus.reduce((s, sk) => s + (sk.margin || 0), 0) / skus.length : 0;
  const grossProfit = totalSales - totalCost;

  // Left block: Families (cols B-G = DATA_START to DATA_START+5)
  const FAM_L = DATA_START;
  const FAM_R = DATA_START + 5;
  // Right block: Financials (cols I-N = DATA_START+7 to DATA_START+12)
  const FIN_L = DATA_START + 7;
  const FIN_R = DATA_START + 12;

  const headerRowNum = 5;

  // FAMILIES header
  ws.mergeCells(headerRowNum, FAM_L, headerRowNum, FAM_R);
  const famHeaderCell = ws.getRow(headerRowNum).getCell(FAM_L);
  famHeaderCell.value = 'FAMILIES';
  famHeaderCell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
  famHeaderCell.fill = DARK_FILL;
  famHeaderCell.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(headerRowNum).height = 26;

  // FINANCIAL OVERVIEW header
  ws.mergeCells(headerRowNum, FIN_L, headerRowNum, FIN_R);
  const finHeaderCell = ws.getRow(headerRowNum).getCell(FIN_L);
  finHeaderCell.value = 'FINANCIAL OVERVIEW';
  finHeaderCell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
  finHeaderCell.fill = DARK_FILL;
  finHeaderCell.alignment = { vertical: 'middle', indent: 1 };

  // Families sub-header row
  const famSubRow = 6;
  const famSubHeaders = [
    { label: 'Family', width: 2 },
    { label: 'SKUs', width: 1 },
    { label: 'Avg PVP', width: 1 },
    { label: 'Avg Margin', width: 1 },
    { label: 'Revenue', width: 1 },
  ];
  let famColPos = FAM_L;
  famSubHeaders.forEach((h) => {
    if (h.width > 1) {
      ws.mergeCells(famSubRow, famColPos, famSubRow, famColPos + h.width - 1);
    }
    const cell = ws.getRow(famSubRow).getCell(famColPos);
    cell.value = h.label;
    cell.font = { bold: true, size: 8, color: { argb: 'FF999999' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F1E8' } };
    cell.alignment = { vertical: 'middle', horizontal: h.label === 'Family' ? 'left' : 'right', indent: 1 };
    cell.border = THIN_BORDER_BOTTOM;
    famColPos += h.width;
  });
  ws.getRow(famSubRow).height = 20;

  // Family data rows
  let famRowNum = 7;
  let famIdx = 0;
  familyMap.forEach((famSkus, famName) => {
    const fAvgPrice = famSkus.reduce((s, sk) => s + (sk.pvp || 0), 0) / famSkus.length;
    const fAvgMargin = famSkus.reduce((s, sk) => s + (sk.margin || 0), 0) / famSkus.length;
    const fRevenue = famSkus.reduce((s, sk) => s + (sk.expected_sales || 0), 0);
    const row = ws.getRow(famRowNum);
    const fill = famIdx % 2 === 0 ? WHITE_FILL : CREAM_FILL;

    // Family name (2 cols)
    ws.mergeCells(famRowNum, FAM_L, famRowNum, FAM_L + 1);
    row.getCell(FAM_L).value = famName;
    row.getCell(FAM_L).font = { size: 10, color: { argb: 'FF282A29' } };
    row.getCell(FAM_L).alignment = { vertical: 'middle', indent: 1 };

    // SKU count
    row.getCell(FAM_L + 2).value = famSkus.length;
    row.getCell(FAM_L + 2).font = BODY_FONT;
    row.getCell(FAM_L + 2).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

    // Avg PVP
    row.getCell(FAM_L + 3).value = fAvgPrice;
    row.getCell(FAM_L + 3).font = BODY_FONT;
    row.getCell(FAM_L + 3).numFmt = '€#,##0';
    row.getCell(FAM_L + 3).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

    // Avg Margin
    row.getCell(FAM_L + 4).value = fAvgMargin / 100;
    row.getCell(FAM_L + 4).font = BODY_FONT;
    row.getCell(FAM_L + 4).numFmt = '0%';
    row.getCell(FAM_L + 4).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

    // Revenue
    row.getCell(FAM_L + 5).value = fRevenue;
    row.getCell(FAM_L + 5).font = BODY_FONT;
    row.getCell(FAM_L + 5).numFmt = '€#,##0';
    row.getCell(FAM_L + 5).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

    for (let c = FAM_L; c <= FAM_R; c++) row.getCell(c).fill = fill;
    row.height = 20;
    famRowNum++;
    famIdx++;
  });

  // Families total row
  const famTotalRow = ws.getRow(famRowNum);
  ws.mergeCells(famRowNum, FAM_L, famRowNum, FAM_L + 1);
  famTotalRow.getCell(FAM_L).value = `TOTAL (${skus.length} SKUs)`;
  famTotalRow.getCell(FAM_L).font = { bold: true, size: 9, color: { argb: 'FF282A29' } };
  famTotalRow.getCell(FAM_L).alignment = { vertical: 'middle', indent: 1 };
  famTotalRow.getCell(FAM_L + 5).value = totalSales;
  famTotalRow.getCell(FAM_L + 5).font = { bold: true, size: 10, color: { argb: 'FF282A29' } };
  famTotalRow.getCell(FAM_L + 5).numFmt = '€#,##0';
  famTotalRow.getCell(FAM_L + 5).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
  for (let c = FAM_L; c <= FAM_R; c++) {
    famTotalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E4DA' } };
    famTotalRow.getCell(c).border = { top: { style: 'thin', color: { argb: 'FF282A29' } } };
  }
  famTotalRow.height = 22;

  // ── FINANCIAL OVERVIEW rows (right side, same vertical position) ──
  const financials: [string, number, string][] = [
    ['Revenue Target', totalSales, '€#,##0'],
    ['Total Units', totalUnits, '#,##0'],
    ['Avg Price', avgPrice, '€#,##0'],
    ['Target Margin', avgMargin / 100, '0.0%'],
    ['Total COGS', totalCost, '€#,##0'],
    ['Gross Profit', grossProfit, '€#,##0'],
  ];

  // Financials sub-header
  ws.mergeCells(famSubRow, FIN_L, famSubRow, FIN_L + 2);
  ws.getRow(famSubRow).getCell(FIN_L).value = 'Metric';
  ws.getRow(famSubRow).getCell(FIN_L).font = { bold: true, size: 8, color: { argb: 'FF999999' } };
  ws.getRow(famSubRow).getCell(FIN_L).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F1E8' } };
  ws.getRow(famSubRow).getCell(FIN_L).alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(famSubRow).getCell(FIN_L).border = THIN_BORDER_BOTTOM;

  ws.mergeCells(famSubRow, FIN_L + 3, famSubRow, FIN_R);
  ws.getRow(famSubRow).getCell(FIN_L + 3).value = 'Value';
  ws.getRow(famSubRow).getCell(FIN_L + 3).font = { bold: true, size: 8, color: { argb: 'FF999999' } };
  ws.getRow(famSubRow).getCell(FIN_L + 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F1E8' } };
  ws.getRow(famSubRow).getCell(FIN_L + 3).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
  ws.getRow(famSubRow).getCell(FIN_L + 3).border = THIN_BORDER_BOTTOM;

  financials.forEach(([label, value, fmt], i) => {
    const rn = 7 + i;
    const row = ws.getRow(rn);
    const fill = i % 2 === 0 ? WHITE_FILL : CREAM_FILL;

    ws.mergeCells(rn, FIN_L, rn, FIN_L + 2);
    row.getCell(FIN_L).value = label;
    row.getCell(FIN_L).font = { size: 10, color: { argb: 'FF666666' } };
    row.getCell(FIN_L).alignment = { vertical: 'middle', indent: 1 };

    ws.mergeCells(rn, FIN_L + 3, rn, FIN_R);
    row.getCell(FIN_L + 3).value = value;
    row.getCell(FIN_L + 3).font = { bold: true, size: 11, color: { argb: 'FF282A29' } };
    row.getCell(FIN_L + 3).numFmt = fmt;
    row.getCell(FIN_L + 3).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

    for (let c = FIN_L; c <= FIN_R; c++) row.getCell(c).fill = fill;
  });

  // ══════════════════════════════════════════════
  // CARDS SECTION (below summary)
  // ══════════════════════════════════════════════

  if (skus.length === 0) return;

  // Start cards 2 rows below the summary section
  const summaryEndRow = Math.max(famRowNum + 1, 7 + financials.length);
  let currentRow = summaryEndRow + 2;

  // Separator line
  for (let c = DATA_START; c <= LAST_COL; c++) {
    ws.getRow(currentRow - 1).getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } } };
  }

  const families = Array.from(new Set(skus.map(s => s.family)));

  for (const fam of families) {
    const famSkus = skus.filter(s => s.family === fam);
    const famTotalSales = famSkus.reduce((s, sk) => s + (sk.expected_sales || 0), 0);

    // Family header row
    ws.mergeCells(currentRow, DATA_START, currentRow, DATA_START + 4);
    const famCell = ws.getRow(currentRow).getCell(DATA_START);
    famCell.value = fam;
    famCell.font = { bold: true, size: 12, color: { argb: 'FF282A29' } };
    famCell.alignment = { vertical: 'middle' };

    const cntCell = ws.getRow(currentRow).getCell(DATA_START + 5);
    cntCell.value = `${famSkus.length} SKUs`;
    cntCell.font = { size: 9, color: { argb: 'FF999999' } };
    cntCell.alignment = { vertical: 'middle' };

    const revCell = ws.getRow(currentRow).getCell(DATA_START + 7);
    revCell.value = famTotalSales;
    revCell.numFmt = '€#,##0';
    revCell.font = { size: 9, color: { argb: 'FF999999' } };
    revCell.alignment = { vertical: 'middle', horizontal: 'right' };

    ws.getRow(currentRow).height = 26;
    currentRow += 1;

    // Cards grid
    for (let i = 0; i < famSkus.length; i++) {
      const sku = famSkus[i];
      const cardCol = i % CARDS_PER_ROW;
      const cardRow = Math.floor(i / CARDS_PER_ROW);
      // Each card: 3 data cols, 1 gap col between cards
      const c1 = DATA_START + cardCol * (colsPerCard + gapCol);
      const r1 = currentRow + cardRow * (CARD_ROWS + GAP_ROW);

      // Rows 1-5: Image area (crema bg)
      ws.mergeCells(r1, c1, r1 + 4, c1 + colsPerCard - 1);
      const imgCell = ws.getRow(r1).getCell(c1);
      imgCell.fill = CARD_IMAGE_FILL;
      imgCell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (sku.sketch_url || sku.reference_image_url) {
        imgCell.value = sku.name;
        imgCell.font = { size: 9, color: { argb: 'FF999999' }, italic: true };
      } else {
        imgCell.value = '';
      }
      for (let r = r1; r < r1 + 5; r++) ws.getRow(r).height = 22;

      // Row 6: Phase badge
      const phaseR = r1 + 5;
      ws.mergeCells(phaseR, c1, phaseR, c1 + colsPerCard - 1);
      const phase = sku.design_phase || 'range_plan';
      const phaseCell = ws.getRow(phaseR).getCell(c1);
      phaseCell.value = PHASE_LABELS[phase] || 'CONCEPT';
      phaseCell.font = { bold: true, size: 8, color: { argb: PHASE_COLORS[phase] || 'FF9c7c4c' } };
      phaseCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      ws.getRow(phaseR).height = 16;

      // Row 7: SKU name
      const nameR = r1 + 6;
      ws.mergeCells(nameR, c1, nameR, c1 + colsPerCard - 1);
      ws.getRow(nameR).getCell(c1).value = sku.name;
      ws.getRow(nameR).getCell(c1).font = { size: 10, color: { argb: 'FF282A29' } };
      ws.getRow(nameR).getCell(c1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      ws.getRow(nameR).height = 20;

      // Row 8: PVP | COGS | Units labels
      const r8 = r1 + 7;
      ws.getRow(r8).getCell(c1).value = 'PVP';
      ws.getRow(r8).getCell(c1).font = LABEL_FONT;
      ws.getRow(r8).getCell(c1).alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
      ws.getRow(r8).getCell(c1 + 1).value = 'COGS';
      ws.getRow(r8).getCell(c1 + 1).font = LABEL_FONT;
      ws.getRow(r8).getCell(c1 + 1).alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
      ws.getRow(r8).getCell(c1 + 2).value = 'UNITS';
      ws.getRow(r8).getCell(c1 + 2).font = LABEL_FONT;
      ws.getRow(r8).getCell(c1 + 2).alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
      ws.getRow(r8).height = 11;

      // Row 9: PVP | COGS | Units values
      const r9 = r1 + 8;
      ws.getRow(r9).getCell(c1).value = `€${sku.pvp}`;
      ws.getRow(r9).getCell(c1).font = VALUE_FONT;
      ws.getRow(r9).getCell(c1).alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
      ws.getRow(r9).getCell(c1 + 1).value = `€${sku.cost}`;
      ws.getRow(r9).getCell(c1 + 1).font = VALUE_FONT;
      ws.getRow(r9).getCell(c1 + 1).alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
      ws.getRow(r9).getCell(c1 + 2).value = String(sku.buy_units || 0);
      ws.getRow(r9).getCell(c1 + 2).font = VALUE_FONT;
      ws.getRow(r9).getCell(c1 + 2).alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
      ws.getRow(r9).height = 15;

      // Row 10: Margin | Sales labels
      const r10 = r1 + 9;
      ws.getRow(r10).getCell(c1).value = 'MARGIN';
      ws.getRow(r10).getCell(c1).font = LABEL_FONT;
      ws.getRow(r10).getCell(c1).alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
      ws.getRow(r10).getCell(c1 + 1).value = 'SALES';
      ws.getRow(r10).getCell(c1 + 1).font = LABEL_FONT;
      ws.getRow(r10).getCell(c1 + 1).alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
      ws.getRow(r10).height = 11;

      // Row 11: Margin | Sales values
      const r11 = r1 + 10;
      ws.getRow(r11).getCell(c1).value = `${Math.round(sku.margin || 0)}%`;
      ws.getRow(r11).getCell(c1).font = VALUE_FONT;
      ws.getRow(r11).getCell(c1).alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
      ws.getRow(r11).getCell(c1 + 1).value = `€${(sku.expected_sales || 0).toLocaleString()}`;
      ws.getRow(r11).getCell(c1 + 1).font = VALUE_FONT;
      ws.getRow(r11).getCell(c1 + 1).alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
      ws.getRow(r11).height = 15;

      // Row 12: Type badge
      const r12 = r1 + 11;
      const typeLabel = (sku.type === 'IMAGEN' ? 'IMAGE' : sku.type || 'REVENUE').toUpperCase();
      const badgeColor = TYPE_BADGE_COLORS[typeLabel] || 'FF9c7c4c';
      ws.getRow(r12).getCell(c1).value = typeLabel;
      ws.getRow(r12).getCell(c1).font = { bold: true, size: 8, color: { argb: badgeColor } };
      ws.getRow(r12).getCell(c1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      ws.getRow(r12).height = 16;

      // ── Card borders (AFTER all merges so they stick) ──
      const cardBorder: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFD0D0D0' } };
      for (let r = r1; r < r1 + CARD_ROWS; r++) {
        for (let c = c1; c < c1 + colsPerCard; c++) {
          const cell = ws.getRow(r).getCell(c);
          const b: Partial<ExcelJS.Borders> = { ...(cell.border || {}) };
          if (r === r1) b.top = cardBorder;
          if (r === r1 + CARD_ROWS - 1) b.bottom = cardBorder;
          if (c === c1) b.left = cardBorder;
          if (c === c1 + colsPerCard - 1) b.right = cardBorder;
          cell.border = b;
        }
      }
    }

    // Advance past card rows for this family
    const familyCardRows = Math.ceil(famSkus.length / CARDS_PER_ROW);
    currentRow += familyCardRows * (CARD_ROWS + GAP_ROW) + 1;
  }
}

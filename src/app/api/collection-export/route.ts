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

    buildRangePlanSheet(wb, skus);
    if (timeline) {
      buildCalendarSheet(wb, timeline, plan);
    }
    buildSummarySheet(wb, plan, skus, timeline);
    buildCardsSheet(wb, skus);

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

  // Column config
  ws.columns = [
    { header: '#', key: 'num', width: 5 },
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Family', key: 'family', width: 16 },
    { header: 'Subcategory', key: 'category', width: 14 },
    { header: 'Drop', key: 'drop', width: 7 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Channel', key: 'channel', width: 11 },
    { header: 'PVP (\u20AC)', key: 'pvp', width: 11 },
    { header: 'COGS (\u20AC)', key: 'cost', width: 11 },
    { header: 'Margin (%)', key: 'margin', width: 11 },
    { header: 'Units', key: 'units', width: 9 },
    { header: 'Expected Sales (\u20AC)', key: 'sales', width: 18 },
    { header: 'Design Phase', key: 'phase', width: 14 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  // ── Header row styling ──
  const headerRow = ws.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = DARK_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = THIN_BORDER_BOTTOM;
  });

  // ── Data rows ──
  let prevFamily = '';
  skus.forEach((sku, i) => {
    const row = ws.addRow({
      num: i + 1,
      name: sku.name,
      family: sku.family || '',
      category: sku.category || '',
      drop: sku.drop_number || '',
      type: sku.type || '',
      channel: sku.channel || '',
      pvp: sku.pvp || 0,
      cost: sku.cost || 0,
      margin: (sku.margin || 0) / 100,
      units: sku.buy_units || 0,
      sales: sku.expected_sales || 0,
      phase: DESIGN_PHASE_LABELS[sku.design_phase] || sku.design_phase || 'Range Plan',
      notes: sku.notes || '',
    });

    // Alternating row colors
    const fill = i % 2 === 0 ? WHITE_FILL : CREAM_FILL;
    row.eachCell((cell) => {
      cell.font = BODY_FONT;
      cell.fill = fill;
      cell.alignment = { vertical: 'middle' };
    });

    // Family group separator
    if (prevFamily && sku.family !== prevFamily) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF999999' } },
        };
      });
    }
    prevFamily = sku.family;

    // Number formats
    row.getCell('pvp').numFmt = '#,##0.00 "\u20AC"';
    row.getCell('cost').numFmt = '#,##0.00 "\u20AC"';
    row.getCell('margin').numFmt = '0.0%';
    row.getCell('units').numFmt = '#,##0';
    row.getCell('sales').numFmt = '#,##0.00 "\u20AC"';
    row.getCell('num').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('drop').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('type').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('channel').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('pvp').alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell('cost').alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell('margin').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('units').alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell('sales').alignment = { horizontal: 'right', vertical: 'middle' };
  });

  // ── Summary row ──
  if (skus.length > 0) {
    ws.addRow([]); // blank separator

    const avgPvp = skus.reduce((s, sk) => s + (sk.pvp || 0), 0) / skus.length;
    const avgMargin = skus.reduce((s, sk) => s + (sk.margin || 0), 0) / skus.length;
    const totalUnits = skus.reduce((s, sk) => s + (sk.buy_units || 0), 0);
    const totalSales = skus.reduce((s, sk) => s + (sk.expected_sales || 0), 0);

    const summaryRow = ws.addRow({
      num: '',
      name: `TOTAL (${skus.length} SKUs)`,
      family: '',
      category: '',
      drop: '',
      type: '',
      channel: '',
      pvp: avgPvp,
      cost: '',
      margin: avgMargin / 100,
      units: totalUnits,
      sales: totalSales,
      phase: '',
      notes: '',
    });

    summaryRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: 'FF282A29' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8E4DA' },
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF282A29' } },
      };
    });

    summaryRow.getCell('pvp').numFmt = '#,##0.00 "\u20AC"';
    summaryRow.getCell('margin').numFmt = '0.0%';
    summaryRow.getCell('units').numFmt = '#,##0';
    summaryRow.getCell('sales').numFmt = '#,##0.00 "\u20AC"';
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
// SHEET 3: Collection Summary
// ══════════════════════════════════════════════════════════════

function buildSummarySheet(wb: ExcelJS.Workbook, plan: PlanRow, skus: SkuRow[], timeline: TimelineRow | null) {
  const ws = wb.addWorksheet('Collection Summary');

  ws.columns = [
    { width: 28 },
    { width: 18 },
    { width: 14 },
    { width: 14 },
  ];

  // ── Row 1: Collection Name (large, merged) ──
  ws.mergeCells('A1:D1');
  const titleCell = ws.getCell('A1');
  titleCell.value = plan.name;
  titleCell.font = { bold: true, size: 18, color: { argb: 'FF282A29' } };
  titleCell.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 32;

  // ── Row 2: Season | Launch Date ──
  ws.getCell('A2').value = 'Season';
  ws.getCell('A2').font = { bold: true, size: 10, color: { argb: 'FF666666' } };
  ws.getCell('B2').value = plan.season || '\u2014';
  ws.getCell('B2').font = { size: 10, color: { argb: 'FF333333' } };
  ws.getCell('C2').value = 'Launch Date';
  ws.getCell('C2').font = { bold: true, size: 10, color: { argb: 'FF666666' } };
  ws.getCell('D2').value = timeline?.launch_date
    ? new Date(timeline.launch_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : '\u2014';
  ws.getCell('D2').font = { size: 10, color: { argb: 'FF333333' } };

  // ── Row 3: blank ──

  // ── Row 4: FAMILIES header ──
  ws.mergeCells('A4:D4');
  const familiesHeader = ws.getCell('A4');
  familiesHeader.value = 'FAMILIES';
  familiesHeader.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  familiesHeader.fill = DARK_FILL;
  familiesHeader.alignment = { vertical: 'middle' };
  ws.getRow(4).height = 24;

  // Sub-header
  const famSubRow = ws.getRow(5);
  const famSubHeaders = ['Family', 'SKU Count', 'Avg Price', 'Avg Margin'];
  famSubHeaders.forEach((h, i) => {
    const cell = famSubRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 9, color: { argb: 'FF666666' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F1E8' },
    };
    cell.border = THIN_BORDER_BOTTOM;
  });

  // ── Family rows ──
  const familyMap = new Map<string, SkuRow[]>();
  skus.forEach((sku) => {
    const fam = sku.family || 'Unassigned';
    if (!familyMap.has(fam)) familyMap.set(fam, []);
    familyMap.get(fam)!.push(sku);
  });

  let rowNum = 6;
  familyMap.forEach((famSkus, famName) => {
    const avgPrice = famSkus.reduce((s, sk) => s + (sk.pvp || 0), 0) / famSkus.length;
    const avgMargin = famSkus.reduce((s, sk) => s + (sk.margin || 0), 0) / famSkus.length;

    const row = ws.getRow(rowNum);
    row.getCell(1).value = famName;
    row.getCell(1).font = BODY_FONT;
    row.getCell(2).value = famSkus.length;
    row.getCell(2).font = BODY_FONT;
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(3).value = avgPrice;
    row.getCell(3).font = BODY_FONT;
    row.getCell(3).numFmt = '#,##0.00 "\u20AC"';
    row.getCell(3).alignment = { horizontal: 'right' };
    row.getCell(4).value = avgMargin / 100;
    row.getCell(4).font = BODY_FONT;
    row.getCell(4).numFmt = '0.0%';
    row.getCell(4).alignment = { horizontal: 'center' };

    // Alternating colors
    const fill = (rowNum - 6) % 2 === 0 ? WHITE_FILL : CREAM_FILL;
    for (let c = 1; c <= 4; c++) row.getCell(c).fill = fill;

    rowNum++;
  });

  // ── Blank row ──
  rowNum++;

  // ── FINANCIAL OVERVIEW ──
  ws.mergeCells(rowNum, 1, rowNum, 4);
  const finHeader = ws.getCell(rowNum, 1);
  finHeader.value = 'FINANCIAL OVERVIEW';
  finHeader.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  finHeader.fill = DARK_FILL;
  finHeader.alignment = { vertical: 'middle' };
  ws.getRow(rowNum).height = 24;
  rowNum++;

  // Compute financials
  const totalUnits = skus.reduce((s, sk) => s + (sk.buy_units || 0), 0);
  const totalSales = skus.reduce((s, sk) => s + (sk.expected_sales || 0), 0);
  const totalCost = skus.reduce((s, sk) => s + (sk.cost || 0) * (sk.buy_units || 0), 0);
  const avgPrice = skus.length > 0
    ? skus.reduce((s, sk) => s + (sk.pvp || 0), 0) / skus.length
    : 0;
  const avgMargin = skus.length > 0
    ? skus.reduce((s, sk) => s + (sk.margin || 0), 0) / skus.length
    : 0;
  const grossProfit = totalSales - totalCost;

  const financials: [string, string | number, string?][] = [
    ['Revenue Target', totalSales, '#,##0.00 "\u20AC"'],
    ['Total Units', totalUnits, '#,##0'],
    ['Avg Price', avgPrice, '#,##0.00 "\u20AC"'],
    ['Target Margin', avgMargin / 100, '0.0%'],
    ['Total COGS', totalCost, '#,##0.00 "\u20AC"'],
    ['Gross Profit', grossProfit, '#,##0.00 "\u20AC"'],
  ];

  financials.forEach(([label, value, fmt], i) => {
    const row = ws.getRow(rowNum);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF666666' } };
    row.getCell(2).value = value;
    row.getCell(2).font = { bold: true, size: 11, color: { argb: 'FF282A29' } };
    if (fmt) row.getCell(2).numFmt = fmt;
    row.getCell(2).alignment = { horizontal: 'right' };

    const fill = i % 2 === 0 ? WHITE_FILL : CREAM_FILL;
    for (let c = 1; c <= 4; c++) row.getCell(c).fill = fill;

    rowNum++;
  });
}

// ══════════════════════════════════════════════════════════════
// SHEET 4: Cards View
// ══════════════════════════════════════════════════════════════

const CARD_COLS = 4;   // each card spans 4 columns
const CARD_ROWS = 8;   // each card spans 8 rows
const CARDS_PER_ROW = 3;
const GAP_COL = 1;     // 1 empty column between cards
const GAP_ROW = 1;     // 1 empty row between card rows

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
  color: { argb: 'FFCCCCCC' },
};

function buildCardsSheet(wb: ExcelJS.Workbook, skus: SkuRow[]) {
  if (skus.length === 0) return;

  const ws = wb.addWorksheet('Cards View');

  // Set all possible column widths — each card block is 4 cols, gaps are 1 col
  const totalGridCols = CARDS_PER_ROW * CARD_COLS + (CARDS_PER_ROW - 1) * GAP_COL;
  for (let c = 1; c <= totalGridCols; c++) {
    ws.getColumn(c).width = 14;
  }
  // Make gap columns narrower
  for (let g = 0; g < CARDS_PER_ROW - 1; g++) {
    const gapCol = (g + 1) * CARD_COLS + g * GAP_COL + 1;
    ws.getColumn(gapCol).width = 3;
  }

  skus.forEach((sku, idx) => {
    const gridCol = idx % CARDS_PER_ROW;           // 0, 1, or 2
    const gridRow = Math.floor(idx / CARDS_PER_ROW); // 0, 1, 2, ...

    // Top-left cell of this card
    const startCol = gridCol * (CARD_COLS + GAP_COL) + 1;
    const startRow = gridRow * (CARD_ROWS + GAP_ROW) + 1;

    // ── Card border (thin border around entire 4×8 block) ──
    for (let r = startRow; r < startRow + CARD_ROWS; r++) {
      for (let c = startCol; c < startCol + CARD_COLS; c++) {
        const cell = ws.getRow(r).getCell(c);
        const border: Partial<ExcelJS.Borders> = {};
        if (r === startRow) border.top = CARD_THIN_BORDER;
        if (r === startRow + CARD_ROWS - 1) border.bottom = CARD_THIN_BORDER;
        if (c === startCol) border.left = CARD_THIN_BORDER;
        if (c === startCol + CARD_COLS - 1) border.right = CARD_THIN_BORDER;
        cell.border = border;
      }
    }

    // ── Row 1-4: Image placeholder (merged 4 cols × 4 rows) ──
    ws.mergeCells(startRow, startCol, startRow + 3, startCol + CARD_COLS - 1);
    const imgCell = ws.getRow(startRow).getCell(startCol);
    imgCell.value = '\u{1F4F7}';
    imgCell.fill = CARD_IMAGE_FILL;
    imgCell.alignment = { horizontal: 'center', vertical: 'middle' };
    imgCell.font = { size: 24 };
    // Ensure merged area gets the border
    imgCell.border = {
      top: CARD_THIN_BORDER,
      left: CARD_THIN_BORDER,
      right: CARD_THIN_BORDER,
    };
    // Set row heights for image area
    for (let r = startRow; r < startRow + 4; r++) {
      ws.getRow(r).height = 22;
    }

    // ── Row 5: SKU name (bold, merged 4 cols) ──
    const nameRow = startRow + 4;
    ws.mergeCells(nameRow, startCol, nameRow, startCol + CARD_COLS - 1);
    const nameCell = ws.getRow(nameRow).getCell(startCol);
    nameCell.value = sku.name || 'Unnamed SKU';
    nameCell.font = { bold: true, size: 12, color: { argb: 'FF282A29' } };
    nameCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    nameCell.border = { left: CARD_THIN_BORDER, right: CARD_THIN_BORDER };
    ws.getRow(nameRow).height = 20;

    // ── Row 6: Family name (italic, lighter color) ──
    const familyRow = startRow + 5;
    ws.mergeCells(familyRow, startCol, familyRow, startCol + CARD_COLS - 1);
    const familyCell = ws.getRow(familyRow).getCell(startCol);
    familyCell.value = sku.family || 'No Family';
    familyCell.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
    familyCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    familyCell.border = { left: CARD_THIN_BORDER, right: CARD_THIN_BORDER };
    ws.getRow(familyRow).height = 18;

    // ── Row 7: PVP | COGS | Margin (3 cells, last col merged with col before if needed) ──
    const metricsRow = startRow + 6;
    const pvpCell = ws.getRow(metricsRow).getCell(startCol);
    pvpCell.value = `PVP \u20AC${(sku.pvp || 0).toFixed(0)}`;
    pvpCell.font = { size: 9, color: { argb: 'FF333333' } };
    pvpCell.alignment = { vertical: 'middle', horizontal: 'center' };
    pvpCell.border = { left: CARD_THIN_BORDER };

    const cogsCell = ws.getRow(metricsRow).getCell(startCol + 1);
    cogsCell.value = `COGS \u20AC${(sku.cost || 0).toFixed(0)}`;
    cogsCell.font = { size: 9, color: { argb: 'FF333333' } };
    cogsCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Merge last two columns for margin
    ws.mergeCells(metricsRow, startCol + 2, metricsRow, startCol + CARD_COLS - 1);
    const marginCell = ws.getRow(metricsRow).getCell(startCol + 2);
    marginCell.value = `Margin ${(sku.margin || 0).toFixed(0)}%`;
    marginCell.font = { size: 9, color: { argb: 'FF333333' } };
    marginCell.alignment = { vertical: 'middle', horizontal: 'center' };
    marginCell.border = { right: CARD_THIN_BORDER };
    ws.getRow(metricsRow).height = 16;

    // ── Row 8: Type badge + Units + Drop ──
    const badgeRow = startRow + 7;
    const typeLabel = (sku.type || 'REVENUE').toUpperCase();
    const badgeColor = TYPE_BADGE_COLORS[typeLabel] || 'FF9c7c4c';

    const typeCell = ws.getRow(badgeRow).getCell(startCol);
    typeCell.value = typeLabel;
    typeCell.font = { bold: true, size: 9, color: { argb: badgeColor } };
    typeCell.alignment = { vertical: 'middle', horizontal: 'center' };
    typeCell.border = { left: CARD_THIN_BORDER, bottom: CARD_THIN_BORDER };

    const unitsCell = ws.getRow(badgeRow).getCell(startCol + 1);
    unitsCell.value = `${sku.buy_units || 0} units`;
    unitsCell.font = { size: 9, color: { argb: 'FF333333' } };
    unitsCell.alignment = { vertical: 'middle', horizontal: 'center' };
    unitsCell.border = { bottom: CARD_THIN_BORDER };

    // Merge last two columns for drop
    ws.mergeCells(badgeRow, startCol + 2, badgeRow, startCol + CARD_COLS - 1);
    const dropCell = ws.getRow(badgeRow).getCell(startCol + 2);
    dropCell.value = sku.drop_number ? `Drop ${sku.drop_number}` : '';
    dropCell.font = { size: 9, color: { argb: 'FF333333' } };
    dropCell.alignment = { vertical: 'middle', horizontal: 'center' };
    dropCell.border = { right: CARD_THIN_BORDER, bottom: CARD_THIN_BORDER };
    ws.getRow(badgeRow).height = 16;
  });
}

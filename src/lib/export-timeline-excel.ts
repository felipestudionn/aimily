import ExcelJS from 'exceljs';
import {
  CollectionTimeline,
  TimelineMilestone,
  TimelinePhase,
} from '@/types/timeline';
import {
  PHASES,
  PHASE_ORDER,
  getMilestoneDate,
  getMilestoneEndDate,
  daysBetween,
} from '@/lib/timeline-template';

// Convert hex color string to ExcelJS ARGB (without #)
function hexToArgb(hex: string): string {
  return 'FF' + hex.replace('#', '');
}

// Lighten a hex color for background
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

type Lang = 'en' | 'es';

export async function exportTimelineToExcel(timeline: CollectionTimeline, lang: Lang = 'en') {
  const mName = (m: TimelineMilestone) => lang === 'es' ? m.nameEs : m.name;
  const pName = (phase: TimelinePhase) => lang === 'es' ? PHASES[phase].nameEs : PHASES[phase].name;
  const tt = (en: string, es: string) => lang === 'es' ? es : en;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OLA Wave';
  wb.created = new Date();

  const ws = wb.addWorksheet('Calendario', {
    views: [{ state: 'frozen', xSplit: 5, ySplit: 3 }],
  });

  // --- Calculate date range ---
  const launchDate = new Date(timeline.launchDate);
  let earliestDate = new Date(launchDate);
  let latestDate = new Date(launchDate);

  timeline.milestones.forEach((m) => {
    const start = getMilestoneDate(timeline.launchDate, m.startWeeksBefore);
    const end = getMilestoneEndDate(timeline.launchDate, m.startWeeksBefore, m.durationWeeks);
    if (start < earliestDate) earliestDate = new Date(start);
    if (end > latestDate) latestDate = new Date(end);
  });

  // Align to week boundaries
  earliestDate.setDate(earliestDate.getDate() - earliestDate.getDay()); // Start on Sunday
  latestDate.setDate(latestDate.getDate() + (7 - latestDate.getDay()) % 7 + 7);

  // Generate weeks array
  const weeks: { start: Date; end: Date; label: string; month: string }[] = [];
  const current = new Date(earliestDate);
  while (current < latestDate) {
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weeks.push({
      start: new Date(current),
      end: weekEnd,
      label: `${current.getDate()}/${current.getMonth() + 1}`,
      month: current.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', year: 'numeric' }),
    });
    current.setDate(current.getDate() + 7);
  }

  // --- Column setup ---
  // Cols: Status | Milestone | Responsible | Start | Duration | Week1 | Week2 | ...
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

  // --- Row 1: Title ---
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = `${timeline.collectionName} — ${timeline.season}`;
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF000000' } };
  ws.mergeCells(1, 1, 1, FIXED_COLS);
  titleRow.getCell(FIXED_COLS + 1).value = `Launch: ${launchDate.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  titleRow.getCell(FIXED_COLS + 1).font = { bold: true, size: 11, color: { argb: 'FFFF0000' } };
  titleRow.height = 24;

  // --- Row 2: Month headers ---
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
  // Merge last month group
  if (monthStartCol < totalCols) {
    ws.mergeCells(2, monthStartCol, 2, totalCols);
  }

  // --- Row 3: Week headers ---
  const weekHeaderRow = ws.getRow(3);
  weekHeaderRow.height = 16;
  weekHeaderRow.getCell(1).value = '';
  weekHeaderRow.getCell(2).value = tt('Milestone', 'Hito');
  weekHeaderRow.getCell(3).value = tt('Resp.', 'Resp.');
  weekHeaderRow.getCell(4).value = tt('Start', 'Inicio');
  weekHeaderRow.getCell(5).value = tt('Wk.', 'Sem.');
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

  // --- Mark TODAY and LAUNCH columns ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let todayWeekIdx = -1;
  let launchWeekIdx = -1;
  weeks.forEach((week, i) => {
    if (today >= week.start && today <= week.end) todayWeekIdx = i;
    if (launchDate >= week.start && launchDate <= week.end) launchWeekIdx = i;
  });

  // --- Data rows ---
  let rowIdx = 4;

  // Group milestones by phase
  const grouped: Record<TimelinePhase, TimelineMilestone[]> = {} as Record<TimelinePhase, TimelineMilestone[]>;
  PHASE_ORDER.forEach((phase) => {
    grouped[phase] = timeline.milestones
      .filter((m) => m.phase === phase)
      .sort((a, b) => b.startWeeksBefore - a.startWeeksBefore);
  });

  PHASE_ORDER.forEach((phaseKey) => {
    const phase = PHASES[phaseKey];
    const milestones = grouped[phaseKey];
    if (!milestones || milestones.length === 0) return;

    // Phase header row
    const phaseRow = ws.getRow(rowIdx);
    phaseRow.height = 22;
    ws.mergeCells(rowIdx, 1, rowIdx, FIXED_COLS);
    const phaseCell = phaseRow.getCell(1);
    phaseCell.value = `${pName(phaseKey).toUpperCase()} (${milestones.filter(m => m.status === 'completed').length}/${milestones.length})`;
    phaseCell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    phaseCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: hexToArgb(phase.color) },
    };
    phaseCell.alignment = { vertical: 'middle' };

    // Light color fill across the week columns for the phase header
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
    milestones.forEach((m) => {
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

      // Milestone name
      const nameCell = row.getCell(2);
      nameCell.value = mName(m);
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
      const startDate = getMilestoneDate(timeline.launchDate, m.startWeeksBefore);
      const startCell = row.getCell(4);
      startCell.value = startDate.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' });
      startCell.font = { size: 9, color: { argb: 'FF666666' } };
      startCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Duration
      const durCell = row.getCell(5);
      durCell.value = `${m.durationWeeks}w`;
      durCell.font = { size: 9, color: { argb: 'FF888888' } };
      durCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Gantt bars
      const endDate = getMilestoneEndDate(timeline.launchDate, m.startWeeksBefore, m.durationWeeks);
      weeks.forEach((week, i) => {
        const cell = row.getCell(FIXED_COLS + 1 + i);
        const weekStart = week.start;
        const weekEnd = week.end;

        // Check if this week overlaps with the milestone
        if (startDate <= weekEnd && endDate >= weekStart) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
              argb: m.status === 'completed'
                ? 'FF' + lightenHex(m.color, 0.5)
                : hexToArgb(m.color),
            },
          };
        }

        // Add subtle gridlines
        cell.border = {
          left: { style: 'hair', color: { argb: 'FFEEEEEE' } },
          bottom: { style: 'hair', color: { argb: 'FFF0F0F0' } },
        };

        // Highlight TODAY column
        if (i === todayWeekIdx && !cell.fill) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF0F0' },
          };
        }

        // Highlight LAUNCH column
        if (i === launchWeekIdx && !cell.fill) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF5E5' },
          };
        }
      });

      // Left border on fixed columns
      for (let i = 1; i <= FIXED_COLS; i++) {
        const cell = row.getCell(i);
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFF0F0F0' } },
        };
      }

      rowIdx++;
    });
  });

  // --- Mark TODAY and LAUNCH columns with header indicators ---
  if (todayWeekIdx >= 0) {
    const cell = weekHeaderRow.getCell(FIXED_COLS + 1 + todayWeekIdx);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF4444' },
    };
    cell.font = { size: 7, color: { argb: 'FFFFFFFF' }, bold: true };
    cell.value = 'HOY';
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

  // --- Summary row ---
  rowIdx++;
  const summaryRow = ws.getRow(rowIdx);
  summaryRow.getCell(2).value = tt('Summary', 'Resumen');
  summaryRow.getCell(2).font = { bold: true, size: 10 };

  rowIdx++;
  const completed = timeline.milestones.filter(m => m.status === 'completed').length;
  const inProgress = timeline.milestones.filter(m => m.status === 'in-progress').length;
  const pending = timeline.milestones.length - completed - inProgress;
  const percent = Math.round((completed / timeline.milestones.length) * 100);

  const statsRow = ws.getRow(rowIdx);
  statsRow.getCell(2).value = tt(
    `${completed} completed | ${inProgress} in progress | ${pending} pending | ${percent}% total`,
    `${completed} completados | ${inProgress} en progreso | ${pending} pendientes | ${percent}% total`
  );
  statsRow.getCell(2).font = { size: 10, color: { argb: 'FF666666' } };

  // --- Generate and download ---
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${timeline.collectionName}_${timeline.season}_calendario.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyCollectionOwnership } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit-log';
import ExcelJS from 'exceljs';

/* ═══════════════════════════════════════════════════════════
   GET /api/purchase-order?skuId=xxx     → PO for single SKU
   GET /api/purchase-order?planId=xxx    → PO for all approved SKUs
   GET /api/purchase-order?planId=xxx&factory=yyy → PO filtered by factory
   ═══════════════════════════════════════════════════════════ */

// ── Styles (matching collection-export) ──
const DARK_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF282A29' } };
const CREAM_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F1E8' } };
const GREEN_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A4F' } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
const BODY_FONT: Partial<ExcelJS.Font> = { size: 10, color: { argb: 'FF333333' } };
const LABEL_FONT: Partial<ExcelJS.Font> = { size: 9, color: { argb: 'FF888888' } };
const TOTAL_FONT: Partial<ExcelJS.Font> = { bold: true, size: 11, color: { argb: 'FF282A29' } };
const THIN_BORDER: Partial<ExcelJS.Borders> = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } };

interface SkuRow {
  id: string;
  name: string;
  family: string;
  category: string;
  type: string;
  pvp: number;
  cost: number;
  buy_units: number;
  margin: number;
  size_run?: Record<string, number>;
  sourcing_data?: Record<string, unknown>;
  production_data?: Record<string, unknown>;
  production_approved: boolean;
  material_zones?: { zone: string; material?: string; composition?: string; weight?: string; finish?: string }[];
  notes?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;

    const skuId = req.nextUrl.searchParams.get('skuId');
    const planId = req.nextUrl.searchParams.get('planId');
    const factoryFilter = req.nextUrl.searchParams.get('factory');

    if (!skuId && !planId) {
      return NextResponse.json({ error: 'skuId or planId required' }, { status: 400 });
    }

    let skus: SkuRow[] = [];
    let collectionName = '';

    if (skuId) {
      // Single SKU
      const { data: sku, error } = await supabaseAdmin.from('collection_skus').select('*').eq('id', skuId).single();
      if (error || !sku) return NextResponse.json({ error: 'SKU not found' }, { status: 404 });
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user!.id, sku.collection_plan_id);
      if (!authorized) return ownerError;
      skus = [sku as SkuRow];
      const { data: plan } = await supabaseAdmin.from('collection_plans').select('name').eq('id', sku.collection_plan_id).single();
      collectionName = plan?.name || '';
    } else if (planId) {
      // All approved SKUs for collection
      const { authorized, error: ownerError } = await verifyCollectionOwnership(user!.id, planId);
      if (!authorized) return ownerError;
      const { data, error } = await supabaseAdmin
        .from('collection_skus')
        .select('*')
        .eq('collection_plan_id', planId)
        .eq('production_approved', true)
        .order('family')
        .order('name');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      skus = (data || []) as SkuRow[];
      if (factoryFilter) {
        skus = skus.filter(s => {
          const pd = s.production_data as Record<string, string> | undefined;
          const sd = s.sourcing_data as Record<string, string> | undefined;
          const factory = pd?.factory_name || sd?.factory || '';
          return factory.toLowerCase().includes(factoryFilter.toLowerCase());
        });
      }
      const { data: plan } = await supabaseAdmin.from('collection_plans').select('name').eq('id', planId).single();
      collectionName = plan?.name || '';
    }

    if (skus.length === 0) {
      return NextResponse.json({ error: 'No approved SKUs found' }, { status: 404 });
    }

    // ── Build Excel ──
    const wb = new ExcelJS.Workbook();
    wb.creator = 'aimily';
    wb.created = new Date();

    // Get factory info from first SKU
    const firstPd = (skus[0].production_data || {}) as Record<string, string>;
    const firstSd = (skus[0].sourcing_data || {}) as Record<string, string>;
    const poNumber = firstPd.po_number || `PO-${Date.now().toString(36).toUpperCase()}`;
    const factoryName = firstPd.factory_name || firstSd.factory || 'TBD';
    const factoryOrigin = firstPd.factory_origin || firstSd.origin || '';
    const factoryContact = firstPd.factory_contact || firstSd.contact || '';

    // ══ SHEET 1: Purchase Order ══
    const ws = wb.addWorksheet('Purchase Order');
    ws.properties.defaultColWidth = 14;

    // Company header (row 1-2)
    ws.mergeCells('A1:J1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'PURCHASE ORDER';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = DARK_FILL;
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(1).height = 35;

    ws.mergeCells('A2:E2');
    ws.getCell('A2').value = `StudioNN Agency S.L. · NIF: B42978130`;
    ws.getCell('A2').font = LABEL_FONT;
    ws.getCell('A2').fill = CREAM_FILL;
    ws.mergeCells('F2:J2');
    ws.getCell('F2').value = `PO: ${poNumber} · Date: ${new Date().toISOString().split('T')[0]}`;
    ws.getCell('F2').font = { ...LABEL_FONT, bold: true };
    ws.getCell('F2').fill = CREAM_FILL;
    ws.getCell('F2').alignment = { horizontal: 'right' };
    ws.getRow(2).height = 22;

    // Collection + Factory info (row 3-4)
    ws.mergeCells('A3:E3');
    ws.getCell('A3').value = `Collection: ${collectionName}`;
    ws.getCell('A3').font = BODY_FONT;
    ws.mergeCells('F3:J3');
    ws.getCell('F3').value = `Factory: ${factoryName}`;
    ws.getCell('F3').font = { ...BODY_FONT, bold: true };
    ws.getCell('F3').alignment = { horizontal: 'right' };

    ws.mergeCells('A4:E4');
    ws.getCell('A4').value = firstPd.payment_terms ? `Payment: ${firstPd.payment_terms}` : '';
    ws.getCell('A4').font = LABEL_FONT;
    ws.mergeCells('F4:J4');
    ws.getCell('F4').value = [factoryOrigin, factoryContact].filter(Boolean).join(' · ');
    ws.getCell('F4').font = LABEL_FONT;
    ws.getCell('F4').alignment = { horizontal: 'right' };

    // Delivery + Shipping (row 5)
    ws.mergeCells('A5:E5');
    ws.getCell('A5').value = firstPd.target_delivery_date ? `Delivery: ${firstPd.target_delivery_date}` : '';
    ws.getCell('A5').font = LABEL_FONT;
    ws.mergeCells('F5:J5');
    ws.getCell('F5').value = firstPd.shipping_method ? `Shipping: ${firstPd.shipping_method}` : '';
    ws.getCell('F5').font = LABEL_FONT;
    ws.getCell('F5').alignment = { horizontal: 'right' };

    // Empty row
    ws.getRow(6).height = 10;

    // Column headers (row 7)
    const headers = ['#', 'Product', 'Family', 'Category', 'Type', 'Quantity', 'Unit Cost', 'Total', 'Size Run', 'Notes'];
    const headerRow = ws.getRow(7);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = HEADER_FONT;
      cell.fill = DARK_FILL;
      cell.alignment = { horizontal: i >= 5 ? 'right' : 'left', vertical: 'middle' };
    });
    headerRow.height = 24;

    // Set column widths
    ws.getColumn(1).width = 5;   // #
    ws.getColumn(2).width = 25;  // Product
    ws.getColumn(3).width = 18;  // Family
    ws.getColumn(4).width = 12;  // Category
    ws.getColumn(5).width = 10;  // Type
    ws.getColumn(6).width = 12;  // Quantity
    ws.getColumn(7).width = 12;  // Unit Cost
    ws.getColumn(8).width = 14;  // Total
    ws.getColumn(9).width = 30;  // Size Run
    ws.getColumn(10).width = 25; // Notes

    // SKU rows
    let totalUnits = 0;
    let totalCost = 0;

    skus.forEach((sku, idx) => {
      const pd = (sku.production_data || {}) as Record<string, unknown>;
      const qty = (pd.order_quantity as number) || sku.buy_units;
      const unitCost = (pd.unit_cost_final as number) || sku.cost;
      const lineTotal = qty * unitCost;
      totalUnits += qty;
      totalCost += lineTotal;

      const sizeRunStr = sku.size_run
        ? Object.entries(sku.size_run).map(([s, q]) => `${s}:${q}`).join(' ')
        : '—';

      const row = ws.getRow(8 + idx);
      row.getCell(1).value = idx + 1;
      row.getCell(2).value = sku.name;
      row.getCell(3).value = sku.family;
      row.getCell(4).value = sku.category === 'CALZADO' ? 'Footwear' : sku.category === 'ROPA' ? 'Apparel' : sku.category;
      row.getCell(5).value = sku.type;
      row.getCell(6).value = qty;
      row.getCell(7).value = unitCost;
      row.getCell(7).numFmt = '€#,##0.00';
      row.getCell(8).value = lineTotal;
      row.getCell(8).numFmt = '€#,##0.00';
      row.getCell(9).value = sizeRunStr;
      row.getCell(10).value = sku.notes || '';

      row.eachCell((cell) => {
        cell.font = BODY_FONT;
        cell.border = THIN_BORDER;
      });
      row.getCell(6).alignment = { horizontal: 'right' };
      row.getCell(7).alignment = { horizontal: 'right' };
      row.getCell(8).alignment = { horizontal: 'right' };
      row.getCell(9).font = { size: 8, color: { argb: 'FF666666' } };

      if (idx % 2 === 1) {
        row.eachCell((cell) => { cell.fill = CREAM_FILL; });
      }
    });

    // Totals row
    const totalsRowNum = 8 + skus.length;
    const totalsRow = ws.getRow(totalsRowNum);
    ws.mergeCells(`A${totalsRowNum}:E${totalsRowNum}`);
    totalsRow.getCell(1).value = `TOTAL — ${skus.length} SKU${skus.length > 1 ? 's' : ''}`;
    totalsRow.getCell(1).font = TOTAL_FONT;
    totalsRow.getCell(6).value = totalUnits;
    totalsRow.getCell(6).font = TOTAL_FONT;
    totalsRow.getCell(6).alignment = { horizontal: 'right' };
    totalsRow.getCell(8).value = totalCost;
    totalsRow.getCell(8).numFmt = '€#,##0.00';
    totalsRow.getCell(8).font = { ...TOTAL_FONT, color: { argb: 'FF2D6A4F' } };
    totalsRow.getCell(8).alignment = { horizontal: 'right' };
    totalsRow.height = 28;

    // Special instructions
    if (firstPd.special_instructions) {
      const instrRow = ws.getRow(totalsRowNum + 2);
      ws.mergeCells(`A${totalsRowNum + 2}:J${totalsRowNum + 2}`);
      instrRow.getCell(1).value = `Special Instructions: ${firstPd.special_instructions}`;
      instrRow.getCell(1).font = { ...LABEL_FONT, italic: true };
    }

    // Footer
    const footerRowNum = totalsRowNum + 4;
    ws.mergeCells(`A${footerRowNum}:J${footerRowNum}`);
    const footerCell = ws.getCell(`A${footerRowNum}`);
    footerCell.value = 'Generated by aimily · aimily.app · StudioNN Agency S.L.';
    footerCell.font = { size: 8, color: { argb: 'FFAAAAAA' }, italic: true };

    // ══ SHEET 2: Technical Specs (BOM per SKU) ══
    const ws2 = wb.addWorksheet('Technical Specs');
    ws2.properties.defaultColWidth = 14;

    ws2.mergeCells('A1:H1');
    ws2.getCell('A1').value = 'TECHNICAL SPECIFICATIONS';
    ws2.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    ws2.getCell('A1').fill = DARK_FILL;
    ws2.getRow(1).height = 30;

    let currentRow = 3;
    skus.forEach((sku) => {
      // SKU header
      ws2.mergeCells(`A${currentRow}:H${currentRow}`);
      ws2.getCell(`A${currentRow}`).value = `${sku.name} — ${sku.family} · ${sku.category === 'CALZADO' ? 'Footwear' : sku.category === 'ROPA' ? 'Apparel' : sku.category}`;
      ws2.getCell(`A${currentRow}`).font = { bold: true, size: 11, color: { argb: 'FF282A29' } };
      ws2.getCell(`A${currentRow}`).fill = CREAM_FILL;
      ws2.getRow(currentRow).height = 24;
      currentRow++;

      // BOM headers
      const bomHeaders = ['Zone', 'Material', 'Composition', 'Weight', 'Finish'];
      const bomRow = ws2.getRow(currentRow);
      bomHeaders.forEach((h, i) => {
        bomRow.getCell(i + 1).value = h;
        bomRow.getCell(i + 1).font = { ...HEADER_FONT, size: 9 };
        bomRow.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF555555' } };
      });
      currentRow++;

      // BOM rows
      const zones = sku.material_zones || [];
      if (zones.length > 0) {
        zones.forEach((z) => {
          const row = ws2.getRow(currentRow);
          row.getCell(1).value = z.zone || '—';
          row.getCell(2).value = z.material || 'Factory discretion';
          row.getCell(3).value = z.composition || '—';
          row.getCell(4).value = z.weight || '—';
          row.getCell(5).value = z.finish || '—';
          row.eachCell((cell) => { cell.font = BODY_FONT; cell.border = THIN_BORDER; });
          currentRow++;
        });
      } else {
        ws2.getCell(`A${currentRow}`).value = 'No material zones configured';
        ws2.getCell(`A${currentRow}`).font = { ...LABEL_FONT, italic: true };
        currentRow++;
      }

      // Size run
      if (sku.size_run && Object.keys(sku.size_run).length > 0) {
        currentRow++;
        ws2.getCell(`A${currentRow}`).value = 'Size Run:';
        ws2.getCell(`A${currentRow}`).font = { ...BODY_FONT, bold: true };
        const sizes = Object.entries(sku.size_run);
        sizes.forEach(([size, qty], i) => {
          ws2.getCell(String.fromCharCode(66 + i) + currentRow).value = `${size}: ${qty}`;
          ws2.getCell(String.fromCharCode(66 + i) + currentRow).font = LABEL_FONT;
        });
        currentRow++;
      }

      currentRow += 2; // spacing between SKUs
    });

    // ── Audit log ──
    logAudit({
      userId: user!.id,
      collectionPlanId: planId || skus[0]?.id ? undefined : undefined,
      action: AUDIT_ACTIONS.PO_DOWNLOADED,
      entityType: 'purchase_order',
      entityId: poNumber,
      metadata: { skuCount: skus.length, totalUnits, totalCost, factoryName, factoryFilter: factoryFilter || undefined },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    });

    // ── Generate buffer ──
    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${poNumber}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('PO export error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate PO' }, { status: 500 });
  }
}

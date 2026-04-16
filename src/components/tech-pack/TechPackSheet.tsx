'use client';

/* ═══════════════════════════════════════════════════════════════════
   TechPackSheet — the real technical sheet canvas per SKU.

   Layout (desktop): large print-style canvas in the center of the
   viewport, ~1400px max width, white background, rounded-[20px].
   Sections: Header · Drawings (left 60%) + Data Panel (right 40%) ·
   Comments thread full-width. Every text field is inline editable;
   comments are append/edit/delete with optimistic UI.

   Data:
   - SKU auto-fills the Header (family, category, season, drop, type)
   - Drawings cells pull sku.reference_image_url, sku.sketch_url,
     sku.render_url, sku.render_urls.3d, sku.production_sample_url
     when available, else render placeholder slots
   - Measurements / BOM / grading / factory notes are free-form
     tables stored in tech_pack_data (per-section JSONB)
   - Comments stream from tech_pack_comments
   ═══════════════════════════════════════════════════════════════════ */

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, MessageSquare, Download, Printer, Loader2, Check } from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import { useTranslation } from '@/i18n';

type Section = 'header' | 'drawings' | 'measurements' | 'bom' | 'grading' | 'factory_notes';
type CommentBlock = 'header' | 'drawings' | 'measurements' | 'bom' | 'grading' | 'factory' | 'general';

interface MeasurementRow { point: string; xs: string; s: string; m: string; l: string; xl: string }
interface BomLine { type: string; material: string; qty: string; unit: string; supplier: string; cost: string }

interface TechPackDataRow {
  header?: Record<string, string>;
  drawings?: Record<string, string>;
  measurements?: { rows?: MeasurementRow[]; notes?: string };
  bom?: { lines?: BomLine[] };
  grading?: Record<string, string>;
  factory_notes?: Record<string, string>;
}

interface Comment {
  id: string;
  block: CommentBlock;
  body: string;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  collectionId: string;
  collectionName: string;
  season: string;
  sku: SKU;
  initialData: TechPackDataRow | null;
  initialComments: Comment[];
}

const DEFAULT_MEASUREMENT_POINTS = ['Length', 'Width', 'Height', 'Toe cap', 'Heel cap'];
const DEFAULT_BOM_LINES: BomLine[] = [
  { type: 'Upper', material: '', qty: '', unit: '', supplier: '', cost: '' },
  { type: 'Lining', material: '', qty: '', unit: '', supplier: '', cost: '' },
  { type: 'Sole', material: '', qty: '', unit: '', supplier: '', cost: '' },
];

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

export function TechPackSheet({ collectionId, collectionName, season, sku, initialData, initialComments }: Props) {
  const t = useTranslation();
  const tp = (t as unknown as { techPack?: Record<string, string> }).techPack || {};
  const [data, setData] = useState<TechPackDataRow>(initialData || {});
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [savingSection, setSavingSection] = useState<Section | null>(null);

  // Default measurements if none stored
  const measurementRows: MeasurementRow[] = data.measurements?.rows && data.measurements.rows.length > 0
    ? data.measurements.rows
    : DEFAULT_MEASUREMENT_POINTS.map(p => ({ point: p, xs: '', s: '', m: '', l: '', xl: '' }));

  const bomLines: BomLine[] = data.bom?.lines && data.bom.lines.length > 0
    ? data.bom.lines
    : DEFAULT_BOM_LINES;

  const saveSection = useCallback(async (section: Section, payload: Record<string, unknown>) => {
    setSavingSection(section);
    try {
      await fetch('/api/tech-pack', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuId: sku.id, section, data: payload }),
      });
    } finally {
      setSavingSection(null);
    }
  }, [sku.id]);

  const updateMeasurements = useCallback((rows: MeasurementRow[], notes?: string) => {
    setData(d => ({ ...d, measurements: { rows, notes: notes ?? d.measurements?.notes } }));
    saveSection('measurements', { rows, notes: notes ?? data.measurements?.notes });
  }, [data.measurements?.notes, saveSection]);

  const updateBom = useCallback((lines: BomLine[]) => {
    setData(d => ({ ...d, bom: { lines } }));
    saveSection('bom', { lines });
  }, [saveSection]);

  const updateFactoryNotes = useCallback((notes: string) => {
    setData(d => ({ ...d, factory_notes: { body: notes } }));
    saveSection('factory_notes', { body: notes });
  }, [saveSection]);

  /* ── Drawings — harvest everything we have on the SKU ── */
  const drawings: { label: string; url?: string; fallback: string }[] = [
    { label: tp.drawingReference || 'Reference', url: sku.reference_image_url, fallback: 'REF' },
    { label: tp.drawingSketch || 'Flat sketch', url: sku.sketch_url, fallback: 'SKT' },
    { label: tp.drawingColor || 'Colorized', url: sku.render_url, fallback: 'CLR' },
    { label: tp.drawing3d || '3D render', url: sku.render_urls?.['3d'], fallback: '3D' },
    { label: tp.drawingProto || 'Prototype', url: sku.proto_iterations?.[sku.proto_iterations.length - 1]?.images?.[0], fallback: 'PR' },
    { label: tp.drawingProduction || 'Production sample', url: sku.production_sample_url, fallback: 'PDN' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#F3F2F0' }}>
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-20 bg-shade/90 backdrop-blur-sm border-b border-carbon/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <Link
            href={`/collection/${collectionId}/product?phase=techpack`}
            className="inline-flex items-center gap-2 text-carbon/50 hover:text-carbon transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[13px] font-medium tracking-[-0.01em]">{tp.backToTechPack || 'Back to Tech Pack'}</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-carbon/[0.12] text-carbon/70 text-[12px] font-medium hover:bg-carbon/[0.04] transition-colors"
              title={tp.print || 'Print'}
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={2} />
              {tp.print || 'Print'}
            </button>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-carbon/[0.04] text-carbon/40 text-[12px] font-medium cursor-not-allowed"
              title={tp.exportComingSoon || 'PDF export coming soon'}
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              {tp.export || 'Export PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Sheet canvas ── */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-10">
        <div className="bg-white rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Header block */}
          <HeaderBlock
            sku={sku}
            collectionName={collectionName}
            season={season}
            tp={tp}
          />

          {/* Drawings + Data panel split */}
          <div className="grid grid-cols-1 lg:grid-cols-5 border-t border-carbon/[0.06]">
            {/* Left 60% — drawings (6-cell grid) */}
            <div className="lg:col-span-3 p-8 md:p-10 border-b lg:border-b-0 lg:border-r border-carbon/[0.06]">
              <SectionHeader
                label={tp.drawingsTitle || 'Drawings'}
                saving={savingSection === 'drawings'}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {drawings.map((d, i) => (
                  <div
                    key={i}
                    className="relative aspect-[4/5] rounded-[12px] bg-carbon/[0.02] border border-carbon/[0.06] overflow-hidden"
                  >
                    {d.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.url} alt={d.label} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/20">
                          {d.fallback}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 px-3 py-1.5 bg-white/95 backdrop-blur-sm border-t border-carbon/[0.06]">
                      <span className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/60">
                        {d.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 40% — data panel */}
            <div className="lg:col-span-2 p-8 md:p-10">
              <MeasurementsTable
                rows={measurementRows}
                onChange={updateMeasurements}
                notes={data.measurements?.notes || ''}
                saving={savingSection === 'measurements'}
                tp={tp}
              />
            </div>
          </div>

          {/* BOM section — full width */}
          <div className="border-t border-carbon/[0.06] p-8 md:p-10">
            <BomTable
              lines={bomLines}
              onChange={updateBom}
              saving={savingSection === 'bom'}
              tp={tp}
            />
          </div>

          {/* Factory notes */}
          <div className="border-t border-carbon/[0.06] p-8 md:p-10">
            <FactoryNotes
              value={(data.factory_notes?.body as string) || ''}
              onChange={updateFactoryNotes}
              saving={savingSection === 'factory_notes'}
              tp={tp}
            />
          </div>

          {/* Comments thread — full width */}
          <div className="border-t border-carbon/[0.06] bg-carbon/[0.015] p-8 md:p-10">
            <CommentsThread
              skuId={sku.id}
              comments={comments}
              onChange={setComments}
              tp={tp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════════ */

function SectionHeader({ label, saving }: { label: string; saving?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/50">
        {label}
      </h2>
      {saving && (
        <span className="inline-flex items-center gap-1 text-[10px] text-carbon/35">
          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
        </span>
      )}
    </div>
  );
}

function HeaderBlock({ sku, collectionName, season, tp }: {
  sku: SKU; collectionName: string; season: string; tp: Record<string, string>;
}) {
  const typeLabel = sku.type === 'IMAGEN' ? 'Image' : sku.type === 'REVENUE' ? 'Revenue' : 'Entry';
  const categoryLabel = sku.category === 'CALZADO' ? 'Footwear' : sku.category === 'ROPA' ? 'Apparel' : 'Accessories';
  const fields: { label: string; value: string }[] = [
    { label: tp.headerStyle || 'Style', value: sku.name },
    { label: tp.headerFamily || 'Family', value: sku.family },
    { label: tp.headerCategory || 'Category', value: categoryLabel },
    { label: tp.headerSeason || 'Season', value: season || '—' },
    { label: tp.headerDrop || 'Drop', value: `Drop ${sku.drop_number}` },
    { label: tp.headerType || 'Segment', value: typeLabel },
    { label: tp.headerPvp || 'PVP', value: `€${sku.pvp}` },
    { label: tp.headerCogs || 'COGS', value: `€${sku.cost}` },
  ];
  return (
    <div className="p-8 md:p-10">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/40 mb-2">
            {tp.header || 'Tech pack'} · {collectionName}
          </p>
          <h1 className="text-[32px] md:text-[40px] font-medium text-carbon tracking-[-0.03em] leading-[1.1]">
            {sku.name}
          </h1>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-carbon/[0.04] text-[11px] font-semibold tracking-[0.05em] text-carbon/70 uppercase">
          {tp.version || 'v1.0'}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {fields.map((f) => (
          <div key={f.label}>
            <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-1">{f.label}</p>
            <p className="text-[14px] font-medium text-carbon tracking-[-0.01em] truncate">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeasurementsTable({ rows, notes, onChange, saving, tp }: {
  rows: MeasurementRow[]; notes: string;
  onChange: (rows: MeasurementRow[], notes?: string) => void;
  saving?: boolean;
  tp: Record<string, string>;
}) {
  const updateCell = (idx: number, key: keyof MeasurementRow, value: string) => {
    const next = [...rows];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };
  const addRow = () => onChange([...rows, { point: '', xs: '', s: '', m: '', l: '', xl: '' }]);
  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  const sizes: (keyof MeasurementRow)[] = ['xs', 's', 'm', 'l', 'xl'];
  return (
    <div>
      <SectionHeader label={tp.measurementsTitle || 'Measurements'} saving={saving} />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-carbon/[0.08]">
              <th className="py-2 pr-3 text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
                {tp.measurementsPoint || 'Point'}
              </th>
              {sizes.map(s => (
                <th key={s} className="py-2 px-2 text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 text-center">
                  {s.toUpperCase()}
                </th>
              ))}
              <th className="w-6" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-carbon/[0.04]">
                <td className="py-1.5 pr-3">
                  <input
                    value={row.point}
                    onChange={(e) => updateCell(i, 'point', e.target.value)}
                    placeholder="—"
                    className="w-full bg-transparent text-[13px] font-medium text-carbon focus:outline-none focus:ring-1 focus:ring-carbon/10 rounded px-2 py-1"
                  />
                </td>
                {sizes.map(s => (
                  <td key={s} className="py-1.5 px-1">
                    <input
                      value={row[s]}
                      onChange={(e) => updateCell(i, s, e.target.value)}
                      placeholder="—"
                      className="w-full bg-transparent text-[13px] tabular-nums text-carbon text-center focus:outline-none focus:ring-1 focus:ring-carbon/10 rounded px-1 py-1"
                    />
                  </td>
                ))}
                <td className="py-1.5 pl-1">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-carbon/25 hover:text-error transition-colors"
                    title="Remove row"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={addRow}
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[-0.01em] text-carbon/50 hover:text-carbon transition-colors"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
          {tp.addRow || 'Add row'}
        </button>
      </div>
      <div className="mt-6">
        <label className="block text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-1.5">
          {tp.measurementsNotes || 'Measurement notes'}
        </label>
        <textarea
          value={notes}
          onChange={(e) => onChange(rows, e.target.value)}
          rows={2}
          placeholder={tp.measurementsNotesPlaceholder || 'Tolerances, reference posture, anything the factory should know…'}
          className="w-full bg-carbon/[0.02] rounded-[10px] px-3 py-2 text-[13px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20"
        />
      </div>
    </div>
  );
}

function BomTable({ lines, onChange, saving, tp }: {
  lines: BomLine[];
  onChange: (lines: BomLine[]) => void;
  saving?: boolean;
  tp: Record<string, string>;
}) {
  const update = (idx: number, key: keyof BomLine, value: string) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };
  const add = () => onChange([...lines, { type: '', material: '', qty: '', unit: '', supplier: '', cost: '' }]);
  const remove = (idx: number) => onChange(lines.filter((_, i) => i !== idx));
  const cols: { key: keyof BomLine; label: string; widthClass: string }[] = [
    { key: 'type', label: tp.bomType || 'Type', widthClass: 'w-[14%]' },
    { key: 'material', label: tp.bomMaterial || 'Material', widthClass: 'w-[26%]' },
    { key: 'qty', label: tp.bomQty || 'Qty', widthClass: 'w-[10%]' },
    { key: 'unit', label: tp.bomUnit || 'Unit', widthClass: 'w-[10%]' },
    { key: 'supplier', label: tp.bomSupplier || 'Supplier', widthClass: 'w-[22%]' },
    { key: 'cost', label: tp.bomCost || 'Cost', widthClass: 'w-[14%]' },
  ];
  return (
    <div>
      <SectionHeader label={tp.bomTitle || 'Bill of Materials'} saving={saving} />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-carbon/[0.08]">
              {cols.map(c => (
                <th key={c.key} className={`py-2 px-2 text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 ${c.widthClass}`}>
                  {c.label}
                </th>
              ))}
              <th className="w-6" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-b border-carbon/[0.04]">
                {cols.map(c => (
                  <td key={c.key} className="py-1.5 px-1">
                    <input
                      value={line[c.key]}
                      onChange={(e) => update(i, c.key, e.target.value)}
                      placeholder="—"
                      className="w-full bg-transparent text-[13px] text-carbon focus:outline-none focus:ring-1 focus:ring-carbon/10 rounded px-2 py-1"
                    />
                  </td>
                ))}
                <td className="py-1.5 pl-1">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-carbon/25 hover:text-error transition-colors"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={add}
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[-0.01em] text-carbon/50 hover:text-carbon transition-colors"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
          {tp.addBomLine || 'Add line'}
        </button>
      </div>
    </div>
  );
}

function FactoryNotes({ value, onChange, saving, tp }: {
  value: string;
  onChange: (v: string) => void;
  saving?: boolean;
  tp: Record<string, string>;
}) {
  // Debounced save — save on blur + 800ms after last keystroke
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocal(value); }, [value]);

  const schedule = (v: string) => {
    setLocal(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), 800);
  };

  return (
    <div>
      <SectionHeader label={tp.factoryTitle || 'Factory notes'} saving={saving} />
      <textarea
        value={local}
        onChange={(e) => schedule(e.target.value)}
        onBlur={() => { if (local !== value) onChange(local); }}
        rows={4}
        placeholder={tp.factoryPlaceholder || 'Stitch specs, seam allowances, reinforcements, anything the factory needs to execute the build…'}
        className="mt-4 w-full bg-carbon/[0.02] rounded-[12px] px-4 py-3 text-[14px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20 leading-[1.55]"
      />
    </div>
  );
}

function CommentsThread({ skuId, comments, onChange, tp }: {
  skuId: string;
  comments: Comment[];
  onChange: (next: Comment[]) => void;
  tp: Record<string, string>;
}) {
  const [body, setBody] = useState('');
  const [block, setBlock] = useState<CommentBlock>('general');
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const post = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/tech-pack/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuId, block, body: body.trim() }),
      });
      const j = await res.json();
      if (j.comment) onChange([...comments, j.comment]);
      setBody('');
    } finally {
      setPosting(false);
    }
  };

  const del = async (id: string) => {
    await fetch(`/api/tech-pack/comments?id=${id}`, { method: 'DELETE' });
    onChange(comments.filter(c => c.id !== id));
  };

  const saveEdit = async () => {
    if (!editingId || !editBody.trim()) return;
    await fetch('/api/tech-pack/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, body: editBody.trim() }),
    });
    onChange(comments.map(c => c.id === editingId ? { ...c, body: editBody.trim() } : c));
    setEditingId(null);
    setEditBody('');
  };

  const BLOCKS: { id: CommentBlock; label: string }[] = [
    { id: 'general', label: tp.commentsBlockGeneral || 'General' },
    { id: 'header', label: tp.commentsBlockHeader || 'Header' },
    { id: 'drawings', label: tp.commentsBlockDrawings || 'Drawings' },
    { id: 'measurements', label: tp.commentsBlockMeasurements || 'Measurements' },
    { id: 'bom', label: tp.commentsBlockBom || 'BOM' },
    { id: 'grading', label: tp.commentsBlockGrading || 'Grading' },
    { id: 'factory', label: tp.commentsBlockFactory || 'Factory' },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <MessageSquare className="h-4 w-4 text-carbon/50" strokeWidth={2} />
        <h2 className="text-[13px] tracking-[-0.01em] font-semibold text-carbon">
          {tp.commentsTitle || 'Comments'}
          <span className="text-carbon/40 font-normal ml-2">({comments.length})</span>
        </h2>
      </div>

      {/* Existing comments */}
      {comments.length > 0 && (
        <div className="space-y-3 mb-6">
          {comments.map(c => (
            <div key={c.id} className="bg-white rounded-[12px] p-4 border border-carbon/[0.06]">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-[11px] text-carbon/55">
                  <span className="font-semibold text-carbon/80">{c.author_name || 'user'}</span>
                  <span>·</span>
                  <span>{fmtDate(c.created_at)}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-carbon/[0.04] text-[9px] font-semibold tracking-wide uppercase">
                    {c.block}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {editingId === c.id ? (
                    <button
                      onClick={saveEdit}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-carbon text-white text-[10px] font-semibold"
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      {tp.commentsSave || 'Save'}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setEditingId(c.id); setEditBody(c.body); }}
                      className="text-[10px] text-carbon/40 hover:text-carbon/80 transition-colors px-1"
                    >
                      {tp.commentsEdit || 'Edit'}
                    </button>
                  )}
                  <button
                    onClick={() => del(c.id)}
                    className="text-carbon/30 hover:text-error transition-colors p-1"
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={2} />
                  </button>
                </div>
              </div>
              {editingId === c.id ? (
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={2}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setEditingId(null); setEditBody(''); }
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit(); }
                  }}
                  className="w-full bg-carbon/[0.02] rounded-[8px] px-3 py-2 text-[13px] text-carbon focus:outline-none focus:ring-1 focus:ring-carbon/20 leading-[1.5]"
                />
              ) : (
                <p className="text-[13px] text-carbon/75 leading-[1.55] whitespace-pre-wrap">{c.body}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="bg-white rounded-[12px] p-4 border border-carbon/[0.06]">
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {BLOCKS.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBlock(b.id)}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold tracking-[0.02em] uppercase transition-colors ${
                block === b.id
                  ? 'bg-carbon text-white'
                  : 'bg-carbon/[0.04] text-carbon/55 hover:bg-carbon/[0.08]'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); post(); }
          }}
          placeholder={tp.commentsPlaceholder || 'Leave a comment…'}
          className="w-full bg-carbon/[0.02] rounded-[8px] px-3 py-2 text-[13px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20 leading-[1.5]"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-carbon/30">{tp.commentsHint || 'Cmd+Enter to send'}</span>
          <button
            type="button"
            onClick={post}
            disabled={posting || !body.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-carbon text-white text-[11px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-carbon/90 transition-colors"
          >
            {posting && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />}
            {tp.commentsSend || 'Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}

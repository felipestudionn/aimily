'use client';

/* ═══════════════════════════════════════════════════════════════════
   TechPackSheet — industry-grade technical sheet per SKU.

   Sections, top-to-bottom:
     1. Header block       — style metadata + version chip
     2. Technical Drawings — front/back/side + dynamic callouts, with
                             image upload per slot and pin comments
                             dropped directly on the drawing
     3. Design Evolution   — reference · sketch · colorized · 3D ·
                             proto · production thumbs from the SKU
                             (read-only, no upload here — they come
                             from the SKU lifecycle)
     4. Material Swatches  — zones with Pantone + supplier + swatch
                             image, editable inline
     5. Measurements       — XS-S-M-L-XL size table with Add row
     6. Bill of Materials  — type · material · qty · unit · supplier
                             · cost, editable inline
     7. Factory Notes      — free-form textarea
     8. Comments thread    — block-anchored + pin-anchored, inline
                             edit + delete, Cmd+Enter to send
   ═══════════════════════════════════════════════════════════════════ */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, MessageSquare, Download, Printer,
  Loader2, Check, Upload, MapPin, X, Sparkles,
} from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';
import { useTranslation } from '@/i18n';

type Section =
  | 'header' | 'drawings' | 'measurements' | 'bom' | 'grading'
  | 'factory_notes' | 'materials';

type CommentBlock =
  | 'header' | 'drawings' | 'measurements' | 'bom' | 'grading'
  | 'factory' | 'general' | 'materials';

interface MeasurementRow { point: string; xs: string; s: string; m: string; l: string; xl: string }
interface BomLine { type: string; material: string; qty: string; unit: string; supplier: string; cost: string }
interface MaterialZone { name: string; pantone: string; supplier: string; swatchUrl: string; notes: string }
interface Callout { url: string; label: string }

interface TechPackDataRow {
  header?: Record<string, string>;
  /* Drawings — two category-aware flat-sketch slots. viewA/viewB
     are optional overrides; when absent, the component falls back to
     the SKU's existing sketch URLs (generated during Sketch & Color),
     so the factory-ready tech pack auto-prefills with whatever the
     designer already drew. */
  drawings?: {
    viewA?: string;
    viewB?: string;
    callouts?: Callout[];
  };
  materials?: { zones?: MaterialZone[] };
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
  drawing_slot: string | null;
  pin_x: number | null;
  pin_y: number | null;
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
const DEFAULT_MATERIAL_ZONES: MaterialZone[] = [
  { name: 'Upper', pantone: '', supplier: '', swatchUrl: '', notes: '' },
  { name: 'Lining', pantone: '', supplier: '', swatchUrl: '', notes: '' },
  { name: 'Outsole', pantone: '', supplier: '', swatchUrl: '', notes: '' },
  { name: 'Hardware', pantone: '', supplier: '', swatchUrl: '', notes: '' },
];

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

/* Upload helper — posts a base64 data URL to /api/storage/upload and
   returns the public URL. Used by drawings + swatches + callouts. */
async function uploadImage(
  collectionPlanId: string,
  assetType: 'tech_pack' | 'material_swatch' | 'callout',
  file: File,
  name: string,
): Promise<string | null> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await fetch('/api/storage/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collectionPlanId,
      assetType,
      name,
      base64: base64.split(',')[1],
      mimeType: file.type,
    }),
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j.publicUrl ?? null;
}

export function TechPackSheet({ collectionId, collectionName, season, sku, initialData, initialComments }: Props) {
  const t = useTranslation();
  const tp = (t as unknown as { techPack?: Record<string, string> }).techPack || {};
  const [data, setData] = useState<TechPackDataRow>(initialData || {});
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [savingSection, setSavingSection] = useState<Section | null>(null);

  const measurementRows: MeasurementRow[] = data.measurements?.rows && data.measurements.rows.length > 0
    ? data.measurements.rows
    : DEFAULT_MEASUREMENT_POINTS.map(p => ({ point: p, xs: '', s: '', m: '', l: '', xl: '' }));

  const bomLines: BomLine[] = data.bom?.lines && data.bom.lines.length > 0
    ? data.bom.lines
    : DEFAULT_BOM_LINES;

  const materialZones: MaterialZone[] = data.materials?.zones && data.materials.zones.length > 0
    ? data.materials.zones
    : DEFAULT_MATERIAL_ZONES;

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

  /* ── Mutators ── */
  const updateDrawings = useCallback((next: TechPackDataRow['drawings']) => {
    setData(d => ({ ...d, drawings: next }));
    saveSection('drawings', next as Record<string, unknown>);
  }, [saveSection]);

  const updateMaterials = useCallback((zones: MaterialZone[]) => {
    setData(d => ({ ...d, materials: { zones } }));
    saveSection('materials', { zones });
  }, [saveSection]);

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

  /* ── AI generation (measurements / BOM / both) ── */
  const [aiBusyScope, setAiBusyScope] = useState<'measurements' | 'bom' | 'both' | null>(null);
  const aiGenerate = useCallback(async (scope: 'measurements' | 'bom' | 'both') => {
    setAiBusyScope(scope);
    try {
      const res = await fetch('/api/ai/tech-pack/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skuId: sku.id, scope }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[tech-pack/generate]', j);
        return;
      }
      const j = await res.json();
      const next: TechPackDataRow = { ...data };
      if (j.result?.measurements) next.measurements = j.result.measurements;
      if (j.result?.bom) next.bom = j.result.bom;
      setData(next);
    } finally {
      setAiBusyScope(null);
    }
  }, [sku.id, data]);

  /* ── Design evolution strip data (read-only — from SKU) ── */
  const evolutionImages: { label: string; url?: string; fallback: string }[] = [
    { label: tp.drawingReference || 'Reference', url: sku.reference_image_url, fallback: 'REF' },
    { label: tp.drawingSketch || 'Flat sketch', url: sku.sketch_url, fallback: 'SKT' },
    { label: tp.drawingColor || 'Colorized', url: sku.render_url, fallback: 'CLR' },
    { label: tp.drawing3d || '3D render', url: sku.render_urls?.['3d'], fallback: '3D' },
    { label: tp.drawingProto || 'Prototype', url: sku.proto_iterations?.[sku.proto_iterations.length - 1]?.images?.[0], fallback: 'PR' },
    { label: tp.drawingProduction || 'Production sample', url: sku.production_sample_url, fallback: 'PDN' },
  ];

  /* ── Comment helpers ── */
  const addComment = useCallback(async (params: {
    block: CommentBlock; body: string; drawingSlot?: string; pinX?: number; pinY?: number;
  }) => {
    const res = await fetch('/api/tech-pack/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skuId: sku.id,
        block: params.block,
        body: params.body,
        drawingSlot: params.drawingSlot ?? null,
        pinX: params.pinX ?? null,
        pinY: params.pinY ?? null,
      }),
    });
    const j = await res.json();
    if (j.comment) setComments(prev => [...prev, j.comment]);
    return j.comment as Comment | undefined;
  }, [sku.id]);

  const deleteComment = useCallback(async (id: string) => {
    await fetch(`/api/tech-pack/comments?id=${id}`, { method: 'DELETE' });
    setComments(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateComment = useCallback(async (id: string, body: string) => {
    await fetch('/api/tech-pack/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, body }),
    });
    setComments(prev => prev.map(c => c.id === id ? { ...c, body } : c));
  }, []);

  /* Pin comments per drawing slot — numbered in order of creation */
  const pinCommentsBySlot = useMemo(() => {
    const out: Record<string, (Comment & { pinNumber: number })[]> = {};
    for (const c of comments) {
      if (c.drawing_slot && c.pin_x !== null && c.pin_y !== null) {
        const slot = c.drawing_slot;
        if (!out[slot]) out[slot] = [];
        out[slot].push({ ...c, pinNumber: out[slot].length + 1 });
      }
    }
    return out;
  }, [comments]);

  const blockComments = useMemo(() =>
    comments.filter(c => !c.drawing_slot),
  [comments]);

  return (
    <div className="min-h-screen" style={{ background: '#F3F2F0' }}>
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 bg-shade/90 backdrop-blur-sm border-b border-carbon/[0.06]">
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
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={2} />
              {tp.print || 'Print'}
            </button>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-carbon/[0.04] text-carbon/40 text-[12px] font-medium cursor-not-allowed"
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
          <HeaderBlock sku={sku} collectionName={collectionName} season={season} tp={tp} />

          {/* Technical Drawings — 2 category-aware views, auto-prefilled
              from the SKU's flat sketches (sketch_url + sketch_top_url),
              with optional upload override + pin comments. */}
          <div className="border-t border-carbon/[0.06] p-8 md:p-10">
            <TechnicalDrawings
              collectionPlanId={collectionId}
              category={sku.category}
              drawings={data.drawings || {}}
              fallbackA={sku.sketch_url}
              fallbackB={sku.sketch_top_url}
              onChange={updateDrawings}
              saving={savingSection === 'drawings'}
              tp={tp}
              pinsBySlot={pinCommentsBySlot}
              onAddPin={(slot, x, y, body) => addComment({ block: 'drawings', drawingSlot: slot, pinX: x, pinY: y, body })}
              onDeletePin={deleteComment}
            />
          </div>

          {/* Design Evolution — read-only strip pulling from SKU */}
          <div className="border-t border-carbon/[0.06] p-8 md:p-10">
            <SectionHeader label={tp.evolutionTitle || 'Design evolution'} />
            <p className="text-[12px] text-carbon/40 mt-1 mb-4">{tp.evolutionSubtitle || 'Visual history of the build — pulled from the SKU lifecycle.'}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {evolutionImages.map((d, i) => (
                <div key={i} className="relative aspect-[4/5] rounded-[12px] bg-carbon/[0.02] border border-carbon/[0.06] overflow-hidden">
                  {d.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.url} alt={d.label} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/20">{d.fallback}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 px-2.5 py-1 bg-white/95 backdrop-blur-sm border-t border-carbon/[0.06]">
                    <span className="text-[9px] tracking-[0.15em] uppercase font-semibold text-carbon/60">{d.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Material Swatches */}
          <div className="border-t border-carbon/[0.06] p-8 md:p-10">
            <MaterialsSection
              collectionPlanId={collectionId}
              zones={materialZones}
              onChange={updateMaterials}
              saving={savingSection === 'materials'}
              tp={tp}
            />
          </div>

          {/* Measurements */}
          <div className="border-t border-carbon/[0.06] p-8 md:p-10">
            <MeasurementsTable
              rows={measurementRows}
              onChange={updateMeasurements}
              notes={data.measurements?.notes || ''}
              saving={savingSection === 'measurements'}
              tp={tp}
              onGenerate={() => aiGenerate('measurements')}
              generating={aiBusyScope === 'measurements' || aiBusyScope === 'both'}
            />
          </div>

          {/* BOM */}
          <div className="border-t border-carbon/[0.06] p-8 md:p-10">
            <BomTable
              lines={bomLines}
              onChange={updateBom}
              saving={savingSection === 'bom'}
              tp={tp}
              onGenerate={() => aiGenerate('bom')}
              generating={aiBusyScope === 'bom' || aiBusyScope === 'both'}
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

          {/* Comments thread (block-anchored + pin-anchored references) */}
          <div className="border-t border-carbon/[0.06] bg-carbon/[0.015] p-8 md:p-10">
            <CommentsThread
              skuId={sku.id}
              blockComments={blockComments}
              allComments={comments}
              onAdd={addComment}
              onUpdate={updateComment}
              onDelete={deleteComment}
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

function SectionHeader({ label, saving, action }: { label: string; saving?: boolean; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/50">{label}</h2>
      <div className="flex items-center gap-2">
        {saving && <Loader2 className="h-3 w-3 animate-spin text-carbon/35" strokeWidth={2} />}
        {action}
      </div>
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

/* ── Technical drawings section ──────────────────────────────────── */
/* Category-aware: footwear uses Side + Top-down; apparel/accessories
   use Front + Back. Each slot auto-prefills from the SKU's flat
   sketches (sku.sketch_url as viewA fallback, sku.sketch_top_url as
   viewB fallback). User can upload to override; "Reset to flat sketch"
   clears the override so the slot falls back to the AI-generated
   drawing again. Pins anchor to 'viewA'/'viewB' regardless of
   category. */
function TechnicalDrawings({
  collectionPlanId, category, drawings, fallbackA, fallbackB, onChange, saving, tp,
  pinsBySlot, onAddPin, onDeletePin,
}: {
  collectionPlanId: string;
  category: SKU['category'];
  drawings: TechPackDataRow['drawings'];
  fallbackA?: string;
  fallbackB?: string;
  onChange: (next: TechPackDataRow['drawings']) => void;
  saving?: boolean;
  tp: Record<string, string>;
  pinsBySlot: Record<string, (Comment & { pinNumber: number })[]>;
  onAddPin: (slot: string, x: number, y: number, body: string) => Promise<Comment | undefined>;
  onDeletePin: (id: string) => Promise<void>;
}) {
  const [pinMode, setPinMode] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [pendingPin, setPendingPin] = useState<{ slot: string; x: number; y: number } | null>(null);
  const [pinBody, setPinBody] = useState('');
  const [openPinId, setOpenPinId] = useState<string | null>(null);

  /* Labels adapt to the product category. Slot ids stay generic
     (viewA/viewB) so comments and uploads don't need remapping if
     the category changes later. */
  const slots: { id: 'viewA' | 'viewB'; label: string }[] =
    category === 'CALZADO'
      ? [
          { id: 'viewA', label: tp.drawingSide || 'Side view' },
          { id: 'viewB', label: tp.drawingTop || 'Top-down view' },
        ]
      : [
          { id: 'viewA', label: tp.drawingFront || 'Front view' },
          { id: 'viewB', label: tp.drawingBack || 'Back view' },
        ];
  const callouts: Callout[] = drawings?.callouts ?? [];

  /* URL resolution per slot: explicit override → SKU fallback. */
  const urlFor = (slot: 'viewA' | 'viewB'): string | undefined => {
    const override = drawings?.[slot];
    if (override) return override;
    return slot === 'viewA' ? fallbackA : fallbackB;
  };
  const hasOverride = (slot: 'viewA' | 'viewB'): boolean => !!drawings?.[slot];
  const isFromSku = (slot: 'viewA' | 'viewB'): boolean => !hasOverride(slot) && !!urlFor(slot);

  const handleUpload = async (slot: 'viewA' | 'viewB', file: File) => {
    setUploadingSlot(slot);
    const url = await uploadImage(collectionPlanId, 'tech_pack', file, `${slot}.${file.name.split('.').pop()}`);
    setUploadingSlot(null);
    if (url) onChange({ ...drawings, [slot]: url });
  };

  /* Remove just clears the override — the slot falls back to the
     SKU's flat sketch automatically. */
  const handleRemove = (slot: 'viewA' | 'viewB') => {
    const next = { ...drawings, [slot]: undefined };
    onChange(next);
  };

  const handleAddCallout = async (file: File) => {
    setUploadingSlot('callout');
    const url = await uploadImage(collectionPlanId, 'callout', file, file.name);
    setUploadingSlot(null);
    if (url) onChange({ ...drawings, callouts: [...callouts, { url, label: '' }] });
  };

  const updateCalloutLabel = (idx: number, label: string) => {
    const next = [...callouts];
    next[idx] = { ...next[idx], label };
    onChange({ ...drawings, callouts: next });
  };

  const removeCallout = (idx: number) => {
    onChange({ ...drawings, callouts: callouts.filter((_, i) => i !== idx) });
  };

  const handleDrawingClick = (slot: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (!pinMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ slot, x, y });
    setPinBody('');
  };

  const submitPin = async () => {
    if (!pendingPin || !pinBody.trim()) return;
    await onAddPin(pendingPin.slot, pendingPin.x, pendingPin.y, pinBody.trim());
    setPendingPin(null);
    setPinBody('');
  };

  return (
    <div>
      <SectionHeader
        label={tp.drawingsTitle || 'Technical drawings'}
        saving={saving}
        action={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPinMode(p => !p)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-[-0.01em] transition-colors ${
                pinMode ? 'bg-carbon text-white' : 'bg-carbon/[0.04] text-carbon/60 hover:bg-carbon/[0.08]'
              }`}
              title={tp.pinModeHint || 'Click on any drawing to drop a comment pin'}
            >
              <MapPin className="h-3 w-3" strokeWidth={2.5} />
              {pinMode ? (tp.pinModeOn || 'Pin mode on') : (tp.pinModeOff || 'Pin a comment')}
            </button>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-carbon/[0.04] text-carbon/60 hover:bg-carbon/[0.08] text-[11px] font-semibold cursor-pointer transition-colors">
              <Plus className="h-3 w-3" strokeWidth={2.5} />
              {tp.addCallout || 'Add callout'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAddCallout(f); e.target.value = ''; }}
              />
            </label>
          </div>
        }
      />

      <p className="text-[12px] text-carbon/40 mt-1 mb-5">
        {category === 'CALZADO'
          ? (tp.drawingsSubtitleFootwear || 'Side and top-down views prefilled from your flat sketch. Drop pin comments on the exact point you want the factory to read.')
          : (tp.drawingsSubtitleApparel || 'Front and back views prefilled from your flat sketch. Drop pin comments on the exact point you want the factory to read.')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {slots.map(s => (
          <DrawingSlot
            key={s.id}
            label={s.label}
            url={urlFor(s.id)}
            fromSku={isFromSku(s.id)}
            uploading={uploadingSlot === s.id}
            pins={pinsBySlot[s.id] ?? []}
            pinMode={pinMode}
            onUpload={(f) => handleUpload(s.id, f)}
            onRemove={() => handleRemove(s.id)}
            onClick={(e) => handleDrawingClick(s.id, e)}
            onPinClick={setOpenPinId}
            openPinId={openPinId}
            onPinDelete={onDeletePin}
            pendingPin={pendingPin?.slot === s.id ? pendingPin : null}
            pinBody={pinBody}
            setPinBody={setPinBody}
            onSubmitPin={submitPin}
            onCancelPin={() => setPendingPin(null)}
            tp={tp}
          />
        ))}
      </div>

      {/* Callouts row */}
      {callouts.length > 0 && (
        <div className="mt-6">
          <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-3">
            {tp.calloutsTitle || 'Construction callouts'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {callouts.map((c, i) => (
              <div key={i} className="relative aspect-square rounded-[12px] bg-carbon/[0.02] border border-carbon/[0.06] overflow-hidden group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.url} alt={c.label || 'callout'} className="absolute inset-0 w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeCallout(i)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-carbon/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" strokeWidth={2.5} />
                </button>
                <input
                  type="text"
                  value={c.label}
                  onChange={(e) => updateCalloutLabel(i, e.target.value)}
                  placeholder={tp.calloutLabel || 'Callout label'}
                  className="absolute bottom-0 inset-x-0 px-3 py-1.5 bg-white/95 backdrop-blur-sm border-t border-carbon/[0.06] text-[11px] font-medium text-carbon focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Individual drawing slot (with pin overlay + upload/remove) ── */
function DrawingSlot({
  label, url, fromSku, uploading, pins, pinMode,
  onUpload, onRemove, onClick,
  pendingPin, pinBody, setPinBody, onSubmitPin, onCancelPin,
  openPinId, onPinClick, onPinDelete,
  tp,
}: {
  label: string;
  url?: string;
  fromSku?: boolean;
  uploading: boolean;
  pins: (Comment & { pinNumber: number })[];
  pinMode: boolean;
  onUpload: (f: File) => void;
  onRemove: () => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  pendingPin: { slot: string; x: number; y: number } | null;
  pinBody: string;
  setPinBody: (v: string) => void;
  onSubmitPin: () => void;
  onCancelPin: () => void;
  openPinId: string | null;
  onPinClick: (id: string | null) => void;
  onPinDelete: (id: string) => Promise<void>;
  tp: Record<string, string>;
}) {
  return (
    <div className="relative aspect-[4/5] rounded-[12px] bg-carbon/[0.02] border border-carbon/[0.06] overflow-hidden group">
      {url ? (
        <>
          <div
            className={`absolute inset-0 ${pinMode ? 'cursor-crosshair' : ''}`}
            onClick={onClick}
          >
            {/* Flat sketches must read completely — object-contain
                with padding keeps the full drawing in frame and
                leaves room for pin overlays without cropping the
                silhouette. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={label}
              className="absolute inset-0 w-full h-full object-contain p-6"
              style={{ background: '#fdfdfc' }}
            />
          </div>

          {/* Existing pins */}
          {pins.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); onPinClick(openPinId === p.id ? null : p.id); }}
              className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                openPinId === p.id
                  ? 'bg-carbon text-white ring-2 ring-white shadow-lg scale-110'
                  : 'bg-white text-carbon ring-2 ring-carbon shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:scale-110'
              }`}
              style={{ left: `${p.pin_x ?? 0}%`, top: `${p.pin_y ?? 0}%` }}
            >
              {p.pinNumber}
            </button>
          ))}

          {/* Pending pin marker + composer */}
          {pendingPin && (
            <>
              <div
                className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-carbon text-white ring-2 ring-white flex items-center justify-center text-[10px] font-bold shadow-lg animate-pulse"
                style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%` }}
              >
                ?
              </div>
              <div
                className="absolute z-10 bg-white rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-carbon/[0.06] p-3 w-[240px]"
                style={{
                  left: `${Math.min(pendingPin.x, 60)}%`,
                  top: `${pendingPin.y + 4}%`,
                }}
              >
                <textarea
                  value={pinBody}
                  onChange={(e) => setPinBody(e.target.value)}
                  autoFocus
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { e.preventDefault(); onCancelPin(); }
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSubmitPin(); }
                  }}
                  placeholder={tp.pinPlaceholder || 'Drop a comment on this point…'}
                  className="w-full bg-carbon/[0.02] rounded-[8px] px-2.5 py-1.5 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20 leading-[1.5] resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={onCancelPin}
                    className="text-[10px] text-carbon/40 hover:text-carbon/80"
                  >
                    {tp.pinCancel || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={onSubmitPin}
                    disabled={!pinBody.trim()}
                    className="px-3 py-1 rounded-full bg-carbon text-white text-[10px] font-semibold disabled:opacity-40"
                  >
                    {tp.pinDrop || 'Drop pin'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Open pin card */}
          {pins.filter(p => p.id === openPinId).map(p => (
            <div
              key={p.id}
              className="absolute z-10 bg-white rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-carbon/[0.06] p-3 w-[240px]"
              style={{ left: `${Math.min((p.pin_x ?? 0), 60)}%`, top: `${(p.pin_y ?? 0) + 4}%` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-carbon/70">#{p.pinNumber} · {p.author_name || 'user'}</span>
                <button
                  type="button"
                  onClick={() => onPinDelete(p.id)}
                  className="text-carbon/30 hover:text-error"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={2} />
                </button>
              </div>
              <p className="text-[12px] text-carbon/80 leading-[1.5] whitespace-pre-wrap">{p.body}</p>
            </div>
          ))}

          {/* Overlay controls (only when not in pin mode). If the
              image comes from the flat sketch (fromSku), show a
              Replace affordance. If it's an uploaded override, show
              Reset to flat sketch. */}
          {!pinMode && (
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <label className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-carbon/80 text-white text-[10px] font-semibold cursor-pointer hover:bg-carbon transition-colors">
                <Upload className="w-3 h-3" strokeWidth={2.5} />
                {fromSku ? (tp.replaceDrawing || 'Replace') : (tp.reuploadDrawing || 'Replace')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }}
                />
              </label>
              {!fromSku && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="w-6 h-6 rounded-full bg-carbon/80 text-white flex items-center justify-center hover:bg-carbon transition-colors"
                  title={tp.resetToSketch || 'Reset to flat sketch'}
                >
                  <X className="w-3 h-3" strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}

          {/* "From flat sketch" chip — reminds the user this is the
              AI-generated drawing, not a manual upload. */}
          {fromSku && (
            <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[9px] font-semibold tracking-wide uppercase text-carbon/60 border border-carbon/[0.06]">
              <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} />
              {tp.fromFlatSketch || 'From flat sketch'}
            </div>
          )}
        </>
      ) : (
        <label className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-carbon/[0.04] transition-colors">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-carbon/40" strokeWidth={1.5} />
          ) : (
            <>
              <Upload className="h-6 w-6 text-carbon/30" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold text-carbon/55 tracking-[-0.01em] text-center px-3">
                {tp.waitingForSketch || 'Waiting for flat sketch. Upload one or generate it in Sketch & Color.'}
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }}
          />
        </label>
      )}

      <div className="absolute bottom-0 inset-x-0 px-3 py-1.5 bg-white/95 backdrop-blur-sm border-t border-carbon/[0.06] flex items-center justify-between">
        <span className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/60">{label}</span>
        {pins.length > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-carbon/60">
            <MessageSquare className="h-2.5 w-2.5" strokeWidth={2.5} /> {pins.length}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Material swatches section ───────────────────────────────────── */
function MaterialsSection({
  collectionPlanId, zones, onChange, saving, tp,
}: {
  collectionPlanId: string;
  zones: MaterialZone[];
  onChange: (next: MaterialZone[]) => void;
  saving?: boolean;
  tp: Record<string, string>;
}) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const update = (idx: number, patch: Partial<MaterialZone>) => {
    const next = [...zones];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const add = () => onChange([...zones, { name: '', pantone: '', supplier: '', swatchUrl: '', notes: '' }]);
  const remove = (idx: number) => onChange(zones.filter((_, i) => i !== idx));

  const handleUpload = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    const url = await uploadImage(collectionPlanId, 'material_swatch', file, `swatch-${idx}-${file.name}`);
    setUploadingIdx(null);
    if (url) update(idx, { swatchUrl: url });
  };

  return (
    <div>
      <SectionHeader
        label={tp.materialsTitle || 'Material swatches'}
        saving={saving}
        action={
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-carbon/[0.04] text-carbon/60 hover:bg-carbon/[0.08] text-[11px] font-semibold tracking-[-0.01em] transition-colors"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} />
            {tp.addZone || 'Add zone'}
          </button>
        }
      />

      <p className="text-[12px] text-carbon/40 mt-1 mb-5">
        {tp.materialsSubtitle || 'Visual reference per construction zone. Attach a swatch photo, Pantone / color code, supplier name and any material notes.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {zones.map((z, i) => (
          <div key={i} className="bg-carbon/[0.02] rounded-[16px] p-4 relative group">
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-carbon/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" strokeWidth={2.5} />
            </button>

            {/* Swatch */}
            <div className="aspect-[5/4] rounded-[10px] bg-white border border-carbon/[0.06] overflow-hidden mb-3 relative">
              {z.swatchUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={z.swatchUrl} alt={z.name} className="absolute inset-0 w-full h-full object-cover" />
                </>
              ) : (
                <label className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-carbon/[0.04] transition-colors">
                  {uploadingIdx === i ? (
                    <Loader2 className="h-5 w-5 animate-spin text-carbon/40" strokeWidth={1.5} />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-carbon/30" strokeWidth={1.5} />
                      <span className="text-[10px] font-semibold text-carbon/50">{tp.uploadSwatch || 'Upload swatch'}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(i, f); e.target.value = ''; }}
                  />
                </label>
              )}
            </div>

            {/* Fields */}
            <input
              value={z.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder={tp.zonePlaceholder || 'Zone (Upper, Lining, Sole…)'}
              className="w-full bg-white rounded-[8px] px-3 py-2 text-[13px] font-semibold text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20 border border-carbon/[0.06] mb-2"
            />
            <input
              value={z.pantone}
              onChange={(e) => update(i, { pantone: e.target.value })}
              placeholder={tp.pantonePlaceholder || 'Pantone / code'}
              className="w-full bg-white rounded-[8px] px-3 py-2 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20 border border-carbon/[0.06] mb-2 font-mono"
            />
            <input
              value={z.supplier}
              onChange={(e) => update(i, { supplier: e.target.value })}
              placeholder={tp.supplierPlaceholder || 'Supplier'}
              className="w-full bg-white rounded-[8px] px-3 py-2 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20 border border-carbon/[0.06] mb-2"
            />
            <textarea
              value={z.notes}
              onChange={(e) => update(i, { notes: e.target.value })}
              rows={2}
              placeholder={tp.materialNotesPlaceholder || 'Notes (finish, weight, care…)'}
              className="w-full bg-white rounded-[8px] px-3 py-2 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20 border border-carbon/[0.06] leading-[1.45] resize-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Measurements table ──────────────────────────────────────────── */
function MeasurementsTable({ rows, notes, onChange, saving, tp, onGenerate, generating }: {
  rows: MeasurementRow[]; notes: string;
  onChange: (rows: MeasurementRow[], notes?: string) => void;
  saving?: boolean;
  tp: Record<string, string>;
  onGenerate?: () => void;
  generating?: boolean;
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
      <SectionHeader
        label={tp.measurementsTitle || 'Measurements'}
        saving={saving}
        action={onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-carbon/[0.04] text-carbon/70 hover:bg-carbon/[0.08] text-[11px] font-semibold tracking-[-0.01em] disabled:opacity-50 transition-colors"
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} /> : <Sparkles className="h-3 w-3" strokeWidth={2.5} />}
            {generating ? (tp.generating || 'Generating…') : (tp.generateWithAI || 'Generate with AI')}
          </button>
        )}
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-carbon/[0.08]">
              <th className="py-2 pr-3 text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40">{tp.measurementsPoint || 'Point'}</th>
              {sizes.map(s => (
                <th key={s} className="py-2 px-2 text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 text-center">{s.toUpperCase()}</th>
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
                  <button type="button" onClick={() => removeRow(i)} className="text-carbon/25 hover:text-error transition-colors">
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

/* ── BOM table ───────────────────────────────────────────────────── */
function BomTable({ lines, onChange, saving, tp, onGenerate, generating }: {
  lines: BomLine[];
  onChange: (lines: BomLine[]) => void;
  saving?: boolean;
  tp: Record<string, string>;
  onGenerate?: () => void;
  generating?: boolean;
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
      <SectionHeader
        label={tp.bomTitle || 'Bill of Materials'}
        saving={saving}
        action={onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-carbon/[0.04] text-carbon/70 hover:bg-carbon/[0.08] text-[11px] font-semibold tracking-[-0.01em] disabled:opacity-50 transition-colors"
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} /> : <Sparkles className="h-3 w-3" strokeWidth={2.5} />}
            {generating ? (tp.generating || 'Generating…') : (tp.generateWithAI || 'Generate with AI')}
          </button>
        )}
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-carbon/[0.08]">
              {cols.map(c => (
                <th key={c.key} className={`py-2 px-2 text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 ${c.widthClass}`}>{c.label}</th>
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
                  <button type="button" onClick={() => remove(i)} className="text-carbon/25 hover:text-error transition-colors">
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

/* ── Factory notes ───────────────────────────────────────────────── */
function FactoryNotes({ value, onChange, saving, tp }: {
  value: string;
  onChange: (v: string) => void;
  saving?: boolean;
  tp: Record<string, string>;
}) {
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

/* ── Comments thread (block-anchored + pin roll-up) ──────────────── */
function CommentsThread({
  skuId, blockComments, allComments,
  onAdd, onUpdate, onDelete, tp,
}: {
  skuId: string;
  blockComments: Comment[];
  allComments: Comment[];
  onAdd: (params: { block: CommentBlock; body: string }) => Promise<Comment | undefined>;
  onUpdate: (id: string, body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  tp: Record<string, string>;
}) {
  const [body, setBody] = useState('');
  const [block, setBlock] = useState<CommentBlock>('general');
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const pinCount = allComments.filter(c => c.drawing_slot).length;

  const post = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      await onAdd({ block, body: body.trim() });
      setBody('');
    } finally {
      setPosting(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId || !editBody.trim()) return;
    await onUpdate(editingId, editBody.trim());
    setEditingId(null);
    setEditBody('');
  };

  const BLOCKS: { id: CommentBlock; label: string }[] = [
    { id: 'general', label: tp.commentsBlockGeneral || 'General' },
    { id: 'header', label: tp.commentsBlockHeader || 'Header' },
    { id: 'drawings', label: tp.commentsBlockDrawings || 'Drawings' },
    { id: 'materials', label: tp.commentsBlockMaterials || 'Materials' },
    { id: 'measurements', label: tp.commentsBlockMeasurements || 'Measurements' },
    { id: 'bom', label: tp.commentsBlockBom || 'BOM' },
    { id: 'factory', label: tp.commentsBlockFactory || 'Factory' },
  ];

  // Keep skuId reference so lint doesn't mark it unused
  void skuId;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <MessageSquare className="h-4 w-4 text-carbon/50" strokeWidth={2} />
        <h2 className="text-[13px] tracking-[-0.01em] font-semibold text-carbon">
          {tp.commentsTitle || 'Comments'}
          <span className="text-carbon/40 font-normal ml-2">({blockComments.length})</span>
        </h2>
        {pinCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-carbon/[0.04] text-[11px] font-medium text-carbon/60">
            <MapPin className="h-3 w-3" strokeWidth={2} />
            {pinCount} {pinCount === 1 ? (tp.pinsSingular || 'pin') : (tp.pinsPlural || 'pins')}
          </span>
        )}
      </div>

      {blockComments.length > 0 && (
        <div className="space-y-3 mb-6">
          {blockComments.map(c => (
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
                    onClick={() => onDelete(c.id)}
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

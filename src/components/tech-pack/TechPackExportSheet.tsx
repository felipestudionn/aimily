/* ═══════════════════════════════════════════════════════════════════
   TechPackExportSheet — print-optimised, read-only render of the
   Tech Pack sheet for PDF export. Renders ALL sections at full size
   in a single scroll (Puppeteer paginates to A3 landscape). Pins
   render as numbered circles on the drawings.

   No interactive buttons, no top bar, no comments composer. The
   comments thread renders as a flat list.
   ═══════════════════════════════════════════════════════════════════ */

import type { SKU } from '@/hooks/useSkus';

interface Comment {
  id: string;
  block: string;
  body: string;
  author_name: string | null;
  drawing_slot: string | null;
  pin_x: number | null;
  pin_y: number | null;
  created_at: string;
}

interface TechPackData {
  header?: Record<string, string>;
  drawings?: {
    viewA?: string;
    viewB?: string;
    callouts?: { url: string; label: string }[];
  };
  materials?: { zones?: { name: string; pantone: string; supplier: string; swatchUrl: string; notes: string }[] };
  measurements?: { rows?: { point: string; xs: string; s: string; m: string; l: string; xl: string }[]; notes?: string };
  bom?: { lines?: { type: string; material: string; qty: string; unit: string; supplier: string; cost: string }[] };
  factory_notes?: Record<string, string>;
}

interface Props {
  collectionName: string;
  season: string;
  sku: SKU;
  data: TechPackData | null;
  comments: Comment[];
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso; }
}

export function TechPackExportSheet({ collectionName, season, sku, data, comments }: Props) {
  const drawings = data?.drawings || {};
  const urlA = drawings.viewA || sku.sketch_url;
  const urlB = drawings.viewB || sku.sketch_top_url;
  const isFootwear = sku.category === 'CALZADO';
  const labelA = isFootwear ? 'Side view' : 'Front view';
  const labelB = isFootwear ? 'Top-down view' : 'Back view';
  const callouts = drawings.callouts || [];

  const measurementRows = data?.measurements?.rows || [];
  const bomLines = data?.bom?.lines || [];
  const materialZones = data?.materials?.zones || [];
  const factoryBody = (data?.factory_notes?.body as string) || '';

  const typeLabel = sku.type === 'IMAGEN' ? 'Image' : sku.type === 'REVENUE' ? 'Revenue' : 'Entry';
  const categoryLabel = sku.category === 'CALZADO' ? 'Footwear' : sku.category === 'ROPA' ? 'Apparel' : 'Accessories';
  const headerFields = [
    { label: 'Style', value: sku.name },
    { label: 'Family', value: sku.family },
    { label: 'Category', value: categoryLabel },
    { label: 'Season', value: season || '—' },
    { label: 'Drop', value: `Drop ${sku.drop_number}` },
    { label: 'Segment', value: typeLabel },
    { label: 'PVP', value: `€${sku.pvp}` },
    { label: 'COGS', value: `€${sku.cost}` },
  ];

  /* Pins grouped by drawing slot for numbering */
  const pinsBySlot: Record<string, (Comment & { pinNumber: number })[]> = {};
  for (const c of comments) {
    if (c.drawing_slot && c.pin_x !== null && c.pin_y !== null) {
      const slot = c.drawing_slot;
      if (!pinsBySlot[slot]) pinsBySlot[slot] = [];
      pinsBySlot[slot].push({ ...c, pinNumber: pinsBySlot[slot].length + 1 });
    }
  }
  const blockComments = comments.filter(c => !c.drawing_slot);

  return (
    <div
      style={{
        background: '#ffffff',
        color: '#111111',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        padding: '40px 48px',
        width: '100%',
        minHeight: '100vh',
      }}
    >
      <style>{`
        @page { size: A3 landscape; margin: 0; }
        .tp-section { page-break-inside: avoid; margin-top: 40px; border-top: 1px solid #e5e5e5; padding-top: 32px; }
        .tp-eyebrow { font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; font-weight: 700; color: #666; }
        .tp-grid { display: grid; gap: 16px; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <p className="tp-eyebrow" style={{ margin: 0, marginBottom: 6 }}>Tech pack · {collectionName}</p>
          <h1 style={{ margin: 0, fontSize: 44, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            {sku.name}
          </h1>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: 999, background: '#f0f0ef', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#444' }}>
          v1.0
        </div>
      </div>
      <div className="tp-grid" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
        {headerFields.map(f => (
          <div key={f.label}>
            <p className="tp-eyebrow" style={{ margin: 0, marginBottom: 4 }}>{f.label}</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>{f.value}</p>
          </div>
        ))}
      </div>

      {/* Technical Drawings */}
      <div className="tp-section">
        <p className="tp-eyebrow">Technical drawings</p>
        <p style={{ fontSize: 12, color: '#777', margin: '6px 0 18px 0' }}>
          {isFootwear
            ? 'Side and top-down views — pin-annotated for factory execution.'
            : 'Front and back views — pin-annotated for factory execution.'}
        </p>
        <div className="tp-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <DrawingSlot url={urlA} label={labelA} pins={pinsBySlot.viewA || []} />
          <DrawingSlot url={urlB} label={labelB} pins={pinsBySlot.viewB || []} />
        </div>

        {/* Pin legend */}
        {(pinsBySlot.viewA?.length || pinsBySlot.viewB?.length) ? (
          <div style={{ marginTop: 20 }}>
            <p className="tp-eyebrow" style={{ marginBottom: 8 }}>Pin notes</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([['viewA', labelA], ['viewB', labelB]] as [string, string][]).map(([slot, slotLabel]) => (
                <div key={slot}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6 }}>{slotLabel}</p>
                  {(pinsBySlot[slot] || []).length === 0 ? (
                    <p style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic' }}>No pins.</p>
                  ) : (
                    <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                      {(pinsBySlot[slot] || []).map(p => (
                        <li key={p.id} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, lineHeight: 1.4 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: 20, height: 20, borderRadius: '50%',
                            background: '#111', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
                          }}>{p.pinNumber}</span>
                          <span style={{ color: '#333' }}>{p.body}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {callouts.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p className="tp-eyebrow" style={{ marginBottom: 8 }}>Construction callouts</p>
            <div className="tp-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {callouts.map((c, i) => (
                <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #eee' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.url} alt={c.label || 'callout'} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '6px 10px', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#666', borderTop: '1px solid #eee', background: '#fafafa' }}>
                    {c.label || `Detail ${i + 1}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Material swatches */}
      {materialZones.length > 0 && (
        <div className="tp-section">
          <p className="tp-eyebrow">Material swatches</p>
          <div className="tp-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 12 }}>
            {materialZones.map((z, i) => (
              <div key={i} style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '5 / 4', background: '#fafafa', position: 'relative' }}>
                  {z.swatchUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={z.swatchUrl} alt={z.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ padding: 10, fontSize: 11 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{z.name || `Zone ${i + 1}`}</div>
                  {z.pantone && <div style={{ fontFamily: 'monospace', color: '#555' }}>{z.pantone}</div>}
                  {z.supplier && <div style={{ color: '#777' }}>{z.supplier}</div>}
                  {z.notes && <div style={{ color: '#999', marginTop: 4 }}>{z.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Measurements */}
      {measurementRows.length > 0 && (
        <div className="tp-section">
          <p className="tp-eyebrow">Measurements</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Point</th>
                {['XS', 'S', 'M', 'L', 'XL'].map(s => (
                  <th key={s} style={{ textAlign: 'center', padding: 8, fontSize: 10, letterSpacing: '0.15em', color: '#666', fontWeight: 700 }}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {measurementRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 500 }}>{r.point}</td>
                  {(['xs', 's', 'm', 'l', 'xl'] as const).map(k => (
                    <td key={k} style={{ padding: 8, fontSize: 13, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{r[k]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data?.measurements?.notes && (
            <p style={{ fontSize: 12, color: '#555', marginTop: 10 }}>{data.measurements.notes}</p>
          )}
        </div>
      )}

      {/* BOM */}
      {bomLines.length > 0 && (
        <div className="tp-section">
          <p className="tp-eyebrow">Bill of Materials</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                {['Type', 'Material', 'Qty', 'Unit', 'Supplier', 'Cost'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: 8, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bomLines.map((line, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  {(['type', 'material', 'qty', 'unit', 'supplier', 'cost'] as const).map(k => (
                    <td key={k} style={{ padding: 8, fontSize: 12 }}>{line[k] || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Factory notes */}
      {factoryBody && (
        <div className="tp-section">
          <p className="tp-eyebrow">Factory notes</p>
          <p style={{ fontSize: 13, color: '#333', lineHeight: 1.6, marginTop: 10, whiteSpace: 'pre-wrap' }}>{factoryBody}</p>
        </div>
      )}

      {/* Block comments */}
      {blockComments.length > 0 && (
        <div className="tp-section">
          <p className="tp-eyebrow">Comments</p>
          <div style={{ marginTop: 10 }}>
            {blockComments.map(c => (
              <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: '#333' }}>{c.author_name || 'user'}</span>
                  {' · '}{fmtDate(c.created_at)}
                  {' · '}<span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 9, fontWeight: 700 }}>{c.block}</span>
                </div>
                <p style={{ fontSize: 13, color: '#222', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DrawingSlot({ url, label, pins }: { url?: string; label: string; pins: (Comment & { pinNumber: number })[] }) {
  return (
    <div style={{ position: 'relative', aspectRatio: '4 / 5', background: '#fdfdfc', border: '1px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: 24 }} />
          {pins.map(p => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.pin_x}%`, top: `${p.pin_y}%`,
                transform: 'translate(-50%, -50%)',
                width: 22, height: 22, borderRadius: '50%',
                background: '#111', color: '#fff',
                border: '2px solid #fff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, fontFamily: 'system-ui',
              }}
            >
              {p.pinNumber}
            </div>
          ))}
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          No drawing
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 12px', background: 'rgba(255,255,255,0.95)', borderTop: '1px solid #eee', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, color: '#555' }}>
        {label}
      </div>
    </div>
  );
}

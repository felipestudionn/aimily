'use client';

/**
 * Phase 6/7 — Artworks Library page.
 *
 * Grid of all artworks the user has uploaded (graphics, AOP repeats,
 * placement prints, embroidery concepts). Add/edit/delete in a single
 * modal. Designers attach artworks to SKUs from the Tech Pack (in the
 * Materials panel — wired in a follow-up task).
 */

import { useEffect, useState } from 'react';
import { Loader2, Plus, X, Trash2, Image as ImageIcon } from 'lucide-react';

type ArtworkType = 'graphic' | 'aop_repeat' | 'placement' | 'embroidery_concept';

interface Artwork {
  id: string;
  name: string;
  artwork_type: ArtworkType;
  preview_url: string | null;
  source_file_url: string | null;
  scale_min_cm: number | null;
  scale_max_cm: number | null;
  aspect_ratio: string | null;
  thread_palette: string[];
  tags: string[];
  notes: string | null;
  created_at: string;
}

const TYPE_LABEL: Record<ArtworkType, string> = {
  graphic: 'Graphic',
  aop_repeat: 'AOP Repeat',
  placement: 'Placement',
  embroidery_concept: 'Embroidery',
};

const TYPE_FILTERS: Array<{ value: ArtworkType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'graphic', label: 'Graphics' },
  { value: 'aop_repeat', label: 'AOP repeats' },
  { value: 'placement', label: 'Placements' },
  { value: 'embroidery_concept', label: 'Embroidery' },
];

export default function ArtworksLibraryPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ArtworkType | 'all'>('all');
  const [editing, setEditing] = useState<Artwork | 'new' | null>(null);

  async function reload() {
    setLoading(true);
    const res = await fetch('/api/artworks');
    if (res.ok) {
      const j = (await res.json()) as { artworks: Artwork[] };
      setArtworks(j.artworks);
    }
    setLoading(false);
  }
  useEffect(() => {
    reload();
  }, []);

  const filtered = filter === 'all' ? artworks : artworks.filter((a) => a.artwork_type === filter);

  return (
    <div className="min-h-screen bg-shade">
      <header className="bg-white border-b border-carbon/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/40">Library</p>
            <h1 className="text-[28px] font-semibold text-carbon tracking-[-0.02em] mt-0.5">Artworks</h1>
            <p className="text-[12px] text-carbon/55 mt-1">
              Graphics, AOP repeats, placement prints, and embroidery concepts. Reusable across collections.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold hover:bg-carbon/90"
          >
            <Plus className="h-4 w-4" /> New artwork
          </button>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-4 flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-[-0.01em] transition-colors ${
                filter === f.value ? 'bg-carbon text-white' : 'bg-white border border-carbon/[0.08] text-carbon/65 hover:border-carbon/20'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex items-center gap-2 text-carbon/50 text-[13px]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <ImageIcon className="h-10 w-10 mx-auto text-carbon/20 mb-3" />
            <p className="text-[14px] text-carbon/55">No artworks yet. Upload your first.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setEditing(a)}
              className="group bg-white rounded-[16px] overflow-hidden border border-carbon/[0.06] hover:border-carbon/15 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all text-left"
            >
              <div className="aspect-square bg-carbon/[0.04] relative overflow-hidden">
                {a.preview_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.preview_url} alt={a.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-carbon/30">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-carbon/40 font-semibold mb-1">
                  {TYPE_LABEL[a.artwork_type]}
                </p>
                <h3 className="text-[14px] font-semibold text-carbon tracking-[-0.01em] truncate">{a.name}</h3>
                {a.tags.length > 0 && (
                  <p className="text-[11px] text-carbon/45 mt-1 truncate">{a.tags.slice(0, 3).join(' · ')}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </main>

      {editing && (
        <ArtworkEditor artwork={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
    </div>
  );
}

// ─── Editor ───────────────────────────────────────────────────────

function ArtworkEditor({ artwork, onClose, onSaved }: { artwork: Artwork | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(artwork?.name ?? '');
  const [type, setType] = useState<ArtworkType>(artwork?.artwork_type ?? 'graphic');
  const [previewUrl, setPreviewUrl] = useState(artwork?.preview_url ?? '');
  const [sourceFileUrl, setSourceFileUrl] = useState(artwork?.source_file_url ?? '');
  const [scaleMin, setScaleMin] = useState<string>(artwork?.scale_min_cm?.toString() ?? '');
  const [scaleMax, setScaleMax] = useState<string>(artwork?.scale_max_cm?.toString() ?? '');
  const [aspect, setAspect] = useState(artwork?.aspect_ratio ?? '');
  const [tags, setTags] = useState((artwork?.tags ?? []).join(', '));
  const [threads, setThreads] = useState((artwork?.thread_palette ?? []).join(', '));
  const [notes, setNotes] = useState(artwork?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setError('Name required');
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      name: name.trim(),
      artwork_type: type,
      preview_url: previewUrl.trim() || null,
      source_file_url: sourceFileUrl.trim() || null,
      scale_min_cm: scaleMin ? Number(scaleMin) : null,
      scale_max_cm: scaleMax ? Number(scaleMax) : null,
      aspect_ratio: aspect.trim() || null,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      thread_palette: threads.split(',').map((t) => t.trim()).filter(Boolean),
      notes: notes.trim() || null,
    };
    const res = artwork
      ? await fetch(`/api/artworks/${artwork.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/artworks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? 'Save failed');
      return;
    }
    onSaved();
    onClose();
  }

  async function remove() {
    if (!artwork) return;
    if (!window.confirm(`Delete "${artwork.name}"?`)) return;
    setBusy(true);
    await fetch(`/api/artworks/${artwork.id}`, { method: 'DELETE' });
    setBusy(false);
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/30 backdrop-blur-[2px] px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-shade rounded-[16px] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
        <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-carbon/[0.06]">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/40">Artwork</p>
            <h2 className="text-[20px] font-semibold text-carbon mt-0.5">{artwork ? 'Edit' : 'New artwork'}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-carbon/[0.05] text-carbon/60" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <div className="px-3 py-2 rounded-[10px] bg-red-50 text-red-700 text-[12px]">{error}</div>}

          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" />
          </Field>

          <Field label="Type">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TYPE_LABEL) as ArtworkType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-[-0.01em] transition-colors ${
                    type === t ? 'bg-carbon text-white' : 'bg-white border border-carbon/[0.08] text-carbon/65 hover:border-carbon/20'
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Preview URL"><input value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>
          <Field label="Source file URL"><input value={sourceFileUrl} onChange={(e) => setSourceFileUrl(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Min size (cm)"><input type="number" step="0.1" value={scaleMin} onChange={(e) => setScaleMin(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>
            <Field label="Max size (cm)"><input type="number" step="0.1" value={scaleMax} onChange={(e) => setScaleMax(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>
            <Field label="Aspect"><input value={aspect} onChange={(e) => setAspect(e.target.value)} placeholder="e.g. 1:1" className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>
          </div>

          <Field label="Tags (comma-separated)"><input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>
          <Field label="Thread palette (comma-separated Pantone codes)"><input value={threads} onChange={(e) => setThreads(e.target.value)} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none" /></Field>
          <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 text-[13px] bg-white border border-carbon/[0.08] rounded-[10px] focus:border-carbon/25 focus:outline-none resize-none" /></Field>
        </div>

        <div className="px-6 py-4 border-t border-carbon/[0.06] flex items-center justify-between">
          {artwork ? (
            <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-[12px] font-semibold text-carbon/60 hover:bg-carbon/[0.04]">Cancel</button>
            <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-carbon text-white text-[12px] font-semibold disabled:opacity-60">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">{label}</label>
      {children}
    </div>
  );
}

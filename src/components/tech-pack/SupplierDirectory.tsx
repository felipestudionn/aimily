'use client';

/* ═══════════════════════════════════════════════════════════════════
   SupplierDirectory — user-scoped supplier address book.
   Header + search + Add → grid of supplier cards with inline edit.
   Built on the same gold-standard patterns as Creative / Merch.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Loader2, Search, Check, X, ArrowLeft, Building2 } from 'lucide-react';
import { useTranslation } from '@/i18n';

export interface Supplier {
  id: string;
  name: string;
  supplier_type: string | null;
  region: string | null;
  moq: number | null;
  lead_time_days: number | null;
  cost_note: string | null;
  certifications: string[];
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const SUPPLIER_TYPES = [
  'fabric', 'leather', 'trim', 'hardware', 'lining', 'thread', 'label', 'packaging', 'other',
];

const COMMON_CERTS = ['OEKO-TEX', 'GOTS', 'LWG', 'GRS', 'FSC', 'BLUESIGN', 'RCS'];

interface Props {
  collectionId: string;
  collectionName: string;
}

export function SupplierDirectory({ collectionId, collectionName }: Props) {
  const t = useTranslation();
  const tp = (t as unknown as { techPack?: Record<string, string> }).techPack || {};
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    const url = q.trim() ? `/api/suppliers?q=${encodeURIComponent(q.trim())}` : '/api/suppliers';
    const res = await fetch(url);
    const j = await res.json();
    setRows(j.suppliers ?? []);
    setLoading(false);
  }, [q]);

  useEffect(() => { load(); }, [load]);

  const create = async (patch: Partial<Supplier>) => {
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const j = await res.json();
    if (j.supplier) setRows(prev => [j.supplier, ...prev]);
    setNewDraft(false);
  };

  const update = async (id: string, patch: Partial<Supplier>) => {
    const res = await fetch('/api/suppliers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const j = await res.json();
    if (j.supplier) setRows(prev => prev.map(r => r.id === id ? j.supplier : r));
    setEditingId(null);
  };

  const remove = async (id: string) => {
    await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE' });
    setRows(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="min-h-[80vh]">
      <div className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16">
        {/* Header */}
        <div className="relative text-center mb-10">
          <Link
            href={`/collection/${collectionId}/product?phase=techpack`}
            className="absolute left-0 top-0 inline-flex items-center gap-2 text-carbon/50 hover:text-carbon transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[13px] font-medium tracking-[-0.01em]">{tp.backToTechPack || 'Back to Tech Pack'}</span>
          </Link>
          <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">{collectionName}</p>
          <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
            {tp.suppliersTitle || 'Suppliers'}
          </h1>
          <p className="text-[14px] text-carbon/45 mt-3 max-w-[640px] mx-auto leading-relaxed">
            {tp.suppliersIntro || 'Your fabric, leather, trim, hardware and packaging network. Build it once, reuse across every collection and BOM line.'}
          </p>
        </div>

        {/* Toolbar */}
        <div className="max-w-[1200px] mx-auto mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 max-w-[420px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-carbon/30" strokeWidth={2} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tp.searchSupplier || 'Search suppliers…'}
              className="w-full pl-9 pr-3 py-2.5 bg-white rounded-full text-[13px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20 border border-carbon/[0.06]"
            />
          </div>
          <button
            type="button"
            onClick={() => setNewDraft(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold hover:bg-carbon/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            {tp.addSupplier || 'Add supplier'}
          </button>
        </div>

        {/* List */}
        <div className="max-w-[1200px] mx-auto">
          {loading ? (
            <div className="text-[13px] text-carbon/40 text-center py-12 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              {tp.loading || 'Loading…'}
            </div>
          ) : rows.length === 0 && !newDraft ? (
            <div className="mx-auto max-w-[520px] text-center bg-white rounded-[20px] p-14 border border-carbon/[0.06]">
              <Building2 className="h-6 w-6 text-carbon/30 mx-auto mb-5" strokeWidth={1.5} />
              <h3 className="text-[22px] font-semibold text-carbon tracking-[-0.03em] mb-3">
                {tp.suppliersEmptyHeading || 'No suppliers yet'}
              </h3>
              <p className="text-[14px] text-carbon/50 leading-[1.6] mb-6">
                {tp.suppliersEmptyBody || 'Start by adding the first fabric, leather or trim supplier. Once saved, they show up as autocomplete options in every BOM line.'}
              </p>
              <button
                type="button"
                onClick={() => setNewDraft(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold hover:bg-carbon/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                {tp.addSupplier || 'Add supplier'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {newDraft && (
                <SupplierCard
                  supplier={{
                    id: 'new', name: '', supplier_type: null, region: null,
                    moq: null, lead_time_days: null, cost_note: null,
                    certifications: [], contact_email: null, contact_phone: null,
                    contact_name: null, website: null, notes: null,
                    created_at: '', updated_at: '',
                  }}
                  isNew
                  onSave={create}
                  onCancel={() => setNewDraft(false)}
                  onDelete={() => setNewDraft(false)}
                  tp={tp}
                />
              )}
              {rows.map(r => (
                <SupplierCard
                  key={r.id}
                  supplier={r}
                  isEditing={editingId === r.id}
                  onEdit={() => setEditingId(r.id)}
                  onSave={(patch) => update(r.id, patch)}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => remove(r.id)}
                  tp={tp}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Supplier card — read mode + edit mode in one component.
   ═══════════════════════════════════════════════════════════════════ */

function SupplierCard({ supplier, isEditing, isNew, onEdit, onSave, onCancel, onDelete, tp }: {
  supplier: Supplier;
  isEditing?: boolean;
  isNew?: boolean;
  onEdit?: () => void;
  onSave: (patch: Partial<Supplier>) => void;
  onCancel: () => void;
  onDelete: () => void;
  tp: Record<string, string>;
}) {
  const [draft, setDraft] = useState<Supplier>(supplier);

  const editing = !!isEditing || !!isNew;

  if (!editing) {
    return (
      <div className="bg-white rounded-[20px] p-6 border border-carbon/[0.06] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-[17px] font-semibold text-carbon tracking-[-0.01em] leading-tight">{supplier.name}</h3>
            {supplier.supplier_type && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-carbon/[0.04] text-[10px] font-semibold tracking-wide uppercase text-carbon/60 mt-1.5">
                {supplier.supplier_type}
              </span>
            )}
          </div>
          <button
            onClick={onEdit}
            className="text-[11px] text-carbon/40 hover:text-carbon transition-colors"
          >
            {tp.edit || 'Edit'}
          </button>
        </div>

        {supplier.region && (
          <p className="text-[13px] text-carbon/55 mt-2">{supplier.region}</p>
        )}

        <div className="grid grid-cols-3 gap-3 mt-4">
          {supplier.moq != null && (
            <Stat label={tp.moq || 'MOQ'} value={`${supplier.moq}`} />
          )}
          {supplier.lead_time_days != null && (
            <Stat label={tp.leadTime || 'Lead'} value={`${supplier.lead_time_days}d`} />
          )}
          {supplier.cost_note && (
            <Stat label={tp.cost || 'Cost'} value={supplier.cost_note} />
          )}
        </div>

        {supplier.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {supplier.certifications.map(c => (
              <span key={c} className="inline-flex px-1.5 py-0.5 rounded-full bg-moss/10 text-[9px] font-semibold text-moss uppercase tracking-wide">
                {c}
              </span>
            ))}
          </div>
        )}

        {supplier.contact_name || supplier.contact_email || supplier.contact_phone ? (
          <div className="mt-4 pt-3 border-t border-carbon/[0.06] text-[11px] text-carbon/55 space-y-0.5">
            {supplier.contact_name && <p className="font-medium text-carbon/70">{supplier.contact_name}</p>}
            {supplier.contact_email && <p>{supplier.contact_email}</p>}
            {supplier.contact_phone && <p>{supplier.contact_phone}</p>}
          </div>
        ) : null}

        {supplier.notes && (
          <p className="mt-3 text-[11px] text-carbon/45 leading-[1.5] line-clamp-3">{supplier.notes}</p>
        )}
      </div>
    );
  }

  /* ── Edit mode ── */
  const toggleCert = (c: string) => {
    const has = draft.certifications.includes(c);
    setDraft({ ...draft, certifications: has ? draft.certifications.filter(x => x !== c) : [...draft.certifications, c] });
  };

  return (
    <div className="bg-white rounded-[20px] p-5 border-2 border-carbon/30 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
      <input
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        placeholder={tp.supplierNamePlaceholder || 'Supplier name'}
        autoFocus
        className="w-full bg-transparent text-[17px] font-semibold text-carbon focus:outline-none border-b border-carbon/[0.08] focus:border-carbon/30 pb-1 mb-3"
      />

      <div className="grid grid-cols-2 gap-2 mb-3">
        <select
          value={draft.supplier_type || ''}
          onChange={(e) => setDraft({ ...draft, supplier_type: e.target.value || null })}
          className="bg-carbon/[0.03] rounded-[8px] px-3 py-1.5 text-[12px] text-carbon focus:outline-none focus:ring-1 focus:ring-carbon/20"
        >
          <option value="">{tp.selectType || 'Type…'}</option>
          {SUPPLIER_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          value={draft.region || ''}
          onChange={(e) => setDraft({ ...draft, region: e.target.value || null })}
          placeholder={tp.regionPlaceholder || 'Region / country'}
          className="bg-carbon/[0.03] rounded-[8px] px-3 py-1.5 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <input
          type="number"
          value={draft.moq ?? ''}
          onChange={(e) => setDraft({ ...draft, moq: e.target.value ? Number(e.target.value) : null })}
          placeholder={tp.moq || 'MOQ'}
          className="bg-carbon/[0.03] rounded-[8px] px-3 py-1.5 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20"
        />
        <input
          type="number"
          value={draft.lead_time_days ?? ''}
          onChange={(e) => setDraft({ ...draft, lead_time_days: e.target.value ? Number(e.target.value) : null })}
          placeholder={tp.leadTimeDays || 'Lead (days)'}
          className="bg-carbon/[0.03] rounded-[8px] px-3 py-1.5 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20"
        />
        <input
          value={draft.cost_note || ''}
          onChange={(e) => setDraft({ ...draft, cost_note: e.target.value || null })}
          placeholder={tp.costNote || 'Cost range'}
          className="bg-carbon/[0.03] rounded-[8px] px-3 py-1.5 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20"
        />
      </div>

      <div className="mb-3">
        <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-1.5">
          {tp.certifications || 'Certifications'}
        </p>
        <div className="flex flex-wrap gap-1">
          {COMMON_CERTS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCert(c)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                draft.certifications.includes(c)
                  ? 'bg-moss text-white'
                  : 'bg-carbon/[0.04] text-carbon/50 hover:bg-carbon/[0.08]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <input
          value={draft.contact_name || ''}
          onChange={(e) => setDraft({ ...draft, contact_name: e.target.value || null })}
          placeholder={tp.contactName || 'Contact name'}
          className="w-full bg-carbon/[0.03] rounded-[8px] px-3 py-1.5 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={draft.contact_email || ''}
            onChange={(e) => setDraft({ ...draft, contact_email: e.target.value || null })}
            placeholder={tp.email || 'Email'}
            className="bg-carbon/[0.03] rounded-[8px] px-3 py-1.5 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20"
          />
          <input
            value={draft.contact_phone || ''}
            onChange={(e) => setDraft({ ...draft, contact_phone: e.target.value || null })}
            placeholder={tp.phone || 'Phone'}
            className="bg-carbon/[0.03] rounded-[8px] px-3 py-1.5 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20"
          />
        </div>
        <input
          value={draft.website || ''}
          onChange={(e) => setDraft({ ...draft, website: e.target.value || null })}
          placeholder={tp.website || 'Website'}
          className="w-full bg-carbon/[0.03] rounded-[8px] px-3 py-1.5 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20"
        />
      </div>

      <textarea
        value={draft.notes || ''}
        onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
        rows={2}
        placeholder={tp.notesPlaceholder || 'Notes…'}
        className="w-full bg-carbon/[0.03] rounded-[8px] px-3 py-2 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20 leading-[1.5] resize-none mb-3"
      />

      <div className="flex items-center justify-between">
        {!isNew && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 text-[11px] text-carbon/30 hover:text-error transition-colors"
          >
            <Trash2 className="h-3 w-3" strokeWidth={2} /> {tp.delete || 'Delete'}
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold text-carbon/60 hover:bg-carbon/[0.04] transition-colors"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
            {tp.cancel || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            disabled={!draft.name.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-carbon text-white text-[11px] font-semibold disabled:opacity-40 hover:bg-carbon/90 transition-colors"
          >
            <Check className="h-3 w-3" strokeWidth={2.5} />
            {tp.save || 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] tracking-[0.15em] uppercase font-semibold text-carbon/40">{label}</p>
      <p className="text-[13px] font-semibold text-carbon tabular-nums">{value}</p>
    </div>
  );
}

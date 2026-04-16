'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Loader2, Search, Check, X, ArrowLeft, Factory as FactoryIcon } from 'lucide-react';
import { useTranslation } from '@/i18n';

export interface Factory {
  id: string;
  name: string;
  region: string | null;
  specialties: string[];
  capacity_note: string | null;
  moq: number | null;
  lead_time_days: number | null;
  cost_note: string | null;
  past_collabs: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const COMMON_SPECIALTIES = [
  'footwear', 'knitwear', 'wovens', 'denim', 'leather goods', 'accessories', 'bags', 'outerwear',
];

interface Props { collectionId: string; collectionName: string }

export function FactoryDirectory({ collectionId, collectionName }: Props) {
  const t = useTranslation();
  const tp = (t as unknown as { techPack?: Record<string, string> }).techPack || {};
  const [rows, setRows] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const url = q.trim() ? `/api/factories?q=${encodeURIComponent(q.trim())}` : '/api/factories';
    const res = await fetch(url);
    const j = await res.json();
    setRows(j.factories ?? []);
    setLoading(false);
  }, [q]);

  useEffect(() => { load(); }, [load]);

  const create = async (patch: Partial<Factory>) => {
    const res = await fetch('/api/factories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const j = await res.json();
    if (j.factory) setRows(prev => [j.factory, ...prev]);
    setNewDraft(false);
  };

  const update = async (id: string, patch: Partial<Factory>) => {
    const res = await fetch('/api/factories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const j = await res.json();
    if (j.factory) setRows(prev => prev.map(r => r.id === id ? j.factory : r));
    setEditingId(null);
  };

  const remove = async (id: string) => {
    await fetch(`/api/factories?id=${id}`, { method: 'DELETE' });
    setRows(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="min-h-[80vh]">
      <div className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16">
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
            {tp.factoriesTitle || 'Factories'}
          </h1>
          <p className="text-[14px] text-carbon/45 mt-3 max-w-[640px] mx-auto leading-relaxed">
            {tp.factoriesIntro || 'Your production network — specialties, capacity, MOQ, lead times. Match the right factory to each SKU category.'}
          </p>
        </div>

        <div className="max-w-[1200px] mx-auto mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 max-w-[420px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-carbon/30" strokeWidth={2} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tp.searchFactory || 'Search factories…'}
              className="w-full pl-9 pr-3 py-2.5 bg-white rounded-full text-[13px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20 border border-carbon/[0.06]"
            />
          </div>
          <button
            type="button"
            onClick={() => setNewDraft(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold hover:bg-carbon/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            {tp.addFactory || 'Add factory'}
          </button>
        </div>

        <div className="max-w-[1200px] mx-auto">
          {loading ? (
            <div className="text-[13px] text-carbon/40 text-center py-12 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              {tp.loading || 'Loading…'}
            </div>
          ) : rows.length === 0 && !newDraft ? (
            <div className="mx-auto max-w-[520px] text-center bg-white rounded-[20px] p-14 border border-carbon/[0.06]">
              <FactoryIcon className="h-6 w-6 text-carbon/30 mx-auto mb-5" strokeWidth={1.5} />
              <h3 className="text-[22px] font-semibold text-carbon tracking-[-0.03em] mb-3">
                {tp.factoriesEmptyHeading || 'No factories yet'}
              </h3>
              <p className="text-[14px] text-carbon/50 leading-[1.6] mb-6">
                {tp.factoriesEmptyBody || 'Add the production partners you trust. Once saved, they show up for matching against SKU categories in every tech pack.'}
              </p>
              <button
                type="button"
                onClick={() => setNewDraft(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold hover:bg-carbon/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                {tp.addFactory || 'Add factory'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {newDraft && (
                <FactoryCard
                  factory={{
                    id: 'new', name: '', region: null, specialties: [],
                    capacity_note: null, moq: null, lead_time_days: null,
                    cost_note: null, past_collabs: null,
                    contact_email: null, contact_phone: null, contact_name: null,
                    website: null, notes: null, created_at: '', updated_at: '',
                  }}
                  isNew
                  onSave={create}
                  onCancel={() => setNewDraft(false)}
                  onDelete={() => setNewDraft(false)}
                  tp={tp}
                />
              )}
              {rows.map(r => (
                <FactoryCard
                  key={r.id}
                  factory={r}
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

function FactoryCard({ factory, isEditing, isNew, onEdit, onSave, onCancel, onDelete, tp }: {
  factory: Factory;
  isEditing?: boolean;
  isNew?: boolean;
  onEdit?: () => void;
  onSave: (patch: Partial<Factory>) => void;
  onCancel: () => void;
  onDelete: () => void;
  tp: Record<string, string>;
}) {
  const [draft, setDraft] = useState<Factory>(factory);
  const editing = !!isEditing || !!isNew;

  if (!editing) {
    return (
      <div className="bg-white rounded-[20px] p-6 border border-carbon/[0.06] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-[17px] font-semibold text-carbon tracking-[-0.01em] leading-tight">{factory.name}</h3>
            {factory.region && <p className="text-[12px] text-carbon/55 mt-1">{factory.region}</p>}
          </div>
          <button onClick={onEdit} className="text-[11px] text-carbon/40 hover:text-carbon transition-colors">
            {tp.edit || 'Edit'}
          </button>
        </div>

        {factory.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {factory.specialties.map(s => (
              <span key={s} className="inline-flex px-2 py-0.5 rounded-full bg-carbon/[0.04] text-[10px] font-semibold uppercase tracking-wide text-carbon/65">
                {s}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mt-4">
          {factory.moq != null && <Stat label={tp.moq || 'MOQ'} value={`${factory.moq}`} />}
          {factory.lead_time_days != null && <Stat label={tp.leadTime || 'Lead'} value={`${factory.lead_time_days}d`} />}
          {factory.cost_note && <Stat label={tp.cost || 'Cost'} value={factory.cost_note} />}
        </div>

        {factory.capacity_note && (
          <p className="mt-3 text-[11px] text-carbon/55">
            <span className="font-semibold text-carbon/70">{tp.capacity || 'Capacity'}:</span> {factory.capacity_note}
          </p>
        )}

        {factory.contact_name || factory.contact_email || factory.contact_phone ? (
          <div className="mt-4 pt-3 border-t border-carbon/[0.06] text-[11px] text-carbon/55 space-y-0.5">
            {factory.contact_name && <p className="font-medium text-carbon/70">{factory.contact_name}</p>}
            {factory.contact_email && <p>{factory.contact_email}</p>}
            {factory.contact_phone && <p>{factory.contact_phone}</p>}
          </div>
        ) : null}

        {factory.past_collabs && (
          <p className="mt-3 text-[11px] text-carbon/45 leading-[1.5] line-clamp-2">
            <span className="font-semibold text-carbon/60">{tp.pastCollabs || 'Past'}:</span> {factory.past_collabs}
          </p>
        )}
      </div>
    );
  }

  const toggleSpec = (s: string) => {
    const has = draft.specialties.includes(s);
    setDraft({ ...draft, specialties: has ? draft.specialties.filter(x => x !== s) : [...draft.specialties, s] });
  };

  return (
    <div className="bg-white rounded-[20px] p-5 border-2 border-carbon/30 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
      <input
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        placeholder={tp.factoryNamePlaceholder || 'Factory name'}
        autoFocus
        className="w-full bg-transparent text-[17px] font-semibold text-carbon focus:outline-none border-b border-carbon/[0.08] focus:border-carbon/30 pb-1 mb-3"
      />

      <input
        value={draft.region || ''}
        onChange={(e) => setDraft({ ...draft, region: e.target.value || null })}
        placeholder={tp.regionPlaceholder || 'Region / country'}
        className="w-full bg-carbon/[0.03] rounded-[8px] px-3 py-1.5 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20 mb-3"
      />

      <div className="mb-3">
        <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-1.5">
          {tp.specialties || 'Specialties'}
        </p>
        <div className="flex flex-wrap gap-1">
          {COMMON_SPECIALTIES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSpec(s)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                draft.specialties.includes(s)
                  ? 'bg-carbon text-white'
                  : 'bg-carbon/[0.04] text-carbon/50 hover:bg-carbon/[0.08]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <input
        value={draft.capacity_note || ''}
        onChange={(e) => setDraft({ ...draft, capacity_note: e.target.value || null })}
        placeholder={tp.capacityPlaceholder || 'Capacity (e.g. up to 5k units / month)'}
        className="w-full bg-carbon/[0.03] rounded-[8px] px-3 py-1.5 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20 mb-3"
      />

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
        value={draft.past_collabs || ''}
        onChange={(e) => setDraft({ ...draft, past_collabs: e.target.value || null })}
        rows={2}
        placeholder={tp.pastCollabsPlaceholder || 'Past collaborations…'}
        className="w-full bg-carbon/[0.03] rounded-[8px] px-3 py-2 text-[12px] text-carbon placeholder:text-carbon/30 focus:outline-none focus:ring-1 focus:ring-carbon/20 leading-[1.5] resize-none mb-2"
      />

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

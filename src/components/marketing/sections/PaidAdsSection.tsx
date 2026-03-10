'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  X,
  Trash2,
  DollarSign,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { AdCampaign, AdSet, ContentPlatform } from '@/types/marketing';
import { PLATFORMS, AD_OBJECTIVES } from '@/types/marketing';

interface Props {
  collectionId: string;
}

export function PaidAdsSection({ collectionId }: Props) {
  const storageKey = `paid-ads-${collectionId}`;
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPlatform, setFormPlatform] = useState<ContentPlatform>('instagram');
  const [formObjective, setFormObjective] = useState<string>(AD_OBJECTIVES[0]);
  const [formBudget, setFormBudget] = useState('');
  const [formCurrency, setFormCurrency] = useState('EUR');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formAdSets, setFormAdSets] = useState<AdSet[]>([]);
  const [formNotes, setFormNotes] = useState('');

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setCampaigns(JSON.parse(saved));
      } catch {
        setCampaigns([]);
      }
    }
  }, [storageKey]);

  // Save to localStorage
  useEffect(() => {
    if (campaigns.length > 0 || localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, JSON.stringify(campaigns));
    }
  }, [campaigns, storageKey]);

  const resetForm = () => {
    setFormName('');
    setFormPlatform('instagram');
    setFormObjective(AD_OBJECTIVES[0]);
    setFormBudget('');
    setFormCurrency('EUR');
    setFormStart('');
    setFormEnd('');
    setFormAdSets([]);
    setFormNotes('');
    setEditingIdx(null);
  };

  const openEdit = (idx: number) => {
    const c = campaigns[idx];
    setEditingIdx(idx);
    setFormName(c.name);
    setFormPlatform(c.platform);
    setFormObjective(c.objective);
    setFormBudget(c.budget.toString());
    setFormCurrency(c.currency);
    setFormStart(c.start_date);
    setFormEnd(c.end_date);
    setFormAdSets(c.ad_sets);
    setFormNotes(c.notes);
    setShowForm(true);
  };

  const addAdSet = () => {
    setFormAdSets((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', audience: '', budget_pct: 0, creatives: [] },
    ]);
  };

  const updateAdSet = (idx: number, updates: Partial<AdSet>) => {
    setFormAdSets((prev) => prev.map((s, i) => (i === idx ? { ...s, ...updates } : s)));
  };

  const removeAdSet = (idx: number) => {
    setFormAdSets((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!formName || !formBudget) return;

    const campaign: AdCampaign = {
      id: editingIdx !== null ? campaigns[editingIdx].id : crypto.randomUUID(),
      name: formName,
      platform: formPlatform,
      objective: formObjective,
      budget: parseFloat(formBudget),
      currency: formCurrency,
      start_date: formStart,
      end_date: formEnd,
      ad_sets: formAdSets,
      notes: formNotes,
    };

    if (editingIdx !== null) {
      setCampaigns((prev) => prev.map((c, i) => (i === editingIdx ? campaign : c)));
    } else {
      setCampaigns((prev) => [...prev, campaign]);
    }

    setShowForm(false);
    resetForm();
  };

  const deleteCampaign = (idx: number) => {
    setCampaigns((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const platformColor = (platform: ContentPlatform) =>
    PLATFORMS.find((p) => p.id === platform)?.color || '#666';

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-100 p-4 text-center">
          <Target className="h-5 w-5 mx-auto text-orange-500 mb-1" />
          <div className="text-xl font-bold text-gray-900">{campaigns.length}</div>
          <div className="text-xs text-gray-500">Campaigns</div>
        </div>
        <div className="bg-white border border-gray-100 p-4 text-center">
          <DollarSign className="h-5 w-5 mx-auto text-green-500 mb-1" />
          <div className="text-xl font-bold text-gray-900">
            {totalBudget.toLocaleString('en', { minimumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-gray-500">Total Budget</div>
        </div>
        <div className="bg-white border border-gray-100 p-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <div className="text-xl font-bold text-gray-900">
            {campaigns.reduce((sum, c) => sum + c.ad_sets.length, 0)}
          </div>
          <div className="text-xs text-gray-500">Ad Sets</div>
        </div>
      </div>

      {/* Add Campaign Button */}
      <div className="flex justify-end">
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Campaign
        </button>
      </div>

      {/* Campaign List */}
      {campaigns.length === 0 ? (
        <div className="bg-white border border-gray-100 p-8 text-center">
          <Target className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No campaigns planned yet</p>
          <p className="text-xs text-gray-300 mt-1">Plan your paid ad campaigns to promote your collection launch</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign, idx) => (
            <div key={campaign.id} className="bg-white border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-gray-900">{campaign.name}</h4>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: platformColor(campaign.platform) + '15',
                        color: platformColor(campaign.platform),
                      }}
                    >
                      {PLATFORMS.find((p) => p.id === campaign.platform)?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{campaign.objective}</span>
                    {campaign.start_date && campaign.end_date && (
                      <span>{campaign.start_date} — {campaign.end_date}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-green-600">
                    {campaign.currency} {campaign.budget.toLocaleString()}
                  </span>
                  <button
                    onClick={() => openEdit(idx)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCampaign(idx)}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Ad Sets */}
              {campaign.ad_sets.length > 0 && (
                <div className="border-t border-gray-50 pt-2 mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-2">Ad Sets</p>
                  <div className="space-y-1.5">
                    {campaign.ad_sets.map((adSet) => (
                      <div key={adSet.id} className="flex items-center gap-3 text-xs bg-gray-50 rounded-lg px-3 py-2">
                        <span className="font-medium text-gray-700 flex-1">{adSet.name || 'Unnamed'}</span>
                        <span className="text-gray-400">{adSet.audience}</span>
                        <span className="text-orange-600 font-medium">{adSet.budget_pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {campaign.notes && (
                <p className="text-xs text-gray-400 mt-2 border-t border-gray-50 pt-2">{campaign.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Campaign Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="bg-white w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {editingIdx !== null ? 'Edit Campaign' : 'New Campaign'}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. SS27 Launch — Instagram"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              {/* Platform + Objective */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
                  <select
                    value={formPlatform}
                    onChange={(e) => setFormPlatform(e.target.value as ContentPlatform)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Objective</label>
                  <select
                    value={formObjective}
                    onChange={(e) => setFormObjective(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    {AD_OBJECTIVES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Budget + Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Budget</label>
                  <input
                    type="number"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                    placeholder="1000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              </div>

              {/* Ad Sets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">Ad Sets</label>
                  <button
                    onClick={addAdSet}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    + Add Ad Set
                  </button>
                </div>
                {formAdSets.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No ad sets yet</p>
                ) : (
                  <div className="space-y-2">
                    {formAdSets.map((adSet, idx) => (
                      <div key={adSet.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={adSet.name}
                            onChange={(e) => updateAdSet(idx, { name: e.target.value })}
                            placeholder="Ad set name"
                            className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
                          />
                          <input
                            type="number"
                            value={adSet.budget_pct || ''}
                            onChange={(e) => updateAdSet(idx, { budget_pct: parseInt(e.target.value) || 0 })}
                            placeholder="%"
                            className="w-16 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
                          />
                          <button onClick={() => removeAdSet(idx)} className="p-0.5 text-gray-400 hover:text-red-500">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={adSet.audience}
                          onChange={(e) => updateAdSet(idx, { audience: e.target.value })}
                          placeholder="Target audience description"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Campaign notes..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formName || !formBudget}
                  className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {editingIdx !== null ? 'Update' : 'Add Campaign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

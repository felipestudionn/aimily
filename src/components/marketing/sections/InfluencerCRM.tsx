'use client';

import { useState } from 'react';
import {
  Plus,
  X,
  Trash2,
  Edit3,
  Search,
  Users,
  ExternalLink,
  Package,
  Mail,
} from 'lucide-react';
import type {
  PrContact,
  ContactType,
  ContactStatus,
} from '@/types/marketing';
import {
  CONTACT_TYPES,
  CONTACT_STATUSES,
} from '@/types/marketing';

interface Props {
  contacts: PrContact[];
  collectionId: string;
  onAdd: (contact: Omit<PrContact, 'id' | 'created_at' | 'updated_at'>) => Promise<PrContact | null>;
  onUpdate: (id: string, updates: Partial<PrContact>) => Promise<PrContact | null>;
  onDelete: (id: string) => Promise<boolean>;
}

export function InfluencerCRM({ contacts, collectionId, onAdd, onUpdate, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ContactType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ContactStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<PrContact | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<ContactType>('influencer');
  const [formPlatform, setFormPlatform] = useState('');
  const [formHandle, setFormHandle] = useState('');
  const [formFollowers, setFormFollowers] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAgency, setFormAgency] = useState('');
  const [formRate, setFormRate] = useState('');
  const [formStatus, setFormStatus] = useState<ContactStatus>('prospect');
  const [formNotes, setFormNotes] = useState('');
  const [formTrackingNumber, setFormTrackingNumber] = useState('');

  const filtered = contacts.filter((c) => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.handle?.toLowerCase().includes(q) ||
        c.agency?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusCounts = CONTACT_STATUSES.map((s) => ({
    ...s,
    count: contacts.filter((c) => c.status === s.id).length,
  }));

  const resetForm = () => {
    setFormName('');
    setFormType('influencer');
    setFormPlatform('');
    setFormHandle('');
    setFormFollowers('');
    setFormEmail('');
    setFormPhone('');
    setFormAgency('');
    setFormRate('');
    setFormStatus('prospect');
    setFormNotes('');
    setFormTrackingNumber('');
    setEditingContact(null);
  };

  const openEditForm = (c: PrContact) => {
    setEditingContact(c);
    setFormName(c.name);
    setFormType(c.type);
    setFormPlatform(c.platform || '');
    setFormHandle(c.handle || '');
    setFormFollowers(c.followers?.toString() || '');
    setFormEmail(c.email || '');
    setFormPhone(c.phone || '');
    setFormAgency(c.agency || '');
    setFormRate(c.rate_range || '');
    setFormStatus(c.status);
    setFormNotes(c.notes || '');
    setFormTrackingNumber(c.tracking_number || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName) return;
    setSaving(true);

    const payload = {
      collection_plan_id: collectionId,
      name: formName,
      type: formType,
      platform: formPlatform || null,
      handle: formHandle || null,
      followers: formFollowers ? parseInt(formFollowers) : null,
      email: formEmail || null,
      phone: formPhone || null,
      agency: formAgency || null,
      rate_range: formRate || null,
      notes: formNotes || null,
      status: formStatus,
      outreach_date: null,
      ship_date: null,
      post_date: null,
      tracking_number: formTrackingNumber || null,
      post_url: null,
      performance: null,
    };

    if (editingContact) {
      await onUpdate(editingContact.id, payload);
    } else {
      await onAdd(payload);
    }

    setSaving(false);
    setShowForm(false);
    resetForm();
  };

  const formatFollowers = (n: number | null) => {
    if (!n) return '';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  const getStatusColor = (status: ContactStatus) =>
    CONTACT_STATUSES.find((s) => s.id === status)?.color || '#94A3B8';

  return (
    <div className="space-y-4">
      {/* Pipeline Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {statusCounts.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilterStatus(filterStatus === s.id ? 'all' : s.id)}
            className={`p-2 border text-center transition-colors ${
              filterStatus === s.id ? 'border-gray-300 bg-gray-50' : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="text-lg font-bold" style={{ color: s.color }}>{s.count}</div>
            <div className="text-[10px] text-gray-500 font-medium">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ContactType | 'all')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="all">All Types</option>
          {CONTACT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
          ))}
        </select>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white border border-gray-100 p-8 text-center">
            <Users className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No contacts found</p>
          </div>
        ) : (
          filtered.map((contact) => (
            <div
              key={contact.id}
              className="bg-white border border-gray-100 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {CONTACT_TYPES.find((t) => t.id === contact.type)?.emoji}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{contact.name}</h4>
                    {contact.handle && (
                      <p className="text-xs text-gray-400">@{contact.handle}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={contact.status}
                    onChange={(e) => onUpdate(contact.id, { status: e.target.value as ContactStatus })}
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border-0 cursor-pointer appearance-none"
                    style={{
                      backgroundColor: getStatusColor(contact.status) + '15',
                      color: getStatusColor(contact.status),
                    }}
                  >
                    {CONTACT_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
                {contact.platform && <span>{contact.platform}</span>}
                {contact.followers && (
                  <span className="font-medium text-gray-700">{formatFollowers(contact.followers)} followers</span>
                )}
                {contact.rate_range && <span>{contact.rate_range}</span>}
                {contact.agency && <span>via {contact.agency}</span>}
              </div>

              {contact.tracking_number && (
                <div className="flex items-center gap-1 text-xs text-purple-600 mb-2">
                  <Package className="h-3 w-3" />
                  <span>Tracking: {contact.tracking_number}</span>
                </div>
              )}

              {contact.post_url && (
                <a
                  href={contact.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline mb-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  View post
                </a>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditForm(contact)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(contact.id)}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="bg-white w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Name + Type */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contact name"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ContactType)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    {CONTACT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Platform + Handle + Followers */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
                  <input
                    type="text"
                    value={formPlatform}
                    onChange={(e) => setFormPlatform(e.target.value)}
                    placeholder="Instagram"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Handle</label>
                  <input
                    type="text"
                    value={formHandle}
                    onChange={(e) => setFormHandle(e.target.value)}
                    placeholder="@handle"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Followers</label>
                  <input
                    type="number"
                    value={formFollowers}
                    onChange={(e) => setFormFollowers(e.target.value)}
                    placeholder="10000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1 234 567 890"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              </div>

              {/* Agency + Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Agency</label>
                  <input
                    type="text"
                    value={formAgency}
                    onChange={(e) => setFormAgency(e.target.value)}
                    placeholder="Agency name"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rate Range</label>
                  <input
                    type="text"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    placeholder="$500-1000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              </div>

              {/* Status + Tracking */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ContactStatus)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    {CONTACT_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tracking #</label>
                  <input
                    type="text"
                    value={formTrackingNumber}
                    onChange={(e) => setFormTrackingNumber(e.target.value)}
                    placeholder="Shipping tracking"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Internal notes..."
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
                  disabled={!formName || saving}
                  className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingContact ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

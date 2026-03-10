'use client';

import { useState, useMemo } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  List,
  X,
  Trash2,
  Edit3,
} from 'lucide-react';
import type {
  ContentCalendarEntry,
  ContentType,
  ContentPlatform,
  ContentStatus,
} from '@/types/marketing';
import {
  CONTENT_TYPES,
  PLATFORMS,
  CONTENT_STATUSES,
} from '@/types/marketing';

interface Props {
  entries: ContentCalendarEntry[];
  collectionId: string;
  onAdd: (entry: Omit<ContentCalendarEntry, 'id' | 'created_at' | 'updated_at'>) => Promise<ContentCalendarEntry | null>;
  onUpdate: (id: string, updates: Partial<ContentCalendarEntry>) => Promise<ContentCalendarEntry | null>;
  onDelete: (id: string) => Promise<boolean>;
}

export function ContentCalendarSection({ entries, collectionId, onAdd, onUpdate, onDelete }: Props) {
  const [view, setView] = useState<'month' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ContentCalendarEntry | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ContentType>('post');
  const [formPlatform, setFormPlatform] = useState<ContentPlatform | ''>('instagram');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [formCampaign, setFormCampaign] = useState('');
  const [formStatus, setFormStatus] = useState<ContentStatus>('idea');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      days.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2;
      const y = month + 2 > 12 ? year + 1 : year;
      days.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false });
    }

    return days;
  }, [year, month]);

  const entriesByDate = useMemo(() => {
    const map: Record<string, ContentCalendarEntry[]> = {};
    entries.forEach((e) => {
      if (!map[e.scheduled_date]) map[e.scheduled_date] = [];
      map[e.scheduled_date].push(e);
    });
    return map;
  }, [entries]);

  // Unique campaigns
  const campaigns = useMemo(() => {
    const set = new Set(entries.map((e) => e.campaign).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [entries]);

  const resetForm = () => {
    setFormTitle('');
    setFormType('post');
    setFormPlatform('instagram');
    setFormDate('');
    setFormTime('');
    setFormCaption('');
    setFormCampaign('');
    setFormStatus('idea');
    setFormNotes('');
    setEditingEntry(null);
  };

  const openAddForm = (date?: string) => {
    resetForm();
    if (date) setFormDate(date);
    setShowForm(true);
  };

  const openEditForm = (entry: ContentCalendarEntry) => {
    setEditingEntry(entry);
    setFormTitle(entry.title);
    setFormType(entry.content_type);
    setFormPlatform(entry.platform || '');
    setFormDate(entry.scheduled_date);
    setFormTime(entry.scheduled_time || '');
    setFormCaption(entry.caption || '');
    setFormCampaign(entry.campaign || '');
    setFormStatus(entry.status);
    setFormNotes(entry.notes || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formTitle || !formDate) return;
    setSaving(true);

    const payload = {
      collection_plan_id: collectionId,
      title: formTitle,
      content_type: formType,
      platform: formPlatform || null,
      scheduled_date: formDate,
      scheduled_time: formTime || null,
      status: formStatus,
      caption: formCaption || null,
      hashtags: null,
      asset_urls: null,
      target_audience: null,
      campaign: formCampaign || null,
      performance: null,
      notes: formNotes || null,
    };

    if (editingEntry) {
      await onUpdate(editingEntry.id, payload);
    } else {
      await onAdd(payload);
    }

    setSaving(false);
    setShowForm(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await onDelete(id);
    if (selectedDay) {
      const remaining = (entriesByDate[selectedDay] || []).filter((e) => e.id !== id);
      if (remaining.length === 0) setSelectedDay(null);
    }
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date().toISOString().split('T')[0];

  const getStatusColor = (status: ContentStatus) =>
    CONTENT_STATUSES.find((s) => s.id === status)?.color || '#94A3B8';

  const getTypeEmoji = (type: ContentType) =>
    CONTENT_TYPES.find((t) => t.id === type)?.emoji || '';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'month' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Calendar className="h-4 w-4 inline mr-1" />
            Month
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'list' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <List className="h-4 w-4 inline mr-1" />
            List
          </button>
        </div>
        <button
          onClick={() => openAddForm()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Content
        </button>
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Month Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5 text-gray-500" />
            </button>
            <h3 className="font-semibold text-gray-900">{monthName}</h3>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100">
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map(({ date, day, isCurrentMonth }, i) => {
              const dayEntries = entriesByDate[date] || [];
              const isToday = date === today;
              return (
                <div
                  key={i}
                  className={`min-h-[90px] border-b border-r border-gray-50 p-1 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !isCurrentMonth ? 'opacity-40' : ''
                  }`}
                  onClick={() => {
                    if (dayEntries.length > 0) {
                      setSelectedDay(date);
                    } else {
                      openAddForm(date);
                    }
                  }}
                >
                  <div
                    className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-orange-500 text-white' : 'text-gray-600'
                    }`}
                  >
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEntries.slice(0, 3).map((entry) => (
                      <div
                        key={entry.id}
                        className="text-[10px] px-1 py-0.5 rounded truncate font-medium"
                        style={{
                          backgroundColor: getStatusColor(entry.status) + '20',
                          color: getStatusColor(entry.status),
                        }}
                        title={entry.title}
                      >
                        {getTypeEmoji(entry.content_type)} {entry.title}
                      </div>
                    ))}
                    {dayEntries.length > 3 && (
                      <div className="text-[10px] text-gray-400 pl-1">
                        +{dayEntries.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No content scheduled yet. Click &quot;Add Content&quot; to get started.
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="text-lg">{getTypeEmoji(entry.content_type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{entry.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{entry.scheduled_date}</span>
                    {entry.platform && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: (PLATFORMS.find((p) => p.id === entry.platform)?.color || '#666') + '15',
                          color: PLATFORMS.find((p) => p.id === entry.platform)?.color || '#666',
                        }}
                      >
                        {PLATFORMS.find((p) => p.id === entry.platform)?.label}
                      </span>
                    )}
                    {entry.campaign && (
                      <span className="text-xs text-gray-400">#{entry.campaign}</span>
                    )}
                  </div>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: getStatusColor(entry.status) + '15',
                    color: getStatusColor(entry.status),
                  }}
                >
                  {CONTENT_STATUSES.find((s) => s.id === entry.status)?.label}
                </span>
                <button
                  onClick={() => openEditForm(entry)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Day Detail Panel */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSelectedDay(null); openAddForm(selectedDay); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-orange-500"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {(entriesByDate[selectedDay] || []).map((entry) => (
                <div key={entry.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {getTypeEmoji(entry.content_type)} {entry.title}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setSelectedDay(null); openEditForm(entry); }} className="p-1 rounded hover:bg-white text-gray-400">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(entry.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {entry.caption && (
                    <p className="text-xs text-gray-500 line-clamp-2">{entry.caption}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: getStatusColor(entry.status) + '15', color: getStatusColor(entry.status) }}
                    >
                      {CONTENT_STATUSES.find((s) => s.id === entry.status)?.label}
                    </span>
                    {entry.platform && (
                      <span className="text-[10px] text-gray-400">
                        {PLATFORMS.find((p) => p.id === entry.platform)?.label}
                      </span>
                    )}
                    {entry.scheduled_time && (
                      <span className="text-[10px] text-gray-400">{entry.scheduled_time}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {editingEntry ? 'Edit Content' : 'Add Content'}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Launch teaser reel"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              {/* Type + Platform */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ContentType)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    {CONTENT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
                  <select
                    value={formPlatform}
                    onChange={(e) => setFormPlatform(e.target.value as ContentPlatform)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    <option value="">None</option>
                    {PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Time (optional)</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              </div>

              {/* Status + Campaign */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    {CONTENT_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Campaign</label>
                  <input
                    type="text"
                    value={formCampaign}
                    onChange={(e) => setFormCampaign(e.target.value)}
                    placeholder="e.g. teasing, launch_week"
                    list="campaigns-list"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  <datalist id="campaigns-list">
                    {campaigns.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Caption / Description</label>
                <textarea
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  rows={3}
                  placeholder="Write your caption or content description..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                />
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
                  disabled={!formTitle || !formDate || saving}
                  className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingEntry ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Summary */}
      {campaigns.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Campaigns</h3>
          <div className="flex flex-wrap gap-2">
            {campaigns.map((campaign) => {
              const count = entries.filter((e) => e.campaign === campaign).length;
              return (
                <span
                  key={campaign}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium"
                >
                  #{campaign}
                  <span className="bg-orange-200 text-orange-800 px-1.5 rounded-full text-[10px]">{count}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

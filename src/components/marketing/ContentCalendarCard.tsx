'use client';

import { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Filter,
  Eye,
  List,
  Grid3X3,
  X,
  Users,
  Mail,
  Clock,
  Edit3,
} from 'lucide-react';
import { useContentCalendar } from '@/hooks/useContentCalendar';
import { usePrContacts } from '@/hooks/usePrContacts';
import { useDrops, type Drop } from '@/hooks/useDrops';
import { useStories, type Story } from '@/hooks/useStories';
import { useCommercialActions } from '@/hooks/useCommercialActions';
import type {
  ContentCalendarEntry,
  ContentType,
  ContentPlatform,
  ContentStatus,
  PrContact,
  ContactType,
  ContactStatus,
} from '@/types/marketing';
import {
  CONTENT_TYPES,
  PLATFORMS,
  CONTENT_STATUSES,
  CONTACT_TYPES,
  CONTACT_STATUSES,
} from '@/types/marketing';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';

/* ── Constants ── */

type AiPill = 'libre' | 'asistido' | 'propuesta';

const AI_PILL_IDS: AiPill[] = ['libre', 'asistido', 'propuesta'];
const AI_PILL_LABEL_KEYS: Record<AiPill, 'pillManual' | 'pillAssisted' | 'pillAiProposal'> = {
  libre: 'pillManual', asistido: 'pillAssisted', propuesta: 'pillAiProposal',
};

type SubTab = 'calendar' | 'influencer';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500', tiktok: 'bg-black', email: 'bg-blue-500',
  website: 'bg-green-500', pinterest: 'bg-red-600', facebook: 'bg-blue-600', google_ads: 'bg-yellow-500',
};

const TYPE_COLORS: Record<string, string> = {
  post: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  story: 'bg-pink-100 text-pink-800 border-pink-300',
  reel: 'bg-purple-100 text-purple-800 border-purple-300',
  email: 'bg-blue-100 text-blue-800 border-blue-300',
  blog: 'bg-green-100 text-green-800 border-green-300',
  ad: 'bg-orange-100 text-orange-800 border-orange-300',
  pr: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

/* ── Props ── */

interface ContentCalendarCardProps {
  collectionPlanId: string;
}

/* ── Component ── */

export function ContentCalendarCard({ collectionPlanId }: ContentCalendarCardProps) {
  const t = useTranslation();
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [activePill, setActivePill] = useState<AiPill>('libre');
  const [subTab, setSubTab] = useState<SubTab>('calendar');
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  // Calendar navigation
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [storyFilter, setStoryFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Data hooks
  const { entries, addEntry, updateEntry, deleteEntry, loading: entriesLoading } = useContentCalendar(collectionPlanId);
  const { contacts, addContact, updateContact, deleteContact, loading: contactsLoading } = usePrContacts(collectionPlanId);
  const { drops, loading: dropsLoading } = useDrops(collectionPlanId);
  const { actions } = useCommercialActions(collectionPlanId);
  const { stories, loading: storiesLoading } = useStories(collectionPlanId);

  // AI state
  const [isGenerating, setIsGenerating] = useState(false);

  // Assisted mode
  const [assistedDirection, setAssistedDirection] = useState('');

  // Propuesta mode
  const [propuestaStartDate, setPropuestaStartDate] = useState('');
  const [propuestaEndDate, setPropuestaEndDate] = useState('');
  const [propuestaPlatforms, setPropuestaPlatforms] = useState('instagram,tiktok,email');

  // Add entry form
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '', content_type: 'post' as ContentType, platform: 'instagram' as ContentPlatform,
    scheduled_date: '', scheduled_time: '', caption: '', campaign: '', status: 'idea' as ContentStatus,
  });

  // Add contact form
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '', type: 'influencer' as ContactType, platform: '', handle: '',
    followers: 0, email: '', notes: '', status: 'prospect' as ContactStatus,
  });

  // Entry detail
  const [selectedEntry, setSelectedEntry] = useState<ContentCalendarEntry | null>(null);

  /* ── Derived data ── */

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (platformFilter !== 'ALL') {
      result = result.filter(e => e.platform === platformFilter);
    }
    if (typeFilter !== 'ALL') {
      result = result.filter(e => e.content_type === typeFilter);
    }
    if (storyFilter) {
      result = result.filter(e => e.campaign === storyFilter);
    }
    return result;
  }, [entries, platformFilter, typeFilter, storyFilter]);

  // Calendar grid data
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday=0
    const days: { date: Date; inMonth: boolean; entries: ContentCalendarEntry[] }[] = [];

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(calYear, calMonth, -i);
      days.push({ date: d, inMonth: false, entries: [] });
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(calYear, calMonth, d);
      const dateStr = date.toISOString().split('T')[0];
      const dayEntries = filteredEntries.filter(e => e.scheduled_date === dateStr);
      days.push({ date, inMonth: true, entries: dayEntries });
    }
    // Next month padding
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(calYear, calMonth + 1, i);
        days.push({ date: d, inMonth: false, entries: [] });
      }
    }
    return days;
  }, [calYear, calMonth, filteredEntries]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
    return counts;
  }, [entries]);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => { if (e.platform) counts[e.platform] = (counts[e.platform] || 0) + 1; });
    return counts;
  }, [entries]);

  /* ── Handlers ── */

  const handleAddEntry = async () => {
    if (!newEntry.title || !newEntry.scheduled_date) return;
    await addEntry({
      collection_plan_id: collectionPlanId,
      title: newEntry.title,
      content_type: newEntry.content_type,
      platform: newEntry.platform,
      scheduled_date: newEntry.scheduled_date,
      scheduled_time: newEntry.scheduled_time || null,
      status: newEntry.status,
      caption: newEntry.caption || null,
      hashtags: null,
      asset_urls: null,
      target_audience: null,
      campaign: newEntry.campaign || null,
      performance: null,
      notes: null,
    });
    setNewEntry({
      title: '', content_type: 'post', platform: 'instagram',
      scheduled_date: '', scheduled_time: '', caption: '', campaign: '', status: 'idea',
    });
    setShowAddEntry(false);
  };

  const handleAddContact = async () => {
    if (!newContact.name) return;
    await addContact({
      collection_plan_id: collectionPlanId,
      name: newContact.name,
      type: newContact.type,
      platform: newContact.platform || null,
      handle: newContact.handle || null,
      followers: newContact.followers || null,
      email: newContact.email || null,
      phone: null,
      agency: null,
      rate_range: null,
      notes: newContact.notes || null,
      status: newContact.status,
      outreach_date: null,
      ship_date: null,
      post_date: null,
      tracking_number: null,
      post_url: null,
      performance: null,
    });
    setNewContact({
      name: '', type: 'influencer', platform: '', handle: '',
      followers: 0, email: '', notes: '', status: 'prospect',
    });
    setShowAddContact(false);
  };

  const handleStatusChange = async (entryId: string, newStatus: ContentStatus) => {
    await updateEntry(entryId, { status: newStatus });
  };

  const handleContactStatusChange = async (contactId: string, newStatus: ContactStatus) => {
    await updateContact(contactId, { status: newStatus });
  };

  const handleAiGenerate = async (mode: 'asistido' | 'propuesta') => {
    setIsGenerating(true);
    try {
      const body: Record<string, any> = {
        collectionPlanId,
        mode,
        drops: drops.map(d => ({
          name: d.name, launch_date: d.launch_date, story_alignment: d.story_name || '',
        })),
        commercialActions: actions.map(a => ({
          name: a.name, type: a.action_type, date: a.start_date,
        })),
        stories: stories.map(s => ({
          name: s.name, mood: (s.mood || []).join(', '),
        })),
        language,
      };

      if (mode === 'asistido') {
        body.userDirection = assistedDirection;
      } else {
        body.startDate = propuestaStartDate;
        body.endDate = propuestaEndDate;
        body.platforms = propuestaPlatforms;
      }

      const response = await fetch('/api/ai/content-calendar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Failed to generate calendar');
      const data = await response.json();

      // Apply generated entries
      if (data.calendar_entries?.length > 0) {
        for (const gen of data.calendar_entries) {
          await addEntry({
            collection_plan_id: collectionPlanId,
            title: gen.title || 'Untitled',
            content_type: gen.type || 'post',
            platform: gen.platform || 'instagram',
            scheduled_date: gen.date,
            scheduled_time: gen.time || null,
            status: 'idea',
            caption: gen.caption || null,
            hashtags: gen.hashtags || null,
            asset_urls: null,
            target_audience: null,
            campaign: gen.campaign_tag || gen.story_name || null,
            performance: null,
            notes: gen.asset_suggestion ? `Asset: ${gen.asset_suggestion}. Pillar: ${gen.pillar_alignment || ''}` : null,
          });
        }
      }
    } catch (error) {
      console.error('Error generating calendar:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  /* ── Card (collapsed) ── */
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="group relative bg-white p-10 lg:p-12 border border-carbon/[0.06] flex flex-col min-h-[340px] hover:shadow-lg transition-all duration-300 text-left w-full"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-carbon/[0.04] flex items-center justify-center flex-shrink-0">
            <Calendar className="h-5 w-5 text-carbon/40 group-hover:text-carbon/70 transition-colors" />
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25 mb-1">
              {t.marketingPage.contentCalendarLabel}
            </p>
            <h3 className="text-xl md:text-2xl font-light text-carbon tracking-tight leading-[1.15]">
              {t.marketingPage.contentCalendarTitle}
            </h3>
          </div>
        </div>
        <p className="text-sm font-light text-carbon/45 leading-relaxed flex-1">
          {t.marketingPage.contentCalendarDesc}
        </p>

        <div className="mt-6 pt-6 border-t border-carbon/[0.06]">
          {entriesLoading ? (
            <p className="text-xs text-carbon/30">{t.marketingPage.loading}</p>
          ) : entries.length === 0 && contacts.length === 0 ? (
            <p className="text-xs text-carbon/20 tracking-wide">{t.marketingPage.noContentYet}</p>
          ) : (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-light text-carbon">{entries.length}</span>
                <span className="text-xs text-carbon/40">{t.marketingPage.entries}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-light text-carbon">{contacts.length}</span>
                <span className="text-xs text-carbon/40">{t.marketingPage.prContacts}</span>
              </div>
              {Object.keys(platformCounts).length > 0 && (
                <div className="flex items-center gap-1.5">
                  {Object.entries(platformCounts).slice(0, 3).map(([p, count]) => (
                    <span key={p} className={`w-2 h-2 rounded-full ${PLATFORM_COLORS[p] || 'bg-gray-400'}`} title={`${p}: ${count}`} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 bg-carbon text-crema py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em] group-hover:bg-carbon/90 transition-colors">
          {t.marketingPage.open}
        </div>
      </button>
    );
  }

  /* ── Expanded (full-screen overlay) ── */
  return (
    <div className="fixed inset-0 z-50 bg-crema overflow-auto">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-crema/95 backdrop-blur border-b border-carbon/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1 text-xs font-medium tracking-[0.1em] uppercase text-carbon/50 hover:text-carbon transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              {t.marketingPage.back}
            </button>
            <div className="h-6 w-px bg-carbon/10" />
            <Calendar className="h-5 w-5 text-carbon/40" />
            <div>
              <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/25">
                {t.marketingPage.contentCalendarLabel}
              </p>
              <h2 className="text-lg font-light text-carbon tracking-tight">{t.marketingPage.contentCalendarTitle}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Sub-tab toggle */}
            <div className="flex border border-carbon/[0.08]">
              <button
                onClick={() => setSubTab('calendar')}
                className={`px-4 py-2 text-xs font-medium tracking-[0.08em] uppercase flex items-center gap-1.5 transition-colors ${
                  subTab === 'calendar' ? 'bg-carbon text-crema' : 'text-carbon/40 hover:text-carbon/60'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" /> {t.marketingPage.contentCalendarLabel}
              </button>
              <button
                onClick={() => setSubTab('influencer')}
                className={`px-4 py-2 text-xs font-medium tracking-[0.08em] uppercase flex items-center gap-1.5 transition-colors ${
                  subTab === 'influencer' ? 'bg-carbon text-crema' : 'text-carbon/40 hover:text-carbon/60'
                }`}
              >
                <Users className="h-3.5 w-3.5" /> {t.marketingPage.prContacts}
              </button>
            </div>
            {/* Stats */}
            <div className="text-right">
              <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30">{t.marketingPage.entries}</p>
              <p className="text-xl font-light text-carbon tracking-tight">{entries.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {subTab === 'calendar' ? (
          <>
            {/* ── AI Pills ── */}
            <div className="flex items-center gap-3">
              {AI_PILL_IDS.map(pillId => (
                <button
                  key={pillId}
                  onClick={() => setActivePill(pillId)}
                  className={`px-4 py-2.5 text-xs font-medium tracking-[0.08em] uppercase border transition-all ${
                    activePill === pillId
                      ? 'bg-carbon text-crema border-carbon'
                      : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {pillId !== 'libre' && <Sparkles className="h-3 w-3" />}
                    {t.marketingPage[AI_PILL_LABEL_KEYS[pillId]]}
                  </span>
                </button>
              ))}
            </div>

            {/* ── Assisted config panel ── */}
            {activePill === 'asistido' && (
              <div className="bg-white border border-carbon/[0.06] p-6 space-y-4">
                <div>
                  <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40 mb-1">{t.marketingPage.assistedMode}</p>
                  <p className="text-sm font-light text-carbon/50">{t.marketingPage.assistedModeDesc}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label className="text-xs">{t.marketingPage.directionOptional}</Label>
                    <Input
                      value={assistedDirection}
                      onChange={e => setAssistedDirection(e.target.value)}
                      placeholder="e.g. Focus on Instagram reels for Gen Z, heavy teasing phase"
                      className="h-9"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => handleAiGenerate('asistido')}
                      disabled={isGenerating || drops.length === 0}
                      className="bg-carbon hover:bg-carbon/90 rounded-none text-[11px] font-medium tracking-[0.08em] uppercase"
                    >
                      {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.marketingPage.generating}</> : <><Sparkles className="h-4 w-4 mr-2" />{t.marketingPage.generate}</>}
                    </Button>
                  </div>
                </div>
                {drops.length === 0 && (
                  <p className="text-xs text-amber-600">You need at least one drop in Go-to-Market to use assisted mode.</p>
                )}
              </div>
            )}

            {/* ── Propuesta config panel ── */}
            {activePill === 'propuesta' && (
              <div className="bg-white border border-carbon/[0.06] p-6 space-y-4">
                <div>
                  <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40 mb-1">{t.marketingPage.pillAiProposal}</p>
                  <p className="text-sm font-light text-carbon/50">{t.marketingPage.propuestaDesc}</p>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs">{t.marketingPage.startDate}</Label>
                    <Input type="date" value={propuestaStartDate} onChange={e => setPropuestaStartDate(e.target.value)} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">{t.marketingPage.endDate}</Label>
                    <Input type="date" value={propuestaEndDate} onChange={e => setPropuestaEndDate(e.target.value)} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">{t.marketingPage.platforms}</Label>
                    <Input value={propuestaPlatforms} onChange={e => setPropuestaPlatforms(e.target.value)} placeholder="instagram,tiktok,email" className="h-9" />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => handleAiGenerate('propuesta')}
                      disabled={isGenerating || !propuestaStartDate || !propuestaEndDate}
                      className="bg-carbon hover:bg-carbon/90 rounded-none text-[11px] font-medium tracking-[0.08em] uppercase"
                    >
                      {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.marketingPage.generating}</> : <><Sparkles className="h-4 w-4 mr-2" />{t.marketingPage.fullPlan}</>}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Filters ── */}
            <div className="flex items-center gap-6 flex-wrap">
              {/* Platform filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-carbon/30" />
                <span className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.platform}:</span>
                <button
                  onClick={() => setPlatformFilter('ALL')}
                  className={`px-3 py-1.5 text-xs border transition-colors ${platformFilter === 'ALL' ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
                >
                  {t.marketingPage.all}
                </button>
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPlatformFilter(p.id)}
                    className={`px-3 py-1.5 text-xs border transition-colors ${platformFilter === p.id ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="h-5 w-px bg-carbon/10" />

              {/* Story filter */}
              {stories.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.story}:</span>
                  <button
                    onClick={() => setStoryFilter(null)}
                    className={`px-3 py-1.5 text-xs border transition-colors ${!storyFilter ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
                  >
                    {t.marketingPage.all}
                  </button>
                  {stories.map(story => (
                    <button
                      key={story.id}
                      onClick={() => setStoryFilter(story.name)}
                      className={`px-3 py-1.5 text-xs border transition-colors ${storyFilter === story.name ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
                    >
                      {story.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="h-5 w-px bg-carbon/10" />

              {/* Type filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.contentType}:</span>
                <button
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-3 py-1.5 text-xs border transition-colors ${typeFilter === 'ALL' ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
                >
                  {t.marketingPage.all}
                </button>
                {CONTENT_TYPES.map(ct => (
                  <button
                    key={ct.id}
                    onClick={() => setTypeFilter(ct.id)}
                    className={`px-3 py-1.5 text-xs border transition-colors ${typeFilter === ct.id ? 'bg-carbon text-crema border-carbon' : 'bg-white text-carbon/50 border-carbon/[0.08] hover:border-carbon/20'}`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setViewMode('month')}
                  className={`p-2 border transition-colors ${viewMode === 'month' ? 'bg-carbon text-crema border-carbon' : 'text-carbon/40 border-carbon/[0.08] hover:border-carbon/20'}`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 border transition-colors ${viewMode === 'list' ? 'bg-carbon text-crema border-carbon' : 'text-carbon/40 border-carbon/[0.08] hover:border-carbon/20'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Status Overview ── */}
            <div className="grid grid-cols-6 gap-3">
              {CONTENT_STATUSES.map(s => (
                <div key={s.id} className="bg-white border border-carbon/[0.06] p-4 text-center">
                  <p className="text-2xl font-light text-carbon">{statusCounts[s.id] || 0}</p>
                  <p className="text-[10px] font-medium tracking-[0.15em] uppercase mt-1" style={{ color: s.color }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* ── Add entry button ── */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddEntry(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-carbon text-crema text-[11px] font-medium tracking-[0.08em] uppercase hover:bg-carbon/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t.marketingPage.addEntry}
              </button>
            </div>

            {/* ── Add entry form ── */}
            {showAddEntry && (
              <div className="bg-white border border-carbon/[0.06] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.newEntry}</p>
                  <button onClick={() => setShowAddEntry(false)} className="text-carbon/30 hover:text-carbon"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <Label className="text-xs">{t.marketingPage.title}</Label>
                    <Input value={newEntry.title} onChange={e => setNewEntry(p => ({ ...p, title: e.target.value }))} placeholder={t.marketingPage.title} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">{t.marketingPage.contentType}</Label>
                    <Select value={newEntry.content_type} onValueChange={(v: ContentType) => setNewEntry(p => ({ ...p, content_type: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t.marketingPage.platform}</Label>
                    <Select value={newEntry.platform} onValueChange={(v: ContentPlatform) => setNewEntry(p => ({ ...p, platform: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs">{t.marketingPage.scheduledDate}</Label>
                    <Input type="date" value={newEntry.scheduled_date} onChange={e => setNewEntry(p => ({ ...p, scheduled_date: e.target.value }))} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">{t.marketingPage.date}</Label>
                    <Input type="time" value={newEntry.scheduled_time} onChange={e => setNewEntry(p => ({ ...p, scheduled_time: e.target.value }))} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">{t.marketingPage.story}</Label>
                    <Input value={newEntry.campaign} onChange={e => setNewEntry(p => ({ ...p, campaign: e.target.value }))} placeholder="e.g. drop-1-teasing" className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">{t.marketingPage.status}</Label>
                    <Select value={newEntry.status} onValueChange={(v: ContentStatus) => setNewEntry(p => ({ ...p, status: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTENT_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">{t.marketingPage.caption}</Label>
                  <textarea
                    value={newEntry.caption}
                    onChange={e => setNewEntry(p => ({ ...p, caption: e.target.value }))}
                    placeholder="Write caption..."
                    className="w-full h-20 border border-carbon/[0.08] p-3 text-sm font-light resize-none focus:outline-none focus:border-carbon/20"
                  />
                </div>
                <Button onClick={handleAddEntry} disabled={!newEntry.title || !newEntry.scheduled_date} className="bg-carbon hover:bg-carbon/90 rounded-none text-[11px] font-medium tracking-[0.08em] uppercase">
                  <Plus className="h-4 w-4 mr-2" /> {t.common.create}
                </Button>
              </div>
            )}

            {/* ── Month Calendar View ── */}
            {viewMode === 'month' && (
              <div className="bg-white border border-carbon/[0.06]">
                {/* Month nav */}
                <div className="flex items-center justify-between p-4 border-b border-carbon/[0.06]">
                  <button onClick={prevMonth} className="p-2 hover:bg-carbon/[0.04] transition-colors">
                    <ChevronLeft className="h-5 w-5 text-carbon/40" />
                  </button>
                  <h3 className="text-lg font-light text-carbon tracking-tight">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </h3>
                  <button onClick={nextMonth} className="p-2 hover:bg-carbon/[0.04] transition-colors">
                    <ChevronRight className="h-5 w-5 text-carbon/40" />
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 border-b border-carbon/[0.06]">
                  {WEEKDAY_LABELS.map(d => (
                    <div key={d} className="p-2 text-center text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, i) => {
                    const isToday = day.date.toDateString() === new Date().toDateString();
                    // Check if a drop launches on this day
                    const dateStr = day.date.toISOString().split('T')[0];
                    const dropOnDay = drops.find(d => d.launch_date === dateStr);
                    return (
                      <div
                        key={i}
                        className={`min-h-[100px] p-2 border-b border-r border-carbon/[0.04] ${
                          day.inMonth ? '' : 'bg-carbon/[0.02]'
                        } ${isToday ? 'ring-1 ring-inset ring-carbon/20' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs ${day.inMonth ? 'text-carbon/60' : 'text-carbon/20'} ${isToday ? 'font-bold' : 'font-light'}`}>
                            {day.date.getDate()}
                          </span>
                          {dropOnDay && (
                            <span className="text-[8px] font-medium tracking-wider uppercase bg-orange-100 text-orange-700 px-1.5 py-0.5">
                              DROP
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {day.entries.slice(0, 3).map(entry => (
                            <button
                              key={entry.id}
                              onClick={() => setSelectedEntry(entry)}
                              className={`w-full text-left px-1.5 py-0.5 text-[10px] truncate border ${TYPE_COLORS[entry.content_type] || 'bg-gray-100 text-gray-800 border-gray-300'} hover:opacity-80 transition-opacity`}
                            >
                              <span className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PLATFORM_COLORS[entry.platform || ''] || 'bg-gray-400'}`} />
                                {entry.title}
                              </span>
                            </button>
                          ))}
                          {day.entries.length > 3 && (
                            <p className="text-[9px] text-carbon/30 pl-1">+{day.entries.length - 3} more</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── List View ── */}
            {viewMode === 'list' && (
              <div className="space-y-2">
                {filteredEntries.length === 0 ? (
                  <div className="bg-white border border-carbon/[0.06] p-12 text-center">
                    <Calendar className="h-8 w-8 text-carbon/20 mx-auto mb-3" />
                    <p className="text-sm font-light text-carbon/40">{t.marketingPage.noEntriesYet}</p>
                  </div>
                ) : (
                  filteredEntries.map(entry => {
                    const statusConfig = CONTENT_STATUSES.find(s => s.id === entry.status);
                    return (
                      <div
                        key={entry.id}
                        className="bg-white border border-carbon/[0.06] p-4 flex items-center gap-4 hover:shadow-sm transition-shadow group"
                      >
                        {/* Date */}
                        <div className="w-20 text-center flex-shrink-0">
                          <p className="text-lg font-light text-carbon">{new Date(entry.scheduled_date + 'T00:00').getDate()}</p>
                          <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30">
                            {MONTH_NAMES[new Date(entry.scheduled_date + 'T00:00').getMonth()]}
                          </p>
                          {entry.scheduled_time && (
                            <p className="text-[10px] text-carbon/40 mt-0.5 flex items-center justify-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> {entry.scheduled_time}
                            </p>
                          )}
                        </div>

                        <div className="h-12 w-px bg-carbon/[0.06]" />

                        {/* Platform dot + type badge */}
                        <div className="flex items-center gap-2 w-28 flex-shrink-0">
                          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${PLATFORM_COLORS[entry.platform || ''] || 'bg-gray-400'}`} />
                          <span className={`text-[10px] px-2 py-0.5 border ${TYPE_COLORS[entry.content_type] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                            {entry.content_type}
                          </span>
                        </div>

                        {/* Title & caption */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-carbon truncate">{entry.title}</p>
                          {entry.caption && (
                            <p className="text-xs font-light text-carbon/40 truncate mt-0.5">{entry.caption}</p>
                          )}
                          {entry.campaign && (
                            <p className="text-[10px] text-carbon/30 mt-0.5">#{entry.campaign}</p>
                          )}
                        </div>

                        {/* Status */}
                        <Select value={entry.status} onValueChange={(v: ContentStatus) => handleStatusChange(entry.id, v)}>
                          <SelectTrigger className="w-28 h-8 text-[10px]">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig?.color }} />
                              {statusConfig?.label}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {CONTENT_STATUSES.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                  {s.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setSelectedEntry(entry)} className="p-1.5 hover:bg-carbon/[0.04]">
                            <Eye className="h-3.5 w-3.5 text-carbon/40" />
                          </button>
                          <button onClick={() => deleteEntry(entry.id)} className="p-1.5 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Entry detail modal ── */}
            {selectedEntry && (
              <div className="fixed inset-0 z-[60] bg-black/20 flex items-center justify-center p-4" onClick={() => setSelectedEntry(null)}>
                <div className="bg-white w-full max-w-lg p-8 shadow-xl" onClick={e => e.stopPropagation()}>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-3 h-3 rounded-full ${PLATFORM_COLORS[selectedEntry.platform || ''] || 'bg-gray-400'}`} />
                        <span className={`text-[10px] px-2 py-0.5 border ${TYPE_COLORS[selectedEntry.content_type]}`}>
                          {selectedEntry.content_type}
                        </span>
                        <span className="text-[10px] text-carbon/30">
                          {selectedEntry.scheduled_date} {selectedEntry.scheduled_time || ''}
                        </span>
                      </div>
                      <h3 className="text-xl font-light text-carbon">{selectedEntry.title}</h3>
                    </div>
                    <button onClick={() => setSelectedEntry(null)} className="text-carbon/30 hover:text-carbon">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {selectedEntry.caption && (
                    <div className="mb-4">
                      <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-1">{t.marketingPage.caption}</p>
                      <p className="text-sm font-light text-carbon/70 whitespace-pre-wrap">{selectedEntry.caption}</p>
                    </div>
                  )}

                  {selectedEntry.hashtags && selectedEntry.hashtags.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-1">Hashtags</p>
                      <p className="text-xs text-blue-500">{selectedEntry.hashtags.map(h => `#${h}`).join(' ')}</p>
                    </div>
                  )}

                  {selectedEntry.campaign && (
                    <div className="mb-4">
                      <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-1">Campaign</p>
                      <p className="text-sm font-light text-carbon/60">{selectedEntry.campaign}</p>
                    </div>
                  )}

                  {selectedEntry.notes && (
                    <div className="mb-4">
                      <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-carbon/30 mb-1">Notes</p>
                      <p className="text-sm font-light text-carbon/60">{selectedEntry.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-4 border-t border-carbon/[0.06]">
                    <Select value={selectedEntry.status} onValueChange={(v: ContentStatus) => { handleStatusChange(selectedEntry.id, v); setSelectedEntry(prev => prev ? { ...prev, status: v } : null); }}>
                      <SelectTrigger className="w-36 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => { deleteEntry(selectedEntry.id); setSelectedEntry(null); }}
                      className="rounded-none text-[11px] font-medium tracking-[0.08em] uppercase text-red-500 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> {t.common.delete}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── Influencer & PR Sub-Tab ── */
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddContact(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-carbon text-crema text-[11px] font-medium tracking-[0.08em] uppercase hover:bg-carbon/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t.marketingPage.addContact}
              </button>
              <span className="text-xs text-carbon/30">{contacts.length} {t.marketingPage.prContacts}</span>
            </div>

            {/* Add contact form */}
            {showAddContact && (
              <div className="bg-white border border-carbon/[0.06] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium tracking-[0.15em] uppercase text-carbon/40">{t.marketingPage.newContact}</p>
                  <button onClick={() => setShowAddContact(false)} className="text-carbon/30 hover:text-carbon"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs">{t.marketingPage.name}</Label>
                    <Input value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">{t.marketingPage.contactType}</Label>
                    <Select value={newContact.type} onValueChange={(v: ContactType) => setNewContact(p => ({ ...p, type: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTACT_TYPES.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t.marketingPage.platform}</Label>
                    <Input value={newContact.platform} onChange={e => setNewContact(p => ({ ...p, platform: e.target.value }))} placeholder="Instagram" className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Handle</Label>
                    <Input value={newContact.handle} onChange={e => setNewContact(p => ({ ...p, handle: e.target.value }))} placeholder="@handle" className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs">Followers</Label>
                    <Input type="number" value={newContact.followers || ''} onChange={e => setNewContact(p => ({ ...p, followers: Number(e.target.value) }))} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input type="email" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} className="h-9" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Notes</Label>
                    <Input value={newContact.notes} onChange={e => setNewContact(p => ({ ...p, notes: e.target.value }))} className="h-9" />
                  </div>
                </div>
                <Button onClick={handleAddContact} disabled={!newContact.name} className="bg-carbon hover:bg-carbon/90 rounded-none text-[11px] font-medium tracking-[0.08em] uppercase">
                  <Plus className="h-4 w-4 mr-2" /> {t.common.create}
                </Button>
              </div>
            )}

            {/* Contacts table */}
            {contacts.length === 0 ? (
              <div className="bg-white border border-carbon/[0.06] p-12 text-center">
                <Users className="h-8 w-8 text-carbon/20 mx-auto mb-3" />
                <p className="text-sm font-light text-carbon/40">{t.marketingPage.noContactsYet}</p>
              </div>
            ) : (
              <div className="bg-white border border-carbon/[0.06] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-carbon/[0.06]">
                      <th className="text-left text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 p-3">{t.marketingPage.name}</th>
                      <th className="text-left text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 p-3">{t.marketingPage.type}</th>
                      <th className="text-left text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 p-3">{t.marketingPage.platform}</th>
                      <th className="text-left text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 p-3">Followers</th>
                      <th className="text-left text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 p-3">{t.marketingPage.status}</th>
                      <th className="text-left text-[10px] font-medium tracking-[0.2em] uppercase text-carbon/30 p-3">{t.marketingPage.date}</th>
                      <th className="p-3 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map(contact => {
                      const typeConfig = CONTACT_TYPES.find(ct => ct.id === contact.type);
                      const statusConfig = CONTACT_STATUSES.find(cs => cs.id === contact.status);
                      return (
                        <tr key={contact.id} className="border-b border-carbon/[0.04] hover:bg-carbon/[0.02] group">
                          <td className="p-3">
                            <p className="text-sm font-medium text-carbon">{contact.name}</p>
                            {contact.handle && <p className="text-xs text-carbon/40">{contact.handle}</p>}
                            {contact.email && <p className="text-xs text-carbon/30">{contact.email}</p>}
                          </td>
                          <td className="p-3">
                            <span className="text-xs text-carbon/50">{typeConfig?.emoji} {typeConfig?.label}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-xs text-carbon/50">{contact.platform || '—'}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-xs text-carbon/50">
                              {contact.followers ? `${(contact.followers / 1000).toFixed(1)}K` : '—'}
                            </span>
                          </td>
                          <td className="p-3">
                            <Select value={contact.status} onValueChange={(v: ContactStatus) => handleContactStatusChange(contact.id, v)}>
                              <SelectTrigger className="w-28 h-7 text-[10px]">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig?.color }} />
                                  {statusConfig?.label}
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                {CONTACT_STATUSES.map(cs => (
                                  <SelectItem key={cs.id} value={cs.id}>
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cs.color }} />
                                      {cs.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3">
                            <div className="text-[10px] text-carbon/40 space-y-0.5">
                              {contact.outreach_date && <p>Outreach: {contact.outreach_date}</p>}
                              {contact.ship_date && <p>Ship: {contact.ship_date}</p>}
                              {contact.post_date && <p>Post: {contact.post_date}</p>}
                              {!contact.outreach_date && !contact.ship_date && !contact.post_date && '—'}
                            </div>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => deleteContact(contact.id)}
                              className="p-1.5 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TIMELINE STRIP TEMPLATE — horizontal milestone timeline

   For slides where sequence matters: prototyping, production, gtm-
   launch. Roadmap-style horizontal line with milestone nodes.

   Layout: title header + narrative lead + horizontal timeline with
   5 nodes (date above · circle on axis · label below). Current
   position highlighted with the theme accent.
   ═══════════════════════════════════════════════════════════════════ */

import type { MicroBlockSlide, DeckMeta } from '@/lib/presentation/types';
import type { TimelineSlideData } from '@/lib/presentation/load-presentation-data';
import { EditableText } from '../EditableText';
import type { EditingContext } from '../SlideRenderer';

interface Props {
  slide: MicroBlockSlide;
  meta: DeckMeta;
  title: string;
  /* Real CIS timeline for this slide. When milestones are present,
     overrides the editorial placeholder. */
  data?: TimelineSlideData;
  /* F5.3: per-milestone label + lead editing when defined. */
  editing?: EditingContext;
}

interface Milestone {
  date: string;
  label: string;
  status: 'done' | 'current' | 'next';
}

const TIMELINE_PLACEHOLDERS: Record<string, { lead: string; milestones: Milestone[] }> = {
  prototyping: {
    lead: 'Five weeks from first white proto to production-ready pattern.',
    milestones: [
      { date: 'WK 28', label: 'White proto start', status: 'done' },
      { date: 'WK 29', label: 'Pattern development', status: 'done' },
      { date: 'WK 30', label: 'First delivery', status: 'current' },
      { date: 'WK 31', label: 'Rectifications', status: 'next' },
      { date: 'WK 32', label: 'Final proto', status: 'next' },
    ],
  },
  production: {
    lead: 'Ten weeks from production order to warehouse arrival.',
    milestones: [
      { date: 'WK 10', label: 'Production order', status: 'done' },
      { date: 'WK 8', label: 'Bulk fabric', status: 'done' },
      { date: 'WK 6', label: 'Cutting & sewing', status: 'current' },
      { date: 'WK 3', label: 'Quality control', status: 'next' },
      { date: 'WK 1', label: 'Warehouse in', status: 'next' },
    ],
  },
  'gtm-launch': {
    lead: 'Eight-week go-to-market runway before the public drop.',
    milestones: [
      { date: 'T-8', label: 'Teaser wave', status: 'done' },
      { date: 'T-4', label: 'Editor preview', status: 'done' },
      { date: 'T-2', label: 'Retailer loadout', status: 'current' },
      { date: 'T-1', label: 'Press embargo', status: 'next' },
      { date: 'T-0', label: 'Public launch', status: 'next' },
    ],
  },
};

const FALLBACK = {
  lead: 'Milestones populate from the Collection Intelligence System when the timeline is defined.',
  milestones: Array.from({ length: 5 }, (_, i) => ({
    date: `M${i + 1}`,
    label: '—',
    status: i < 2 ? 'done' as const : i === 2 ? 'current' as const : 'next' as const,
  })),
};

export function TimelineStripTemplate({ slide, meta, title, data: cisData, editing }: Props) {
  const placeholder = TIMELINE_PLACEHOLDERS[slide.id] ?? FALLBACK;
  const baseLead = cisData?.lead ?? placeholder.lead;
  const baseMilestones = (cisData?.milestones && cisData.milestones.length > 0)
    ? cisData.milestones
    : placeholder.milestones;
  /* Apply live drafts over CIS/placeholder for real-time typing. */
  const drafts = editing?.drafts ?? {};
  const validStatus = (s: string): s is Milestone['status'] =>
    s === 'done' || s === 'current' || s === 'next';
  const milestonesWithDrafts = baseMilestones.map((m, i) => {
    const labelDraft = drafts[`milestones.${i}.label`];
    const dateDraft = drafts[`milestones.${i}.date`];
    const statusDraft = drafts[`milestones.${i}.status`];
    return {
      ...m,
      label: labelDraft ?? m.label,
      date: dateDraft ?? m.date,
      status: validStatus(statusDraft ?? '') ? (statusDraft as Milestone['status']) : m.status,
    };
  });
  const data = {
    lead: drafts.lead ?? baseLead,
    milestones: milestonesWithDrafts,
  };
  const isLeadOverride = !!editing?.slideOverrides.lead;

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        background: 'var(--p-bg)',
        color: 'var(--p-fg)',
        padding: 'clamp(48px, 5vw, 80px)',
      }}
    >
      {/* Header */}
      <div className="mb-8">
        <span
          style={{
            fontFamily: 'var(--p-mono-font)',
            fontSize: '11px',
            letterSpacing: '0.24em',
            color: 'var(--p-mute)',
            textTransform: 'uppercase',
          }}
        >
          {slide.eyebrow}
        </span>
        <h2
          style={{
            fontFamily: 'var(--p-display-font)',
            textTransform: 'var(--p-display-case)' as const,
            fontWeight: 'var(--p-display-weight)',
            letterSpacing: 'var(--p-display-tracking)',
            fontSize: 'clamp(28px, 2.8vw, 44px)',
            lineHeight: 1.1,
            color: 'var(--p-fg)',
            margin: '12px 0 0 0',
          }}
        >
          {title}
        </h2>
      </div>

      {/* Lead sentence */}
      <div style={{ margin: '0 0 56px 0', maxWidth: '70%' }}>
        <EditableText
          as="p"
          value={data.lead}
          editMode={!!editing?.editMode}
          isOverride={isLeadOverride}
          onDraftChange={(v) => editing?.onDraftChange('lead', v)}
          onRevert={() => editing?.onRevert('lead')}
          style={{
            fontFamily: 'var(--p-display-font)',
            textTransform: 'var(--p-display-case)' as const,
            fontWeight: 'var(--p-display-weight)',
            letterSpacing: 'var(--p-display-tracking)',
            fontSize: 'clamp(20px, 1.8vw, 28px)',
            lineHeight: 1.3,
            color: 'var(--p-fg)',
            margin: 0,
          }}
        >
          {data.lead}
        </EditableText>
      </div>

      {/* Timeline — flex distributes evenly */}
      <div className="flex-1 flex items-center">
        <div className="relative w-full">
          {/* Baseline */}
          <div
            className="absolute left-0 right-0 top-1/2"
            style={{
              height: '1px',
              background: 'var(--p-border)',
              transform: 'translateY(-50%)',
            }}
          />

          <div className="relative flex items-center justify-between">
            {data.milestones.map((m, i) => (
              <div key={i} className="flex flex-col items-center gap-0" style={{ width: '18%' }}>
                {/* Date above */}
                <div style={{ marginBottom: '20px' }}>
                  <EditableText
                    as="span"
                    value={m.date}
                    editMode={!!editing?.editMode}
                    isOverride={!!editing?.slideOverrides[`milestones.${i}.date`]}
                    onDraftChange={(v) => editing?.onDraftChange(`milestones.${i}.date`, v)}
                    onRevert={() => editing?.onRevert(`milestones.${i}.date`)}
                    style={{
                      fontFamily: 'var(--p-mono-font)',
                      fontSize: '11px',
                      letterSpacing: '0.18em',
                      color: m.status === 'current' ? 'var(--p-accent)' : 'var(--p-mute)',
                      textTransform: 'uppercase',
                      fontWeight: m.status === 'current' ? 700 : 500,
                    }}
                  >
                    {m.date}
                  </EditableText>
                </div>
                {/* Node on the axis — clickable in edit mode to cycle
                    through done → current → next → done. */}
                <div className="relative h-4 flex items-center justify-center">
                  <button
                    type="button"
                    disabled={!editing?.editMode}
                    onClick={() => {
                      if (!editing) return;
                      const nextStatus: Milestone['status'] =
                        m.status === 'done' ? 'current' :
                        m.status === 'current' ? 'next' : 'done';
                      editing.onDraftChange(`milestones.${i}.status`, nextStatus);
                    }}
                    aria-label={`${m.label} status — ${m.status}`}
                    title={editing?.editMode ? `Click to cycle status (${m.status})` : undefined}
                    className={`rounded-full ${editing?.editMode ? 'cursor-pointer' : 'cursor-default'} transition-transform ${editing?.editMode ? 'hover:scale-110' : ''}`}
                    style={{
                      width: m.status === 'current' ? '18px' : '12px',
                      height: m.status === 'current' ? '18px' : '12px',
                      padding: 0,
                      background: m.status === 'done' ? 'var(--p-fg)'
                        : m.status === 'current' ? 'var(--p-accent)'
                        : 'var(--p-bg)',
                      border: `2px solid ${m.status === 'next' ? 'var(--p-border)' : 'transparent'}`,
                      boxShadow: m.status === 'current' ? `0 0 0 4px var(--p-bg), 0 0 0 5px var(--p-accent)` : 'none',
                      outline: editing?.slideOverrides[`milestones.${i}.status`] ? '1px dashed var(--p-accent)' : 'none',
                      outlineOffset: '3px',
                    }}
                  />
                </div>
                {/* Label below */}
                <EditableText
                  as="div"
                  value={m.label}
                  editMode={!!editing?.editMode}
                  isOverride={!!editing?.slideOverrides[`milestones.${i}.label`]}
                  onDraftChange={(v) => editing?.onDraftChange(`milestones.${i}.label`, v)}
                  onRevert={() => editing?.onRevert(`milestones.${i}.label`)}
                  style={{
                    fontFamily: 'var(--p-display-font)',
                    textTransform: 'var(--p-display-case)' as const,
                    fontWeight: m.status === 'current' ? 700 : (Number('var(--p-display-weight)') || 500),
                    fontSize: 'clamp(13px, 1.1vw, 16px)',
                    letterSpacing: 'var(--p-display-tracking)',
                    color: m.status === 'next' ? 'var(--p-mute)' : 'var(--p-fg)',
                    textAlign: 'center',
                    lineHeight: 1.25,
                    marginTop: '20px',
                    maxWidth: '95%',
                  }}
                >
                  {m.label}
                </EditableText>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between">
        <span
          style={{
            fontFamily: 'var(--p-mono-font)',
            fontSize: '11px',
            letterSpacing: '0.18em',
            color: 'var(--p-mute)',
            textTransform: 'uppercase',
          }}
        >
          {meta.collectionName}{meta.season ? ` · ${meta.season}` : ''}
        </span>
        <span
          style={{
            fontFamily: 'var(--p-mono-font)',
            fontSize: '11px',
            letterSpacing: '0.18em',
            color: 'var(--p-mute)',
            textTransform: 'uppercase',
          }}
        >
          {data.milestones.filter(m => m.status === 'done').length} / {data.milestones.length} complete
        </span>
      </div>
    </div>
  );
}

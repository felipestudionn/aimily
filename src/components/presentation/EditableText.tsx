/* ═══════════════════════════════════════════════════════════════════
   EditableText — click-to-edit wrapper for slide text in the deck

   Behavior:
   - editMode = false     → render `value` as plain text (no chrome)
   - editMode = true, not editing → subtle dashed hover affordance
   - editMode = true, editing     → textarea replaces the text; Esc
                                    cancels, Cmd+Enter (or Ctrl+Enter)
                                    commits the draft into local state.
   - Clicking Save (in the slide) flushes drafts to the DB via onSave.
   - isOverride + onRevert expose the "Volver al original" affordance.

   The wrapper is theme-agnostic — it forwards `style` and `className`
   so the template can still control font / tracking / weight via
   CSS variables. It only mounts the textarea + "revert" chip when
   edit mode is active.
   ═══════════════════════════════════════════════════════════════════ */

'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
  value: string;
  editMode: boolean;
  /* Committed override for this field, if any. Used to decide whether
     to show the "revert to original" affordance and the gold dot. */
  isOverride: boolean;
  onDraftChange: (draft: string) => void;
  onRevert: () => void;
  /* Optional: per-field chrome below the text block (shows when
     edit mode is active). Placement is handled by the caller. */
  children: React.ReactNode;
  /* Forward to the rendered element */
  as?: 'p' | 'h1' | 'h2' | 'span' | 'div';
  className?: string;
  style?: React.CSSProperties;
}

export function EditableText({
  value,
  editMode,
  isOverride,
  onDraftChange,
  onRevert,
  children,
  as: Tag = 'p',
  className,
  style,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /* Sync external value changes into our local draft when NOT editing
     (e.g. after a save, or when the user reverts). */
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  /* Auto-focus + autosize on edit start */
  useEffect(() => {
    if (!editing || !textareaRef.current) return;
    const ta = textareaRef.current;
    ta.focus();
    ta.selectionStart = ta.value.length;
    ta.selectionEnd = ta.value.length;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, [editing]);

  const commit = () => {
    if (draft !== value) onDraftChange(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editMode) {
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  if (editing) {
    return (
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            // autosize
            e.currentTarget.style.height = 'auto';
            e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); cancel(); }
            if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); commit(); }
          }}
          className={className}
          style={{
            ...style,
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px dashed var(--p-accent)',
            outline: 'none',
            resize: 'none',
            padding: '4px 6px',
            margin: '-4px -6px',
            borderRadius: '4px',
          }}
        />
      </div>
    );
  }

  // Edit mode on, not editing — show hover affordance + revert chip
  return (
    <div className="relative group/edit">
      <Tag
        className={className}
        style={{
          ...style,
          cursor: 'text',
          borderRadius: '4px',
          padding: '2px 4px',
          margin: '-2px -4px',
          transition: 'background 150ms, outline 150ms',
          outline: isOverride ? '1px dashed var(--p-accent)' : 'none',
          outlineOffset: '2px',
        }}
        onClick={() => setEditing(true)}
      >
        {children}
      </Tag>
      {isOverride && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRevert(); }}
          className="absolute -top-6 right-0 opacity-0 group-hover/edit:opacity-100 transition-opacity inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold tracking-[0.12em] uppercase bg-carbon text-white hover:bg-carbon/90"
          title="Revert this field to the original"
        >
          <RotateCcw className="w-3 h-3" strokeWidth={2} />
          Revert
        </button>
      )}
    </div>
  );
}

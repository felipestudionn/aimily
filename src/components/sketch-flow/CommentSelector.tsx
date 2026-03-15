'use client';

import { useState } from 'react';
import { ProposedNote } from '@/types/tech-pack';
import { Plus, X } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface CommentSelectorProps {
  proposedNotes: ProposedNote[];
  onNotesChange: (notes: ProposedNote[]) => void;
}

export default function CommentSelector({ proposedNotes, onNotesChange }: CommentSelectorProps) {
  const t = useTranslation();
  const [customText, setCustomText] = useState('');

  const toggleNote = (index: number) => {
    const updated = proposedNotes.map((note, i) =>
      i === index ? { ...note, selected: !note.selected } : note
    );
    onNotesChange(updated);
  };

  const addCustomNote = () => {
    if (!customText.trim()) return;
    const newNote: ProposedNote = {
      text: customText.trim(),
      position: 'front-waist',
      x: 220,
      y: 200,
      selected: true,
    };
    onNotesChange([...proposedNotes, newNote]);
    setCustomText('');
  };

  const removeNote = (index: number) => {
    onNotesChange(proposedNotes.filter((_, i) => i !== index));
  };

  const selectedCount = proposedNotes.filter((n) => n.selected).length;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        {t.sketchFlowPage.commentSelectorDesc}
      </p>

      {/* Proposed notes as checkboxes */}
      <div className="space-y-2 mb-4">
        {proposedNotes.map((note, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer
              ${note.selected
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            onClick={() => toggleNote(i)}
          >
            {/* Checkbox */}
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                ${note.selected ? 'bg-red-500 border-red-500' : 'border-gray-300'}`}
            >
              {note.selected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            {/* Note text */}
            <span className={`text-sm flex-1 ${note.selected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
              {note.text}
            </span>

            {/* Position badge */}
            <span className="text-[10px] text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full flex-shrink-0">
              {note.position.replace('-', ' ')}
            </span>

            {/* Remove button for custom notes */}
            {i >= proposedNotes.length && (
              <button
                onClick={(e) => { e.stopPropagation(); removeNote(i); }}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add custom note */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomNote()}
          placeholder={t.sketchFlowPage.addCustomNotePlaceholder}
          className="flex-1 h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 placeholder:text-gray-400"
        />
        <button
          onClick={addCustomNote}
          disabled={!customText.trim()}
          className="h-10 px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Selection count */}
      <p className="text-xs text-gray-400 mt-3">
        {selectedCount} {t.sketchFlowPage.notesSelected}
      </p>
    </div>
  );
}

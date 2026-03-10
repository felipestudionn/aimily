'use client';

import { useState } from 'react';
import {
  Scissors,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileText,
  ExternalLink,
} from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';

interface PatternFile {
  name: string;
  url: string;
  fileType: string;
  gradingNotes: string;
}

interface Props {
  skus: SKU[];
  patterns: Record<string, PatternFile[]>;
  onUpdate: (patterns: Record<string, PatternFile[]>) => void;
}

function SkuPatternCard({
  sku,
  files,
  onChange,
}: {
  sku: SKU;
  files: PatternFile[];
  onChange: (files: PatternFile[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const addFile = () => {
    onChange([
      ...files,
      { name: '', url: '', fileType: 'PDF', gradingNotes: '' },
    ]);
  };

  const updateFile = (idx: number, updates: Partial<PatternFile>) => {
    onChange(files.map((f, i) => (i === idx ? { ...f, ...updates } : f)));
  };

  const removeFile = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
        <div
          className="w-8 h-8 rounded-lg bg-cover bg-center border border-gray-100"
          style={{
            backgroundImage: sku.reference_image_url
              ? `url(${sku.reference_image_url})`
              : undefined,
            backgroundColor: sku.reference_image_url ? undefined : '#f3f4f6',
          }}
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{sku.name}</p>
          <p className="text-xs text-gray-400">
            {sku.category} &middot; {sku.family}
          </p>
        </div>
        <span className="text-xs text-gray-400">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 space-y-3 pt-3">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="space-y-2 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-300 flex-shrink-0" />
                <input
                  type="text"
                  value={file.name}
                  onChange={(e) => updateFile(idx, { name: e.target.value })}
                  placeholder="Pattern file name"
                  className="flex-1 text-sm bg-transparent border-none focus:outline-none"
                />
                <select
                  value={file.fileType}
                  onChange={(e) => updateFile(idx, { fileType: e.target.value })}
                  className="text-xs px-2 py-1 rounded-md bg-white border border-gray-200 focus:outline-none"
                >
                  <option value="PDF">PDF</option>
                  <option value="AI">AI</option>
                  <option value="DXF">DXF</option>
                  <option value="PLT">PLT</option>
                  <option value="Other">Other</option>
                </select>
                <button
                  onClick={() => removeFile(idx)}
                  className="p-1 text-gray-300 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={file.url}
                  onChange={(e) => updateFile(idx, { url: e.target.value })}
                  placeholder="File URL..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
                />
                {file.url && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-amber-600"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <textarea
                value={file.gradingNotes}
                onChange={(e) => updateFile(idx, { gradingNotes: e.target.value })}
                placeholder="Grading notes..."
                rows={1}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 resize-none"
              />
            </div>
          ))}

          <button
            onClick={addFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-3 w-3" /> Add Pattern File
          </button>
        </div>
      )}
    </div>
  );
}

export function PatternSection({ skus, patterns, onUpdate }: Props) {
  const getFiles = (skuId: string): PatternFile[] => patterns[skuId] || [];

  const handleChange = (skuId: string, files: PatternFile[]) => {
    onUpdate({ ...patterns, [skuId]: files });
  };

  const totalFiles = Object.values(patterns).flat().length;

  if (skus.length === 0) {
    return (
      <div className="bg-white border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Scissors className="h-4 w-4 text-texto/60" />
          <h2 className="font-semibold text-gray-900">Pattern Management</h2>
        </div>
        <p className="text-sm text-gray-400 text-center py-6">
          No SKUs found. Add products in the Product tab first.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-texto/60" />
          <h2 className="font-semibold text-gray-900">Pattern Management</h2>
        </div>
        {totalFiles > 0 && (
          <span className="text-xs text-gray-400">{totalFiles} files</span>
        )}
      </div>

      <div className="space-y-2">
        {skus.map((sku) => (
          <SkuPatternCard
            key={sku.id}
            sku={sku}
            files={getFiles(sku.id)}
            onChange={(f) => handleChange(sku.id, f)}
          />
        ))}
      </div>
    </div>
  );
}

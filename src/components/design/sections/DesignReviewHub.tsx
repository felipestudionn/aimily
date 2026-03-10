'use client';

import { useState } from 'react';
import {
  Image as ImageIcon,
  Upload,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Clock,
  Eye,
} from 'lucide-react';
import type { SKU } from '@/hooks/useSkus';

interface DesignFile {
  name: string;
  url: string;
  status: 'draft' | 'review' | 'approved' | 'rejected';
}

interface Props {
  skus: SKU[];
  designFiles: Record<string, DesignFile[]>;
  onUpdate: (files: Record<string, DesignFile[]>) => void;
}

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600', icon: Clock },
  review: { label: 'In Review', color: 'bg-amber-50 text-amber-600', icon: Eye },
  approved: { label: 'Approved', color: 'bg-green-50 text-green-600', icon: Check },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-600', icon: X },
};

function SkuDesignCard({
  sku,
  files,
  onChange,
}: {
  sku: SKU;
  files: DesignFile[];
  onChange: (files: DesignFile[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const addFile = () => {
    const name = `Shot ${files.length + 1}`;
    onChange([...files, { name, url: '', status: 'draft' }]);
  };

  const updateFile = (idx: number, updates: Partial<DesignFile>) => {
    onChange(files.map((f, i) => (i === idx ? { ...f, ...updates } : f)));
  };

  const removeFile = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
    if (selectedIdx === idx) setSelectedIdx(null);
  };

  const approvedCount = files.filter((f) => f.status === 'approved').length;

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
            {files.length} iteration{files.length !== 1 ? 's' : ''}
          </p>
        </div>
        {files.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">
            {approvedCount}/{files.length} approved
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50">
          {/* Side-by-side comparison area */}
          {files.length >= 2 && selectedIdx !== null && (
            <div className="grid grid-cols-2 gap-3 pt-3 mb-4">
              {files
                .filter((_, i) => i === selectedIdx || i === (selectedIdx > 0 ? selectedIdx - 1 : 1))
                .slice(0, 2)
                .map((f, i) => (
                  <div key={i} className="aspect-square bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                    {f.url ? (
                      <img
                        src={f.url}
                        alt={f.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 text-gray-200 mx-auto mb-1" />
                        <p className="text-xs text-gray-300">{f.name}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Iteration list */}
          <div className="space-y-2 pt-3">
            {files.map((file, idx) => {
              const cfg = STATUS_CONFIG[file.status];
              const StatusIcon = cfg.icon;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                    selectedIdx === idx
                      ? 'border-amber-200 bg-amber-50/30'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {file.url ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-gray-300" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={file.name}
                    onChange={(e) => updateFile(idx, { name: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-sm bg-transparent border-none focus:outline-none"
                  />
                  <select
                    value={file.status}
                    onChange={(e) =>
                      updateFile(idx, {
                        status: e.target.value as DesignFile['status'],
                      })
                    }
                    onClick={(e) => e.stopPropagation()}
                    className={`text-xs px-2 py-1 rounded-full border-none ${cfg.color} cursor-pointer focus:outline-none`}
                  >
                    <option value="draft">Draft</option>
                    <option value="review">In Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="p-1 text-gray-300 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* URL input for selected */}
          {selectedIdx !== null && files[selectedIdx] && (
            <div className="pt-3">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Image URL for &quot;{files[selectedIdx].name}&quot;
              </label>
              <input
                type="url"
                value={files[selectedIdx].url}
                onChange={(e) => updateFile(selectedIdx, { url: e.target.value })}
                placeholder="Paste image URL..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
              />
            </div>
          )}

          <button
            onClick={addFile}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 text-xs hover:bg-gray-100 transition-colors"
          >
            <Upload className="h-3 w-3" /> Add Iteration
          </button>
        </div>
      )}
    </div>
  );
}

export function DesignReviewHub({ skus, designFiles, onUpdate }: Props) {
  const getFiles = (skuId: string): DesignFile[] => designFiles[skuId] || [];

  const handleChange = (skuId: string, files: DesignFile[]) => {
    onUpdate({ ...designFiles, [skuId]: files });
  };

  const totalFiles = Object.values(designFiles).flat().length;
  const approvedFiles = Object.values(designFiles)
    .flat()
    .filter((f) => f.status === 'approved').length;

  if (skus.length === 0) {
    return (
      <div className="bg-white border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="h-4 w-4 text-texto/60" />
          <h2 className="font-semibold text-gray-900">Design Review Hub</h2>
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
          <ImageIcon className="h-4 w-4 text-texto/60" />
          <h2 className="font-semibold text-gray-900">Design Review Hub</h2>
        </div>
        {totalFiles > 0 && (
          <span className="text-xs text-gray-400">
            {approvedFiles}/{totalFiles} approved
          </span>
        )}
      </div>

      <div className="space-y-2">
        {skus.map((sku) => (
          <SkuDesignCard
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

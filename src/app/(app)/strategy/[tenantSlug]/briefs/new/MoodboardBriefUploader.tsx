'use client';

/* Strategy moodboard uploader — drag/drop images + paste Pinterest pin
   URLs OR raw image URLs. On "Extract brief from moodboard" click, calls
   /api/strategy/briefs/discover with the resolved imageUrls + fills the
   parent brief form with the AI synthesis.

   Mirrors the Block 1 MoodboardUploader UX but ships its own simpler
   storage flow scoped to the Strategy tenant bucket. */

import { useCallback, useRef, useState } from 'react';
import { Plus, X, Loader2, ImageIcon, Link2, Wand2, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface MoodImage {
  id: string;
  url: string;
  source: 'upload' | 'pinterest' | 'url';
  storage_path?: string;
  width?: number;
  height?: number;
  status: 'pending' | 'uploaded' | 'failed';
  error?: string;
}

export interface MoodboardExtractionResult {
  draft: {
    name: string;
    description: string;
    color_story: string[];
    archetypes_focus: string[];
    family_pivot: Record<string, number>;
    silhouette_preferences: { favored?: string[]; deprioritized?: string[] };
    material_direction: { favored?: string[]; deprioritized?: string[] };
    customer_segment_shift: string | null;
    creative_narrative: string;
    sources: Record<string, unknown>;
    data_sufficiency_warning?: string | null;
  };
  moodboard_analysis: {
    keyColors: string[];
    keyMaterials: string[];
    keySilhouettes: string[];
    keyArchetypes: string[];
    keyMoodAdjectives: string[];
    moodDescription: string;
    targetCustomerHint: string;
    detectedBrandReferences: string[];
  } | null;
  context_used: Record<string, unknown>;
}

interface Props {
  tenantSlug: string;
  busy: boolean;
  onExtracted: (result: MoodboardExtractionResult) => void;
}

export function MoodboardBriefUploader({ tenantSlug, busy, onExtracted }: Props) {
  const [images, setImages] = useState<MoodImage[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File): Promise<MoodImage> => {
      const id = `${file.name}-${Date.now()}-${Math.random()}`;
      const tempImg: MoodImage = {
        id,
        url: URL.createObjectURL(file),
        source: 'upload',
        status: 'pending',
      };
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('tenant_slug', tenantSlug);
        const res = await fetch('/api/strategy/moodboard/upload', {
          method: 'POST',
          body: form,
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `Upload failed (${res.status})`);
        }
        const data = await res.json();
        return {
          id,
          url: data.signed_url,
          source: 'upload',
          storage_path: data.storage_path,
          width: data.width,
          height: data.height,
          status: 'uploaded',
        };
      } catch (e: any) {
        return { ...tempImg, status: 'failed', error: e.message };
      }
    },
    [tenantSlug]
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setErr(null);
      setUploading(true);
      const placeholders: MoodImage[] = Array.from(files).map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        url: URL.createObjectURL(f),
        source: 'upload' as const,
        status: 'pending',
      }));
      setImages((prev) => [...prev, ...placeholders]);
      const uploaded = await Promise.all(Array.from(files).map(uploadFile));
      setImages((prev) => {
        const next = [...prev];
        placeholders.forEach((p, i) => {
          const idx = next.findIndex((img) => img.id === p.id);
          if (idx >= 0) next[idx] = uploaded[i];
        });
        return next;
      });
      setUploading(false);
    },
    [uploadFile]
  );

  const handleUrlAdd = useCallback(() => {
    const lines = urlInput
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const newImages: MoodImage[] = lines.map((line) => {
      const isPinterest = /pinterest\.(com|es|fr|it|de|co\.uk)/i.test(line);
      return {
        id: `url-${Date.now()}-${Math.random()}`,
        url: line,
        source: isPinterest ? 'pinterest' : 'url',
        status: 'uploaded',
      };
    });
    setImages((prev) => [...prev, ...newImages]);
    setUrlInput('');
  }, [urlInput]);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const handleExtract = useCallback(async () => {
    const validImages = images.filter((img) => img.status === 'uploaded');
    if (validImages.length === 0) {
      setErr('Upload at least one image or paste a Pinterest pin URL first.');
      return;
    }
    setErr(null);
    setInfo(null);
    setExtracting(true);
    try {
      const res = await fetch('/api/strategy/briefs/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          moodboard: {
            imageUrls: validImages.map((img) => img.url),
          },
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Extraction failed (${res.status})`);
      }
      const data = (await res.json()) as MoodboardExtractionResult;
      onExtracted(data);
      setInfo(
        `Brief extracted from ${validImages.length} reference${validImages.length === 1 ? '' : 's'}${
          data.moodboard_analysis
            ? ` · ${data.moodboard_analysis.keyColors.length} colors · ${data.moodboard_analysis.keyArchetypes.length} archetypes detected`
            : ' · vision fallback (no analysis output)'
        }.`
      );
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setExtracting(false);
    }
  }, [images, tenantSlug, onExtracted]);

  const validCount = images.filter((i) => i.status === 'uploaded').length;
  const failedCount = images.filter((i) => i.status === 'failed').length;

  return (
    <div className="space-y-4 -mb-1">
      <div>
        <h3 className="text-[14px] font-semibold text-carbon tracking-[-0.01em]">
          Moodboard → brief
        </h3>
        <p className="text-[12px] text-carbon/55 leading-[1.55] mt-1 max-w-2xl">
          Drag images, browse files, or paste Pinterest pin URLs. We decode the visual codes —
          colors, materials, silhouettes, archetypes, mood — and synthesize a draft brief that
          stays grounded in your portfolio winners and brand DNA. Same loop as Block 1, scoped to
          Strategy.
        </p>
      </div>

      {/* Drop zone + thumbnails */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="rounded-[16px] border-2 border-dashed border-carbon/15 p-4 transition-colors hover:border-carbon/25 hover:bg-carbon/[0.02]"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        {images.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || extracting || uploading}
            className="w-full py-8 flex flex-col items-center justify-center text-carbon/50 hover:text-carbon transition-colors disabled:opacity-50"
          >
            <ImageIcon className="h-7 w-7 mb-2" />
            <p className="text-[13px] font-medium">Drop images or click to browse</p>
            <p className="text-[11px] mt-1 text-carbon/40">JPG, PNG, WebP, HEIC — max 25 MB each</p>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-[10px] overflow-hidden bg-carbon/[0.06] group">
                  {img.status === 'failed' ? (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-700 px-2 text-center">
                      {img.error || 'failed'}
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={img.url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                    />
                  )}
                  {img.status === 'pending' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {img.source !== 'upload' && (
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[9px] uppercase tracking-[0.08em]">
                      {img.source}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy || extracting || uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-carbon/[0.04] text-carbon/70 text-[12px] font-semibold hover:bg-carbon/[0.08] disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
              Add more
            </button>
          </div>
        )}
      </div>

      {/* Pinterest / URL paste */}
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus-within:border-carbon/20 transition-colors">
            <Link2 className="h-3.5 w-3.5 text-carbon/40 flex-shrink-0" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste Pinterest pin URL or image URL (one per line)"
              className="flex-1 bg-transparent text-[12px] text-carbon placeholder:text-carbon/35 focus:outline-none"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleUrlAdd}
          disabled={busy || !urlInput.trim() || extracting}
          className="px-4 py-2.5 rounded-[12px] bg-carbon/[0.06] text-carbon/75 text-[12px] font-semibold hover:bg-carbon/[0.1] disabled:opacity-40"
        >
          Add URL
        </button>
      </div>

      {/* Extract */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-carbon/45">
          {validCount > 0 ? `${validCount} ready` : 'No images yet'}
          {failedCount > 0 ? ` · ${failedCount} failed` : ''}
        </p>
        <button
          type="button"
          onClick={handleExtract}
          disabled={busy || extracting || validCount === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 disabled:opacity-50"
        >
          {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Extract brief from moodboard
        </button>
      </div>

      {info && (
        <p className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-2 rounded-[8px] flex items-start gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          {info}
        </p>
      )}
      {err && (
        <p className="text-[11px] text-red-700 bg-red-50 px-3 py-2 rounded-[8px] flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          {err}
        </p>
      )}
    </div>
  );
}

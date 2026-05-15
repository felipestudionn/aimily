'use client';

/* Upload client: drop-zone + metadata form, posts to /api/strategy/sources/upload,
   then auto-fires /parse. Streams progress to the user. */

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  tenantSlug: string;
  tenantId: string;
}

type Phase = 'idle' | 'uploading' | 'parsing' | 'complete' | 'error';

interface ParseSummary {
  source_id: string;
  persist?: {
    raw_record_count: number;
    product_fact_count: number;
    inventory_fact_count: number;
    sales_window_count: number;
    efficiency_fact_count: number;
    parse_confidence: number;
    parser_warnings: string[];
  };
  identity_graph?: {
    lineages_total: number;
    match_type_counts: Record<string, number>;
  };
}

export function UploadSourceClient({ tenantSlug, tenantId: _tenantId }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [season, setSeason] = useState('V26');
  const [market, setMarket] = useState('');
  const [sourceFormat, setSourceFormat] = useState('zara_rnk_pdf');
  const [observationDate, setObservationDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<string>('');
  const [parseSummary, setParseSummary] = useState<ParseSummary | null>(null);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File | null) => {
    setFile(f);
    if (f) {
      // Smart-default source_format from file mime
      if (f.type === 'application/pdf') setSourceFormat('zara_rnk_pdf');
      else if (f.name.endsWith('.csv') || f.type.includes('csv')) setSourceFormat('shopify_csv');
      else if (f.name.endsWith('.xlsx')) setSourceFormat('shopify_csv_bundle');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Pick a file first');
      return;
    }
    setError('');
    setPhase('uploading');
    setProgress('Uploading to private bucket…');

    const form = new FormData();
    form.append('file', file);
    form.append('tenant_slug', tenantSlug);
    form.append('season', season);
    if (market) form.append('market', market);
    form.append('source_format', sourceFormat);
    form.append('observation_date', observationDate);
    if (notes) form.append('notes', notes);

    let uploadJson: { source_id: string } | null = null;
    try {
      const res = await fetch('/api/strategy/sources/upload', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed (${res.status})`);
      }
      uploadJson = (await res.json()) as { source_id: string };
    } catch (e: any) {
      setPhase('error');
      setError(`Upload: ${e.message}`);
      return;
    }

    setPhase('parsing');
    setProgress('Parsing + ETL (this can take 30–60s for a Zara PDF)…');

    try {
      const res = await fetch(`/api/strategy/sources/${uploadJson!.source_id}/parse`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Parse failed (${res.status})`);
      }
      const data = (await res.json()) as ParseSummary;
      setParseSummary(data);
      setPhase('complete');
      setProgress('Done.');
      setTimeout(() => router.push(`/strategy/${tenantSlug}`), 3500);
    } catch (e: any) {
      setPhase('error');
      setError(`Parse: ${e.message}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-[20px] p-8 md:p-10 space-y-6"
    >
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-[16px] border-2 border-dashed transition-colors p-12 text-center ${
          file
            ? 'border-carbon/30 bg-carbon/[0.02]'
            : 'border-carbon/15 hover:border-carbon/30 hover:bg-carbon/[0.02]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.csv,.xlsx,.xls,.json,.txt"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-6 w-6 text-carbon/60" />
            <div className="text-left">
              <p className="text-[14px] font-medium text-carbon">{file.name}</p>
              <p className="text-[12px] text-carbon/40">
                {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || 'unknown'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <UploadCloud className="h-8 w-8 text-carbon/40 mx-auto mb-3" />
            <p className="text-[14px] text-carbon/60 font-medium">
              Drop file here or click to choose
            </p>
            <p className="mt-1 text-[12px] text-carbon/40">
              PDF, CSV, XLSX, JSON — max 100 MB
            </p>
          </>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Season tag">
          <input
            type="text"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            placeholder="V26 | I26+V26 | SS26"
            className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30"
            required
          />
        </Field>
        <Field label="Market (optional)">
          <input
            type="text"
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            placeholder="ES | UK | global"
            className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30"
          />
        </Field>
        <Field label="Source format">
          <select
            value={sourceFormat}
            onChange={(e) => setSourceFormat(e.target.value)}
            className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors"
          >
            <option value="zara_rnk_pdf">Zara RNK PDF (Inditex internal)</option>
            <option value="shopify_csv">Shopify · single CSV</option>
            <option value="shopify_csv_bundle">Shopify · XLSX bundle (sales + inventory + returns)</option>
            <option value="erp_custom_csv">ERP custom CSV</option>
            <option value="manual_upload">Manual / other</option>
          </select>
        </Field>
        <Field label="Observation date">
          <input
            type="date"
            value={observationDate}
            onChange={(e) => setObservationDate(e.target.value)}
            className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors"
            required
          />
        </Field>
      </div>

      <Field label="Notes (optional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything we should know about this snapshot — coverage gaps, anomalies, marker promo dates…"
          className="w-full px-4 py-3 text-sm text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30 resize-none"
        />
      </Field>

      {/* Progress / errors */}
      {phase !== 'idle' && (
        <div
          className={`flex items-start gap-3 px-4 py-3 rounded-[12px] ${
            phase === 'error'
              ? 'bg-red-50 text-red-700'
              : phase === 'complete'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          {phase === 'error' ? (
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : phase === 'complete' ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : (
            <Loader2 className="h-4 w-4 mt-0.5 flex-shrink-0 animate-spin" />
          )}
          <div className="flex-1 text-[13px] leading-[1.5]">
            <p className="font-medium">{phase === 'error' ? error : progress}</p>
            {parseSummary && phase === 'complete' && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] opacity-80">
                <span>{parseSummary.persist?.raw_record_count} rows parsed</span>
                <span>{parseSummary.persist?.product_fact_count} product_facts</span>
                <span>{parseSummary.persist?.inventory_fact_count} inventory_facts</span>
                <span>{parseSummary.persist?.sales_window_count} sales_windows</span>
                <span className="col-span-2">
                  Identity graph: {parseSummary.identity_graph?.lineages_total} lineages ·{' '}
                  {Object.entries(parseSummary.identity_graph?.match_type_counts ?? {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' · ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={!file || phase === 'uploading' || phase === 'parsing'}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {phase === 'uploading' || phase === 'parsing' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" />
              Upload & parse
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] text-carbon/50 uppercase tracking-[0.08em] mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}

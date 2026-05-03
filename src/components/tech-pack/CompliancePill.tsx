'use client';

/**
 * Phase 5 — Compliance pill in the Tech Pack header.
 *
 * Reads /api/compliance/check?skuId=X and surfaces:
 *   compliant   →  "Compliance OK"        (moss)
 *   warning     →  "N warnings"            (citronella)
 *   violation   →  "N violations"          (red)
 *
 * Click → opens a popover-style detail panel with the per-material
 * findings + recommendations. No mutation; if the BOM changes the
 * caller bumps refreshKey to retrigger the check.
 */

import { useEffect, useState } from 'react';
import { ChevronRight, ShieldAlert, ShieldCheck, ShieldQuestion, X } from 'lucide-react';

type Severity = 'info' | 'warning' | 'violation';

interface Finding {
  material: string;
  flag: string;
  regulation: string;
  severity: Severity;
  description: string;
  recommendation: string;
}

interface Report {
  status: 'compliant' | 'warning' | 'violation';
  findings: Finding[];
  certifications_present: string[];
  inspected_count: number;
  matched_count: number;
}

interface Props {
  skuId: string;
  refreshKey?: number;
}

const STATUS_META: Record<Report['status'], { label: string; bg: string; text: string; Icon: typeof ShieldCheck }> = {
  compliant: { label: 'Compliance OK', bg: 'bg-moss/[0.18]', text: 'text-carbon/80', Icon: ShieldCheck },
  warning: { label: 'Compliance: review', bg: 'bg-citronella/[0.22]', text: 'text-carbon/85', Icon: ShieldQuestion },
  violation: { label: 'Compliance: violation', bg: 'bg-red-50', text: 'text-red-700', Icon: ShieldAlert },
};

const SEVERITY_DOT: Record<Severity, string> = {
  info: 'bg-carbon/30',
  warning: 'bg-citronella',
  violation: 'bg-red-500',
};

export function CompliancePill({ skuId, refreshKey = 0 }: Props) {
  const [report, setReport] = useState<Report | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/compliance/check?skuId=${skuId}`);
      if (cancelled) return;
      if (res.ok) setReport((await res.json()) as Report);
    })();
    return () => {
      cancelled = true;
    };
  }, [skuId, refreshKey]);

  if (!report) return null;
  const meta = STATUS_META[report.status];
  const Icon = meta.Icon;
  const violationCount = report.findings.filter((f) => f.severity === 'violation').length;
  const warningCount = report.findings.filter((f) => f.severity === 'warning').length;

  let countLabel = '';
  if (report.status === 'violation') countLabel = `${violationCount} violation${violationCount === 1 ? '' : 's'}`;
  else if (report.status === 'warning') countLabel = `${warningCount} warning${warningCount === 1 ? '' : 's'}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${meta.bg} ${meta.text} text-[11px] font-semibold tracking-[0.05em] uppercase transition-colors hover:brightness-95`}
        title="Open compliance report"
      >
        <Icon className="h-3 w-3" strokeWidth={2.4} />
        <span>{meta.label}</span>
        {countLabel && (
          <>
            <span className="opacity-50">·</span>
            <span className="normal-case tracking-[-0.01em]">{countLabel}</span>
          </>
        )}
        <ChevronRight className="h-3 w-3 opacity-60" strokeWidth={2.4} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-carbon/30 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full sm:w-[480px] h-full bg-shade overflow-y-auto shadow-[-12px_0_40px_rgba(0,0,0,0.08)]">
            <div className="sticky top-0 z-10 bg-shade/95 backdrop-blur px-6 pt-5 pb-4 border-b border-carbon/[0.06] flex items-start justify-between">
              <div>
                <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-carbon/40">Compliance Report</p>
                <h2 className="text-[20px] font-semibold text-carbon tracking-[-0.02em] mt-0.5">{meta.label}</h2>
                <p className="text-[12px] text-carbon/55 mt-1">
                  {report.inspected_count} materials inspected · {report.matched_count} matched in catalog
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 rounded-full hover:bg-carbon/[0.05] text-carbon/60"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {report.findings.length === 0 && (
                <p className="text-[13px] text-carbon/55">
                  No flags detected. All inspected materials are clear of common REACH / AAFA-RSL concerns at this stage.
                </p>
              )}

              {report.findings.map((f, i) => (
                <div key={i} className="p-4 bg-white rounded-[14px] border border-carbon/[0.06]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${SEVERITY_DOT[f.severity]}`} />
                    <span className="text-[13px] font-semibold text-carbon">{f.material}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-[0.1em] text-carbon/45">{f.regulation}</span>
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-carbon/60 mb-1.5">{f.flag}</p>
                  <p className="text-[12px] text-carbon/65 leading-snug">{f.description}</p>
                  <p className="text-[12px] text-carbon mt-2 leading-snug">
                    <span className="font-semibold">Action:</span> {f.recommendation}
                  </p>
                </div>
              ))}

              {report.certifications_present.length > 0 && (
                <div className="p-4 bg-white rounded-[14px] border border-carbon/[0.06]">
                  <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-carbon/45 mb-2">
                    Certifications surfaced from catalog
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.certifications_present.map((c) => (
                      <span
                        key={c}
                        className="inline-block px-2 py-0.5 rounded-full bg-moss/[0.18] text-[10px] font-semibold tracking-[-0.01em] text-carbon/80 uppercase"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

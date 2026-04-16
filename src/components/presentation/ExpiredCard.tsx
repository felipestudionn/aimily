/* Viewer-facing page when the /p/[token] share has expired.
   Same dark canvas as the deck so the transition feels native. */

import { Clock } from 'lucide-react';

interface Props {
  expiredAt: string; // ISO timestamp
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function ExpiredCard({ expiredAt }: Props) {
  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="w-full max-w-[480px] rounded-[20px] bg-white p-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-carbon/[0.06] mb-6">
          <Clock className="w-5 h-5 text-carbon/50" strokeWidth={2} />
        </div>
        <h1 className="text-[24px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-3">
          This link has expired
        </h1>
        <p className="text-[14px] text-carbon/55 leading-[1.6] mb-6">
          The presentation behind this URL is no longer available. Expired on {formatWhen(expiredAt)}.
        </p>
        <p className="text-[12px] text-carbon/40">
          Ask the sender for a fresh link.
        </p>
      </div>
    </div>
  );
}

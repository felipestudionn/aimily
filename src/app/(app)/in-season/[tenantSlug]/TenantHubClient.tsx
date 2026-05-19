'use client';

/**
 * Client wrapper for the Strategy tenant hub. The parent page.tsx is a
 * server component (data fetch + RLS-gated queries); this component
 * receives all 4 cards' data via props and renders them with locale-aware
 * copy via useTranslation.
 *
 * Mirrors the Gold Standard 4-card pattern from CLAUDE.md verbatim.
 */

import Link from 'next/link';
import { Building2, ShieldCheck, ArrowRight, Check, FileText } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface Tenant {
  slug: string;
  display_name: string;
  legal_name: string | null;
  tier: string;
  isolation_mode: string;
  role: string;
}

interface HubCardData {
  number: number;
  /** Stable kind for translation lookups. */
  kind: 'sources' | 'creative' | 'buyStrategy' | 'analysis';
  href: string;
  progress: number;
  /** Pre-computed status fragment with placeholders resolved on the client. */
  status:
    | { kind: 'sourcesNone' }
    | { kind: 'sourcesIngesting'; count: number }
    | { kind: 'sourcesProcessed'; count: number }
    | { kind: 'briefConfirmed'; label?: string | null }
    | { kind: 'briefNotStarted' }
    | { kind: 'archetypeConfirmed'; id: string }
    | { kind: 'archetypeNotStarted' }
    | { kind: 'runsComplete'; count: number }
    | { kind: 'runInProgress' }
    | { kind: 'runsNone' };
}

interface Props {
  tenant: Tenant;
  cards: HubCardData[];
  latestCompletedRunId: string | null;
}

export function TenantHubClient({ tenant, cards, latestCompletedRunId }: Props) {
  const t = useTranslation();
  const completedCount = cards.filter((c) => c.progress === 100).length;
  const allFour = completedCount === 4;

  // ── Static tenant chips (tier + isolation labels stay English on purpose;
  // these are technical terms in our internal contract, not user-facing
  // marketing copy). ────────────────────────────────────────────────────
  const TIER_LABELS: Record<string, string> = {
    tier2_mid: 'Tier-2 Mid',
    tier2_premium: 'Tier-2 Premium',
    tier1_fashion: 'Tier-1 Fashion',
    tier1_mega: 'Tier-1 Mega',
  };
  const ISOLATION_LABELS: Record<string, string> = {
    shared_rls: 'Shared · RLS',
    dedicated_schema: 'Dedicated schema',
    dedicated_project: 'Dedicated project',
    vpc_byoc: 'VPC · BYOC',
  };

  function renderStatus(status: HubCardData['status']): string {
    const c = t.strategy.hub.cardStatus;
    switch (status.kind) {
      case 'sourcesNone':
        return c.sourcesNone;
      case 'sourcesIngesting':
        return c.sourcesIngesting.replace('{count}', String(status.count));
      case 'sourcesProcessed':
        return c.sourcesProcessed.replace('{count}', String(status.count));
      case 'briefConfirmed':
        return status.label ?? c.briefConfirmed;
      case 'briefNotStarted':
        return c.briefNotStarted;
      case 'archetypeConfirmed':
        return c.archetypeConfirmed.replace('{id}', status.id);
      case 'archetypeNotStarted':
        return c.archetypeNotStarted;
      case 'runsComplete':
        return c.runsComplete
          .replace('{count}', String(status.count))
          .replace('{plural}', status.count === 1 ? '' : 's');
      case 'runInProgress':
        return c.runInProgress;
      case 'runsNone':
        return c.runsNone;
    }
  }

  function renderCardLabel(kind: HubCardData['kind']) {
    return t.strategy.hub.cards[kind];
  }

  return (
    <main className="min-h-screen bg-shade px-6 py-12 md:px-12 xl:px-16">
      <div className="mx-auto max-w-[2200px]">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <Link
              href="/in-season"
              className="text-[12px] text-carbon/40 hover:text-carbon/70 transition-colors uppercase tracking-[0.08em]"
            >
              {t.strategy.hub.backToAllTenants}
            </Link>
            <nav className="flex items-center gap-1.5 text-[12px]">
              <Link
                href={`/in-season/${tenant.slug}/connections`}
                className="px-3 py-1.5 rounded-full bg-white border border-carbon/[0.08] text-carbon/60 hover:text-carbon hover:border-carbon/30 transition-colors"
              >
                Conexiones
              </Link>
              <Link
                href={`/in-season/${tenant.slug}/seeds`}
                className="px-3 py-1.5 rounded-full bg-white border border-carbon/[0.08] text-carbon/60 hover:text-carbon hover:border-carbon/30 transition-colors"
              >
                Semillas In-Season
              </Link>
            </nav>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-carbon/[0.04] text-[11px] text-carbon/50 uppercase tracking-[0.08em]">
                  <Building2 className="h-3 w-3" />
                  {TIER_LABELS[tenant.tier] || tenant.tier}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-carbon/[0.04] text-[11px] text-carbon/50 uppercase tracking-[0.08em]">
                  <ShieldCheck className="h-3 w-3" />
                  {ISOLATION_LABELS[tenant.isolation_mode] || tenant.isolation_mode}
                </span>
                <span className="text-[11px] text-carbon/35 uppercase tracking-[0.08em]">
                  {tenant.role}
                </span>
              </div>
              <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.05]">
                {tenant.display_name}
              </h1>
              {tenant.legal_name && tenant.legal_name !== tenant.display_name && (
                <p className="mt-2 text-[14px] text-carbon/50">{tenant.legal_name}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
                {t.strategy.hub.progressLabel}
              </div>
              <div className="text-[28px] font-semibold text-carbon tabular-nums tracking-[-0.03em] mt-1">
                {completedCount}/4
              </div>
            </div>
          </div>
        </header>

        {/* 4 Gold Standard hub cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {cards.map((card) => {
            const isComplete = card.progress === 100;
            const isStarted = card.progress > 0;
            const n = card.number;
            const label = renderCardLabel(card.kind);
            return (
              <Link
                key={card.number}
                href={card.href}
                className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
              >
                {/* Ghost number */}
                <div className="mb-10">
                  <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
                    0{n}.
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-5">
                  {label.title}
                </h3>

                {/* Description */}
                <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em]">
                  {label.description}
                </p>

                {/* Status line */}
                <p className="text-[11px] text-carbon/35 uppercase tracking-[0.08em] mt-5">
                  {renderStatus(card.status)}
                </p>

                <div className="flex-1" />

                {/* CTA pill */}
                <div className="flex justify-center mt-10">
                  <div
                    className={`inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
                      isComplete
                        ? 'border border-carbon/[0.15] text-carbon group-hover:bg-carbon/[0.04]'
                        : 'bg-carbon text-white group-hover:bg-carbon/90'
                    }`}
                  >
                    {isComplete
                      ? t.strategy.hub.cards.ctaCompleted
                      : isStarted
                      ? t.strategy.hub.cards.ctaContinue
                      : t.strategy.hub.cards.ctaStart}
                    {!isComplete && (
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    )}
                    {isComplete && <Check className="h-3.5 w-3.5" />}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 mx-auto w-[120px] h-[6px] rounded-full bg-carbon/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-carbon/30 transition-all duration-1000 ease-out"
                    style={{ width: `${card.progress}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Output band */}
        {allFour && latestCompletedRunId ? (
          <Link
            href={`/strategy/${tenant.slug}/runs/${latestCompletedRunId}/decision-pack`}
            className="group block bg-white rounded-[20px] p-10 md:p-14 transition-all duration-300 hover:scale-[1.005] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-carbon/55" />
                  <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
                    {t.strategy.hub.output}
                  </span>
                </div>
                <h2 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15]">
                  {t.strategy.hub.decisionPackReadyTitle}
                </h2>
                <p className="text-[14px] text-carbon/55 mt-2 max-w-2xl leading-relaxed">
                  {t.strategy.hub.decisionPackReadyDescription}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 py-2.5 px-7 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] group-hover:bg-carbon/90 transition-colors">
                {t.strategy.hub.decisionPackOpen}
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="bg-white rounded-[20px] p-10 md:p-14 ring-1 ring-carbon/[0.04]">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-carbon/40" />
                  <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/35">
                    {t.strategy.hub.output}
                  </span>
                </div>
                <h2 className="text-[24px] md:text-[28px] font-semibold text-carbon/40 tracking-[-0.03em] leading-[1.15]">
                  {t.strategy.hub.decisionPackLockedTitle}
                </h2>
                <p className="text-[14px] text-carbon/45 mt-2 max-w-2xl leading-relaxed">
                  {t.strategy.hub.decisionPackLockedDescription}
                </p>
              </div>
              <div className="text-right">
                <div className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/35">
                  {t.strategy.hub.missingLabel}
                </div>
                <div className="text-[20px] font-semibold text-carbon/50 tabular-nums tracking-[-0.02em] mt-1">
                  {t.strategy.hub.missingOfFour.replace('{n}', String(4 - completedCount))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

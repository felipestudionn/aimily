/**
 * 02.4 Plan Financiero · Sonnet narrative + risks (Sprint B.4, 2026-05-09)
 *
 * The numbers are computed deterministically (see lib/financial-plan/calculate.ts).
 * Sonnet produces ONLY the editorial layer:
 *   - 1 paragraph executive narrative (3-4 sentences)
 *   - 2-3 risk flags (each: title + description + severity)
 *   - 2-3 levers (the numbers the user should keep an eye on)
 *
 * Anti-leak: brandName must be the confirmed brand (e.g. "Nudo"), NEVER
 * the working title (e.g. "AZUR"). Numbers must NEVER be invented — only
 * cite the values fed in via the user message.
 */

import type { FinancialPlan } from '@/lib/financial-plan/calculate';

export interface FinancialNarrative {
  narrative: string;        // 3-4 sentence executive summary
  risks: Array<{
    title: string;          // short, e.g. "Sell-through stalls at week 12"
    description: string;    // 1-2 sentences
    severity: 'low' | 'medium' | 'high';
  }>;
  levers: Array<{
    label: string;          // e.g. "Margen objetivo"
    why_it_matters: string; // 1 sentence
  }>;
}

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish (Castilian)',
  en: 'English',
  fr: 'French',
  it: 'Italian',
  de: 'German',
  pt: 'Portuguese (Brazilian)',
  nl: 'Dutch',
  sv: 'Swedish',
  no: 'Norwegian (Bokmål)',
};

function langDirective(language: string): string {
  if (!language || language === 'en') return '';
  const name = LANG_NAMES[language];
  if (!name) return '';
  return `\n\nIMPORTANT LANGUAGE INSTRUCTION: You MUST respond entirely in ${name}. ALL fields (narrative, risk titles + descriptions, lever labels) must be written in ${name}. Universally English business terms (P&L, ROI, CAC, sell-through, drop, DTC) may stay in English.`;
}

const PERSONA = `You are a CFO-grade financial analyst with 15 years of experience advising contemporary fashion brands on their first commercial year. You read plans like balance sheets — quickly identifying where the math is fragile, what assumption is doing the heavy lifting, and which lever the founder should pull when reality diverges from forecast. You never invent numbers; you ALWAYS cite the values the user gave you. Your voice is calm, sharp, and honest — flag the risks without dramatizing them.`;

export function buildFinancialNarrativePrompt(args: {
  brandName: string;
  brandTagline: string;
  archetypeName: string;
  productCategory: string;
  plan: FinancialPlan;
  totalInvestment: number;
  language: string;
}): { system: string; user: string; temperature: number } {
  const { brandName, brandTagline, archetypeName, productCategory, plan, totalInvestment, language } = args;

  const system = `${PERSONA}

You are reading the FULL financial plan for ${brandName} (${archetypeName} archetype) and producing the editorial layer the founder will read first: an executive narrative, 2-3 risk flags, and 2-3 levers to watch.

NON-NEGOTIABLE RULES:
- Cite ONLY the numbers in the plan. NEVER invent metrics.
- BRAND NAME = ${brandName}. Never echo working titles.
- Risk flags must be SPECIFIC and ACTIONABLE — say WHAT could go wrong, when, and what to watch. Avoid generic "marketing might underperform" risks.
- Severity rubric:
  · low    = manageable, normal Y1 turbulence
  · medium = needs a contingency plan, but not existential
  · high   = if this breaks, the year breaks
- Tone: founder-to-founder, not consultant fluff. Use Spanish word "tail" only if the user is in English.
${langDirective(language)}`;

  const user = `BRAND: ${brandName}${brandTagline ? ` — "${brandTagline}"` : ''}
PRODUCT CATEGORY: ${productCategory || 'contemporary fashion'}
ARCHETYPE: ${archetypeName}
TOTAL INVESTMENT: €${totalInvestment.toLocaleString()}

═══ THE FULL PLAN ═══

P&L (Y1):
  Revenue:           €${plan.pnl.revenue.toLocaleString()}
  COGS:              €${plan.pnl.cogs.toLocaleString()}
  Gross profit:      €${plan.pnl.gross_profit.toLocaleString()}  (${plan.pnl.gross_margin_pct}% margin)
  Marketing spend:   €${plan.pnl.marketing_spend.toLocaleString()}
  Net contribution:  €${plan.pnl.net_contribution.toLocaleString()}  (${plan.pnl.net_margin_pct}% net margin)
  ROI:               ${plan.pnl.return_on_investment.toFixed(2)}× on €${totalInvestment.toLocaleString()} invested
  Units to sell:     ${plan.pnl.units_to_sell.toLocaleString()}
  Blended avg price: €${plan.pnl.blended_avg_price}

Channel revenue split:
${plan.channel_revenue.map(c => `  ${c.label}: ${c.share_pct}% of revenue (€${c.revenue.toLocaleString()}) · ${c.units} units @ €${c.effective_price} effective`).join('\n')}

Sell-through (annualised forecast from 02.3):
${plan.monthly_revenue.map(m => `  M${m.month}: €${m.revenue.toLocaleString()} (${m.cumulative_pct}% cumulative)${m.drop_label ? ` · ${m.drop_label}` : ''}`).join('\n')}

Markdown calendar:
  Initial markdown:  week ${plan.markdown_calendar.start_week} · ${plan.markdown_calendar.initial_markdown_pct}%
  Deep markdown:     week ${plan.markdown_calendar.deep_markdown_week} · ${plan.markdown_calendar.deep_markdown_pct}%
  Rationale:         ${plan.markdown_calendar.rationale}

Break-even:
  ${plan.break_even.week ? `Week ${plan.break_even.week}` : 'NOT reached within Y1'} (requires €${plan.break_even.revenue_required.toLocaleString()} cumulative revenue)

═══ END PLAN ═══

Return ONLY valid JSON (no markdown, no fences):
{
  "narrative": "...",
  "risks": [
    {"title": "...", "description": "...", "severity": "low"}
  ],
  "levers": [
    {"label": "...", "why_it_matters": "..."}
  ]
}

Replace ALL placeholders. Be specific.`;

  return { system, user, temperature: 0.55 };
}

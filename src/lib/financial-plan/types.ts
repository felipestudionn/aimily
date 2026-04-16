/* ═══════════════════════════════════════════════════════════════════
   Financial Plan — pre-business plan for a fashion collection.

   The Merchandising > Financial Plan workspace is not a data-capture
   screen. It's a COMPOSITION on top of decisions already made:
     - Buying Strategy → scenario selected (production budget, Y1 target,
       margin, SKU count)
     - Pricing → avg selling price per family
     - Distribution → channel mix
     - Drops → cash-in timing

   The user owns FOUR assumption fields (sell-through, markdown, dev %,
   working-capital weeks) plus a marketing investment placeholder. Every
   other number is derived.

   Shape of the persisted object:
     collection_workspace_data.merchandising.cardData.budget.data = FinancialPlanState
   Shape of the CIS record (written on confirm, consumed by Presentation
   and by AI prompts that need investor framing):
     collection_decisions (merchandising, financial_plan, pre_business_plan) = FinancialPlan
   ═══════════════════════════════════════════════════════════════════ */

/* Inputs owned by the user — the only editable fields on this screen. */
export interface FinancialPlanInputs {
  assumptions: {
    /** Full-price sell-through rate %. Base = 60. Drives revenue scenarios. */
    fullPriceSellThrough: number;
    /** Expected markdown depth on the remainder (%). Base = 30. */
    markdownDepth: number;
    /** Development one-time cost as % of production. Base = 10. */
    developmentCostPct: number;
    /** Inventory weeks on hand before sell-through starts. Base = 8. */
    workingCapitalWeeks: number;
  };
  marketing: {
    /** 'pending' until investment decision is made. */
    status: 'pending' | 'set';
    /** € committed. null while status === 'pending'. */
    investment: number | null;
    /** If user hasn't committed a number, we assume this % of target revenue
        for margin math. Base = 8. */
    assumedPctOfRevenue: number;
  };
  /** Which of the three revenue scenarios the user is committing to. */
  selectedScenario: 'conservative' | 'target' | 'stretch';
  /** Optional free-text thesis the user can override on the AI-generated
      narrative. Pulled into the presentation slide. */
  narrativeOverride?: string;
}

/** Defaults for a fresh screen. */
export const DEFAULT_INPUTS: FinancialPlanInputs = {
  assumptions: {
    fullPriceSellThrough: 60,
    markdownDepth: 30,
    developmentCostPct: 10,
    workingCapitalWeeks: 8,
  },
  marketing: {
    status: 'pending',
    investment: null,
    assumedPctOfRevenue: 8,
  },
  selectedScenario: 'target',
};

/* Sourced from other merchandising cards. Read-only on this screen. */
export interface FinancialPlanSources {
  /** id of the scenario selected in Buying Strategy — drives everything. */
  scenarioId?: string;
  scenarioName?: string;
  /** € production budget from the selected scenario. 0 if no scenario yet. */
  productionBudget: number;
  /** Scenario's Y1 sales target. Acts as the 'target' revenue line. */
  targetRevenue: number;
  /** Scenario's target gross margin %. */
  targetMarginPct: number;
  /** Number of SKUs in the selected scenario. */
  totalSkus: number;
  /** Weighted avg PVP across pricing rows (optional, informational). */
  avgSellingPrice?: number;
  /** Channel mix normalized to sum 100. */
  channelMix: { channel: string; pct: number }[];
  /** Drop cadence — used for cash-in timing. Empty = single revenue flow. */
  drops: { name: string; launchMonth: number; weight: number }[];
}

/* Purely derived. Never stored — recomputed on every read. */
export interface FinancialPlanDerived {
  investment: {
    production: number;
    development: number;
    marketing: number;           // 0 if status === 'pending' (real effective €)
    marketingAssumed: number;    // The € we use for margin math regardless
    workingCapital: number;
    total: number;
    /** Same as total but including marketingAssumed instead of marketing. */
    totalWithAssumedMarketing: number;
  };
  revenue: {
    conservative: number;        // target × 0.8
    target: number;              // scenario.firstYearSalesTarget
    stretch: number;             // target × 1.2
    selected: number;            // whichever scenario user picked
  };
  margin: {
    grossMargin: number;         // selectedRevenue × targetMarginPct
    grossMarginPct: number;
    contributionMargin: number;  // gross - marketingAssumed
    contributionMarginPct: number;
  };
  kpis: {
    totalInvestment: number;
    expectedRevenue: number;
    grossMarginPct: number;
    roi: number;                 // contribution / totalWithAssumedMarketing
    paybackMonths: number;       // 12 × total / contribution (capped at 99)
  };
  /** 13 points: month 0..12. Cumulative cash positions. */
  cashCurve: { month: number; cashOut: number; cashIn: number; net: number }[];
}

export interface FinancialPlanNarrative {
  /** 10-14 word hero line. Shown as the big stat on the presentation slide. */
  headline: string;
  /** 60-100 word business thesis. */
  thesis: string;
  /** 2-3 bullet assumptions. */
  assumptions: string[];
  /** 2-3 bullet risks. */
  risks: string[];
  /** Optional note when marketing is still pending. */
  marketingNote?: string;
}

/** The full object. Sources + Inputs + Derived + Narrative. */
export interface FinancialPlan {
  inputs: FinancialPlanInputs;
  sources: FinancialPlanSources;
  derived: FinancialPlanDerived;
  narrative?: FinancialPlanNarrative;
  generatedAt?: string;
  generatedBy?: 'user' | 'ai';
}

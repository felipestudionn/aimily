'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Lock, ShoppingBag, DollarSign, Store, Calculator, LayoutGrid } from 'lucide-react';
import { useState } from 'react';

/* ═══════════════════════════════════════════════════════════
   Merchandising & Planning Block — 4 Cards + Collection Builder
   Familias → Pricing → Canales → Budget → Builder
   ═══════════════════════════════════════════════════════════ */

interface MerchCard {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  icon: React.ElementType;
  lockedBy?: string; // card ID that must be validated first
  hasAiModes: boolean;
}

const MERCH_CARDS: MerchCard[] = [
  {
    id: 'families',
    name: 'Product Families',
    nameEs: 'Familias de Producto',
    description: 'Define main categories (Footwear, Apparel, Accessories) and sub-categories. The foundation for your entire collection structure.',
    icon: ShoppingBag,
    hasAiModes: true,
  },
  {
    id: 'pricing',
    name: 'Pricing',
    nameEs: 'Pricing',
    description: 'Set min/max price ranges for each family and sub-category. AI can pre-fill based on your consumer profile and market.',
    icon: DollarSign,
    lockedBy: 'families',
    hasAiModes: true,
  },
  {
    id: 'channels',
    name: 'Channels & Markets',
    nameEs: 'Canales y Mercados',
    description: 'Select distribution channels (DTC, Wholesale, custom) and define target markets with AI-powered opportunity analysis.',
    icon: Store,
    hasAiModes: true,
  },
  {
    id: 'budget',
    name: 'Budget & Financials',
    nameEs: 'Budget y Financieros',
    description: 'Sales target, margins, discounts, sell-through months, and product segmentation (Revenue / Image / Entry × Newness / Carry-Over).',
    icon: Calculator,
    hasAiModes: true,
  },
];

const INPUT_MODES = [
  { id: 'free', label: 'Libre' },
  { id: 'assisted', label: 'Asistido' },
  { id: 'ai', label: 'Propuesta IA' },
];

export default function MerchandisingPage() {
  const { id } = useParams();
  const router = useRouter();
  const [validated, setValidated] = useState<Set<string>>(new Set());

  function isLocked(card: MerchCard): boolean {
    if (!card.lockedBy) return false;
    return !validated.has(card.lockedBy);
  }

  function toggleValidation(cardId: string) {
    setValidated((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  const allValidated = MERCH_CARDS.every((c) => validated.has(c.id));

  return (
    <div className="min-h-[80vh]">
      <div className="px-8 md:px-12 lg:px-16 py-12">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => router.push(`/collection/${id}`)}
            className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3 hover:text-carbon/50 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-3 w-3" /> Overview
          </button>
          <h2 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
            Merchandising & <span className="italic">Planning</span>
          </h2>
          <p className="text-sm text-carbon/40 mt-2 max-w-lg">
            Define product families, pricing, channels, and budget. Validate all four cards to unlock the Collection Builder.
          </p>
        </div>

        {/* Validation Progress */}
        <div className="flex items-center gap-4 mb-10">
          {MERCH_CARDS.map((card) => (
            <div key={card.id} className="flex items-center gap-2">
              <div className={`w-6 h-6 flex items-center justify-center text-[10px] font-medium transition-all ${
                validated.has(card.id)
                  ? 'bg-carbon text-crema'
                  : isLocked(card)
                  ? 'bg-carbon/[0.04] text-carbon/20'
                  : 'bg-carbon/[0.06] text-carbon/40'
              }`}>
                {validated.has(card.id) ? '✓' : isLocked(card) ? <Lock className="h-2.5 w-2.5" /> : MERCH_CARDS.indexOf(card) + 1}
              </div>
              <span className={`text-[11px] font-medium tracking-[0.05em] uppercase ${
                validated.has(card.id) ? 'text-carbon' : 'text-carbon/30'
              }`}>
                {card.nameEs}
              </span>
              {MERCH_CARDS.indexOf(card) < MERCH_CARDS.length - 1 && (
                <ArrowRight className="h-3 w-3 text-carbon/15 ml-2" />
              )}
            </div>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {MERCH_CARDS.map((card) => {
            const Icon = card.icon;
            const locked = isLocked(card);
            const valid = validated.has(card.id);

            return (
              <div
                key={card.id}
                className={`group relative bg-white p-10 lg:p-12 transition-all duration-300 overflow-hidden border flex flex-col min-h-[320px] ${
                  locked
                    ? 'border-carbon/[0.04] opacity-50 cursor-not-allowed'
                    : 'border-carbon/[0.06] hover:shadow-lg cursor-pointer'
                }`}
              >
                {/* Validated badge */}
                {valid && (
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-carbon" />
                )}

                {/* Icon + Title */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className={`w-10 h-10 flex items-center justify-center mb-4 ${
                      locked ? 'bg-carbon/[0.02]' : 'bg-carbon/[0.04]'
                    }`}>
                      {locked ? (
                        <Lock className="h-5 w-5 text-carbon/20" />
                      ) : (
                        <Icon className="h-5 w-5 text-carbon/50" />
                      )}
                    </div>
                    <h3 className="text-xl font-light text-carbon tracking-tight">
                      {card.name}
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-carbon/40 font-light leading-relaxed flex-1">
                  {card.description}
                </p>

                {/* Input Mode Pills */}
                {card.hasAiModes && !locked && (
                  <div className="mt-6 flex items-center gap-2">
                    {INPUT_MODES.map((mode) => (
                      <span
                        key={mode.id}
                        className="px-3 py-1.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-carbon/[0.08] text-carbon/30"
                      >
                        {mode.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* CTA / Lock / Validate */}
                {locked ? (
                  <div className="mt-6 flex items-center justify-center gap-2 bg-carbon/[0.04] text-carbon/20 py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em]">
                    <Lock className="h-3 w-3" /> Requires {MERCH_CARDS.find((c) => c.id === card.lockedBy)?.nameEs}
                  </div>
                ) : (
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex-1 flex items-center justify-center gap-2 bg-carbon text-crema py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em] group-hover:bg-carbon/90 transition-colors">
                      {valid ? 'Edit' : 'Start'} <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleValidation(card.id);
                      }}
                      className={`flex items-center justify-center gap-1.5 py-3 px-4 text-[11px] font-medium uppercase tracking-[0.15em] border transition-all ${
                        valid
                          ? 'bg-carbon text-crema border-carbon'
                          : 'border-carbon/[0.12] text-carbon/40 hover:border-carbon/30 hover:text-carbon/60'
                      }`}
                    >
                      ✓ {valid ? 'Validated' : 'Validate'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Collection Builder CTA */}
        <div className={`mt-8 p-8 border transition-all ${
          allValidated
            ? 'bg-white border-carbon/[0.06] hover:shadow-lg cursor-pointer'
            : 'bg-carbon/[0.02] border-carbon/[0.04] cursor-not-allowed'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 flex items-center justify-center ${
                allValidated ? 'bg-carbon/[0.04]' : 'bg-carbon/[0.02]'
              }`}>
                {allValidated ? (
                  <LayoutGrid className="h-6 w-6 text-carbon/50" />
                ) : (
                  <Lock className="h-5 w-5 text-carbon/15" />
                )}
              </div>
              <div>
                <h3 className={`text-xl font-light tracking-tight ${
                  allValidated ? 'text-carbon' : 'text-carbon/25'
                }`}>
                  Collection Builder
                </h3>
                <p className={`text-sm font-light mt-1 ${
                  allValidated ? 'text-carbon/40' : 'text-carbon/15'
                }`}>
                  {allValidated
                    ? 'All cards validated — build your SKU collection'
                    : 'Validate all 4 cards above to unlock the Collection Builder'
                  }
                </p>
              </div>
            </div>
            {allValidated && (
              <button
                onClick={() => router.push(`/collection/${id}/product`)}
                className="flex items-center gap-2 bg-carbon text-crema py-3 px-6 text-[11px] font-medium uppercase tracking-[0.15em] hover:bg-carbon/90 transition-colors"
              >
                Open Builder <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

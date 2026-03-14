'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Pencil, Package, CheckSquare, Factory, LayoutGrid } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { Dictionary } from '@/i18n';

/* ═══════════════════════════════════════════════════════════
   Design & Development Block — 4 Phases as Layers
   Each phase adds dimensions to the Collection Builder
   ═══════════════════════════════════════════════════════════ */

interface DevPhase {
  id: string;
  number: number;
  nameKey: keyof Dictionary['developmentPage'];
  descKey: keyof Dictionary['developmentPage'];
  icon: React.ElementType;
  route: string;
  dimensionKeys: (keyof Dictionary['developmentPage'])[];
  requiresPrevious: boolean;
}

const DEV_PHASES: DevPhase[] = [
  {
    id: 'sketch',
    number: 1,
    nameKey: 'phase1Name',
    descKey: 'phase1Desc',
    icon: Pencil,
    route: 'design',
    dimensionKeys: ['dimSketch', 'dimColorways', 'dimMaterials'],
    requiresPrevious: false,
  },
  {
    id: 'prototyping',
    number: 2,
    nameKey: 'phase2Name',
    descKey: 'phase2Desc',
    icon: Package,
    route: 'prototyping',
    dimensionKeys: ['dimProtoPhoto', 'dimProtoStatus', 'dimApprovedColor', 'dimNotes'],
    requiresPrevious: true,
  },
  {
    id: 'selection',
    number: 3,
    nameKey: 'phase3Name',
    descKey: 'phase3Desc',
    icon: CheckSquare,
    route: 'sampling',
    dimensionKeys: ['dimFinalProto', 'dimFinalColor', 'dimAdjustedPVP', 'dimAICatalogImage'],
    requiresPrevious: true,
  },
  {
    id: 'production',
    number: 4,
    nameKey: 'phase4Name',
    descKey: 'phase4Desc',
    icon: Factory,
    route: 'production',
    dimensionKeys: ['dimUnits', 'dimFactory', 'dimDeliveryDate', 'dimQCStatus', 'dimExportPO'],
    requiresPrevious: true,
  },
];

export default function DevelopmentPage() {
  const { id } = useParams();
  const router = useRouter();
  const collectionId = id as string;
  const t = useTranslation();

  return (
    <div className="min-h-[80vh]">
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-10 pl-12 md:pl-0">
          <button
            onClick={() => router.push(`/collection/${collectionId}`)}
            className="text-[10px] sm:text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3 hover:text-carbon/50 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-3 w-3" /> {t.developmentPage.backToOverview}
          </button>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
            {t.developmentPage.title} <span className="italic">{t.developmentPage.titleItalic}</span>
          </h2>
          <p className="text-xs sm:text-sm text-carbon/40 mt-2 max-w-lg">
            {t.developmentPage.description}
          </p>
        </div>

        {/* Collection Builder Core Indicator */}
        <div className="mb-8 p-5 bg-carbon/[0.03] border border-carbon/[0.06] flex items-center gap-4">
          <LayoutGrid className="h-5 w-5 text-carbon/30 flex-shrink-0" />
          <div>
            <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-carbon/40">
              {t.developmentPage.collectionBuilderCenter}
            </p>
            <p className="text-xs text-carbon/30 mt-0.5">
              {t.developmentPage.collectionBuilderDesc}
            </p>
          </div>
        </div>

        {/* Phases — Vertical Timeline Layout */}
        <div className="space-y-5">
          {DEV_PHASES.map((phase) => {
            const Icon = phase.icon;

            return (
              <Link
                key={phase.id}
                href={`/collection/${collectionId}/${phase.route}`}
                className="group relative bg-white p-4 sm:p-6 md:p-8 lg:p-10 hover:shadow-lg transition-all duration-300 overflow-hidden border border-carbon/[0.06] flex items-start gap-4 sm:gap-6 md:gap-8 cursor-pointer block"
              >
                {/* Phase Number */}
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-carbon/[0.04] flex items-center justify-center">
                  <span className="text-base sm:text-lg font-light text-carbon/30">{phase.number}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="h-4 w-4 text-carbon/40" />
                    <h3 className="text-lg sm:text-xl font-light text-carbon tracking-tight">
                      {t.developmentPage[phase.nameKey]}
                    </h3>
                    {phase.requiresPrevious && (
                      <span className="text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/20 border border-carbon/[0.08] px-2 py-0.5">
                        {t.developmentPage.sequential}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-carbon/40 font-light leading-relaxed mb-4">
                    {t.developmentPage[phase.descKey]}
                  </p>

                  {/* Dimensions added */}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {phase.dimensionKeys.map((dimKey) => (
                      <span
                        key={dimKey}
                        className="px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-medium tracking-[0.08em] uppercase bg-carbon/[0.03] text-carbon/35 border border-carbon/[0.06]"
                      >
                        + {t.developmentPage[dimKey]}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 self-center">
                  <ArrowRight className="h-4 w-4 text-carbon/20 group-hover:text-carbon/50 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, Package, Factory, Ruler } from 'lucide-react';

/**
 * Tech Pack Workspace
 *
 * 4-card hub (gold standard pattern) with:
 *   01. Technical Specs — construction, measurements, grading, seam allowances
 *   02. Bill of Materials — fabrics, trims, thread, hardware, labels
 *   03. Materials Sourcing — fabric suppliers database + selection per SKU
 *   04. Factory Sourcing — factory database + capacity + MOQ + lead time
 *
 * Clicking a card drills into that sub-section with inline breadcrumb.
 * Each sub-section will eventually be wired to /api/ai/generate-techpack
 * with full CIS context (product category, brand DNA, vibe) and persist
 * specs/BOM/supplier/factory selection into new Supabase tables.
 *
 * For launch, this is the scaffolding — the deep implementation of BOM,
 * suppliers DB, and factory DB ships in subsequent sprints.
 */

interface TechPackSection {
  id: string;
  number: string;
  title: string;
  description: string;
  icon: React.ElementType;
  comingSoon?: boolean;
}

const SECTIONS: TechPackSection[] = [
  {
    id: 'specs',
    number: '01',
    title: 'Technical Specs',
    description:
      'Construction details, measurements table, grading (XS–XXL), seam allowances, stitching specs and quality checkpoints for factory execution.',
    icon: Ruler,
  },
  {
    id: 'bom',
    number: '02',
    title: 'Bill of Materials',
    description:
      'Every fabric, trim, thread, label, and hardware with quantity per SKU, supplier reference, and unit cost. The complete material list the factory receives.',
    icon: FileText,
  },
  {
    id: 'materials',
    number: '03',
    title: 'Materials Sourcing',
    description:
      'Fabric and trim suppliers database — name, contact, MOQ, lead time, cost/yard, certifications (OEKO-TEX, GOTS). Select suppliers per BOM line.',
    icon: Package,
    comingSoon: true,
  },
  {
    id: 'factories',
    number: '04',
    title: 'Factory Sourcing',
    description:
      'Factory database — location, specialties, capacity, MOQ, lead time, cost per unit, past collaborations. Match factories to your product category.',
    icon: Factory,
    comingSoon: true,
  },
];

interface Props {
  collectionPlanId: string;
  collectionName: string;
  productCategory?: string;
}

export function TechPackWorkspace({ collectionPlanId, collectionName }: Props) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (activeSection) {
    const section = SECTIONS.find((s) => s.id === activeSection);
    if (!section) return null;
    const Icon = section.icon;
    return (
      <div className="min-h-[80vh]">
        <div className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16">
          <div className="mb-8 flex items-center justify-between">
            <button
              onClick={() => setActiveSection(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium text-carbon/50 hover:text-carbon hover:bg-carbon/[0.04] transition-all"
            >
              <ArrowLeft className="h-3 w-3" />
              Tech Pack
            </button>
            <div className="text-center">
              <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">{collectionName}</p>
              <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
                {section.title}
              </h1>
            </div>
            <div className="w-[120px]" />
          </div>

          <div className="mx-auto max-w-[960px] bg-white rounded-[20px] p-10 md:p-14 min-h-[500px] flex flex-col items-center justify-center text-center gap-6 border border-carbon/[0.06]">
            <Icon className="h-12 w-12 text-carbon/30" strokeWidth={1.25} />
            <div>
              <h2 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-tight mb-3">
                {section.title}
              </h2>
              <p className="text-[15px] text-carbon/55 leading-relaxed max-w-[540px]">{section.description}</p>
            </div>
            {section.comingSoon ? (
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[12px] font-medium bg-carbon/[0.04] text-carbon/50">
                Coming next sprint
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  /* Wire to /api/ai/generate-techpack with collectionPlanId in next sprint */
                  console.log('Generate tech pack for', collectionPlanId);
                }}
                className="inline-flex items-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] bg-carbon text-white hover:bg-carbon/90 transition-all"
              >
                Generate Tech Pack
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh]">
      <div className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16">
        <div className="text-center mb-12">
          <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">{collectionName}</p>
          <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
            Tech Pack
          </h1>
          <p className="text-[14px] text-carbon/45 mt-3 max-w-[640px] mx-auto leading-relaxed">
            The factory-ready document of every SKU. Specs, BOM, materials sourcing, factory sourcing — everything production needs.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-5">
          {SECTIONS.map((section) => {
            const progress: number = section.comingSoon ? 0 : 0;
            const isComplete = progress === 100;
            const isStarted = progress > 0;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[500px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
              >
                <div className="mb-10">
                  <span className="text-[72px] font-bold text-carbon/[0.05] leading-none tracking-[-0.04em]">
                    {section.number}.
                  </span>
                </div>

                <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-5">
                  {section.title}
                </h3>

                <p className="text-[14px] text-carbon/50 leading-[1.7] tracking-[-0.02em]">
                  {section.description}
                </p>

                <div className="flex-1" />

                <div className="flex justify-center mt-10">
                  <div
                    className={`inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-all ${
                      isComplete
                        ? 'border border-carbon/[0.15] text-carbon group-hover:bg-carbon/[0.04]'
                        : 'bg-carbon text-white group-hover:bg-carbon/90'
                    }`}
                  >
                    {isComplete ? 'Completed' : isStarted ? 'Continue' : 'Start'}
                    {!isComplete && <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />}
                    {isComplete && <Check className="h-3.5 w-3.5" />}
                  </div>
                </div>

                <div className="mt-4 mx-auto w-[120px] h-[6px] rounded-full bg-carbon/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-carbon/30 transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

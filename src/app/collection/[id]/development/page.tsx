'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Lock, Pencil, Package, CheckSquare, Factory, LayoutGrid } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   Design & Development Block — 4 Phases as Layers
   Each phase adds dimensions to the Collection Builder
   ═══════════════════════════════════════════════════════════ */

interface DevPhase {
  id: string;
  number: number;
  name: string;
  nameEs: string;
  description: string;
  icon: React.ElementType;
  route: string;
  dimensions: string[];
  requiresPrevious: boolean;
}

const DEV_PHASES: DevPhase[] = [
  {
    id: 'sketch',
    number: 1,
    name: 'Sketch, Color & Materials',
    nameEs: 'Sketch, Color y Materiales',
    description: 'Add design sketches (manual or AI-generated), colorways, and material specs to each SKU in the Collection Builder.',
    icon: Pencil,
    route: 'design',
    dimensions: ['Sketch', 'Colorways', 'Materials'],
    requiresPrevious: false,
  },
  {
    id: 'prototyping',
    number: 2,
    name: 'Prototyping',
    nameEs: 'Prototipado',
    description: 'Upload real prototype photos, review status (approved / with modifications / rejected), and select approved colors.',
    icon: Package,
    route: 'prototyping',
    dimensions: ['Proto Photo', 'Proto Status', 'Approved Color', 'Notes'],
    requiresPrevious: true,
  },
  {
    id: 'selection',
    number: 3,
    name: 'Final Selection & Catalog',
    nameEs: 'Selección Final y Catálogo',
    description: 'Assign final prototypes to each SKU, adjust pricing, and generate AI catalog images for sales.',
    icon: CheckSquare,
    route: 'sampling',
    dimensions: ['Final Proto', 'Final Color', 'Adjusted PVP', 'AI Catalog Image'],
    requiresPrevious: true,
  },
  {
    id: 'production',
    number: 4,
    name: 'Production',
    nameEs: 'Producción',
    description: 'Generate production orders, assign factories, track QC, manage logistics, and export Excel POs.',
    icon: Factory,
    route: 'production',
    dimensions: ['Units', 'Factory', 'Delivery Date', 'QC Status', 'Export PO'],
    requiresPrevious: true,
  },
];

export default function DevelopmentPage() {
  const { id } = useParams();
  const router = useRouter();
  const collectionId = id as string;

  return (
    <div className="min-h-[80vh]">
      <div className="px-8 md:px-12 lg:px-16 py-12">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => router.push(`/collection/${collectionId}`)}
            className="text-xs font-medium tracking-[0.25em] uppercase text-carbon/30 mb-3 hover:text-carbon/50 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-3 w-3" /> Overview
          </button>
          <h2 className="text-3xl md:text-4xl font-light text-carbon tracking-tight leading-[1.15]">
            Design & <span className="italic">Development</span>
          </h2>
          <p className="text-sm text-carbon/40 mt-2 max-w-lg">
            Four phases that layer new dimensions onto your Collection Builder. Each phase enriches your SKUs with design, prototyping, selection, and production data.
          </p>
        </div>

        {/* Collection Builder Core Indicator */}
        <div className="mb-8 p-5 bg-carbon/[0.03] border border-carbon/[0.06] flex items-center gap-4">
          <LayoutGrid className="h-5 w-5 text-carbon/30 flex-shrink-0" />
          <div>
            <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-carbon/40">
              Collection Builder is the center
            </p>
            <p className="text-xs text-carbon/30 mt-0.5">
              Each phase below adds columns and data to the same Collection Builder view.
            </p>
          </div>
        </div>

        {/* Phases — Vertical Timeline Layout */}
        <div className="space-y-5">
          {DEV_PHASES.map((phase, i) => {
            const Icon = phase.icon;
            const isFirst = i === 0;

            return (
              <Link
                key={phase.id}
                href={`/collection/${collectionId}/${phase.route}`}
                className="group relative bg-white p-8 lg:p-10 hover:shadow-lg transition-all duration-300 overflow-hidden border border-carbon/[0.06] flex items-start gap-8 cursor-pointer block"
              >
                {/* Phase Number */}
                <div className="flex-shrink-0 w-14 h-14 bg-carbon/[0.04] flex items-center justify-center">
                  <span className="text-lg font-light text-carbon/30">{phase.number}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="h-4 w-4 text-carbon/40" />
                    <h3 className="text-xl font-light text-carbon tracking-tight">
                      {phase.name}
                    </h3>
                    {phase.requiresPrevious && (
                      <span className="text-[10px] font-medium tracking-[0.1em] uppercase text-carbon/20 border border-carbon/[0.08] px-2 py-0.5">
                        Sequential
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-carbon/40 font-light leading-relaxed mb-4">
                    {phase.description}
                  </p>

                  {/* Dimensions added */}
                  <div className="flex flex-wrap gap-2">
                    {phase.dimensions.map((dim) => (
                      <span
                        key={dim}
                        className="px-3 py-1 text-[10px] font-medium tracking-[0.08em] uppercase bg-carbon/[0.03] text-carbon/35 border border-carbon/[0.06]"
                      >
                        + {dim}
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

'use client';

/* ═══════════════════════════════════════════════════════════════════
   TechPackWorkspace — hub for the collection's tech packs.

   Lists every SKU in the collection as a gold-standard card. Click
   a SKU → /collection/[id]/techpack/[skuId] opens the full technical
   sheet (TechPackSheet component) with inline-editable sections and
   comments thread.

   Replaces the earlier 4-card placeholder hub. The 4 sections
   (Specs / BOM / Materials / Factories) now live as sections inside
   each SKU's tech pack sheet, which is where the work actually
   happens.
   ═══════════════════════════════════════════════════════════════════ */

import Link from 'next/link';
import { FileText, ArrowRight, Building2, Factory as FactoryIcon } from 'lucide-react';
import { useSkus } from '@/hooks/useSkus';
import { useTranslation } from '@/i18n';

interface Props {
  collectionPlanId: string;
  collectionName: string;
  productCategory?: string;
}

export function TechPackWorkspace({ collectionPlanId, collectionName }: Props) {
  const { skus, loading } = useSkus(collectionPlanId);
  const t = useTranslation();
  const tp = (t as unknown as { techPack?: Record<string, string> }).techPack || {};

  return (
    <div className="min-h-[80vh]">
      <div className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16">
        <div className="text-center mb-12">
          <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-3">{collectionName}</p>
          <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.15]">
            {tp.hubTitle || 'Tech Pack'}
          </h1>
          <p className="text-[14px] text-carbon/45 mt-3 max-w-[640px] mx-auto leading-relaxed">
            {tp.hubIntro || 'The factory-ready document of every SKU. Open any style to edit its technical sheet — header, drawings, measurements, BOM, factory notes, comments.'}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 flex-wrap justify-center">
            <Link
              href={`/collection/${collectionPlanId}/suppliers`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-carbon/[0.12] text-carbon/70 text-[12px] font-semibold hover:bg-carbon/[0.04] transition-colors"
            >
              <Building2 className="h-3.5 w-3.5" strokeWidth={2} />
              {tp.hubSuppliers || 'Suppliers database'}
            </Link>
            <Link
              href={`/collection/${collectionPlanId}/factories`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-carbon/[0.12] text-carbon/70 text-[12px] font-semibold hover:bg-carbon/[0.04] transition-colors"
            >
              <FactoryIcon className="h-3.5 w-3.5" strokeWidth={2} />
              {tp.hubFactories || 'Factories database'}
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-[13px] text-carbon/40 text-center py-12">…</div>
        ) : skus.length === 0 ? (
          <div className="mx-auto max-w-[520px] text-center bg-white rounded-[20px] p-14 border border-carbon/[0.06]">
            <FileText className="h-6 w-6 text-carbon/30 mx-auto mb-5" strokeWidth={1.5} />
            <h3 className="text-[22px] font-semibold text-carbon tracking-[-0.03em] mb-3">
              {tp.hubEmptyHeading || 'No SKUs yet'}
            </h3>
            <p className="text-[14px] text-carbon/50 leading-[1.6]">
              {tp.hubEmptyBody || 'Once you add SKUs in the Collection Builder, each one gets a dedicated tech pack sheet with inline editing and a comments thread.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {skus.map((sku) => {
              const cover = sku.production_sample_url
                || sku.proto_iterations?.[sku.proto_iterations.length - 1]?.images?.[0]
                || sku.render_urls?.['3d']
                || sku.render_url
                || sku.sketch_url
                || sku.reference_image_url;
              return (
                <Link
                  key={sku.id}
                  href={`/collection/${collectionPlanId}/techpack/${sku.id}`}
                  className="group bg-white rounded-[20px] overflow-hidden hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-300"
                >
                  <div className="aspect-[4/5] bg-carbon/[0.02] relative">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover as string} alt={sku.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-carbon/15" strokeWidth={1.25} />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] tracking-[0.15em] uppercase font-semibold text-carbon/40 mb-1.5">
                      {sku.family} · Drop {sku.drop_number}
                    </p>
                    <h3 className="text-[15px] font-semibold text-carbon tracking-[-0.01em] leading-tight mb-4 truncate">
                      {sku.name}
                    </h3>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-carbon/60 group-hover:text-carbon transition-colors">
                      {tp.openSheet || 'Open tech pack'}
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

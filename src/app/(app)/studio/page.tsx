/* ═══════════════════════════════════════════════════════════════════════════
   /studio — Aimily Studio dashboard.

   The authenticated landing for Studio users. Lists the user's active
   studio_projects with outputs remaining and last-updated stamps. Empty
   state offers a CTA to create the first project.

   Server Component: resolves auth + projects server-side so the HTML
   reaches the browser populated, no skeleton flash.
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth/server-session';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ArrowRight, Plus, Camera } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface StudioProjectRow {
  id: string;
  brand_name: string;
  brand_logo_url: string | null;
  updated_at: string;
}

interface PurchaseAgg {
  studio_project_id: string;
  outputs_allocated: number;
  outputs_consumed: number;
}

export default async function StudioDashboardPage() {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  const [{ data: projectsData }, { data: purchasesData }] = await Promise.all([
    supabaseAdmin
      .from('studio_projects')
      .select('id, brand_name, brand_logo_url, updated_at')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('updated_at', { ascending: false }),
    supabaseAdmin
      .from('studio_purchases')
      .select('studio_project_id, outputs_allocated, outputs_consumed')
      .eq('user_id', user.id),
  ]);

  const projects = (projectsData || []) as StudioProjectRow[];
  const purchases = (purchasesData || []) as PurchaseAgg[];

  const outputsByProject = purchases.reduce((acc, p) => {
    if (!acc[p.studio_project_id]) acc[p.studio_project_id] = 0;
    acc[p.studio_project_id] += Math.max(p.outputs_allocated - p.outputs_consumed, 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <main className="min-h-screen bg-shade px-6 py-12 md:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-12 flex items-end justify-between gap-6">
          <div>
            <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-2">
              Aimily Studio
            </p>
            <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.05]">
              Tus campañas
            </h1>
            <p className="mt-3 text-[14px] text-carbon/50 max-w-xl leading-[1.6]">
              AI fashion content brand-locked. 12 formatos por output, listos
              para Instagram, TikTok, web, ecommerce y print.
            </p>
          </div>
          {projects.length > 0 && (
            <Link
              href="/studio/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
            >
              <Plus className="h-4 w-4" />
              Nuevo proyecto
            </Link>
          )}
        </header>

        {/* Empty state */}
        {projects.length === 0 && (
          <EmptyState />
        )}

        {/* Project grid (gold standard) */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {projects.map((p) => {
              const remaining = outputsByProject[p.id] || 0;
              return (
                <Link
                  key={p.id}
                  href={`/studio/${p.id}`}
                  className="group relative bg-white rounded-[20px] p-10 md:p-14 flex flex-col min-h-[420px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
                >
                  <div className="mb-8">
                    {p.brand_logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.brand_logo_url}
                        alt={p.brand_name}
                        className="h-14 w-auto object-contain mb-4"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-carbon/[0.04] flex items-center justify-center mb-4">
                        <Camera className="h-5 w-5 text-carbon/30" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-[24px] md:text-[28px] font-semibold text-carbon tracking-[-0.03em] leading-[1.15] mb-5">
                    {p.brand_name}
                  </h3>

                  <p className="text-[13px] text-carbon/50 leading-[1.7] tracking-[-0.02em]">
                    {remaining > 0
                      ? `${remaining} ${remaining === 1 ? 'output disponible' : 'outputs disponibles'}`
                      : 'Comprar pack para generar'}
                  </p>

                  <div className="flex-1" />

                  <div className="flex justify-center mt-10">
                    <div className="inline-flex items-center justify-center gap-2 py-2.5 px-7 rounded-full text-[13px] font-semibold tracking-[-0.01em] bg-carbon text-white group-hover:bg-carbon/90 transition-all">
                      Abrir
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* New project card */}
            <Link
              href="/studio/new"
              className="group relative rounded-[20px] p-10 md:p-14 flex flex-col items-center justify-center min-h-[420px] border-2 border-dashed border-carbon/15 text-carbon/40 hover:border-carbon/40 hover:text-carbon transition-all"
            >
              <Plus className="h-10 w-10 mb-4" />
              <p className="text-[14px] font-medium tracking-[-0.02em]">
                Nuevo proyecto
              </p>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-2xl rounded-[20px] bg-white p-12 md:p-16 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-carbon/[0.04] flex items-center justify-center mb-6">
        <Camera className="h-7 w-7 text-carbon/40" />
      </div>
      <h2 className="text-[28px] md:text-[36px] font-medium text-carbon tracking-[-0.03em] leading-[1.1] mb-4">
        Tu primera campaña
      </h2>
      <p className="text-[14px] text-carbon/55 leading-[1.7] max-w-md mx-auto mb-10">
        Crea un proyecto, sube tu producto y elige un modelo del casting Aimily.
        Outputs listos en minutos, en 12 formatos por imagen.
      </p>
      <Link
        href="/studio/new"
        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-carbon text-white text-[14px] font-semibold tracking-[-0.01em] transition-all hover:bg-carbon/90"
      >
        Crear proyecto
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

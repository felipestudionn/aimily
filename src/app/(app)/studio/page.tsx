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
import { ArrowRight, Plus, Camera, Layers, Film, ImageIcon, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface StudioProjectRow {
  id: string;
  brand_name: string;
  brand_logo_url: string | null;
  updated_at: string;
}


interface CollectionAssetRow {
  id: string;
  collection_plan_id: string;
  asset_type: string;
  name: string | null;
  url: string;
  thumbnail_url: string | null;
  created_at: string;
}

interface CollectionRow {
  id: string;
  name: string;
  season: string | null;
}

// Marketing-grade asset types only — render/sketch/moodboard/callout are
// design artefacts of the 360 builder and don't belong in Studio's library.
const STUDIO_LIBRARY_TYPES = ['editorial', 'lifestyle', 'still_life', 'video'] as const;

export default async function StudioDashboardPage() {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  // First fetch user's collections — we need their IDs to scope the
  // cross-collection asset query (assets are FK'd to collection_plans, not
  // to user_id directly).
  const { data: userCollections } = await supabaseAdmin
    .from('collection_plans')
    .select('id, name, season')
    .eq('user_id', user.id)
    .is('deleted_at', null);

  const collections = (userCollections || []) as CollectionRow[];
  const collectionsById = new Map(collections.map((c) => [c.id, c]));
  const collectionIds = collections.map((c) => c.id);

  const [{ data: projectsData }, { data: creditRow }, { data: assetsData }] = await Promise.all([
    supabaseAdmin
      .from('studio_projects')
      .select('id, brand_name, brand_logo_url, updated_at')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('updated_at', { ascending: false }),
    // Global credit balance — migration 077. The dashboard surfaces one
    // number ("X credits") rather than per-card output counts.
    supabaseAdmin
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle(),
    collectionIds.length > 0
      ? supabaseAdmin
          .from('collection_assets')
          .select('id, collection_plan_id, asset_type, name, url, thumbnail_url, created_at')
          .in('collection_plan_id', collectionIds)
          .in('asset_type', STUDIO_LIBRARY_TYPES as unknown as string[])
          .is('deleted_at', null)
          .is('studio_project_id', null)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as CollectionAssetRow[] }),
  ]);

  const projects = (projectsData || []) as StudioProjectRow[];
  const collectionAssets = (assetsData || []) as CollectionAssetRow[];
  const creditBalance = creditRow?.balance ?? 0;

  // Group cross-collection assets by collection_plan_id for the library view.
  const assetsByCollection = collectionAssets.reduce((acc, a) => {
    if (!acc[a.collection_plan_id]) acc[a.collection_plan_id] = [];
    acc[a.collection_plan_id].push(a);
    return acc;
  }, {} as Record<string, CollectionAssetRow[]>);
  const collectionsWithAssets = Object.keys(assetsByCollection)
    .map((id) => collectionsById.get(id))
    .filter((c): c is CollectionRow => Boolean(c));

  return (
    <main className="min-h-screen bg-shade px-6 py-12 md:px-12 xl:px-16">
      <div className="mx-auto max-w-[2200px]">
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

        {/* Empty state — only when there's literally nothing in either
            bucket (no standalone projects AND no marketing assets in any
            of the user's collections). With cross-collection visibility,
            the studio surface is meaningful even before standalone packs
            are bought. */}
        {projects.length === 0 && collectionAssets.length === 0 && (
          <EmptyState />
        )}

        {/* ── Standalone Studio projects ────────────────────────────── */}
        {projects.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-2.5 mb-6">
              <Camera className="h-4 w-4 text-carbon/55" />
              <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
                Proyectos Studio
              </span>
            </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
            {projects.map((p) => {
              // Post-077 unified credits: the dashboard shows one global
              // balance per project card so the user understands credits
              // are pooled. (The balance is the same on every card; we
              // keep it per-card so the UX reads "X credits available"
              // next to each project without making them hunt for it.)
              const remaining = creditBalance;
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
                      ? `${remaining} ${remaining === 1 ? 'crédito disponible' : 'créditos disponibles'}`
                      : 'Compra un pack o sube de plan para generar'}
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
          </section>
        )}

        {/* ── Cross-collection content library ──────────────────────── */}
        {collectionsWithAssets.length > 0 && (
          <section>
            <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <Layers className="h-4 w-4 text-carbon/55" />
                  <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
                    Contenido de tus colecciones
                  </span>
                </div>
                <p className="text-[13px] text-carbon/50 max-w-xl leading-[1.6]">
                  Editoriales, lifestyles, still life y vídeos generados dentro
                  del builder 360. Vive aquí también para que lo encuentres
                  desde Studio.
                </p>
              </div>
            </div>

            <div className="space-y-10">
              {collectionsWithAssets.map((col) => {
                const assets = assetsByCollection[col.id] || [];
                const counts = assets.reduce(
                  (acc, a) => {
                    acc[a.asset_type] = (acc[a.asset_type] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>,
                );
                return (
                  <div key={col.id}>
                    <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
                      <div>
                        <h3 className="text-[20px] font-semibold text-carbon tracking-[-0.03em] leading-[1.2]">
                          {col.name}
                          {col.season && (
                            <span className="ml-2 text-[12px] text-carbon/35 uppercase tracking-[0.06em] font-normal">
                              {col.season}
                            </span>
                          )}
                        </h3>
                        <p className="text-[12px] text-carbon/45 mt-1 flex gap-3 flex-wrap">
                          {counts.editorial > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              {counts.editorial} editorial
                            </span>
                          )}
                          {counts.video > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Film className="h-3 w-3" />
                              {counts.video} vídeo
                            </span>
                          )}
                          {counts.lifestyle > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />
                              {counts.lifestyle} lifestyle
                            </span>
                          )}
                          {counts.still_life > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />
                              {counts.still_life} still life
                            </span>
                          )}
                        </p>
                      </div>
                      <Link
                        href={`/collection/${col.id}/marketing`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-carbon/[0.04] hover:bg-carbon/[0.08] text-[12px] font-medium text-carbon/70 transition-colors"
                      >
                        Abrir en colección
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                      {assets.slice(0, 16).map((a) => (
                        <Link
                          key={a.id}
                          href={`/collection/${col.id}/marketing`}
                          className="group relative aspect-square rounded-[12px] overflow-hidden bg-white border border-carbon/[0.06] hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all"
                        >
                          {a.thumbnail_url || a.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={a.thumbnail_url || a.url}
                              alt={a.name || a.asset_type}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-carbon/30">
                              <ImageIcon className="h-6 w-6" />
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-full bg-white/90 text-[9px] text-carbon/60 uppercase tracking-[0.08em] font-medium">
                            {a.asset_type === 'still_life' ? 'still' : a.asset_type}
                          </div>
                        </Link>
                      ))}
                    </div>
                    {assets.length > 16 && (
                      <Link
                        href={`/collection/${col.id}/marketing`}
                        className="inline-block mt-3 text-[12px] text-carbon/50 hover:text-carbon transition-colors"
                      >
                        Ver los {assets.length} en {col.name} →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
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

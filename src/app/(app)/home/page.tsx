/* ═══════════════════════════════════════════════════════════════════════════
   /home — Free workspace landing.

   The single authenticated entry point. Shows all of the user's active
   projects across the three faces of the product (Collections · Studio ·
   In-Season) in one unified view, so the user can either continue an
   existing project or start a new one in any face — without going through
   an intent gate first.

   The three face hubs (/my-collections · /studio · /in-season) remain as
   per-face filtered views. The product switcher (top-right pill) always
   navigates to those hubs, not to active project URLs.

   Server Component: resolves auth + 3 parallel data fetches so the HTML
   reaches the browser populated, no skeleton flash.
   ═══════════════════════════════════════════════════════════════════════════ */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Plus, Layers, Camera, LineChart, Building2, ShieldCheck } from 'lucide-react';
import { getServerSession } from '@/lib/auth/server-session';
import { loadSubscriptionForUser } from '@/lib/billing/load-subscription';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { listUserTenants } from '@/lib/in-season/tenant-context';

export const dynamic = 'force-dynamic';

interface CollectionRow {
  id: string;
  name: string;
  season: string | null;
  updated_at: string;
}

interface StudioProjectRow {
  id: string;
  brand_name: string;
  brand_logo_url: string | null;
  updated_at: string;
}

const TIER_LABELS: Record<string, string> = {
  tier2_mid: 'Tier-2 Medio',
  tier2_premium: 'Tier-2 Premium',
  tier1_fashion: 'Tier-1 Moda',
  tier1_mega: 'Tier-1 Mega',
};

export default async function HomePage() {
  const { user } = await getServerSession();
  if (!user) redirect('/');

  const subscription = await loadSubscriptionForUser(user.id, user.email).catch(() => null);
  if (subscription && !subscription.onboardingCompletedAt) {
    redirect('/welcome');
  }

  const [{ data: collectionsData }, { data: studioData }, tenants] = await Promise.all([
    supabaseAdmin
      .from('collection_plans')
      .select('id, name, season, updated_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
    supabaseAdmin
      .from('studio_projects')
      .select('id, brand_name, brand_logo_url, updated_at')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .order('updated_at', { ascending: false }),
    listUserTenants(user.id),
  ]);

  const collections = (collectionsData || []) as CollectionRow[];
  const studioProjects = (studioData || []) as StudioProjectRow[];
  const meta = user.user_metadata as { first_name?: string; full_name?: string } | null;
  const firstName =
    meta?.first_name?.trim() ||
    (meta?.full_name?.trim().split(/\s+/)[0] ?? '');
  const totalActive = collections.length + studioProjects.length + tenants.length;

  return (
    <main className="min-h-screen bg-shade px-6 py-12 md:px-12 xl:px-16">
      <div className="mx-auto max-w-[2200px]">
        {/* Header */}
        <header className="mb-14 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[13px] font-medium text-carbon/35 tracking-[-0.02em] mb-2">
              aimily
            </p>
            <h1 className="text-[36px] md:text-[46px] font-medium text-carbon tracking-[-0.03em] leading-[1.05]">
              {firstName ? `Hola, ${firstName}` : 'Tu workspace'}
            </h1>
            <p className="mt-3 text-[14px] text-carbon/50 max-w-xl leading-[1.6]">
              {totalActive === 0
                ? 'Empieza una colección, un proyecto Studio o un análisis In-Season.'
                : `${collections.length} ${collections.length === 1 ? 'colección' : 'colecciones'} · ${studioProjects.length} Studio · ${tenants.length} In-Season`}
            </p>
          </div>
        </header>

        {/* ── COLECCIONES ───────────────────────────────────────────── */}
        <Section
          icon={<Layers className="h-4 w-4 text-carbon/55" />}
          eyebrow="Aimily"
          title="Colecciones"
          hubHref="/my-collections"
          newHref="/new-collection"
          newLabel="Nueva colección"
        >
          {collections.length === 0 ? (
            <EmptyTile
              href="/new-collection"
              label="Crear tu primera colección"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
              {collections.map((c) => (
                <Link
                  key={c.id}
                  href={`/collection/${c.id}`}
                  className="group relative bg-white rounded-[20px] p-8 xl:p-10 flex flex-col min-h-[280px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
                >
                  <div className="mb-6">
                    <div className="h-10 w-10 rounded-full bg-carbon/[0.04] flex items-center justify-center">
                      <Layers className="h-4 w-4 text-carbon/40" />
                    </div>
                  </div>
                  <h3 className="text-[20px] xl:text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-[1.2] mb-2">
                    {c.name}
                  </h3>
                  {c.season && (
                    <p className="text-[12px] text-carbon/45 uppercase tracking-[0.06em]">
                      {c.season}
                    </p>
                  )}
                  <div className="flex-1" />
                  <div className="flex justify-center mt-6">
                    <div className="inline-flex items-center gap-2 py-2 px-5 rounded-full text-[12px] font-semibold tracking-[-0.01em] bg-carbon text-white group-hover:bg-carbon/90 transition-all">
                      Continuar
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
              <EmptyTile href="/new-collection" label="Nueva colección" />
            </div>
          )}
        </Section>

        {/* ── STUDIO ────────────────────────────────────────────────── */}
        <Section
          icon={<Camera className="h-4 w-4 text-carbon/55" />}
          eyebrow="aimily Studio"
          title="Generación de contenido"
          hubHref="/studio"
          newHref="/studio/new"
          newLabel="Nuevo proyecto"
        >
          {studioProjects.length === 0 ? (
            <EmptyTile
              href="/studio/new"
              label="Crear tu primer proyecto Studio"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
              {studioProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/studio/${p.id}`}
                  className="group relative bg-white rounded-[20px] p-8 xl:p-10 flex flex-col min-h-[280px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
                >
                  <div className="mb-6">
                    {p.brand_logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.brand_logo_url}
                        alt={p.brand_name}
                        className="h-10 w-auto object-contain"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-carbon/[0.04] flex items-center justify-center">
                        <Camera className="h-4 w-4 text-carbon/40" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-[20px] xl:text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-[1.2] mb-2">
                    {p.brand_name}
                  </h3>
                  <div className="flex-1" />
                  <div className="flex justify-center mt-6">
                    <div className="inline-flex items-center gap-2 py-2 px-5 rounded-full text-[12px] font-semibold tracking-[-0.01em] bg-carbon text-white group-hover:bg-carbon/90 transition-all">
                      Abrir
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
              <EmptyTile href="/studio/new" label="Nuevo proyecto" />
            </div>
          )}
        </Section>

        {/* ── IN-SEASON ─────────────────────────────────────────────── */}
        <Section
          icon={<LineChart className="h-4 w-4 text-carbon/55" />}
          eyebrow="aimily In-Season"
          title="Análisis de ventas"
          hubHref="/in-season"
          newHref="/in-season"
          newLabel="Conectar marca"
        >
          {tenants.length === 0 ? (
            <EmptyTile
              href="/in-season"
              label="Conectar tu primera marca"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
              {tenants.map((t) => (
                <Link
                  key={t.id}
                  href={`/in-season/${t.slug}`}
                  className="group relative bg-white rounded-[20px] p-8 xl:p-10 flex flex-col min-h-[280px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] text-left"
                >
                  <div className="mb-6 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-carbon/[0.04] text-[10px] text-carbon/45 uppercase tracking-[0.06em]">
                      <Building2 className="h-2.5 w-2.5" />
                      {TIER_LABELS[t.tier] || t.tier}
                    </span>
                  </div>
                  <h3 className="text-[20px] xl:text-[22px] font-semibold text-carbon tracking-[-0.03em] leading-[1.2] mb-2">
                    {t.display_name}
                  </h3>
                  <p className="text-[12px] text-carbon/45">
                    <ShieldCheck className="inline h-3 w-3 mr-1" />
                    {t.role === 'owner' ? 'Propietario' : t.role}
                  </p>
                  <div className="flex-1" />
                  <div className="flex justify-center mt-6">
                    <div className="inline-flex items-center gap-2 py-2 px-5 rounded-full text-[12px] font-semibold tracking-[-0.01em] bg-carbon text-white group-hover:bg-carbon/90 transition-all">
                      Abrir
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
              <EmptyTile href="/in-season" label="Conectar marca" />
            </div>
          )}
        </Section>
      </div>
    </main>
  );
}

function Section({
  icon,
  eyebrow,
  title,
  hubHref,
  newHref,
  newLabel,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  hubHref: string;
  newHref: string;
  newLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-[11px] tracking-[0.15em] uppercase font-semibold text-carbon/40">
            {eyebrow}
          </span>
          <span className="text-carbon/20">·</span>
          <Link
            href={hubHref}
            className="text-[20px] md:text-[24px] font-semibold text-carbon tracking-[-0.03em] hover:text-carbon/70 transition-colors"
          >
            {title} <ArrowRight className="inline h-4 w-4 -mt-0.5" />
          </Link>
        </div>
        <Link
          href={newHref}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-carbon text-white text-[12px] font-semibold tracking-[-0.01em] hover:bg-carbon/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          {newLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

function EmptyTile({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group relative rounded-[20px] p-8 xl:p-10 flex flex-col items-center justify-center min-h-[280px] border-2 border-dashed border-carbon/15 text-carbon/40 hover:border-carbon/40 hover:text-carbon transition-all"
    >
      <Plus className="h-8 w-8 mb-3" />
      <p className="text-[13px] font-medium tracking-[-0.02em] text-center px-4">
        {label}
      </p>
    </Link>
  );
}

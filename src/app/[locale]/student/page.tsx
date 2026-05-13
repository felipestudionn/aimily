'use client';

/* ═══════════════════════════════════════════════════════════════════
   /student — Public landing for the Aimily Student tier (free 12 mo)

   Lists all supported academic institutions (loaded from Supabase
   `academic_domains`) and offers a verify form that calls
   POST /api/student/verify when the user is logged in. Anonymous
   visitors are redirected to signup with their email pre-filled.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useHomeTranslation } from '@/i18n/home';
import { ArrowRight, GraduationCap, Search, Check } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { SiteFooter } from '@/components/layout/SiteFooter';

interface School {
  name: string;
  short_name: string | null;
  country: string;
  city: string | null;
  website: string | null;
  domains: string[];
}

const COUNTRY_NAMES: Record<string, string> = {
  ES: 'España', GB: 'United Kingdom', IT: 'Italia', FR: 'France', BE: 'België',
  NL: 'Nederland', DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz',
  FI: 'Suomi', DK: 'Danmark', SE: 'Sverige', NO: 'Norge', IS: 'Ísland',
  US: 'United States', CA: 'Canada', JP: '日本', CN: '中国', HK: '香港',
  IN: 'India', TW: '臺灣', KR: '대한민국', AU: 'Australia',
  AR: 'Argentina', MX: 'México', BR: 'Brasil', IL: 'ישראל',
};

export default function StudentPage() {
  const { user } = useAuth();
  const h = useHomeTranslation();
  const p = h.pricing;
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/academic-domains/list')
      .then((r) => r.json())
      .then((data) => { setSchools(data.schools || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const q = filter.toLowerCase().trim();
    const filtered = !q ? schools : schools.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.short_name?.toLowerCase().includes(q) ?? false) ||
      (s.city?.toLowerCase().includes(q) ?? false) ||
      COUNTRY_NAMES[s.country]?.toLowerCase().includes(q),
    );
    const byCountry = new Map<string, School[]>();
    for (const s of filtered) {
      const list = byCountry.get(s.country) || [];
      list.push(s);
      byCountry.set(s.country, list);
    }
    // Sort countries by school count descending, then alphabetically
    return Array.from(byCountry.entries()).sort((a, b) => {
      if (b[1].length !== a[1].length) return b[1].length - a[1].length;
      return a[0].localeCompare(b[0]);
    });
  }, [schools, filter]);

  const handleVerify = async () => {
    if (!user) {
      // Redirect to signup so they create an account with their .edu email first
      window.location.href = '/?auth=signup';
      return;
    }
    setVerifying(true);
    setVerifyMsg(null);
    try {
      const res = await fetch('/api/student/verify', { method: 'POST' });
      const data = await res.json();
      if (data.eligible) {
        setVerifyMsg(p.studentSuccess.replace('{school}', data.school_name || ''));
        setTimeout(() => { window.location.href = '/my-collections'; }, 1500);
      } else if (data.reason === 'domain_not_whitelisted') {
        setVerifyMsg(p.studentNotEligible);
      } else if (data.reason === 'has_paid_subscription') {
        setVerifyMsg(p.studentBlockedPaid);
      } else {
        setVerifyMsg(p.studentError);
      }
    } catch {
      setVerifyMsg(p.studentError);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="bg-crema text-carbon min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="px-6 pt-28 md:pt-36 pb-16 md:pb-24 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-6">
          <GraduationCap className="w-4 h-4" />
          aimily Student
        </div>
        <h1 className="text-[44px] md:text-[64px] font-light tracking-[-0.03em] leading-[1.05] mb-6">
          12 meses gratis<span className="italic"> para estudiantes</span> de moda.
        </h1>
        <p className="max-w-[620px] mx-auto text-[16px] text-carbon/65 leading-[1.7] mb-10">
          Si estudias moda en una de las universidades reconocidas, accede gratis a aimily durante un curso completo.
          Mismas herramientas que un Founder. 100 Aimily Credits/mes. Verificación automática con tu email institucional.
        </p>

        {/* Verify CTA — single, prominent */}
        <div className="inline-flex flex-col items-center gap-3">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="inline-flex items-center justify-center gap-2 py-3.5 px-7 rounded-full text-[14px] font-semibold bg-carbon text-crema hover:bg-carbon/90 transition-colors"
          >
            {verifying ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {user ? 'Verificar mi email institucional' : 'Crear cuenta con email institucional'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-[12px] text-carbon/55">
            {user
              ? `Verificaremos ${user.email}`
              : 'Te pediremos tu email institucional al hacer signup.'}
          </p>
          {verifyMsg && (
            <div className="mt-4 max-w-[480px] text-[13px] leading-[1.6] text-carbon/85 bg-white border border-carbon/10 rounded-[12px] px-5 py-3">
              {verifyMsg}
            </div>
          )}
        </div>
      </section>

      {/* What's included — concise resource list */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { num: '12', label: 'meses gratis', sub: 'renovable cada año académico' },
            { num: '100', label: 'Aimily Credits', sub: 'por mes · sketches · editoriales · 3D' },
            { num: '1', label: 'usuario', sub: 'tu cuenta personal' },
            { num: '∞', label: 'colecciones', sub: 'sin límite mientras dure el curso' },
          ].map((item, i) => (
            <div key={i} className="bg-white border border-carbon/[0.08] rounded-[20px] p-7">
              <div className="text-[44px] font-light tracking-[-0.03em] leading-none text-carbon mb-3">
                {item.num}
              </div>
              <div className="text-[15px] font-medium text-carbon mb-1">{item.label}</div>
              <div className="text-[12px] text-carbon/55 leading-[1.5]">{item.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Search + supported universities */}
      <section className="px-6 pb-32 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-[12px] tracking-[0.3em] uppercase text-carbon/55 font-medium mb-4">
            Universidades soportadas
          </div>
          <h2 className="text-[32px] md:text-[40px] font-light tracking-[-0.03em] leading-[1.1] mb-6">
            <span className="italic">{loading ? '…' : schools.length}</span> escuelas y universidades reconocidas.
          </h2>
          <p className="max-w-[560px] mx-auto text-[14px] text-carbon/65 leading-[1.6] mb-8">
            Tu universidad no está en la lista? Pídele a tu departamento que escriba a hello@aimily.app y la añadimos.
          </p>

          {/* Search */}
          <div className="relative max-w-[420px] mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-carbon/40" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar por nombre, ciudad, país..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-carbon/[0.08] rounded-full text-[14px] focus:border-carbon/30 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center text-[14px] text-carbon/55 py-12">Cargando…</div>
        ) : grouped.length === 0 ? (
          <div className="text-center text-[14px] text-carbon/55 py-12">
            No hay resultados. Pídele a tu universidad que escriba a hello@aimily.app.
          </div>
        ) : (
          <div className="space-y-12">
            {grouped.map(([country, list]) => (
              <div key={country}>
                <div className="flex items-baseline justify-between mb-5 pb-3 border-b border-carbon/10">
                  <h3 className="text-[20px] font-light tracking-[-0.02em] text-carbon">
                    {COUNTRY_NAMES[country] || country}
                  </h3>
                  <span className="text-[12px] text-carbon/55 tabular-nums">
                    {list.length} {list.length === 1 ? 'escuela' : 'escuelas'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {list.map((school, i) => (
                    <a
                      key={i}
                      href={school.website ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-4 rounded-[12px] bg-white border border-carbon/[0.06] hover:border-carbon/20 transition-colors group"
                    >
                      <Check className="w-4 h-4 mt-1 shrink-0 text-carbon/45 group-hover:text-carbon transition-colors" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium text-carbon leading-[1.35]">
                          {school.name}
                        </div>
                        {school.city && (
                          <div className="text-[12px] text-carbon/55 mt-0.5">
                            {school.city}
                          </div>
                        )}
                        <div className="text-[11px] text-carbon/45 mt-1.5 font-mono truncate">
                          @{school.domains[0]}{school.domains.length > 1 ? ` · +${school.domains.length - 1}` : ''}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Final CTA */}
      <section className="bg-carbon text-crema px-6 py-24 text-center">
        <h2 className="text-[32px] md:text-[44px] font-light tracking-[-0.03em] leading-[1.1] max-w-[640px] mx-auto mb-6">
          Empieza ahora.<span className="italic"> No tienes nada que perder.</span>
        </h2>
        <p className="max-w-[480px] mx-auto text-[14px] text-crema/70 leading-[1.6] mb-8">
          12 meses gratis con tu email institucional. Cancela cuando termine el curso o pasa al plan Founder por €99/mes.
        </p>
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="inline-flex items-center justify-center gap-2 py-3.5 px-7 rounded-full text-[14px] font-semibold bg-crema text-carbon hover:bg-crema/90 transition-colors"
        >
          {user ? 'Verificar mi email' : 'Crear mi cuenta'}
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-[12px] text-crema/55 mt-4">
          <Link href="/?pricing=1#pricing" className="underline hover:text-crema transition-colors">
            Ver todos los planes
          </Link>
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}

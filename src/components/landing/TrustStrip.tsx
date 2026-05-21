'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   TrustStrip — quiet trust signals on the home page.

   Sits between Block 05 In-Season and Powered By. The audience here is the
   enterprise/director-level buyer who has read the 5 blocks and now wants
   to know: can I actually plug this into our stack without legal+IT
   pushing back?

   Four cards, all backed by actually-shipped infrastructure:
     • Shopify Partner App — approved, Protected Customer Data Access
     • Vault encryption — tokens never sit plaintext at rest
     • EU AI Act lane — no training on customer data, DPA + SCCs default
     • Hosted in EU — Vercel + Supabase EU regions

   Strings stay inline (no home.ts plumbing) to keep this isolated. EN+ES
   today; other locales fall back to EN until translated.
   ═══════════════════════════════════════════════════════════════════════════ */

import { ShoppingBag, Lock, ScrollText, Server } from 'lucide-react';
import { useLanguage, type Language } from '@/contexts/LanguageContext';

type TrustCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  shopifyTitle: string;
  shopifyBody: string;
  vaultTitle: string;
  vaultBody: string;
  euActTitle: string;
  euActBody: string;
  hostedTitle: string;
  hostedBody: string;
};

const TRUST_COPY: Record<Language, TrustCopy> = {
  en: {
    eyebrow: 'Trust · already shipped, already audited',
    title: 'Plug aimily into your stack without a six-week legal review.',
    subtitle: 'Every claim below maps to infrastructure that\'s already running in production today — not a roadmap.',
    shopifyTitle: 'Shopify Partner App approved',
    shopifyBody: 'Official OAuth install with Protected Customer Data Access. Two-click connect from your Shopify admin. No CSV exports, no scripts running in your dev\'s laptop.',
    vaultTitle: 'Tokens encrypted at rest',
    vaultBody: 'Access tokens and webhook signing secrets live in Supabase Vault — encrypted column-level with KMS. The plaintext column was dropped from the database schema in migration 069.',
    euActTitle: 'EU AI Act lane',
    euActBody: 'No training on customer data, ever. DPA + SCCs are default — not a paid add-on. Algorithm versions, taxonomy versions and evidence pairs reproduce every recommendation exactly.',
    hostedTitle: 'Hosted in Europe',
    hostedBody: 'Compute on Vercel\'s EU regions, data on Supabase EU (Frankfurt). No US-only services on the critical path. Dedicated tenant or VPC available for enterprise volume.',
  },
  es: {
    eyebrow: 'Confianza · ya en producción, ya auditado',
    title: 'Enchufa aimily a tu stack sin una revisión legal de seis semanas.',
    subtitle: 'Cada claim de abajo mapea a infraestructura que ya está corriendo en producción hoy — no un roadmap.',
    shopifyTitle: 'Shopify Partner App aprobada',
    shopifyBody: 'Instalación OAuth oficial con Protected Customer Data Access. Conexión en dos clics desde tu admin de Shopify. Sin exports CSV, sin scripts corriendo en el laptop de un dev.',
    vaultTitle: 'Tokens encriptados at rest',
    vaultBody: 'Access tokens y secrets de webhook viven en Supabase Vault — encriptados a nivel de columna con KMS. La columna plaintext se dropeó del schema en la migration 069.',
    euActTitle: 'Línea EU AI Act',
    euActBody: 'Nunca entrenamos sobre tus datos. DPA + SCCs por defecto — no como add-on. Versiones de algoritmo, versiones de taxonomía y pares de evidencia reproducen cada recomendación exacta.',
    hostedTitle: 'Hosting en Europa',
    hostedBody: 'Compute en las regiones EU de Vercel, datos en Supabase EU (Frankfurt). Sin servicios US-only en el critical path. Tenant dedicado o VPC disponibles para volumen enterprise.',
  },
  fr: {
    eyebrow: 'Trust · already shipped, already audited',
    title: 'Plug aimily into your stack without a six-week legal review.',
    subtitle: 'Every claim below maps to infrastructure that\'s already running in production today — not a roadmap.',
    shopifyTitle: 'Shopify Partner App approved',
    shopifyBody: 'Official OAuth install with Protected Customer Data Access. Two-click connect from your Shopify admin. No CSV exports, no scripts running in your dev\'s laptop.',
    vaultTitle: 'Tokens encrypted at rest',
    vaultBody: 'Access tokens and webhook signing secrets live in Supabase Vault — encrypted column-level with KMS. The plaintext column was dropped from the database schema in migration 069.',
    euActTitle: 'EU AI Act lane',
    euActBody: 'No training on customer data, ever. DPA + SCCs are default — not a paid add-on. Algorithm versions, taxonomy versions and evidence pairs reproduce every recommendation exactly.',
    hostedTitle: 'Hosted in Europe',
    hostedBody: 'Compute on Vercel\'s EU regions, data on Supabase EU (Frankfurt). No US-only services on the critical path. Dedicated tenant or VPC available for enterprise volume.',
  },
  it: {} as TrustCopy,
  de: {} as TrustCopy,
  pt: {} as TrustCopy,
  nl: {} as TrustCopy,
  no: {} as TrustCopy,
  sv: {} as TrustCopy,
};

// Fallback: any locale without an entry falls back to EN at runtime.
function pick(lang: Language): TrustCopy {
  const c = TRUST_COPY[lang];
  return c && c.title ? c : TRUST_COPY.en;
}

export function TrustStrip() {
  const { language } = useLanguage();
  const t = pick(language);

  const cards = [
    { icon: ShoppingBag, title: t.shopifyTitle, body: t.shopifyBody },
    { icon: Lock, title: t.vaultTitle, body: t.vaultBody },
    { icon: ScrollText, title: t.euActTitle, body: t.euActBody },
    { icon: Server, title: t.hostedTitle, body: t.hostedBody },
  ];

  return (
    <section className="px-6 py-32 md:py-44 border-t border-crema/[0.06]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-[12px] tracking-[0.3em] uppercase text-crema/55 font-medium mb-6">
            {t.eyebrow}
          </div>
          <h2 className="text-[36px] md:text-[58px] font-light tracking-[-0.03em] leading-[1.05] max-w-[820px] mx-auto mb-6">
            {t.title}
          </h2>
          <p className="max-w-[600px] mx-auto text-[15px] text-crema/65 leading-[1.65]">
            {t.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="bg-crema/[0.03] border border-crema/[0.08] rounded-[16px] p-7 md:p-8"
              >
                <Icon className="w-5 h-5 text-crema/55 mb-5" />
                <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-crema leading-[1.25] mb-3">
                  {c.title}
                </h3>
                <p className="text-[13px] text-crema/65 leading-[1.65]">
                  {c.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

#!/usr/bin/env tsx
/**
 * One-shot: append pricingPage v2 keys (imagery quota model + Aimily Credits +
 * 4 tiers) to ES locale (translated), and to FR/IT/PT/DE/NL/NO/SV (EN
 * fallback) right after `aimilyFromSave:` so the new pricing page renders
 * without `undefined` strings in any locale.
 *
 * Re-runnable: detects `subtitleV2:` and skips if already present.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

const EN_BLOCK = `    // ── V2 (2026-04-28) — imagery quota model + Aimily Credits + 4 tiers ──
    subtitleV2: 'Same top-quality models on every plan. Differentiation by quantity, never by quality.',
    bannerTitle: '14-day free trial',
    bannerSubtitle: 'Full access. No card required.',
    saveAnnual: 'Save 20%',
    mostPopular: 'Most popular',
    starterTagline: 'For solo founders building their first collections.',
    professionalTagline: 'For small fashion teams shipping multiple drops.',
    proMax: 'Professional Max',
    proMaxTagline: 'For studios and brands at full creative velocity.',
    enterpriseTagline: 'Custom imagery + seats, dedicated onboarding.',
    custom: 'Custom',
    customFrom: 'From €3,000/mo',
    perMonthShort: '/mo',
    billedMonthly: 'Billed monthly',
    off: 'off',
    startFreeTrial: 'Start free trial',
    contactSales: 'Contact sales',
    imageryPerMonth: 'imagery / month',
    unlimitedImagery: 'Unlimited imagery',
    oneUser: '1 user',
    seats: 'users',
    unlimitedUsers: 'Unlimited users',
    hStarter1: 'Unlimited brands & collections',
    hStarter2: 'All 28 aimily models',
    hStarter3: 'Top-quality AI on every render',
    hStarter4: 'Unlimited text generation',
    hStarter5: 'Email support',
    hPro1: 'Everything in Starter',
    hPro2: 'Video generation (Kling 2.1)',
    hPro3: 'Priority email support',
    hPro4: 'Roles & permissions',
    hPro5: 'Realtime collaboration',
    hProMax1: 'Everything in Professional',
    hProMax2: '5× more imagery',
    hProMax3: '25 seats',
    hProMax4: 'Priority email + setup call',
    hProMax5: 'Volume top-up packs available',
    hEnt1: 'Everything in Pro Max',
    hEnt2: 'Unlimited imagery',
    hEnt3: 'API access',
    hEnt4: 'SSO',
    hEnt5: 'Dedicated onboarding',
    packsTitle: 'Aimily Credits',
    packsSubtitle: 'One-time imagery top-ups for busy months. No subscription, no expiry — added straight to your account balance.',
    imageryGenerations: 'imagery generations',
    perImagery: 'per imagery',
    buyPack: 'Buy pack',
    packsTip: "Tip: 2-3 packs per month means you'd save with the next plan tier.",
    whatCounts: 'What counts as one imagery?',
    countSketch: 'Sketch from photo',
    countColorize: 'Colorize / 3D render',
    countEditorial: 'Editorial on-model',
    countStillLife: 'Still life / try-on / brand-model',
    countVisualRefs: 'Brand visual references (4 images)',
    countVideo: 'Video Kling Pro',
    countText: 'Text generation (briefs, copy, plans, …)',
    countResearch: 'Research & analysis',
    bottomNote: 'All plans include a 14-day free trial. No card required.',
    pricesExclVat: 'Prices exclude VAT.',`;

const ES_BLOCK = `    // ── V2 (2026-04-28) — modelo de cuota imagery + Créditos aimily + 4 tiers ──
    subtitleV2: 'Los mismos modelos de calidad superior en todos los planes. Diferenciación por cantidad, nunca por calidad.',
    bannerTitle: 'Prueba gratuita de 14 días',
    bannerSubtitle: 'Acceso completo. Sin tarjeta.',
    saveAnnual: 'Ahorra 20%',
    mostPopular: 'Más popular',
    starterTagline: 'Para fundadores en solitario lanzando sus primeras colecciones.',
    professionalTagline: 'Para equipos de moda que lanzan múltiples drops.',
    proMax: 'Professional Max',
    proMaxTagline: 'Para estudios y marcas al máximo ritmo creativo.',
    enterpriseTagline: 'Imagery y asientos a medida, onboarding dedicado.',
    custom: 'A medida',
    customFrom: 'Desde 3.000€/mes',
    perMonthShort: '/mes',
    billedMonthly: 'Facturación mensual',
    off: 'menos',
    startFreeTrial: 'Empezar prueba gratuita',
    contactSales: 'Contactar ventas',
    imageryPerMonth: 'imagery / mes',
    unlimitedImagery: 'Imagery ilimitada',
    oneUser: '1 usuario',
    seats: 'usuarios',
    unlimitedUsers: 'Usuarios ilimitados',
    hStarter1: 'Marcas y colecciones ilimitadas',
    hStarter2: 'Los 28 modelos aimily',
    hStarter3: 'IA de máxima calidad en cada render',
    hStarter4: 'Generación de texto ilimitada',
    hStarter5: 'Soporte por email',
    hPro1: 'Todo lo de Starter',
    hPro2: 'Generación de vídeo (Kling 2.1)',
    hPro3: 'Soporte email prioritario',
    hPro4: 'Roles y permisos',
    hPro5: 'Colaboración en tiempo real',
    hProMax1: 'Todo lo de Professional',
    hProMax2: '5× más imagery',
    hProMax3: '25 asientos',
    hProMax4: 'Soporte prioritario + setup call',
    hProMax5: 'Packs de top-up por volumen',
    hEnt1: 'Todo lo de Pro Max',
    hEnt2: 'Imagery ilimitada',
    hEnt3: 'Acceso API',
    hEnt4: 'SSO',
    hEnt5: 'Onboarding dedicado',
    packsTitle: 'Créditos aimily',
    packsSubtitle: 'Top-ups puntuales de imagery para meses intensos. Sin suscripción, sin caducidad — se añaden directamente a tu saldo.',
    imageryGenerations: 'generaciones imagery',
    perImagery: 'por imagery',
    buyPack: 'Comprar pack',
    packsTip: 'Tip: si compras 2-3 packs al mes, te sale más a cuenta subir de plan.',
    whatCounts: '¿Qué cuenta como una imagery?',
    countSketch: 'Sketch desde foto',
    countColorize: 'Colorize / render 3D',
    countEditorial: 'Editorial con modelo',
    countStillLife: 'Still life / try-on / brand-model',
    countVisualRefs: 'Referencias visuales de marca (4 imágenes)',
    countVideo: 'Vídeo Kling Pro',
    countText: 'Generación de texto (briefs, copy, planes, …)',
    countResearch: 'Investigación y análisis',
    bottomNote: 'Todos los planes incluyen 14 días de prueba gratuita. Sin tarjeta.',
    pricesExclVat: 'Precios sin IVA.',`;

const ANCHOR = "aimilyFromSave: ";

function patch(filename: string, block: string) {
  const filepath = path.join(ROOT, 'src/i18n', filename);
  const content = fs.readFileSync(filepath, 'utf8');
  if (content.includes('subtitleV2:')) {
    console.log(`  ↳ ${filename}: already patched, skipping`);
    return;
  }
  if (!content.includes(ANCHOR)) {
    console.log(`  ✗ ${filename}: anchor not found, skipping`);
    return;
  }
  // Insert after the line containing the anchor
  const lines = content.split('\n');
  const anchorIdx = lines.findIndex((l) => l.includes(ANCHOR));
  if (anchorIdx === -1) return;
  lines.splice(anchorIdx + 1, 0, block);
  fs.writeFileSync(filepath, lines.join('\n'));
  console.log(`  ✓ ${filename}: patched`);
}

console.log('\n📝 Patching i18n locales with pricingPage V2 keys\n');
patch('es.ts', ES_BLOCK);
// Locales without translation use the EN block (English shown in those UIs —
// preferable to undefined). Felipe can refine translations later.
['fr.ts', 'it.ts', 'pt.ts', 'de.ts', 'nl.ts', 'no.ts', 'sv.ts'].forEach((f) => patch(f, EN_BLOCK));
console.log('\n✅ done\n');

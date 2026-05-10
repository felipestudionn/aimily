/**
 * Block 4 · 3 Sales Strategy Archetypes · canonical seed data
 *
 * Source: research 2026-05-10 + memory/spec_block-4-sales-strategy-archetypes.md
 * Update: when benchmarks change or research data invalidates levers.
 */

import type { SalesArchetype } from '@/types/sales-strategy';

export const SALES_ARCHETYPES: SalesArchetype[] = [
  {
    id: 'A',
    name: 'Brand DTC',
    tagline: 'Construyes una marca con voz propia, sin tu cara como lever',
    narrative:
      'Vendes desde tu propia tienda — Shopify, aimily.shop, o build custom. La marca posee al cliente, los datos, y el margen. La voz de marca es el lever de adquisición, no la cara del founder. Tradeoff: el tráfico es tu problema (paid + SEO + IG slow build) y comes el riesgo de inventario.',
    levers: {
      capital_initial: 'high',
      time_to_first_revenue: '6-12 meses',
      cac_eur: { min: 30, max: 60 },
      typical_pvp_eur: { min: 40, max: 200 },
      typical_margin_pct: { min: 55, max: 72 },
      typical_aov_eur: { min: 70, max: 140 },
      typical_cvr_pct: { min: 1.5, max: 3.5 },
    },
    marketing_budget_mix: {
      paid_social: 40,
      seo_content: 25,
      email_crm: 15,
      pr_collabs: 15,
      owned_content: 5,
    },
    cadence: {
      drops: 'continuous_plus_monthly_restock',
      posts_per_day: 1,
      emails_per_week: 2,
      press_per_year: 2,
    },
    kpis: [
      'conversion_rate',
      'aov',
      'cac_payback',
      'email_capture_rate',
      'repeat_purchase_rate',
    ],
    failure_mode: 'Sobre-producir → sin caja → discount 40% para liquidar',
    benchmarks: [
      {
        brand: 'Nude Project',
        country: 'ES',
        sells: 'streetwear',
        scale: '€26M+ revenue 2023, 7 tiendas',
        tactic: 'Audiencia social primero IG/TikTok antes de tienda · 90% own DTC.',
      },
      {
        brand: 'Baymo',
        country: 'ES (Barcelona)',
        sells: 'vestidos bold-print',
        scale: 'Pop-ups Madrid sold-out en horas',
        tactic: 'Tiradas mini · tejidos Milán/París · scarcity como marketing.',
      },
      {
        brand: 'Halara',
        country: 'US (China-founded)',
        sells: 'athleisure, leggings',
        scale: '$241M+ TikTok Shop GMV lifetime',
        tactic: 'Mismo modelo Brand DTC, channel mix opuesto: 70% TikTok Shop / 30% own DTC.',
      },
      {
        brand: 'Nurrk',
        country: 'ES',
        sells: 'womenswear print expresivo',
        scale: 'Times Square placement',
        tactic: 'Editorial-grade product photography · el sitio es la revista.',
      },
      {
        brand: 'Laganini',
        country: 'ES',
        sells: 'staples Made-in-Spain',
        scale: 'DTC + selective wholesale',
        tactic: 'Voz de marca codificada en cada touchpoint.',
      },
    ],
    best_for:
      'Founders sin audiencia social previa que quieren construir un asset de marca propio anónimo o semi-anónimo.',
    cascade_defaults: {
      payment_provider_primary: 'stripe_buy_button',
      fulfillment_model_default: 'in_stock',
      drop_mechanic_default: 'continuous',
      storefront_layout: 'multi_page_full',
    },
  },

  {
    id: 'B',
    name: 'Creator brand',
    tagline: 'Tu cara es el brand, tu audiencia personal es el engine',
    narrative:
      'Tú eres el brand. La marca ES la persona. Drops capsule lanzan desde tu IG/TikTok hacia un Shopify-grade storefront propio. Marketing = tu feed. Sales = el bio link. Tradeoff: tu reputación ES el brand — una controversia, un algorithm hit, y las ventas colapsan instantáneamente. Pero el day-1 launch es exponencial: Khy hizo $1M/hora primera hora.',
    levers: {
      capital_initial: 'medium',
      time_to_first_revenue: 'día 1',
      cac_eur: { min: 5, max: 25 },
      typical_pvp_eur: { min: 35, max: 120 },
      typical_margin_pct: { min: 55, max: 70 },
      typical_aov_eur: { min: 60, max: 110 },
      typical_cvr_pct: { min: 4, max: 8 },
    },
    marketing_budget_mix: {
      founder_content: 40,
      email_drops: 20,
      paid_amplification: 15,
      pr_collabs: 15,
      web_storefront: 10,
    },
    cadence: {
      drops: 'capsule_every_6_to_12_weeks',
      posts_per_day: 4,
      emails_per_week: 1,
      press_per_year: 1,
    },
    kpis: [
      'sellthrough_first_24h',
      'founder_engagement_rate',
      'drop_to_drop_repeat_rate',
      'email_capture_per_drop',
      'audience_to_buyer_conversion',
      'founder_reputation_health',
    ],
    failure_mode:
      'Founder reputation event (algorithm hit, controversia) → ventas -50%+ instantáneo (Djerf 2025 case)',
    benchmarks: [
      {
        brand: 'Khy (Kylie Jenner)',
        country: 'US',
        sells: 'capsule womenswear',
        scale: '$1M/hora primera hora launch',
        tactic: 'Creator-IS-brand · Shopify DTC · audiencia handle personal migra al brand.',
      },
      {
        brand: 'Skims (Kim Kardashian)',
        country: 'US',
        sells: 'shapewear, intimates',
        scale: '$5B valuation Nov 2025',
        tactic: 'Creator-fronted · 4+ años brand asset construction · retail expansion.',
      },
      {
        brand: 'Djerf Avenue (Matilda Djerf)',
        country: 'SE',
        sells: 'minimalist Scandi',
        scale: '$36M 2024 · €16M 2025 post-scandal -50%',
        tactic: 'Shopify DTC + IG content engine · benchmark EU "Khy".',
      },
      {
        brand: 'Rouje (Jeanne Damas)',
        country: 'FR',
        sells: 'Parisian aesthetic + beauty',
        scale: '~$15M annual 2025 · 4 retail',
        tactic: 'Bespoke Shopify · "French girl" persona como brand identity.',
      },
      {
        brand: 'Hôtel Mahfouf (Léna Mahfouf)',
        country: 'FR',
        sells: 'capsule womenswear',
        scale: 'Mid 7-fig €',
        tactic: 'DTC + pop-ups experienciales · drops como evento.',
      },
      {
        brand: 'Name The Brand (María Pombo)',
        country: 'ES',
        sells: 'apparel creator-led',
        scale: 'Sells out en horas · drops semanales',
        tactic: 'Shopify · IG drops · audiencia personal de María como engine.',
      },
      {
        brand: 'Tipi Tent (Aida Domenech)',
        country: 'ES',
        sells: 'womenswear creator-led',
        scale: '>€1M revenue · entró kidswear 2024',
        tactic: 'Linktree → Shopify · creator-IS-brand multi-categoría.',
      },
    ],
    best_for:
      'Creators con >50K seguidores engaged que quieren convertir su persona en un brand asset propio.',
    cascade_defaults: {
      payment_provider_primary: 'stripe_buy_button',
      fulfillment_model_default: 'pre_order',
      drop_mechanic_default: 'scheduled_capsule',
      storefront_layout: 'multi_page_full',
      router_layer: ['linktree', 'komi', 'shopmy'],
    },
  },

  {
    id: 'C',
    name: 'Made-to-Order',
    tagline: 'El cliente paga primero, después produces',
    narrative:
      'No produces hasta que el cliente paga. El cliente paga deposit (50%) o full upfront, la orden financia la producción, y envías 4-20 semanas después. Tradeoff: el lead time es el precio que cobras por no comer riesgo de inventario. Proteges margen y zero stock no vendido, pero pierdes al impulse buyer. Es la estrategia para founders en materiales caros, ceremonialwear, demi-couture donde el cliente espera oficio.',
    levers: {
      capital_initial: 'low',
      time_to_first_revenue: '1 semana (deposit) → 4-20 sem (ship)',
      cac_eur: { min: 10, max: 30 },
      typical_pvp_eur: { min: 180, max: 2000 },
      typical_margin_pct: { min: 55, max: 70 },
      typical_aov_eur: { min: 280, max: 650 },
      typical_cvr_pct: { min: 0.9, max: 1.4 },
      typical_lead_time_days: { min: 28, max: 140 },
    },
    marketing_budget_mix: {
      editorial_press: 35,
      craft_documentary: 25,
      email_waitlist: 20,
      seo_long_tail: 10,
      paid: 10,
    },
    cadence: {
      drops: 'on_demand',
      posts_per_day: 0.3,
      emails_per_week: 0.5,
      press_per_year: 4,
    },
    kpis: [
      'deposit_conversion_rate',
      'lead_time_adherence',
      'cancellation_rate',
      'deposit_to_balance_collection_rate',
      'waitlist_size',
    ],
    failure_mode:
      'Incumplir lead time → chargebacks · refund requests · brand trust colapsa',
    benchmarks: [
      {
        brand: 'Conner Ives',
        country: 'UK',
        sells: 'upcycled luxury, demi-couture, slogan tees',
        scale: 'BFC/Vogue Fund 2025 (£150K) · "Protect the Dolls" tee $600K+',
        tactic: 'Tees in-stock + gowns demi-couture MTO con full deposit · dos tiers SKU.',
      },
      {
        brand: 'Maitrepierre',
        country: 'FR',
        sells: 'ready-to-wear con MTO line fuerte',
        scale: '~60% range MTO · China largest MTO market',
        tactic: 'MTO embebido en colección runway · cada look orderable 6-8 sem post-show.',
      },
      {
        brand: 'Laure de Sagazan',
        country: 'FR',
        sells: 'made-to-measure wedding',
        scale: '8-12 sem MTO ceremonialwear',
        tactic: '100% MTO · in-store appointments + remote measurements · la espera es la experiencia.',
      },
      {
        brand: 'Pattern PreProduct indies EU/US',
        country: 'EU/US',
        sells: 'small-batch streetwear, knit, denim',
        scale: '61% clientes cómodos esperando 2-4 sem · ventana media 3.2 sem',
        tactic: '50% deposit + 50% al ship · financia run sin dilución.',
      },
    ],
    best_for:
      'Founders en materiales caros, ceremonialwear, demi-couture, capsule pequeña donde el lead time se vuelve parte del posicionamiento.',
    cascade_defaults: {
      payment_provider_primary: 'stripe_buy_button',
      payment_options_secondary: ['preproduct', 'manual_invoice_split'],
      fulfillment_model_default: 'made_to_order',
      deposit_pct_default: 50,
      lead_time_days_default: 56,
      drop_mechanic_default: 'on_demand',
      storefront_layout: 'multi_page_full',
    },
  },
];

export function getArchetype(id: string): SalesArchetype | undefined {
  return SALES_ARCHETYPES.find((a) => a.id === id);
}

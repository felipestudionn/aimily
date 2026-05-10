/**
 * Block 4 · 6 Sales Channels · canonical seed data
 *
 * Each channel is a SURFACE/overlay that any of the 3 archetypes can activate.
 * own_storefront is default-on for all collections; the other 5 are opt-in.
 *
 * Templates listed here are the asset/content artifacts aimily generates
 * for that channel. The actual generators live in src/lib/sales-strategy/
 * templates/{channel}/. Files are stubs at Sprint B-pre — fully implemented
 * in subsequent sprints.
 */

import type { SalesChannelDefinition } from '@/types/sales-strategy';

export const SALES_CHANNELS: SalesChannelDefinition[] = [
  {
    id: 'own_storefront',
    name: 'Tienda propia',
    description: 'Tu propia web — Shopify, aimily.shop, o build custom. Posees el dominio, el customer data, y la experiencia.',
    default_on: true,
    payment_providers: ['stripe_buy_button', 'shopify_buy', 'lookbook_only'],
    fulfillment_model_default: 'in_stock',
    templates: [
      { id: 'editorial_lookbook', label: 'Lookbook editorial', description: 'Páginas hero + secciones del catálogo en estilo editorial.' },
      { id: 'plp', label: 'Listing de productos (PLP)', description: 'Grid de productos con filtros + ordering.' },
      { id: 'pdp', label: 'Detalle de producto (PDP)', description: 'Galería + descripción + variants + add-to-cart.' },
      { id: 'about_page', label: 'Página About', description: 'Manifesto + history + values + team.' },
      { id: 'newsletter_template', label: 'Newsletter template', description: 'Editorial email mensual con drop preview.' },
    ],
    benchmark_brands: ['Nude Project', 'Skims', 'Djerf Avenue', 'Nurrk', 'Baymo'],
    benchmark_scale_signal: '12 themes editoriales hosted en *.aimily.shop',
    archetype_compatibility: ['A', 'B', 'C'],
  },

  {
    id: 'tiktok_shop',
    name: 'TikTok Shop',
    description: 'Native checkout dentro de TikTok app. Creator-affiliate como engine de tráfico. Halara €305K/mes ES.',
    default_on: false,
    payment_providers: ['tiktok_shop_native'],
    fulfillment_model_default: 'in_stock',
    templates: [
      { id: 'product_feed_csv', label: 'Product feed (CSV)', description: 'Title 80c + description 2000c + 5+ vertical photos + variants + tags.' },
      { id: 'creator_brief', label: 'Creator brief (Markdown)', description: '8 secciones: brand voice + product story + key talking points + visual references + 3 hooks sugeridos + commission terms + posting schedule + measurement framework.' },
      { id: 'live_selling_script', label: 'LIVE selling script', description: '60-90min stream estructura: opening hook + product carousel + Q&A + objection handling + closing CTA + sellthrough recap.' },
      { id: 'ugc_seeding_kit', label: 'UGC seeding kit', description: 'Packaging instructions + unboxing guide + content prompts + hashtag list + branded asset shareable.' },
      { id: 'affiliate_setup', label: 'Affiliate program setup', description: 'Commission tiers + code generator + attribution rules.' },
    ],
    benchmark_brands: ['Halara', 'FUFFI', 'ARMONIAS', 'Nurrk TikTok ES'],
    benchmark_scale_signal: 'Halara €305K/mes ES · FUFFI €242K/mes ES · ARMONIAS €399K/mes FR',
    archetype_compatibility: ['A', 'B'],
  },

  {
    id: 'community_dm',
    name: 'Community DM',
    description: 'Catálogo en chat 1:1 vía WhatsApp / IG DM / Telegram. Bizum/Pix/MercadoPago como rail. Drops privados a tu lista VIP.',
    default_on: false,
    payment_providers: ['bizum', 'mercadopago', 'pix', 'whatsapp_pay', 'stripe_buy_button'],
    fulfillment_model_default: 'in_stock',
    templates: [
      { id: 'catalog_card', label: 'Catalog card', description: '1 photo + name + price + size availability + Bizum/Pix link.' },
      { id: 'broadcast_segments', label: 'Broadcast list segments', description: '5 segmentos default editables: VIP tier · regulars · newsletter · waitlist · post-purchase.' },
      { id: 'dm_scripts', label: 'DM script library', description: '5 scripts: greeting · sizing question · shipping question · objection · closing.' },
      { id: 'voice_note_script', label: 'Voice note intro', description: '30-60s personal voice intro per drop.' },
      { id: 'ig_story_sequence', label: 'IG Story sequence', description: '5-day countdown sequence + swipe-up flow.' },
      { id: 'payment_link_generator', label: 'Payment link generator', description: 'Per SKU + per drop · Bizum/Pix/MercadoPago.' },
    ],
    benchmark_brands: ['Telfar broadcast', 'Mejuri VIP early access', 'Gucci concierge', 'Brunello Cucinelli atelier DM'],
    benchmark_scale_signal: 'Mejuri $100M ARR · Fashion = 28% del WhatsApp commerce volume · CVR 35-52% en chat',
    archetype_compatibility: ['A', 'B', 'C'],
  },

  {
    id: 'wholesale_b2b',
    name: 'Wholesale B2B',
    description: 'PO + line-sheet + Net30/60. Joor / NuOrder / FAIRE / direct retailer. Late-stage channel.',
    default_on: false,
    payment_providers: ['manual_invoice_full', 'manual_invoice_split'],
    fulfillment_model_default: 'in_stock',
    templates: [
      { id: 'line_sheet_pdf', label: 'Line-sheet PDF', description: 'Landscape 4-col grid · SKU image + name + style # + colors + sizes + WHS price + RTL price + MOQ.' },
      { id: 'order_form_xlsx', label: 'Order form (Excel/Joor)', description: 'Joor/NuOrder format export · Excel fallback.' },
      { id: 'cost_sheet', label: 'Cost sheet (internal)', description: 'Landed cost + WHS margin + RTL margin.' },
      { id: 'terms_boilerplate', label: 'Terms boilerplate', description: 'Net30/Net60 · returns policy · MOQ rules.' },
      { id: 'showroom_invite', label: 'Showroom invite', description: 'Calendar booking + line-sheet preview + appointment confirmation.' },
    ],
    benchmark_brands: ['Conner Ives + Joor', 'Maitrepierre runway buyers', 'indie hits via FAIRE'],
    benchmark_scale_signal: 'Joor + NuOrder dominate luxury · FAIRE for indie discovery',
    archetype_compatibility: ['A', 'C'],
  },

  {
    id: 'pop_ups_physical',
    name: 'Pop-ups físicos',
    description: 'Tour de pop-ups con POS portátil + IG event integration + post-event reconciliation.',
    default_on: false,
    payment_providers: ['stripe_buy_button'],
    fulfillment_model_default: 'in_stock',
    templates: [
      { id: 'event_calendar', label: 'Pop-up calendar', description: 'Date + location + RSVP capture + IG event integration.' },
      { id: 'signage', label: 'Signage print-ready', description: '3 tamaños mockups con archetype voice: window, wall, shelf-talker.' },
      { id: 'pos_setup', label: 'POS setup', description: 'Square/SumUp/Stripe Terminal export config + product feed sync.' },
      { id: 'inventory_split', label: 'Inventory split logic', description: 'Qué SKUs/cantidades llevar al pop-up vs almacén · split + return rule.' },
      { id: 'post_event_recon', label: 'Post-event reconciliation', description: 'Units sold + traffic + IG capture + revenue write-back to dashboard.' },
    ],
    benchmark_brands: ['Hôtel Mahfouf Bois de Vincennes Aug 2025', 'Baymo Madrid pop-ups', 'Tipi Tent multi-city'],
    benchmark_scale_signal: 'Pop-up retail market $95B en 2025',
    archetype_compatibility: ['A', 'B', 'C'],
  },

  {
    id: 'marketplaces',
    name: 'Marketplaces',
    description: 'Depop · Vinted · Etsy · Grailed · Vestiaire. Discovery channel para audiencia nueva.',
    default_on: false,
    payment_providers: ['stripe_buy_button'],
    fulfillment_model_default: 'in_stock',
    templates: [
      { id: 'depop_listing', label: 'Depop listing', description: '1080x1080 + 5 photos + 4-line description + 5 tags.' },
      { id: 'vinted_listing', label: 'Vinted listing', description: '4 photos + sizing detail + condition + price target.' },
      { id: 'etsy_listing', label: 'Etsy listing', description: '10 photos + 13 tags + 14-section description + production timeline.' },
      { id: 'grailed_listing', label: 'Grailed listing', description: 'Premium streetwear positioning + provenance + grading.' },
      { id: 'vestiaire_listing', label: 'Vestiaire listing', description: 'Luxury authentication flow + concierge messaging.' },
      { id: 'pricing_differential', label: 'Pricing differential', description: 'Accounting commission (Depop 10% · Etsy ~6.5% · Grailed 9% · Vinted near-0).' },
      { id: 'cross_listing_scheduler', label: 'Cross-listing scheduler', description: 'Qué SKUs en cada marketplace · timing · conflict rules.' },
      { id: 'buyer_messages', label: 'Buyer messages', description: 'Initial response · shipping confirmation · post-sale review.' },
    ],
    benchmark_brands: ['Conner Ives Depop capsule', 'Drapers Power 100 reuse revolutionaries'],
    benchmark_scale_signal: 'Depop ~10% commission · Vinted near-0 fees · Conner Ives capsule 2024',
    archetype_compatibility: ['A', 'B', 'C'],
  },
];

export function getChannel(id: string): SalesChannelDefinition | undefined {
  return SALES_CHANNELS.find((c) => c.id === id);
}

export function getChannelsForArchetype(archetypeId: 'A' | 'B' | 'C'): SalesChannelDefinition[] {
  return SALES_CHANNELS.filter((c) => c.archetype_compatibility.includes(archetypeId));
}

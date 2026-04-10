// ── Digital Presence & AI Copywriting Types ──

export type CopyType =
  | 'product_description'
  | 'brand_story'
  | 'seo_meta'
  | 'email_template'
  | 'social_caption'
  // B2 — context-specific product copy variants
  | 'copy_ad_hook'
  | 'copy_landing_hero'
  | 'copy_email_mention'
  | 'copy_sms_tease'
  | 'copy_push_notification';

export type CopyStatus = 'draft' | 'approved' | 'rejected';

export type EmailTemplateType =
  | 'welcome'
  | 'launch'
  | 'cart_abandonment'
  | 'post_purchase';

export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'pinterest'
  | 'facebook';

export interface ProductCopy {
  id: string;
  collection_plan_id: string;
  sku_id: string | null;
  copy_type: CopyType;
  title: string;
  content: string;
  metadata: Record<string, unknown> | null; // { platform, seo_title, seo_description, alt_text, subject_line, hashtags[], etc. }
  status: CopyStatus;
  story_id: string | null;
  model_used: string | null;
  created_at: string;
  updated_at: string;
}

// ── Content Strategy Types ──

export interface ContentPillar {
  id: string;
  collection_plan_id: string;
  name: string;
  description: string | null;
  examples: string[] | null;
  stories_alignment: string[] | null;
  created_at: string;
}

export interface BrandVoiceConfig {
  id: string;
  collection_plan_id: string;
  personality: string | null;
  tone: string | null;
  do_rules: string[] | null;
  dont_rules: string[] | null;
  vocabulary: string[] | null;
  example_caption: string | null;
  created_at: string;
}

export type SocialTemplateType =
  | 'product_feature'
  | 'lifestyle'
  | 'behind_the_scenes'
  | 'styling_tip'
  | 'story_narrative';

export interface SocialTemplate {
  id: string;
  collection_plan_id: string;
  story_id: string | null;
  platform: SocialPlatform;
  type: SocialTemplateType;
  caption: string | null;
  hashtags: string[] | null;
  cta: string | null;
  best_paired_with: string | null;
  /** B4 — which of the 4 hook categories this template leads with */
  hook_type?: 'curiosity' | 'story' | 'value' | 'contrarian' | null;
  created_at: string;
}

export type EmailSequenceType =
  | 'welcome'
  | 'launch'
  | 'post_purchase'
  | 're_engagement';

export type EmailHookType = 'curiosity' | 'story' | 'value' | 'contrarian';

export interface EmailTemplateContent {
  id: string;
  collection_plan_id: string;
  story_id: string | null;
  email_type: EmailTemplateType;
  subject_line: string | null;
  preview_text: string | null;
  heading: string | null;
  body: string | null;
  cta_text: string | null;
  cta_url: string | null;
  status: string | null;
  created_at: string;
  // B1 — sequence fields. NULL for single emails.
  sequence_id?: string | null;
  sequence_name?: string | null;
  sequence_type?: EmailSequenceType | null;
  sequence_position?: number | null;
  sequence_total?: number | null;
  trigger?: string | null;
  send_delay_hours?: number | null;
  send_time_preference?: string | null;
  exit_conditions?: string[] | null;
  one_job?: string | null;
  hook_type?: EmailHookType | null;
  success_metrics?: {
    target_open_rate?: number;
    target_ctr?: number;
    target_conversion_rate?: number;
  } | null;
}

export type ContentStrategyTab = 'pillars-voice' | 'product-copy' | 'social' | 'email' | 'seo';

export type DigitalTab = 'catalog' | 'copywriting' | 'tracker';

export type CopywritingSubTab =
  | 'product_descriptions'
  | 'brand_story'
  | 'seo'
  | 'emails'
  | 'social';

export interface WebsiteChecklistItem {
  id: string;
  label: string;
  labelEs: string;
  category: 'platform' | 'content' | 'seo' | 'performance' | 'launch';
  checked: boolean;
}

export const DEFAULT_WEBSITE_CHECKLIST: Omit<WebsiteChecklistItem, 'checked'>[] = [
  // Platform
  { id: 'wc-1', label: 'Domain purchased & DNS configured', labelEs: 'Dominio comprado y DNS configurado', category: 'platform' },
  { id: 'wc-2', label: 'E-commerce platform selected (Shopify/WooCommerce/Custom)', labelEs: 'Plataforma e-commerce seleccionada', category: 'platform' },
  { id: 'wc-3', label: 'Hosting & SSL configured', labelEs: 'Hosting y SSL configurados', category: 'platform' },
  { id: 'wc-4', label: 'Payment gateway integrated', labelEs: 'Pasarela de pago integrada', category: 'platform' },
  { id: 'wc-5', label: 'Shipping rates & zones configured', labelEs: 'Tarifas y zonas de envío configuradas', category: 'platform' },
  // Content
  { id: 'wc-6', label: 'Homepage designed & built', labelEs: 'Página de inicio diseñada y construida', category: 'content' },
  { id: 'wc-7', label: 'Product pages created with descriptions', labelEs: 'Páginas de producto creadas con descripciones', category: 'content' },
  { id: 'wc-8', label: 'About / Brand Story page', labelEs: 'Página "Nosotros" / Historia de marca', category: 'content' },
  { id: 'wc-9', label: 'Contact & FAQ pages', labelEs: 'Páginas de contacto y FAQ', category: 'content' },
  { id: 'wc-10', label: 'Legal pages (Privacy, Terms, Returns)', labelEs: 'Páginas legales (Privacidad, Términos, Devoluciones)', category: 'content' },
  // SEO
  { id: 'wc-11', label: 'Meta titles & descriptions for all pages', labelEs: 'Meta títulos y descripciones para todas las páginas', category: 'seo' },
  { id: 'wc-12', label: 'Alt text for all product images', labelEs: 'Texto alt para todas las imágenes de producto', category: 'seo' },
  { id: 'wc-13', label: 'Sitemap generated & submitted', labelEs: 'Sitemap generado y enviado', category: 'seo' },
  { id: 'wc-14', label: 'Google Analytics / Tag Manager installed', labelEs: 'Google Analytics / Tag Manager instalados', category: 'seo' },
  { id: 'wc-15', label: 'Schema markup for products', labelEs: 'Schema markup para productos', category: 'seo' },
  // Performance
  { id: 'wc-16', label: 'Page speed optimized (< 3s load)', labelEs: 'Velocidad de página optimizada (< 3s carga)', category: 'performance' },
  { id: 'wc-17', label: 'Mobile responsive across devices', labelEs: 'Responsive en todos los dispositivos', category: 'performance' },
  { id: 'wc-18', label: 'Images optimized (WebP, lazy load)', labelEs: 'Imágenes optimizadas (WebP, lazy load)', category: 'performance' },
  // Launch
  { id: 'wc-19', label: 'Test orders placed successfully', labelEs: 'Pedidos de prueba realizados exitosamente', category: 'launch' },
  { id: 'wc-20', label: 'Email signup / newsletter form working', labelEs: 'Formulario de suscripción / newsletter funcionando', category: 'launch' },
  { id: 'wc-21', label: 'Social media links connected', labelEs: 'Enlaces de redes sociales conectados', category: 'launch' },
  { id: 'wc-22', label: 'Launch date countdown / coming soon page', labelEs: 'Cuenta regresiva de lanzamiento / página coming soon', category: 'launch' },
];

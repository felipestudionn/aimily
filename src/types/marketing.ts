// ── Marketing & Content Calendar Types ──

export type ContentType = 'post' | 'story' | 'reel' | 'email' | 'blog' | 'ad' | 'pr';

export type ContentPlatform =
  | 'instagram'
  | 'tiktok'
  | 'email'
  | 'website'
  | 'pinterest'
  | 'facebook'
  | 'google_ads';

export type ContentStatus = 'idea' | 'draft' | 'review' | 'approved' | 'scheduled' | 'published';

export type ContactType = 'influencer' | 'media' | 'stylist' | 'buyer' | 'celebrity';

export type ContactStatus = 'prospect' | 'contacted' | 'confirmed' | 'shipped' | 'posted' | 'declined';

export type MarketingTab = 'calendar' | 'influencer' | 'email' | 'ads';

export interface ContentCalendarEntry {
  id: string;
  collection_plan_id: string;
  title: string;
  content_type: ContentType;
  platform: ContentPlatform | null;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string | null;
  status: ContentStatus;
  caption: string | null;
  hashtags: string[] | null;
  asset_urls: string[] | null;
  target_audience: string | null;
  campaign: string | null;
  performance: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrContact {
  id: string;
  collection_plan_id: string;
  name: string;
  type: ContactType;
  platform: string | null;
  handle: string | null;
  followers: number | null;
  email: string | null;
  phone: string | null;
  agency: string | null;
  rate_range: string | null;
  notes: string | null;
  status: ContactStatus;
  outreach_date: string | null;
  ship_date: string | null;
  post_date: string | null;
  tracking_number: string | null;
  post_url: string | null;
  performance: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ── Content type config ──

export const CONTENT_TYPES: { id: ContentType; label: string; labelEs: string; emoji: string }[] = [
  { id: 'post', label: 'Post', labelEs: 'Publicación', emoji: '📸' },
  { id: 'story', label: 'Story', labelEs: 'Historia', emoji: '📱' },
  { id: 'reel', label: 'Reel', labelEs: 'Reel', emoji: '🎬' },
  { id: 'email', label: 'Email', labelEs: 'Email', emoji: '📧' },
  { id: 'blog', label: 'Blog', labelEs: 'Blog', emoji: '📝' },
  { id: 'ad', label: 'Ad', labelEs: 'Anuncio', emoji: '📣' },
  { id: 'pr', label: 'PR', labelEs: 'PR', emoji: '🗞️' },
];

export const PLATFORMS: { id: ContentPlatform; label: string; color: string }[] = [
  { id: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'tiktok', label: 'TikTok', color: '#000000' },
  { id: 'email', label: 'Email', color: '#4A90D9' },
  { id: 'website', label: 'Website', color: '#34A853' },
  { id: 'pinterest', label: 'Pinterest', color: '#E60023' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2' },
  { id: 'google_ads', label: 'Google Ads', color: '#FBBC04' },
];

export const CONTENT_STATUSES: { id: ContentStatus; label: string; labelEs: string; color: string }[] = [
  { id: 'idea', label: 'Idea', labelEs: 'Idea', color: '#94A3B8' },
  { id: 'draft', label: 'Draft', labelEs: 'Borrador', color: '#F59E0B' },
  { id: 'review', label: 'Review', labelEs: 'Revisión', color: '#8B5CF6' },
  { id: 'approved', label: 'Approved', labelEs: 'Aprobado', color: '#3B82F6' },
  { id: 'scheduled', label: 'Scheduled', labelEs: 'Programado', color: '#06B6D4' },
  { id: 'published', label: 'Published', labelEs: 'Publicado', color: '#10B981' },
];

export const CONTACT_TYPES: { id: ContactType; label: string; labelEs: string; emoji: string }[] = [
  { id: 'influencer', label: 'Influencer', labelEs: 'Influencer', emoji: '⭐' },
  { id: 'media', label: 'Media', labelEs: 'Medios', emoji: '📰' },
  { id: 'stylist', label: 'Stylist', labelEs: 'Estilista', emoji: '👗' },
  { id: 'buyer', label: 'Buyer', labelEs: 'Comprador', emoji: '🛒' },
  { id: 'celebrity', label: 'Celebrity', labelEs: 'Celebridad', emoji: '🌟' },
];

export const CONTACT_STATUSES: { id: ContactStatus; label: string; labelEs: string; color: string }[] = [
  { id: 'prospect', label: 'Prospect', labelEs: 'Prospecto', color: '#94A3B8' },
  { id: 'contacted', label: 'Contacted', labelEs: 'Contactado', color: '#F59E0B' },
  { id: 'confirmed', label: 'Confirmed', labelEs: 'Confirmado', color: '#3B82F6' },
  { id: 'shipped', label: 'Shipped', labelEs: 'Enviado', color: '#8B5CF6' },
  { id: 'posted', label: 'Posted', labelEs: 'Publicado', color: '#10B981' },
  { id: 'declined', label: 'Declined', labelEs: 'Rechazado', color: '#EF4444' },
];

// ── Email flow templates ──

export interface EmailFlowTemplate {
  id: string;
  label: string;
  labelEs: string;
  description: string;
  descriptionEs: string;
  emails: { subject: string; subjectEs: string; timing: string }[];
}

export const EMAIL_FLOW_TEMPLATES: EmailFlowTemplate[] = [
  {
    id: 'welcome',
    label: 'Welcome Series',
    labelEs: 'Serie de Bienvenida',
    description: 'Onboard new subscribers with your brand story',
    descriptionEs: 'Da la bienvenida a nuevos suscriptores con tu historia de marca',
    emails: [
      { subject: 'Welcome to [Brand]!', subjectEs: '¡Bienvenido a [Brand]!', timing: 'Immediately' },
      { subject: 'Our Story', subjectEs: 'Nuestra Historia', timing: 'Day 2' },
      { subject: 'Exclusive first look', subjectEs: 'Primer vistazo exclusivo', timing: 'Day 5' },
    ],
  },
  {
    id: 'launch',
    label: 'Launch Announcement',
    labelEs: 'Anuncio de Lanzamiento',
    description: 'Build hype and drive launch day sales',
    descriptionEs: 'Genera expectativa e impulsa ventas del lanzamiento',
    emails: [
      { subject: 'Something big is coming...', subjectEs: 'Algo grande viene...', timing: '7 days before' },
      { subject: 'Tomorrow is the day!', subjectEs: '¡Mañana es el día!', timing: '1 day before' },
      { subject: 'WE ARE LIVE 🚀', subjectEs: '¡YA ESTAMOS EN VIVO! 🚀', timing: 'Launch day' },
      { subject: 'Last chance — selling fast', subjectEs: 'Última oportunidad — se agotan rápido', timing: 'Day 3' },
    ],
  },
  {
    id: 'cart_abandonment',
    label: 'Cart Abandonment',
    labelEs: 'Carrito Abandonado',
    description: 'Recover abandoned carts with gentle reminders',
    descriptionEs: 'Recupera carritos abandonados con recordatorios',
    emails: [
      { subject: 'You left something behind', subjectEs: 'Dejaste algo en tu carrito', timing: '1 hour' },
      { subject: 'Still thinking about it?', subjectEs: '¿Sigues pensándolo?', timing: '24 hours' },
      { subject: 'Your cart is expiring soon', subjectEs: 'Tu carrito expira pronto', timing: '72 hours' },
    ],
  },
  {
    id: 'post_purchase',
    label: 'Post-Purchase',
    labelEs: 'Post-Compra',
    description: 'Delight customers and encourage reviews',
    descriptionEs: 'Deleita a los clientes y fomenta reseñas',
    emails: [
      { subject: 'Your order is confirmed!', subjectEs: '¡Tu pedido está confirmado!', timing: 'Immediately' },
      { subject: 'Your order is on its way!', subjectEs: '¡Tu pedido va en camino!', timing: 'When shipped' },
      { subject: 'How are you loving it?', subjectEs: '¿Qué te ha parecido?', timing: '7 days after delivery' },
    ],
  },
];

// ── Paid ads defaults ──

export interface AdCampaign {
  id: string;
  name: string;
  platform: ContentPlatform;
  objective: string;
  budget: number;
  currency: string;
  start_date: string;
  end_date: string;
  ad_sets: AdSet[];
  notes: string;
}

export interface AdSet {
  id: string;
  name: string;
  audience: string;
  budget_pct: number; // percentage of campaign budget
  creatives: string[]; // descriptions or asset references
}

export const AD_OBJECTIVES = [
  'Brand Awareness',
  'Reach',
  'Traffic',
  'Engagement',
  'Video Views',
  'Lead Generation',
  'Conversions',
  'Catalog Sales',
] as const;

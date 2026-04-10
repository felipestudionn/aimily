// ── Marketing & Content Calendar Types ──
//
// NOTE on i18n: this file contains *only* type definitions, stable ids and
// non-translatable metadata (colors, emojis). Human-readable labels live in
// i18n under `marketingPage` and are resolved through helpers in
// `src/lib/marketing-labels.ts`.

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

export type PaidPlatform = 'meta' | 'tiktok' | 'google' | 'pinterest' | 'other';

export type CampaignStatus = 'draft' | 'planned' | 'active' | 'paused' | 'completed';

export type AdObjective =
  | 'brand_awareness'
  | 'reach'
  | 'traffic'
  | 'engagement'
  | 'video_views'
  | 'lead_generation'
  | 'conversions'
  | 'catalog_sales';

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

// ── Stable id lists (enum ordering for UI) ──

export const CONTENT_TYPE_IDS: ContentType[] = ['post', 'story', 'reel', 'email', 'blog', 'ad', 'pr'];

export const PLATFORM_IDS: ContentPlatform[] = [
  'instagram',
  'tiktok',
  'email',
  'website',
  'pinterest',
  'facebook',
  'google_ads',
];

export const CONTENT_STATUS_IDS: ContentStatus[] = [
  'idea',
  'draft',
  'review',
  'approved',
  'scheduled',
  'published',
];

export const CONTACT_TYPE_IDS: ContactType[] = ['influencer', 'media', 'stylist', 'buyer', 'celebrity'];

export const CONTACT_STATUS_IDS: ContactStatus[] = [
  'prospect',
  'contacted',
  'confirmed',
  'shipped',
  'posted',
  'declined',
];

export const PAID_PLATFORM_IDS: PaidPlatform[] = ['meta', 'tiktok', 'google', 'pinterest', 'other'];

export const CAMPAIGN_STATUS_IDS: CampaignStatus[] = ['draft', 'planned', 'active', 'paused', 'completed'];

export const AD_OBJECTIVE_IDS: AdObjective[] = [
  'brand_awareness',
  'reach',
  'traffic',
  'engagement',
  'video_views',
  'lead_generation',
  'conversions',
  'catalog_sales',
];

// ── Non-textual metadata (colors, emojis) ──

export const CONTENT_TYPE_EMOJI: Record<ContentType, string> = {
  post: '📸',
  story: '📱',
  reel: '🎬',
  email: '📧',
  blog: '📝',
  ad: '📣',
  pr: '🗞️',
};

export const PLATFORM_COLOR: Record<ContentPlatform, string> = {
  instagram: '#E1306C',
  tiktok: '#000000',
  email: '#4A90D9',
  website: '#34A853',
  pinterest: '#E60023',
  facebook: '#1877F2',
  google_ads: '#FBBC04',
};

export const CONTENT_STATUS_COLOR: Record<ContentStatus, string> = {
  idea: '#94A3B8',
  draft: '#F59E0B',
  review: '#8B5CF6',
  approved: '#3B82F6',
  scheduled: '#06B6D4',
  published: '#10B981',
};

export const CONTACT_TYPE_EMOJI: Record<ContactType, string> = {
  influencer: '⭐',
  media: '📰',
  stylist: '👗',
  buyer: '🛒',
  celebrity: '🌟',
};

export const CONTACT_STATUS_COLOR: Record<ContactStatus, string> = {
  prospect: '#94A3B8',
  contacted: '#F59E0B',
  confirmed: '#3B82F6',
  shipped: '#8B5CF6',
  posted: '#10B981',
  declined: '#EF4444',
};

export const PAID_PLATFORM_COLOR: Record<PaidPlatform, string> = {
  meta: '#1877F2',
  tiktok: '#000000',
  google: '#FBBC04',
  pinterest: '#E60023',
  other: '#94A3B8',
};

export const CAMPAIGN_STATUS_COLOR: Record<CampaignStatus, string> = {
  draft: '#94A3B8',
  planned: '#3B82F6',
  active: '#10B981',
  paused: '#F59E0B',
  completed: '#8B5CF6',
};

// ── Ad campaign interfaces ──

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

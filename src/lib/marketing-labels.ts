// ── i18n helpers for marketing enums ──
//
// The enums in `src/types/marketing.ts` hold only stable ids and non-textual
// metadata (colors, emojis). User-facing labels live under `marketingPage` in
// each locale dictionary.
//
// Usage:
//   const t = useTranslation();
//   const label = getContentTypeLabel(t, entry.content_type);

import type { Dictionary } from '@/i18n';
import type {
  ContentType,
  ContentPlatform,
  ContentStatus,
  ContactType,
  ContactStatus,
  PaidPlatform,
  CampaignStatus,
  AdObjective,
} from '@/types/marketing';

type T = Dictionary;

export function getContentTypeLabel(t: T, id: ContentType): string {
  switch (id) {
    case 'post': return t.marketingPage.contentTypePost;
    case 'story': return t.marketingPage.contentTypeStory;
    case 'reel': return t.marketingPage.contentTypeReel;
    case 'email': return t.marketingPage.contentTypeEmail;
    case 'blog': return t.marketingPage.contentTypeBlog;
    case 'ad': return t.marketingPage.contentTypeAd;
    case 'pr': return t.marketingPage.contentTypePr;
  }
}

export function getPlatformLabel(t: T, id: ContentPlatform): string {
  switch (id) {
    case 'instagram': return t.marketingPage.platformInstagram;
    case 'tiktok': return t.marketingPage.platformTiktok;
    case 'email': return t.marketingPage.platformEmail;
    case 'website': return t.marketingPage.platformWebsite;
    case 'pinterest': return t.marketingPage.platformPinterest;
    case 'facebook': return t.marketingPage.platformFacebook;
    case 'google_ads': return t.marketingPage.platformGoogleAds;
  }
}

export function getContentStatusLabel(t: T, id: ContentStatus): string {
  switch (id) {
    case 'idea': return t.marketingPage.contentStatusIdea;
    case 'draft': return t.marketingPage.contentStatusDraft;
    case 'review': return t.marketingPage.contentStatusReview;
    case 'approved': return t.marketingPage.contentStatusApproved;
    case 'scheduled': return t.marketingPage.contentStatusScheduled;
    case 'published': return t.marketingPage.contentStatusPublished;
  }
}

export function getContactTypeLabel(t: T, id: ContactType): string {
  switch (id) {
    case 'influencer': return t.marketingPage.contactTypeInfluencer;
    case 'media': return t.marketingPage.contactTypeMedia;
    case 'stylist': return t.marketingPage.contactTypeStylist;
    case 'buyer': return t.marketingPage.contactTypeBuyer;
    case 'celebrity': return t.marketingPage.contactTypeCelebrity;
  }
}

export function getContactStatusLabel(t: T, id: ContactStatus): string {
  switch (id) {
    case 'prospect': return t.marketingPage.contactStatusProspect;
    case 'contacted': return t.marketingPage.contactStatusContacted;
    case 'confirmed': return t.marketingPage.contactStatusConfirmed;
    case 'shipped': return t.marketingPage.contactStatusShipped;
    case 'posted': return t.marketingPage.contactStatusPosted;
    case 'declined': return t.marketingPage.contactStatusDeclined;
  }
}

export function getPaidPlatformLabel(t: T, id: PaidPlatform): string {
  switch (id) {
    case 'meta': return t.marketingPage.paidPlatformMeta;
    case 'tiktok': return t.marketingPage.paidPlatformTiktok;
    case 'google': return t.marketingPage.paidPlatformGoogle;
    case 'pinterest': return t.marketingPage.paidPlatformPinterest;
    case 'other': return t.marketingPage.paidPlatformOther;
  }
}

export function getCampaignStatusLabel(t: T, id: CampaignStatus): string {
  switch (id) {
    case 'draft': return t.marketingPage.campaignStatusDraft;
    case 'planned': return t.marketingPage.campaignStatusPlanned;
    case 'active': return t.marketingPage.campaignStatusActive;
    case 'paused': return t.marketingPage.campaignStatusPaused;
    case 'completed': return t.marketingPage.campaignStatusCompleted;
  }
}

export function getAdObjectiveLabel(t: T, id: AdObjective): string {
  switch (id) {
    case 'brand_awareness': return t.marketingPage.adObjectiveBrandAwareness;
    case 'reach': return t.marketingPage.adObjectiveReach;
    case 'traffic': return t.marketingPage.adObjectiveTraffic;
    case 'engagement': return t.marketingPage.adObjectiveEngagement;
    case 'video_views': return t.marketingPage.adObjectiveVideoViews;
    case 'lead_generation': return t.marketingPage.adObjectiveLeadGeneration;
    case 'conversions': return t.marketingPage.adObjectiveConversions;
    case 'catalog_sales': return t.marketingPage.adObjectiveCatalogSales;
  }
}

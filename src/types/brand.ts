export interface BrandColor {
  hex: string;
  pantone?: string;
  name: string;
  usage?: string;
}

export interface BrandVoice {
  tone: string;
  keywords: string[];
  personality: string;
  doNot: string[];
}

export interface TargetAudience {
  demographics: string;
  psychographics: string;
  lifestyle: string;
}

export interface Competitor {
  name: string;
  positioning: string;
  priceRange: string;
}

export interface NamingOption {
  name: string;
  available: boolean;
  notes: string;
}

export interface BrandTypography {
  primary: { family: string; weight: string };
  secondary: { family: string; weight: string };
}

export interface BrandProfile {
  id: string;
  collection_plan_id: string;
  brand_name: string | null;
  tagline: string | null;
  brand_story: string | null;
  brand_voice: BrandVoice | null;
  target_audience: TargetAudience | null;
  competitors: Competitor[] | null;
  naming_options: NamingOption[] | null;
  logo_asset_id: string | null;
  primary_colors: BrandColor[] | null;
  secondary_colors: BrandColor[] | null;
  typography: BrandTypography | null;
  guidelines_asset_id: string | null;
  packaging_notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AssetReview {
  id: string;
  asset_id: string;
  reviewer_name: string;
  status: 'approved' | 'rejected' | 'changes_requested';
  comments: string | null;
  annotations: { x: number; y: number; width: number; height: number; text: string }[] | null;
  created_at: string;
}

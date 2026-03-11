/**
 * Shared types for creative components (Creative Space, Creative Brief, etc.)
 */

export interface MoodImage {
  id: string;
  src: string;
  name: string;
  source?: 'upload' | 'pinterest';
}

export interface PinterestPin {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  dominantColor?: string;
}

export interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  pin_count: number;
  image_thumbnail_url?: string;
}

export interface MoodboardAnalysis {
  collectionName?: string;
  keyColors: string[];
  keyTrends: string[];
  keyBrands?: string[];
  keyItems: string[];
  keyStyles?: string[];
  keyMaterials?: string[];
  seasonalFit?: string;
  moodDescription?: string;
  targetAudience?: string;
}

export interface MarketTrends {
  keyColors: string[];
  keyTrends: string[];
  keyItems: string[];
  lastUpdated?: string;
}

export interface TrendExploration {
  query: string;
  keyColors: string[];
  keyTrends: string[];
  keyItems: string[];
  description: string;
}

export interface SelectedTrends {
  colors: string[];
  trends: string[];
  items: string[];
}

/**
 * Creative Brief data — aggregated creative direction for a collection.
 * Used by CreativeBriefWorkspace and passed to generate-plan.
 */
export interface CreativeBriefData {
  visionText: string;
  moodboardImages: MoodImage[];
  insights: {
    keyColors: string[];
    keyTrends: string[];
    keyItems: string[];
    keyStyles: string[];
    keyMaterials: string[];
    keyBrands: string[];
    moodDescription: string;
    targetAudience: string;
    collectionName: string;
    seasonalFit: string;
  };
  pinterestBoardIds: string[];
  trendQueries: string[];
}

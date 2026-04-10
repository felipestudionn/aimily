// ── Generation Types ──

export type GenerationType =
  | 'tryon'
  | 'product_render'
  | 'still_life'
  | 'editorial'
  | 'ad_creative'
  | 'video'
  | 'brand_model'
  | 'copy';

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Model identifiers we record in `ai_generations.model_used`.
 * Each value maps to one of the active providers:
 *   - OpenAI gpt-image-1.5 (Product Render / 3D via /api/ai/colorize-sketch)
 *   - Freepik Nano Banana (Still Life / Brand Model / Try-On)
 *   - Freepik Kling 2.1 Std/Pro (Video)
 */
export type ImageVideoModel =
  | 'gpt-image-1.5'
  | 'freepik-nano-banana'
  | 'freepik-kling-2.1-std'
  | 'freepik-kling-2.1-pro';

export interface AiGeneration {
  id: string;
  collection_plan_id: string | null;
  user_id: string;
  generation_type: GenerationType;
  prompt: string;
  input_data: GenerationInput;
  output_data: GenerationOutput | null;
  provider_request_id: string | null;
  model_used: string;
  cost_credits: number | null;
  status: GenerationStatus;
  is_favorite: boolean;
  error: string | null;
  story_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface GenerationInput {
  reference_images?: string[];
  sku_id?: string;
  sku_name?: string;
  model_id?: string;
  garment_image_url?: string;
  model_image_url?: string;
  style?: string;
  background?: string;
  scene?: string;
  format?: string;
  width?: number;
  height?: number;
  motion_type?: string;
  [key: string]: unknown;
}

export interface GenerationOutput {
  images?: Array<{ url: string; width?: number; height?: number }>;
  video_url?: string;
  text?: string;
  seed?: number;
  [key: string]: unknown;
}

// ── Brand Model Types ──

export type ModelGender = 'female' | 'male' | 'non-binary';

export interface BrandModel {
  id: string;
  collection_plan_id: string;
  name: string;
  gender: ModelGender | null;
  age_range: string | null;
  ethnicity: string | null;
  body_type: string | null;
  hair_description: string | null;
  style_vibe: string | null;
  reference_image_url: string | null;
  fal_model_id: string | null;
  preview_images: Array<{ url: string; pose?: string }> | null;
  created_at: string;
}

// ── Lookbook Types ──

export type LookbookLayout =
  | 'full_bleed'
  | 'two_column'
  | 'grid_4'
  | 'text_image'
  | 'cover'
  | 'quote';

export interface LookbookContentItem {
  type: 'image' | 'text' | 'product_info';
  asset_url?: string;
  text?: string;
  sku_id?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface LookbookPage {
  id: string;
  collection_plan_id: string;
  lookbook_name: string;
  page_number: number;
  layout_type: LookbookLayout;
  content: LookbookContentItem[];
  background_color: string | null;
  story_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Campaign Shoot Types ──

export type ShootType = 'lookbook' | 'campaign' | 'product' | 'lifestyle' | 'video';
export type ShootStatus = 'planning' | 'scheduled' | 'shot' | 'editing' | 'delivered';

export interface CampaignShoot {
  id: string;
  collection_plan_id: string;
  name: string;
  shoot_type: ShootType;
  shoot_date: string | null;
  location: string | null;
  photographer: string | null;
  stylist: string | null;
  models: string | null;
  mood_description: string | null;
  shot_list: Array<{ description: string; sku_ids: string[]; setup_notes?: string }> | null;
  status: ShootStatus;
  deliverables: Array<{ type: string; format: string; quantity: number; due_date?: string; status: string }> | null;
  budget: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── UI Helper Types ──

export type StudioTab = 'renders' | 'models' | 'campaigns' | 'video' | 'gallery';

export type RenderMode = 'tryon' | 'studio' | 'lifestyle';

export interface FormatPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  platform: string;
}

export const FORMAT_PRESETS: FormatPreset[] = [
  { id: 'ig-feed', name: 'Instagram Feed', width: 1080, height: 1080, platform: 'instagram' },
  { id: 'ig-story', name: 'Instagram Story', width: 1080, height: 1920, platform: 'instagram' },
  { id: 'fb-ad', name: 'Facebook Ad', width: 1200, height: 628, platform: 'facebook' },
  { id: 'pinterest', name: 'Pinterest Pin', width: 1000, height: 1500, platform: 'pinterest' },
  { id: 'email-header', name: 'Email Header', width: 600, height: 200, platform: 'email' },
  { id: 'web-banner', name: 'Web Banner', width: 1440, height: 480, platform: 'website' },
];

export const SCENE_OPTIONS = [
  { id: 'white-studio', label: 'White Studio', labelEs: 'Estudio Blanco' },
  { id: 'marble', label: 'Marble', labelEs: 'Mármol' },
  { id: 'gradient', label: 'Gradient', labelEs: 'Degradado' },
  { id: 'street', label: 'Street', labelEs: 'Calle' },
  { id: 'cafe', label: 'Café', labelEs: 'Cafetería' },
  { id: 'beach', label: 'Beach', labelEs: 'Playa' },
  { id: 'office', label: 'Office', labelEs: 'Oficina' },
  { id: 'runway', label: 'Runway', labelEs: 'Pasarela' },
  { id: 'nature', label: 'Nature', labelEs: 'Naturaleza' },
  { id: 'urban', label: 'Urban', labelEs: 'Urbano' },
];

export const MOTION_TYPES = [
  { id: 'subtle', label: 'Subtle Movement', labelEs: 'Movimiento Sutil' },
  { id: 'walk', label: 'Model Walk', labelEs: 'Pasarela' },
  { id: 'pan', label: 'Camera Pan', labelEs: 'Paneo' },
  { id: 'zoom', label: 'Zoom In', labelEs: 'Zoom' },
];

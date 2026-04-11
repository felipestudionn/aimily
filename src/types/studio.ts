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

/**
 * Still Life editorial presets. Each one is a signed director-of-photography
 * look — surface + light + palette + props — not just a scene label. The
 * prompt builder treats these as lookbook directions, the way Hereu /
 * Jacquemus / Khaite / Bottega style their product imagery.
 *
 * Adding a new preset: also add a matching entry in STILL_LIFE_LOOKS inside
 * src/app/api/ai/freepik/still-life/route.ts — that's where the prose lives.
 */
export const SCENE_OPTIONS = [
  {
    id: 'sun_on_stone',
    label: 'Sun on Stone',
    labelEs: 'Sol sobre Piedra',
    hint: 'Hereu / Bottega · warm travertine, high-contrast noon shadow',
    hintEs: 'Travertino cálido, sombra dura de mediodía',
  },
  {
    id: 'still_breakfast',
    label: 'Still Breakfast',
    labelEs: 'Bodegón de Desayuno',
    hint: 'Top-down with props (fruit, bowl, linen) · Hereu classic',
    hintEs: 'Cenital con props (fruta, cuenco, lino)',
  },
  {
    id: 'atelier_floor',
    label: 'Atelier Floor',
    labelEs: 'Suelo de Atelier',
    hint: 'Aged wood or concrete at ground level · Khaite / The Row quiet',
    hintEs: 'Madera envejecida u hormigón a ras de suelo',
  },
  {
    id: 'gallery_plinth',
    label: 'Gallery Plinth',
    labelEs: 'Pedestal de Galería',
    hint: 'Museum plinth, sculpted window light · high-end editorial',
    hintEs: 'Pedestal de museo, luz de ventana esculpida',
  },
  {
    id: 'window_light',
    label: 'Window Light',
    labelEs: 'Luz de Ventana',
    hint: 'Linen tabletop, soft side light, dust in the air · Khaite',
    hintEs: 'Mantel de lino, luz lateral suave, polvo en el aire',
  },
  {
    id: 'sand_and_shell',
    label: 'Sand & Shell',
    labelEs: 'Arena y Concha',
    hint: 'Coastal · sand, dried grass, pebble · Jacquemus summer',
    hintEs: 'Costero · arena, hierba seca, guijarro',
  },
  {
    id: 'color_wall',
    label: 'Color Wall',
    labelEs: 'Pared de Color',
    hint: 'Painted wall with sculpted shadow · Bottega tonal',
    hintEs: 'Pared pintada con sombra esculpida · tonal',
  },
  {
    id: 'ceramic_still',
    label: 'Ceramic Still',
    labelEs: 'Cerámica',
    hint: 'Matte ceramic vessel, neutral linen · Khaite interior',
    hintEs: 'Cerámica mate, lino neutro · interior Khaite',
  },
];

export const MOTION_TYPES = [
  { id: 'subtle', label: 'Subtle Movement', labelEs: 'Movimiento Sutil' },
  { id: 'walk', label: 'Model Walk', labelEs: 'Pasarela' },
  { id: 'pan', label: 'Camera Pan', labelEs: 'Paneo' },
  { id: 'zoom', label: 'Zoom In', labelEs: 'Zoom' },
];

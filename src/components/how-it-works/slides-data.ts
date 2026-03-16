import {
  Sparkles, Lightbulb, Palette, TrendingUp, Users, Eye, Camera, ShoppingBag,
  DollarSign, MapPin, BarChart3, Layers, PenTool, Box, Scissors, Factory,
  Megaphone, Film, CalendarDays, Target, Rocket, LayoutGrid, Timer,
  type LucideIcon,
} from 'lucide-react';

export type SlideLayout = 'hero' | 'split' | 'centered' | 'diagram';
export type SlideTheme = 'dark' | 'light';

export interface ToolCard {
  iconKey: string;
  nameKey: string;
  descKey: string;
}

export interface SlideDefinition {
  id: string;
  layout: SlideLayout;
  theme: SlideTheme;
  blockNumber?: string;
  tools?: ToolCard[];
}

// Icon map for tool cards (resolved at render time)
export const TOOL_ICONS: Record<string, LucideIcon> = {
  users: Users,
  eye: Eye,
  camera: Camera,
  palette: Palette,
  shoppingBag: ShoppingBag,
  dollarSign: DollarSign,
  mapPin: MapPin,
  barChart: BarChart3,
  layers: Layers,
  penTool: PenTool,
  box: Box,
  scissors: Scissors,
  factory: Factory,
  megaphone: Megaphone,
  film: Film,
  calendarDays: CalendarDays,
  target: Target,
  rocket: Rocket,
  sparkles: Sparkles,
  lightbulb: Lightbulb,
  trendingUp: TrendingUp,
  layoutGrid: LayoutGrid,
  timer: Timer,
};

export const SLIDES: SlideDefinition[] = [
  // 0 — Intro
  {
    id: 'intro',
    layout: 'hero',
    theme: 'dark',
  },
  // 1 — AI Modes
  {
    id: 'ai-modes',
    layout: 'centered',
    theme: 'dark',
  },
  // 2 — Creative Overview
  {
    id: 'creative-overview',
    layout: 'split',
    theme: 'dark',
    blockNumber: '01',
  },
  // 3 — Creative Deep Dive
  {
    id: 'creative-deep',
    layout: 'centered',
    theme: 'light',
    blockNumber: '01',
    tools: [
      { iconKey: 'users', nameKey: 'creativeTool1', descKey: 'creativeTool1Desc' },
      { iconKey: 'eye', nameKey: 'creativeTool2', descKey: 'creativeTool2Desc' },
      { iconKey: 'camera', nameKey: 'creativeTool3', descKey: 'creativeTool3Desc' },
      { iconKey: 'palette', nameKey: 'creativeTool4', descKey: 'creativeTool4Desc' },
    ],
  },
  // 4 — Merchandising Overview
  {
    id: 'merch-overview',
    layout: 'split',
    theme: 'dark',
    blockNumber: '02',
  },
  // 5 — Merchandising Deep Dive
  {
    id: 'merch-deep',
    layout: 'centered',
    theme: 'light',
    blockNumber: '02',
    tools: [
      { iconKey: 'shoppingBag', nameKey: 'merchTool1', descKey: 'merchTool1Desc' },
      { iconKey: 'dollarSign', nameKey: 'merchTool2', descKey: 'merchTool2Desc' },
      { iconKey: 'mapPin', nameKey: 'merchTool3', descKey: 'merchTool3Desc' },
      { iconKey: 'barChart', nameKey: 'merchTool4', descKey: 'merchTool4Desc' },
    ],
  },
  // 6 — Collection Builder
  {
    id: 'collection-builder',
    layout: 'diagram',
    theme: 'light',
  },
  // 7 — Design Overview
  {
    id: 'design-overview',
    layout: 'split',
    theme: 'dark',
    blockNumber: '03',
  },
  // 8 — Design Deep Dive
  {
    id: 'design-deep',
    layout: 'centered',
    theme: 'light',
    blockNumber: '03',
    tools: [
      { iconKey: 'penTool', nameKey: 'designTool1', descKey: 'designTool1Desc' },
      { iconKey: 'box', nameKey: 'designTool2', descKey: 'designTool2Desc' },
      { iconKey: 'scissors', nameKey: 'designTool3', descKey: 'designTool3Desc' },
      { iconKey: 'factory', nameKey: 'designTool4', descKey: 'designTool4Desc' },
    ],
  },
  // 9 — Marketing Overview
  {
    id: 'marketing-overview',
    layout: 'split',
    theme: 'dark',
    blockNumber: '04',
  },
  // 10 — Marketing Deep Dive
  {
    id: 'marketing-deep',
    layout: 'centered',
    theme: 'light',
    blockNumber: '04',
    tools: [
      { iconKey: 'megaphone', nameKey: 'marketingTool1', descKey: 'marketingTool1Desc' },
      { iconKey: 'film', nameKey: 'marketingTool2', descKey: 'marketingTool2Desc' },
      { iconKey: 'calendarDays', nameKey: 'marketingTool3', descKey: 'marketingTool3Desc' },
      { iconKey: 'target', nameKey: 'marketingTool4', descKey: 'marketingTool4Desc' },
      { iconKey: 'rocket', nameKey: 'marketingTool5', descKey: 'marketingTool5Desc' },
    ],
  },
  // 11 — Calendar Orchestrator
  {
    id: 'calendar',
    layout: 'diagram',
    theme: 'light',
  },
  // 12 — Before → After Transformation
  {
    id: 'transformation',
    layout: 'centered',
    theme: 'dark',
  },
  // 13 — CTA
  {
    id: 'cta',
    layout: 'hero',
    theme: 'dark',
  },
];

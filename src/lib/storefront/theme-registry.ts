/* ═══════════════════════════════════════════════════════════════════
   Theme registry · resolves theme_id → ThemeModule

   Lazy dynamic imports so we don't bundle 12 themes into every page.
   The route-group SSR loader awaits the dynamic import inline.

   Pattern: when adding a new theme, add an entry to the THEMES map.
   Each entry is `() => import('./themes/<id>')`. The import returns the
   theme module's default export which conforms to `ThemeModule`.
   ═══════════════════════════════════════════════════════════════════ */

import type { ThemeId } from '@/types/storefront';
import type { ThemeModule } from './types';

type ThemeLoader = () => Promise<{ default: ThemeModule }>;

const THEMES: Record<ThemeId, ThemeLoader | null> = {
  'editorial-heritage':  () => import('./themes/editorial-heritage'),
  'minimal-architect':   () => import('./themes/minimal-architect'),
  'streetwear-drop':     () => import('./themes/streetwear-drop'),
  'romantic-feminine':   () => import('./themes/romantic-feminine'),
  'resort-luxe':         () => import('./themes/resort-luxe'),
  'sustainable-craft':   () => import('./themes/sustainable-craft'),
  'workwear-heritage':   () => import('./themes/workwear-heritage'),
  'performance-tech':    () => import('./themes/performance-tech'),
  'y2k-digital-native':  () => import('./themes/y2k-digital-native'),
  'avant-garde-concept': () => import('./themes/avant-garde-concept'),
  'drop-lookbook':       () => import('./themes/drop-lookbook'),
  'linkinbio-plus':      () => import('./themes/linkinbio-plus'),
};

/**
 * Loads a theme module by id. Falls back to editorial-heritage if the
 * requested theme is not yet implemented (so we never 500 on a valid
 * but unbuilt theme — the storefront just renders in the default theme
 * with a small "rendered in fallback theme" hint in the response).
 */
export async function loadTheme(themeId: ThemeId): Promise<ThemeModule> {
  const loader = THEMES[themeId];
  if (loader) {
    const mod = await loader();
    return mod.default;
  }

  // Fallback to editorial-heritage when requested theme isn't built yet
  const fallback = await THEMES['editorial-heritage']!();
  return fallback.default;
}

export function isThemeAvailable(themeId: ThemeId): boolean {
  return THEMES[themeId] !== null;
}

export function listAvailableThemes(): ThemeId[] {
  return (Object.keys(THEMES) as ThemeId[]).filter(isThemeAvailable);
}

/* streetwear-drop · Aimé Leon Dore / Stüssy mood
   - Drop-driven, mono uppercase headline, denser grid, harder edges */
import type { ThemeModule, ThemeManifest, ThemeTokens } from '../../types';
import { createAllPages } from '../../shared/page-templates';

const manifest: ThemeManifest = {
  id: 'streetwear-drop',
  name: 'Streetwear Drop',
  description: 'Drop-driven storefront with mono uppercase headlines and denser grids.',
  anchorBrandsInternal: ['Aimé Leon Dore', 'Stüssy'],
  pages: ['home', 'plp', 'pdp', 'lookbook', 'about', 'contact'],
  fonts: [
    { family: 'Space Mono', weights: [400, 700], source: 'google', category: 'mono' },
    { family: 'Inter',      weights: [400, 600, 700], source: 'google', category: 'sans' },
  ],
};

const tokens: ThemeTokens = {
  '--s-bg':         '#0A0A0A',
  '--s-bg-elev':    '#161616',
  '--s-fg':         '#F2F2F2',
  '--s-fg-muted':   'rgba(242,242,242,0.55)',
  '--s-line':       'rgba(242,242,242,0.10)',
  '--s-accent':     '#FF4500',
  '--s-display-font':     '"Space Mono", "IBM Plex Mono", monospace',
  '--s-display-weight':   '700',
  '--s-display-tracking': '-0.01em',
  '--s-display-case':     'uppercase',
  '--s-body-font':        '"Inter", system-ui, -apple-system, sans-serif',
  '--s-body-weight':      '400',
  '--s-radius-card':   '0px',
  '--s-radius-image':  '0px',
  '--s-radius-button': '0px',
  '--s-spacing-section':        '6rem',
  '--s-spacing-section-mobile': '3rem',
  '--s-grid-gap':               '0.75rem',
  '--s-image-ratio-pdp':        '1/1',
  '--s-image-ratio-plp':        '1/1',
  '--s-image-ratio-hero':       '21/9',
};

const theme: ThemeModule = {
  manifest,
  tokens,
  pages: createAllPages({
    headerLayout: 'left',
    footerTone:   'dark',
    cardStyle:    'editorial',
    heroVariant:  'image-overlay',
    rhythm:       'tight',
  }),
};

export default theme;

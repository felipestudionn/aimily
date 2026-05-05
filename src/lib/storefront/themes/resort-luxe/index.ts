/* resort-luxe · Jacquemus / Zimmermann mood
   - Off-white + tan, luz natural, hero lookbook full-bleed */
import type { ThemeModule, ThemeManifest, ThemeTokens } from '../../types';
import { createAllPages } from '../../shared/page-templates';

const manifest: ThemeManifest = {
  id: 'resort-luxe',
  name: 'Resort Luxe',
  description: 'Slow horizons. Off-white parchment, sun-soaked tan, full-bleed lookbook.',
  anchorBrandsInternal: ['Jacquemus', 'Zimmermann'],
  pages: ['home', 'plp', 'pdp', 'lookbook', 'about', 'contact'],
  fonts: [
    { family: 'Cormorant Garamond', weights: [300, 500], source: 'google', category: 'serif' },
    { family: 'Inter',              weights: [300, 400], source: 'google', category: 'sans' },
  ],
};

const tokens: ThemeTokens = {
  '--s-bg':         '#F4EEE3',
  '--s-bg-elev':    '#FFFFFF',
  '--s-fg':         '#2A2419',
  '--s-fg-muted':   'rgba(42,36,25,0.55)',
  '--s-line':       'rgba(42,36,25,0.10)',
  '--s-accent':     '#C28A56',
  '--s-display-font':     '"Cormorant Garamond", serif',
  '--s-display-weight':   '300',
  '--s-display-tracking': '-0.025em',
  '--s-display-case':     'none',
  '--s-body-font':        '"Inter", system-ui, -apple-system, sans-serif',
  '--s-body-weight':      '300',
  '--s-radius-card':   '0px',
  '--s-radius-image':  '0px',
  '--s-radius-button': '999px',
  '--s-spacing-section':        '12rem',
  '--s-spacing-section-mobile': '5rem',
  '--s-grid-gap':               '2rem',
  '--s-image-ratio-pdp':        '4/5',
  '--s-image-ratio-plp':        '4/5',
  '--s-image-ratio-hero':       '21/9',
};

const theme: ThemeModule = {
  manifest,
  tokens,
  pages: createAllPages({
    headerLayout: 'split',
    footerTone:   'light',
    cardStyle:    'editorial',
    heroVariant:  'image-overlay',
    rhythm:       'loose',
  }),
};

export default theme;

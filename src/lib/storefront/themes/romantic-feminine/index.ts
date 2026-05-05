/* romantic-feminine · Ganni / Sandy Liang mood
   - Pastel cremosos, italic serif, lookbook dominante, soft hover */
import type { ThemeModule, ThemeManifest, ThemeTokens } from '../../types';
import { createAllPages } from '../../shared/page-templates';

const manifest: ThemeManifest = {
  id: 'romantic-feminine',
  name: 'Romantic Feminine',
  description: 'Cinematic softness. Pastel parchment, italic serif, lookbook-led storytelling.',
  anchorBrandsInternal: ['Ganni', 'Sandy Liang'],
  pages: ['home', 'plp', 'pdp', 'lookbook', 'about', 'contact'],
  fonts: [
    { family: 'Playfair Display', weights: [400, 500], source: 'google', category: 'serif' },
    { family: 'Inter',            weights: [300, 400], source: 'google', category: 'sans' },
  ],
};

const tokens: ThemeTokens = {
  '--s-bg':         '#FBF1ED',
  '--s-bg-elev':    '#FFFFFF',
  '--s-fg':         '#3A1F2B',
  '--s-fg-muted':   'rgba(58,31,43,0.55)',
  '--s-line':       'rgba(58,31,43,0.12)',
  '--s-accent':     '#C04A7D',
  '--s-display-font':     '"Playfair Display", "Cormorant Garamond", serif',
  '--s-display-weight':   '400',
  '--s-display-tracking': '-0.015em',
  '--s-display-case':     'none',
  '--s-body-font':        '"Inter", system-ui, -apple-system, sans-serif',
  '--s-body-weight':      '300',
  '--s-radius-card':   '24px',
  '--s-radius-image':  '24px',
  '--s-radius-button': '999px',
  '--s-spacing-section':        '7rem',
  '--s-spacing-section-mobile': '4rem',
  '--s-grid-gap':               '1.5rem',
  '--s-image-ratio-pdp':        '4/5',
  '--s-image-ratio-plp':        '3/4',
  '--s-image-ratio-hero':       '16/9',
};

const theme: ThemeModule = {
  manifest,
  tokens,
  pages: createAllPages({
    headerLayout: 'split',
    footerTone:   'light',
    cardStyle:    'centered',
    heroVariant:  'image-overlay',
    rhythm:       'editorial',
  }),
};

export default theme;

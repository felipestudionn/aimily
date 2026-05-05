/* minimal-architect · COS / Lemaire mood
   - Cero ornamento, sans-serif neto, rejilla estricta, max whitespace */
import type { ThemeModule, ThemeManifest, ThemeTokens } from '../../types';
import { createAllPages } from '../../shared/page-templates';

const manifest: ThemeManifest = {
  id: 'minimal-architect',
  name: 'Minimal Architect',
  description: 'No ornament. Strict grid. Sans-serif. The product speaks for itself.',
  anchorBrandsInternal: ['COS', 'Lemaire'],
  pages: ['home', 'plp', 'pdp', 'lookbook', 'about', 'contact'],
  fonts: [{ family: 'Inter', weights: [300, 400, 500, 600], source: 'google', category: 'sans' }],
};

const tokens: ThemeTokens = {
  '--s-bg':         '#FAFAF7',
  '--s-bg-elev':    '#FFFFFF',
  '--s-fg':         '#0F0F0E',
  '--s-fg-muted':   'rgba(15,15,14,0.5)',
  '--s-line':       'rgba(15,15,14,0.08)',
  '--s-accent':     '#0F0F0E',
  '--s-display-font':     '"Inter", system-ui, -apple-system, sans-serif',
  '--s-display-weight':   '400',
  '--s-display-tracking': '-0.025em',
  '--s-display-case':     'none',
  '--s-body-font':        '"Inter", system-ui, -apple-system, sans-serif',
  '--s-body-weight':      '400',
  '--s-radius-card':   '0px',
  '--s-radius-image':  '0px',
  '--s-radius-button': '0px',     // square buttons fit the architectural ethos
  '--s-spacing-section':        '10rem',
  '--s-spacing-section-mobile': '5rem',
  '--s-grid-gap':               '1rem',
  '--s-image-ratio-pdp':        '1/1',
  '--s-image-ratio-plp':        '1/1',
  '--s-image-ratio-hero':       '4/5',
};

const theme: ThemeModule = {
  manifest,
  tokens,
  pages: createAllPages({
    headerLayout: 'left',
    footerTone:   'light',
    cardStyle:    'minimal',
    heroVariant:  'image-overlay',
    rhythm:       'loose',
  }),
};

export default theme;

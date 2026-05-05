/* workwear-heritage · Carhartt WIP / RRL mood */
import type { ThemeModule, ThemeManifest, ThemeTokens } from '../../types';
import { createAllPages } from '../../shared/page-templates';

const manifest: ThemeManifest = {
  id: 'workwear-heritage',
  name: 'Workwear Heritage',
  description: 'Khaki, denim, slab serif. Built to outlast. Functional first, editorial second.',
  anchorBrandsInternal: ['Carhartt WIP', 'RRL'],
  pages: ['home', 'plp', 'pdp', 'lookbook', 'about', 'contact'],
  fonts: [
    { family: 'Roboto Slab', weights: [400, 700], source: 'google', category: 'serif' },
    { family: 'Inter',       weights: [400, 500], source: 'google', category: 'sans' },
  ],
};

const tokens: ThemeTokens = {
  '--s-bg':         '#E8E2D2',
  '--s-bg-elev':    '#F2EDDF',
  '--s-fg':         '#1F1A12',
  '--s-fg-muted':   'rgba(31,26,18,0.55)',
  '--s-line':       'rgba(31,26,18,0.18)',
  '--s-accent':     '#8B5A1F',
  '--s-display-font':     '"Roboto Slab", "Georgia", serif',
  '--s-display-weight':   '700',
  '--s-display-tracking': '-0.01em',
  '--s-display-case':     'none',
  '--s-body-font':        '"Inter", system-ui, sans-serif',
  '--s-body-weight':      '400',
  '--s-radius-card':   '4px',
  '--s-radius-image':  '4px',
  '--s-radius-button': '4px',
  '--s-spacing-section':        '6rem',
  '--s-spacing-section-mobile': '3.5rem',
  '--s-grid-gap':               '1rem',
  '--s-image-ratio-pdp':        '4/5',
  '--s-image-ratio-plp':        '4/5',
  '--s-image-ratio-hero':       '16/9',
};

const theme: ThemeModule = {
  manifest, tokens,
  pages: createAllPages({ headerLayout: 'left', footerTone: 'dark', cardStyle: 'editorial', heroVariant: 'image-overlay', rhythm: 'tight' }),
};

export default theme;

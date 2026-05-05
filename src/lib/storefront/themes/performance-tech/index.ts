/* performance-tech · Arc'teryx / On mood */
import type { ThemeModule, ThemeManifest, ThemeTokens } from '../../types';
import { createAllPages } from '../../shared/page-templates';

const manifest: ThemeManifest = {
  id: 'performance-tech',
  name: 'Performance Tech',
  description: 'Mono + sans. Data visible. Engineered to move. Dark surfaces, technical grid.',
  anchorBrandsInternal: ["Arc'teryx", 'On'],
  pages: ['home', 'plp', 'pdp', 'lookbook', 'about', 'contact'],
  fonts: [
    { family: 'IBM Plex Mono', weights: [400, 600], source: 'google', category: 'mono' },
    { family: 'Inter',         weights: [400, 600], source: 'google', category: 'sans' },
  ],
};

const tokens: ThemeTokens = {
  '--s-bg':         '#0E1217',
  '--s-bg-elev':    '#171C24',
  '--s-fg':         '#E8ECF0',
  '--s-fg-muted':   'rgba(232,236,240,0.55)',
  '--s-line':       'rgba(232,236,240,0.10)',
  '--s-accent':     '#00D4AA',
  '--s-display-font':     '"IBM Plex Mono", monospace',
  '--s-display-weight':   '600',
  '--s-display-tracking': '0em',
  '--s-display-case':     'uppercase',
  '--s-body-font':        '"Inter", system-ui, sans-serif',
  '--s-body-weight':      '400',
  '--s-radius-card':   '2px',
  '--s-radius-image':  '2px',
  '--s-radius-button': '2px',
  '--s-spacing-section':        '5rem',
  '--s-spacing-section-mobile': '3rem',
  '--s-grid-gap':               '0.75rem',
  '--s-image-ratio-pdp':        '4/5',
  '--s-image-ratio-plp':        '1/1',
  '--s-image-ratio-hero':       '16/9',
};

const theme: ThemeModule = {
  manifest, tokens,
  pages: createAllPages({ headerLayout: 'left', footerTone: 'dark', cardStyle: 'editorial', heroVariant: 'image-overlay', rhythm: 'tight' }),
};

export default theme;

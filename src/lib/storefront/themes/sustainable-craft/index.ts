/* sustainable-craft · Christy Dawn / Eileen Fisher mood */
import type { ThemeModule, ThemeManifest, ThemeTokens } from '../../types';
import { createAllPages } from '../../shared/page-templates';

const manifest: ThemeManifest = {
  id: 'sustainable-craft',
  name: 'Sustainable Craft',
  description: 'Earth tones, soft serif, maker-focused storytelling. Slow fashion, told quietly.',
  anchorBrandsInternal: ['Christy Dawn', 'Eileen Fisher'],
  pages: ['home', 'plp', 'pdp', 'lookbook', 'about', 'contact'],
  fonts: [
    { family: 'Lora',  weights: [400, 500], source: 'google', category: 'serif' },
    { family: 'Inter', weights: [300, 400], source: 'google', category: 'sans' },
  ],
};

const tokens: ThemeTokens = {
  '--s-bg':         '#EDE5D8',
  '--s-bg-elev':    '#F8F2E6',
  '--s-fg':         '#3B2E20',
  '--s-fg-muted':   'rgba(59,46,32,0.55)',
  '--s-line':       'rgba(59,46,32,0.12)',
  '--s-accent':     '#7E5A3C',
  '--s-display-font':     '"Lora", "Cormorant Garamond", serif',
  '--s-display-weight':   '500',
  '--s-display-tracking': '-0.015em',
  '--s-display-case':     'none',
  '--s-body-font':        '"Inter", system-ui, sans-serif',
  '--s-body-weight':      '300',
  '--s-radius-card':   '8px',
  '--s-radius-image':  '8px',
  '--s-radius-button': '999px',
  '--s-spacing-section':        '8rem',
  '--s-spacing-section-mobile': '4rem',
  '--s-grid-gap':               '1.5rem',
  '--s-image-ratio-pdp':        '4/5',
  '--s-image-ratio-plp':        '4/5',
  '--s-image-ratio-hero':       '16/9',
};

const theme: ThemeModule = {
  manifest, tokens,
  pages: createAllPages({ headerLayout: 'split', footerTone: 'light', cardStyle: 'editorial', heroVariant: 'image-overlay', rhythm: 'editorial' }),
};

export default theme;

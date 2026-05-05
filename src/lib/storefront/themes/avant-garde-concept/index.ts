/* avant-garde-concept · Rick Owens / SSENSE mood */
import type { ThemeModule, ThemeManifest, ThemeTokens } from '../../types';
import { createAllPages } from '../../shared/page-templates';

const manifest: ThemeManifest = {
  id: 'avant-garde-concept',
  name: 'Avant-Garde Concept',
  description: 'Asymmetry. Conventional rules suspended. The product as artifact.',
  anchorBrandsInternal: ['Rick Owens', 'SSENSE'],
  pages: ['home', 'plp', 'pdp', 'lookbook', 'about', 'contact'],
  fonts: [
    { family: 'Bodoni Moda', weights: [400], source: 'google', category: 'serif' },
    { family: 'Inter',       weights: [300, 400], source: 'google', category: 'sans' },
  ],
};

const tokens: ThemeTokens = {
  '--s-bg':         '#0A0A0A',
  '--s-bg-elev':    '#161616',
  '--s-fg':         '#EDEDED',
  '--s-fg-muted':   'rgba(237,237,237,0.50)',
  '--s-line':       'rgba(237,237,237,0.08)',
  '--s-accent':     '#7C0000',
  '--s-display-font':     '"Bodoni Moda", "Times New Roman", serif',
  '--s-display-weight':   '400',
  '--s-display-tracking': '-0.04em',
  '--s-display-case':     'none',
  '--s-body-font':        '"Inter", system-ui, sans-serif',
  '--s-body-weight':      '300',
  '--s-radius-card':   '0px',
  '--s-radius-image':  '0px',
  '--s-radius-button': '0px',
  '--s-spacing-section':        '12rem',
  '--s-spacing-section-mobile': '6rem',
  '--s-grid-gap':               '0.5rem',
  '--s-image-ratio-pdp':        '3/4',
  '--s-image-ratio-plp':        '3/4',
  '--s-image-ratio-hero':       '4/5',
};

const theme: ThemeModule = {
  manifest, tokens,
  pages: createAllPages({ headerLayout: 'left', footerTone: 'dark', cardStyle: 'minimal', heroVariant: 'image-overlay', rhythm: 'loose' }),
};

export default theme;

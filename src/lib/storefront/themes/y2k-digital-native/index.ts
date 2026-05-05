/* y2k-digital-native · Diesel / Marine Serre mood */
import type { ThemeModule, ThemeManifest, ThemeTokens } from '../../types';
import { createAllPages } from '../../shared/page-templates';

const manifest: ThemeManifest = {
  id: 'y2k-digital-native',
  name: 'Y2K Digital Native',
  description: 'Saturated color blocks, bold sans, internet-native. Made for the feed.',
  anchorBrandsInternal: ['Diesel', 'Marine Serre'],
  pages: ['home', 'plp', 'pdp', 'lookbook', 'about', 'contact'],
  fonts: [
    { family: 'Archivo Black', weights: [400], source: 'google', category: 'sans' },
    { family: 'Inter',         weights: [400, 700], source: 'google', category: 'sans' },
  ],
};

const tokens: ThemeTokens = {
  '--s-bg':         '#FFEEF2',
  '--s-bg-elev':    '#FFFFFF',
  '--s-fg':         '#0B0B0B',
  '--s-fg-muted':   'rgba(11,11,11,0.55)',
  '--s-line':       'rgba(11,11,11,0.12)',
  '--s-accent':     '#FF1A6B',
  '--s-display-font':     '"Archivo Black", "Inter", sans-serif',
  '--s-display-weight':   '900',
  '--s-display-tracking': '-0.04em',
  '--s-display-case':     'uppercase',
  '--s-body-font':        '"Inter", system-ui, sans-serif',
  '--s-body-weight':      '400',
  '--s-radius-card':   '20px',
  '--s-radius-image':  '20px',
  '--s-radius-button': '999px',
  '--s-spacing-section':        '5rem',
  '--s-spacing-section-mobile': '3rem',
  '--s-grid-gap':               '1rem',
  '--s-image-ratio-pdp':        '1/1',
  '--s-image-ratio-plp':        '1/1',
  '--s-image-ratio-hero':       '4/5',
};

const theme: ThemeModule = {
  manifest, tokens,
  pages: createAllPages({ headerLayout: 'split', footerTone: 'dark', cardStyle: 'centered', heroVariant: 'image-overlay', rhythm: 'tight' }),
};

export default theme;

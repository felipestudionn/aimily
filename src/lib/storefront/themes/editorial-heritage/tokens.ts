import type { ThemeTokens } from '../../types';

/**
 * editorial-heritage theme tokens — designed for premium fashion brands
 * with editorial sensibilities. Hard edges (radius 0), serif display,
 * generous spacing. Brand DNA tokens (palette + typography) from the
 * user's brand can override the defaults at render time.
 */
export const tokens: ThemeTokens = {
  // Color
  '--s-bg':         '#F5F2EC',                  // off-white parchment
  '--s-bg-elev':    '#FFFFFF',
  '--s-fg':         '#1A1815',                  // near-black, slightly warm
  '--s-fg-muted':   'rgba(26, 24, 21, 0.55)',
  '--s-line':       'rgba(26, 24, 21, 0.10)',
  '--s-accent':     '#A8553B',                  // terracotta, editorial accent

  // Typography
  '--s-display-font':     '"Cormorant Garamond", "Times New Roman", serif',
  '--s-display-weight':   '300',
  '--s-display-tracking': '-0.02em',
  '--s-display-case':     'none',
  '--s-body-font':        '"Inter", system-ui, -apple-system, sans-serif',
  '--s-body-weight':      '400',

  // Sizing — magazine flat geometry
  '--s-radius-card':   '0px',
  '--s-radius-image':  '0px',
  '--s-radius-button': '999px',                 // pill CTA against flat cards

  // Layout
  '--s-spacing-section':        '8rem',
  '--s-spacing-section-mobile': '4rem',
  '--s-grid-gap':               '1.25rem',
  '--s-image-ratio-pdp':        '4/5',
  '--s-image-ratio-plp':        '3/4',
  '--s-image-ratio-hero':       '16/9',
};

import type { ThemeManifest } from '../../types';

export const manifest: ThemeManifest = {
  id: 'editorial-heritage',
  name: 'Editorial Heritage',
  description: 'Magazine premium with serif display, generous whitespace, and editorial cadence.',
  anchorBrandsInternal: ['Acne', 'Jil Sander'],
  pages: ['home', 'plp', 'pdp', 'lookbook', 'about', 'contact'],
  fonts: [
    { family: 'Cormorant Garamond', weights: [300, 400, 500, 600], source: 'google', category: 'serif' },
    { family: 'Inter',              weights: [300, 400, 500],      source: 'google', category: 'sans' },
  ],
  previewImage: '/themes/editorial-heritage/preview.jpg',
};

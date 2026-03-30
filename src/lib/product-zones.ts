/* ═══════════════════════════════════════════════════════════
   Product Zone Definitions by Category
   Used for colorway color-up sheets and BOM (materials)
   Zones are the shared axis between colors and materials.
   ═══════════════════════════════════════════════════════════ */

export interface ZoneTemplate {
  zone: string;
  defaultHex: string;
  description: string;
}

/* ── CALZADO (Footwear) ── */
const FOOTWEAR_ZONES: ZoneTemplate[] = [
  { zone: 'Upper',         defaultHex: '#3B3B3B', description: 'Main body panels (vamp + quarter)' },
  { zone: 'Tongue',        defaultHex: '#4A4A4A', description: 'Tongue panel under laces' },
  { zone: 'Lining',        defaultHex: '#D4CBC0', description: 'Interior lining fabric' },
  { zone: 'Midsole',       defaultHex: '#F0EDE8', description: 'Cushioning layer (EVA/PU)' },
  { zone: 'Outsole',       defaultHex: '#8B7D6B', description: 'Bottom ground-contact surface' },
  { zone: 'Laces',         defaultHex: '#2B2B2B', description: 'Shoelaces' },
  { zone: 'Heel Counter',  defaultHex: '#3B3B3B', description: 'Rear heel reinforcement' },
  { zone: 'Eyelets',       defaultHex: '#8C8C8C', description: 'Lace holes / hardware' },
  { zone: 'Branding',      defaultHex: '#2B2B2B', description: 'Logo and brand marks' },
];

/* ── ROPA (Apparel) ── */
const APPAREL_ZONES: ZoneTemplate[] = [
  { zone: 'Body',          defaultHex: '#3B3B3B', description: 'Main fabric panels (front + back)' },
  { zone: 'Lining',        defaultHex: '#D4CBC0', description: 'Interior lining' },
  { zone: 'Collar',        defaultHex: '#3B3B3B', description: 'Neckline / collar construction' },
  { zone: 'Cuffs',         defaultHex: '#3B3B3B', description: 'Sleeve endings' },
  { zone: 'Closures',      defaultHex: '#8C8C8C', description: 'Buttons, zippers, snaps' },
  { zone: 'Stitching',     defaultHex: '#4A4A4A', description: 'Visible stitching / topstitch' },
  { zone: 'Trim',          defaultHex: '#6B6B6B', description: 'Ribbing, piping, tape' },
  { zone: 'Branding',      defaultHex: '#2B2B2B', description: 'Labels and logos' },
];

/* ── ACCESORIOS (Accessories) ── */
const ACCESSORIES_ZONES: ZoneTemplate[] = [
  { zone: 'Body',          defaultHex: '#3B3B3B', description: 'Main exterior surface' },
  { zone: 'Hardware',      defaultHex: '#8C8C8C', description: 'Buckles, clasps, D-rings' },
  { zone: 'Lining',        defaultHex: '#D4CBC0', description: 'Interior lining' },
  { zone: 'Strap',         defaultHex: '#4A4A4A', description: 'Straps, handles, chains' },
  { zone: 'Trim',          defaultHex: '#6B6B6B', description: 'Edge finishing, piping' },
  { zone: 'Branding',      defaultHex: '#2B2B2B', description: 'Logo and brand marks' },
];

const ZONE_MAP: Record<string, ZoneTemplate[]> = {
  CALZADO: FOOTWEAR_ZONES,
  ROPA: APPAREL_ZONES,
  ACCESORIOS: ACCESSORIES_ZONES,
};

export function getDefaultZones(category: string): ZoneTemplate[] {
  return ZONE_MAP[category] || APPAREL_ZONES;
}

/** Convert zone templates to initial colorway zones */
export function zonesToColorwayZones(templates: ZoneTemplate[]): import('@/types/design').ColorwayZone[] {
  return templates.map(t => ({ zone: t.zone, hex: t.defaultHex }));
}

/** Convert zone templates to empty material zones */
export function zonesToMaterialZones(templates: ZoneTemplate[]): import('@/types/design').MaterialZone[] {
  return templates.map(t => ({ zone: t.zone, material: '' }));
}

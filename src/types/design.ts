export type ColorwayStatus = 'proposed' | 'sampled' | 'approved' | 'production';

/* ── Zone-based color mapping (per colorway) ── */
export interface ColorwayZone {
  zone: string;         // "Upper", "Midsole", etc.
  hex: string;          // "#2B2B2B"
  pantone?: string;     // "19-4006 TCX"
  notes?: string;       // "DTM with outsole"
}

/* ── Zone-based BOM (per SKU, shared across colorways) ── */
export interface MaterialZone {
  zone: string;         // Same zone names as colorway
  material: string;     // "Nubuck leather"
  composition?: string; // "100% bovine"
  weight?: string;      // "1.4mm" or "280 GSM"
  finish?: string;      // "Tumbled", "Enzyme washed"
  swatchUrl?: string;   // Material sample image
  supplier?: string;    // "Tannery XYZ"
  notes?: string;
  /** Cost-aware AI proposal fields — populated when the materials AI
   *  proposes a material with a budget constraint. Industry-realistic
   *  prices that respect the SKU's target COGS + margin. */
  consumption?: string;     // "0.32 m²" or "1 unit" or "12 cm"
  cost_per_unit?: string;   // "€7.50 / m²" — average market price
  cost_total?: number;      // EUR — consumption × cost_per_unit (numeric for BOM)
  cost_currency?: string;   // "EUR" by default
}

export interface SkuColorway {
  id: string;
  sku_id: string;
  name: string;
  hex_primary: string;
  hex_secondary: string | null;
  hex_accent: string | null;
  pantone_primary: string | null;
  pantone_secondary: string | null;
  material_swatch_url: string | null;
  status: ColorwayStatus;
  position: number;
  zones: ColorwayZone[];
  created_at: string;
}

export interface FormSpec {
  lastType: string;
  lastCode: string;
  factoryLink: string;
  notes: string;
}

export interface DesignIteration {
  id: string;
  name: string;
  url: string;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  uploadedAt: string;
}

export interface PatternFile {
  id: string;
  name: string;
  url: string;
  fileType: string;
  gradingNotes: string;
  uploadedAt: string;
}

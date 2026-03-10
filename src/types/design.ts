export type ColorwayStatus = 'proposed' | 'sampled' | 'approved' | 'production';

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

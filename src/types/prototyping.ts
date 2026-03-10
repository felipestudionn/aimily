// ── Sample Review types (Phase 4: Prototyping & Sampling QA) ──

export type ReviewType = 'white_proto' | 'color_sample' | 'fitting_sample' | 'production_sample';
export type ReviewStatus = 'pending' | 'issues_found' | 'approved' | 'rejected';

export interface ReviewPhoto {
  url: string;
  caption: string;
  issue_area?: string;
}

export interface ReviewIssue {
  id: string;
  area: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  photo_url?: string;
  resolved?: boolean;
}

export interface MeasurementRow {
  point: string;
  spec: string;
  actual: string;
  tolerance: string;
  pass: boolean | null;
}

export interface SampleReview {
  id: string;
  collection_plan_id: string;
  sku_id: string | null;
  milestone_id: string | null;
  review_type: ReviewType;
  status: ReviewStatus;
  overall_rating: number | null;
  fit_notes: string | null;
  construction_notes: string | null;
  material_notes: string | null;
  color_notes: string | null;
  measurements_ok: boolean | null;
  photos: ReviewPhoto[];
  issues: ReviewIssue[];
  rectification_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

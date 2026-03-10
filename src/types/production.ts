// ── Production & Logistics Types ──

export type OrderStatus =
  | 'draft'
  | 'sent'
  | 'confirmed'
  | 'in_production'
  | 'qc'
  | 'shipped'
  | 'delivered';

export type ProductionTab = 'orders' | 'qc' | 'logistics';

export interface LineItem {
  sku_id: string;
  sku_name: string;
  colorway: string;
  size_run: Record<string, number>; // e.g. { "38": 10, "39": 15, "40": 20 }
  units: number;
  unit_cost: number;
}

export interface OrderDocument {
  name: string;
  url: string;
  type: 'po' | 'invoice' | 'packing_list' | 'customs' | 'other';
}

export interface QcIssue {
  id: string;
  sku_id: string;
  sku_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolved: boolean;
}

export interface ProductionOrder {
  id: string;
  collection_plan_id: string;
  order_number: string | null;
  factory_name: string | null;
  factory_contact: string | null;
  status: OrderStatus;
  order_date: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  total_units: number | null;
  total_cost: number | null;
  currency: string;
  shipping_method: string | null;
  tracking_number: string | null;
  line_items: LineItem[] | null;
  qc_issues: QcIssue[] | null;
  quality_notes: string | null;
  documents: OrderDocument[] | null;
  created_at: string;
  updated_at: string;
}

// ── Status config ──

export const ORDER_STATUSES: { id: OrderStatus; label: string; labelEs: string; color: string }[] = [
  { id: 'draft', label: 'Draft', labelEs: 'Borrador', color: '#94A3B8' },
  { id: 'sent', label: 'Sent', labelEs: 'Enviada', color: '#F59E0B' },
  { id: 'confirmed', label: 'Confirmed', labelEs: 'Confirmada', color: '#3B82F6' },
  { id: 'in_production', label: 'In Production', labelEs: 'En producción', color: '#8B5CF6' },
  { id: 'qc', label: 'Quality Control', labelEs: 'Control de calidad', color: '#EC4899' },
  { id: 'shipped', label: 'Shipped', labelEs: 'Enviada', color: '#06B6D4' },
  { id: 'delivered', label: 'Delivered', labelEs: 'Entregada', color: '#10B981' },
];

export const SHIPPING_METHODS = [
  'Sea Freight',
  'Air Freight',
  'Express Courier',
  'Rail Freight',
  'Road Transport',
] as const;

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CNY'] as const;

export const QC_SEVERITY: { id: QcIssue['severity']; label: string; labelEs: string; color: string }[] = [
  { id: 'low', label: 'Low', labelEs: 'Bajo', color: '#94A3B8' },
  { id: 'medium', label: 'Medium', labelEs: 'Medio', color: '#F59E0B' },
  { id: 'high', label: 'High', labelEs: 'Alto', color: '#EF4444' },
  { id: 'critical', label: 'Critical', labelEs: 'Crítico', color: '#7F1D1D' },
];

export const DOCUMENT_TYPES: { id: OrderDocument['type']; label: string; labelEs: string }[] = [
  { id: 'po', label: 'Purchase Order', labelEs: 'Orden de compra' },
  { id: 'invoice', label: 'Invoice', labelEs: 'Factura' },
  { id: 'packing_list', label: 'Packing List', labelEs: 'Lista de empaque' },
  { id: 'customs', label: 'Customs Docs', labelEs: 'Documentos aduaneros' },
  { id: 'other', label: 'Other', labelEs: 'Otro' },
];

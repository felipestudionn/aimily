import { useState, useEffect, useCallback } from 'react';
import { backendError } from './hook-errors';

/**
 * Contract (enterprise-ready, applies to every *.ts hook in this folder):
 *
 *  - Read operations (fetch*) set `error` on failure and degrade gracefully
 *    (loading flag flips, data stays empty). They never throw.
 *
 *  - Write operations (add/update/delete/toggle/bulkSave) set `error` AND
 *    throw a structured Error built from the backend envelope via
 *    backendError(res). Callers must wrap them in try/catch and surface
 *    err.message to the user. Silent "return null" is no longer acceptable:
 *    it masked every persistence failure and was the root cause of the
 *    2026-04-11 Still Life / stories regression.
 */

export type DesignPhase = 'range_plan' | 'sketch' | 'prototyping' | 'production' | 'completed';

export interface ProtoIteration {
  id: string;
  images: string[];
  notes: string;
  status: 'pending' | 'issues' | 'approved' | 'rejected';
  created_at: string;
}

export interface SKU {
  id: string;
  collection_plan_id: string;
  name: string;
  category: 'CALZADO' | 'ROPA' | 'ACCESORIOS';
  family: string;
  drop_number: number;
  type: 'IMAGEN' | 'ENTRY' | 'REVENUE';
  pvp: number;
  cost: number;
  discount: number;
  final_price: number;
  buy_units: number;
  sale_percentage: number;
  expected_sales: number;
  margin: number;
  channel: 'DTC' | 'WHOLESALE' | 'BOTH';
  origin?: 'LOCAL' | 'CHINA' | 'EUROPE' | 'OTHER';
  size_run?: Record<string, number>;
  sku_role?: 'NEW' | 'BESTSELLER_REINVENTION' | 'CARRYOVER' | 'CAPSULE';
  launch_date: string;
  notes?: string;
  reference_image_url?: string;
  source_sku_id?: string;
  // ── Design lifecycle ──
  design_phase: DesignPhase;
  sketch_url?: string;
  sketch_top_url?: string;
  proto_iterations: ProtoIteration[];
  production_sample_url?: string;
  render_url?: string; // flat colorized sketch (set by colorway acceptance only)
  render_urls?: Record<string, string>; // {'3d': photorealistic, 'preview': card preview}
  material_zones?: import('@/types/design').MaterialZone[];
  sourcing_data?: {
    factory?: string; origin?: string; contact?: string; notes?: string;
    aiResult?: Record<string, unknown>;
  };
  production_data?: {
    color_status?: 'pending' | 'approved' | 'issues';
    color_notes?: string;
    fit_status?: 'pending' | 'approved' | 'issues';
    fit_notes?: string;
    confirmed_steps?: string[];
    // Factory order details
    factory_name?: string;
    factory_contact?: string;
    factory_origin?: string;
    target_delivery_date?: string;
    order_quantity?: number;
    unit_cost_final?: number;
    payment_terms?: string;
    shipping_method?: string;
    special_instructions?: string;
    po_number?: string;
    po_generated_at?: string;
  };
  production_approved: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useSkus = (collectionPlanId: string) => {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSkus = useCallback(async () => {
    if (!collectionPlanId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/skus?planId=${collectionPlanId}`);
      if (!res.ok) throw await backendError(res);
      const data = await res.json();
      setSkus(data as SKU[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching SKUs:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addSku = async (sku: Omit<SKU, 'id' | 'created_at' | 'updated_at'>) => {
    setError(null);
    if (!collectionPlanId) {
      const err = new Error('Cannot add SKU without a collection plan id');
      setError(err.message);
      throw err;
    }
    const res = await fetch('/api/skus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...sku,
        collection_plan_id: collectionPlanId,
      }),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as SKU;
    setSkus((prev) => [data, ...prev]);
    return data;
  };

  const updateSku = async (id: string, updates: Partial<SKU>) => {
    setError(null);
    const res = await fetch(`/api/skus/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    const data = (await res.json()) as SKU;
    setSkus((prev) => prev.map((s) => (s.id === id ? data : s)));
    return data;
  };

  const deleteSku = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/skus/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await backendError(res);
      setError(err.message);
      throw err;
    }
    setSkus((prev) => prev.filter((s) => s.id !== id));
    return true;
  };

  useEffect(() => {
    if (collectionPlanId) {
      fetchSkus();
    }
  }, [collectionPlanId, fetchSkus]);

  return {
    skus,
    loading,
    error,
    addSku,
    updateSku,
    deleteSku,
    refetch: fetchSkus,
  };
};

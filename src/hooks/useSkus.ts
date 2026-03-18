import { useState, useEffect, useCallback } from 'react';

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
  proto_iterations: ProtoIteration[];
  production_sample_url?: string;
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
      
      const response = await fetch(`/api/skus?planId=${collectionPlanId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch SKUs');
      }
      
      const data = await response.json();
      setSkus(data as SKU[]);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching SKUs:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionPlanId]);

  const addSku = async (sku: Omit<SKU, 'id' | 'created_at' | 'updated_at'>) => {
    if (!collectionPlanId) return null;
    
    try {
      const response = await fetch('/api/skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sku,
          collection_plan_id: collectionPlanId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add SKU');
      }

      const data = await response.json();
      setSkus(prev => [data as SKU, ...prev]);
      return data as SKU;
    } catch (err: any) {
      setError(err.message);
      console.error('Error adding SKU:', err);
      return null;
    }
  };

  const updateSku = async (id: string, updates: Partial<SKU>) => {
    try {
      const response = await fetch(`/api/skus/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update SKU');
      }

      const data = await response.json();
      setSkus(prev => prev.map(sku => sku.id === id ? data as SKU : sku));
      return data as SKU;
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating SKU:', err);
      return null;
    }
  };

  const deleteSku = async (id: string) => {
    try {
      const response = await fetch(`/api/skus/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete SKU');
      }

      setSkus(prev => prev.filter(sku => sku.id !== id));
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting SKU:', err);
      return false;
    }
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
    refetch: fetchSkus
  };
};

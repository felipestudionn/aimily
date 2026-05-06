export interface PriceSegment {
  name: string;
  minPrice: number;
  maxPrice: number;
  percentage: number;
}

export interface ProductFamily {
  name: string;
  percentage: number;
}

export interface ProductTypeSegment {
  type: 'REVENUE' | 'IMAGEN' | 'ENTRY';
  percentage: number;
}

/**
 * Rich required-fields snapshot used by the Collection Builder + planner
 * dashboard internals. Populated by merging DerivedSetupData (loaded from
 * /api/derived-setup-data) with EMPTY_SETUP defaults — never read
 * directly from a database column.
 *
 * The on-disk `collection_plans.setup_data` jsonb is no longer typed
 * as SetupData; it lives only as the carrier for `post_launch_analysis`.
 */
export interface SetupData {
  totalSalesTarget: number;
  monthlyDistribution: number[];
  expectedSkus: number;
  families: string[];
  dropsCount: number;
  avgPriceTarget: number;
  targetMargin: number;
  plannedDiscounts: number;
  hasHistoricalData?: boolean;
  productCategory: 'ROPA' | 'CALZADO' | 'ACCESORIOS' | string; // Allow string for AI flexibility
  productFamilies: ProductFamily[];
  priceSegments: PriceSegment[];
  productTypeSegments: ProductTypeSegment[];
  minPrice: number;
  maxPrice: number;
}

export interface CollectionPlan {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  season?: string;
  location?: string;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface CollectionSku {
  id: string;
  plan_id: string;
  category: string;
  family: string;
  name: string;
  description?: string;
  variant_name?: string;
  cost: number;
  price: number;
  quantity: number;
  attributes?: any;
  created_at: string;
  updated_at: string;
}

/**
 * Data synchronization layer between blocks
 * Ensures data flows seamlessly from Block 1 → Block 2 → Block 3
 */

export interface CreativeSpaceData {
  // User moodboard
  moodboardImages: {
    id: string;
    name: string;
    url: string;
  }[];
  
  // Pinterest data
  pinterestBoards?: {
    id: string;
    name: string;
    pinCount: number;
  }[];
  
  // AI-extracted insights
  keyColors?: string[];
  keyTrends?: string[];
  keyItems?: string[];
  keyStyles?: string[];
  keyBrands?: string[];
}

export interface AIAdvisorData {
  // From wizard
  targetConsumer: string;
  season: string;
  location: string;
  
  // Framework
  expectedSkus: number;
  dropsCount: number;
  priceMin: number;
  priceMax: number;
  avgPriceTarget: number;
  
  // Architecture
  productFamilies: { name: string; percentage: number }[];
  priceSegments: { name: string; minPrice: number; maxPrice: number; percentage: number }[];
  productTypeSegments: { type: 'REVENUE' | 'IMAGEN' | 'ENTRY'; percentage: number }[];
  
  // Monthly distribution
  monthlyDistribution: number[];
}

export interface PlannerData extends AIAdvisorData {
  // Financial layer (added in Planner)
  totalSalesTarget: number;
  targetMargin: number;
  plannedDiscounts: number;
  
  // SKU details
  skus: {
    id: string;
    name: string;
    category: string;
    family: string;
    cost: number;
    price: number;
    quantity: number;
    margin: number;
  }[];
}

/**
 * Save Creative Space data to localStorage
 */
export function saveCreativeSpaceData(data: CreativeSpaceData): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('aimily_creative_data', JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save creative space data:', error);
  }
}

/**
 * Load Creative Space data from localStorage
 */
export function loadCreativeSpaceData(): CreativeSpaceData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem('aimily_creative_data');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load creative space data:', error);
    return null;
  }
}

/**
 * Generate AI context from Creative Space data
 */
export function generateAIContext(creativeData: CreativeSpaceData): string {
  const parts: string[] = [];
  
  if (creativeData.moodboardImages.length > 0) {
    parts.push(`User moodboard contains ${creativeData.moodboardImages.length} reference images.`);
  }
  
  if (creativeData.pinterestBoards && creativeData.pinterestBoards.length > 0) {
    const boardNames = creativeData.pinterestBoards.map(b => b.name).join(', ');
    parts.push(`Pinterest boards: ${boardNames}.`);
  }
  
  if (creativeData.keyColors && creativeData.keyColors.length > 0) {
    parts.push(`Key colors: ${creativeData.keyColors.join(', ')}.`);
  }
  
  if (creativeData.keyTrends && creativeData.keyTrends.length > 0) {
    parts.push(`Key trends: ${creativeData.keyTrends.join(', ')}.`);
  }
  
  if (creativeData.keyItems && creativeData.keyItems.length > 0) {
    parts.push(`Key items: ${creativeData.keyItems.join(', ')}.`);
  }
  
  return parts.join(' ');
}

/**
 * Calculate financial metrics from Planner data
 */
export function calculateFinancialMetrics(data: PlannerData) {
  const totalCost = data.skus.reduce((sum, sku) => sum + (sku.cost * sku.quantity), 0);
  const totalRevenue = data.skus.reduce((sum, sku) => sum + (sku.price * sku.quantity), 0);
  const totalMargin = totalRevenue - totalCost;
  const marginPercentage = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
  
  return {
    totalCost,
    totalRevenue,
    totalMargin,
    marginPercentage,
    actualSkuCount: data.skus.length,
    expectedSkuCount: data.expectedSkus,
    skuGap: data.skus.length - data.expectedSkus,
  };
}

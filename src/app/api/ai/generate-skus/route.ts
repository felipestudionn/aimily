import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash-lite';

/**
 * Generate SKUs based on the collection framework from AI Advisor
 * CRITICAL: Must generate EXACTLY the requested number of SKUs
 * CRITICAL: Total expected_sales must equal EXACTLY the totalSalesTarget
 */
export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured' },
      { status: 500 }
    );
  }

  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const body = await req.json();
    const { setupData, count } = body;

    if (!setupData) {
      return NextResponse.json(
        { error: 'setupData is required' },
        { status: 400 }
      );
    }

    // Use EXACTLY the expected SKU count from setup
    const exactSkuCount = count || setupData.expectedSkus;
    const totalSalesTarget = setupData.totalSalesTarget;
    const targetMargin = setupData.targetMargin;
    const salePercentage = 60; // Assumed sell-through rate

    const SYSTEM_PROMPT = `You are an expert Fashion Merchandiser creating a SKU list for a fashion collection.

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${exactSkuCount} SKUs - no more, no less
2. The collection must achieve a total sales target of €${totalSalesTarget}

Collection Framework:
- EXACT SKU Count Required: ${exactSkuCount}
- EXACT Total Sales Target: €${totalSalesTarget}
- Product Families: ${JSON.stringify(setupData.productFamilies)}
- Price Range: €${setupData.minPrice} - €${setupData.maxPrice}
- Average Price Target: €${setupData.avgPriceTarget}
- Target Margin: ${targetMargin}%
- Product Type Mix: ${JSON.stringify(setupData.productTypeSegments)}
- Price Segments: ${JSON.stringify(setupData.priceSegments)}
- Drops: ${setupData.dropsCount}

For each SKU, calculate:
- expected_sales = buy_units * sale_percentage(${salePercentage}%) * pvp
- The SUM of all expected_sales across all ${exactSkuCount} SKUs should approximate €${totalSalesTarget}

Return ONLY a valid JSON array with EXACTLY ${exactSkuCount} items:
[
  {
    "name": "Product Name",
    "family": "Family from productFamilies",
    "type": "REVENUE" | "IMAGEN" | "ENTRY",
    "pvp": number (retail price),
    "cost": number (cost price based on ${targetMargin}% margin),
    "suggestedUnits": number (buy units),
    "drop": number (1 to ${setupData.dropsCount}),
    "salesWeight": number (percentage of total sales this SKU represents, all must sum to 100)
  }
]

Rules:
1. MUST return EXACTLY ${exactSkuCount} SKUs
2. Names should be specific fashion product names
3. Distribute SKUs across families according to their percentages
4. Ensure margin = (pvp - cost) / pvp equals ${targetMargin}%
5. REVENUE items: moderate prices, higher units, ~60% of sales
6. IMAGEN items: higher prices, lower units, ~15% of sales
7. ENTRY items: lower prices, moderate units, ~25% of sales
8. salesWeight must sum to exactly 100 across all SKUs
9. Return ONLY JSON array, no markdown or explanation`;

    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent`
    );
    url.searchParams.set('key', GEMINI_API_KEY);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT }] }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error', response.status, errorText);
      return NextResponse.json(
        { error: 'Gemini API error', details: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsedSkus;
    try {
      const firstBracket = textResponse.indexOf('[');
      const lastBracket = textResponse.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1) {
        parsedSkus = JSON.parse(textResponse.slice(firstBracket, lastBracket + 1));
      } else {
        parsedSkus = JSON.parse(textResponse);
      }
    } catch (e) {
      console.error('Failed to parse Gemini SKUs', textResponse);
      return NextResponse.json(
        { error: 'Failed to parse generated SKUs', raw: textResponse },
        { status: 500 }
      );
    }

    // POST-PROCESSING: Ensure EXACTLY the right number of SKUs and EXACT sales target
    
    // 1. Ensure exact SKU count
    while (parsedSkus.length < exactSkuCount) {
      // Duplicate last SKU with slight variation
      const lastSku = parsedSkus[parsedSkus.length - 1];
      parsedSkus.push({
        ...lastSku,
        name: `${lastSku.name} Variant ${parsedSkus.length + 1}`,
        salesWeight: 100 / exactSkuCount
      });
    }
    if (parsedSkus.length > exactSkuCount) {
      parsedSkus = parsedSkus.slice(0, exactSkuCount);
    }

    // 2. Normalize salesWeight to sum to exactly 100
    const totalWeight = parsedSkus.reduce((sum: number, sku: any) => sum + (sku.salesWeight || 100 / exactSkuCount), 0);
    parsedSkus = parsedSkus.map((sku: any) => ({
      ...sku,
      salesWeight: ((sku.salesWeight || 100 / exactSkuCount) / totalWeight) * 100
    }));

    // 3. Calculate units to achieve EXACT sales target
    // expected_sales = units * salePercentage * pvp
    // We need: sum(expected_sales) = totalSalesTarget
    // For each SKU: expected_sales = (salesWeight / 100) * totalSalesTarget
    // So: units = expected_sales / (salePercentage * pvp)
    
    const processedSkus = parsedSkus.map((sku: any, index: number) => {
      const skuSalesTarget = (sku.salesWeight / 100) * totalSalesTarget;
      const pvp = sku.pvp || setupData.avgPriceTarget;
      const cost = sku.cost || pvp * (1 - targetMargin / 100);
      
      // Calculate units needed to hit exact sales target
      // expected_sales = units * (salePercentage/100) * pvp
      // units = expected_sales / ((salePercentage/100) * pvp)
      const unitsNeeded = Math.round(skuSalesTarget / ((salePercentage / 100) * pvp));
      
      // Recalculate expected_sales with rounded units
      const expectedSales = unitsNeeded * (salePercentage / 100) * pvp;
      
      return {
        ...sku,
        pvp: Math.round(pvp * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        suggestedUnits: Math.max(1, unitsNeeded),
        expectedSales: Math.round(expectedSales * 100) / 100,
        targetSales: skuSalesTarget // Keep track of target for adjustment
      };
    });

    // 4. Final adjustment: Distribute any rounding difference to hit EXACT target
    const currentTotal = processedSkus.reduce((sum: number, sku: any) => sum + sku.expectedSales, 0);
    const difference = totalSalesTarget - currentTotal;
    
    if (Math.abs(difference) > 0.01) {
      // Add/subtract the difference from the largest SKU
      const largestSkuIndex = processedSkus.reduce((maxIdx: number, sku: any, idx: number, arr: any[]) => 
        sku.expectedSales > arr[maxIdx].expectedSales ? idx : maxIdx, 0);
      
      processedSkus[largestSkuIndex].expectedSales = 
        Math.round((processedSkus[largestSkuIndex].expectedSales + difference) * 100) / 100;
      
      // Recalculate units for this SKU to match the adjusted expected sales
      const sku = processedSkus[largestSkuIndex];
      sku.suggestedUnits = Math.round(sku.expectedSales / ((salePercentage / 100) * sku.pvp));
    }

    // Clean up internal fields
    const finalSkus = processedSkus.map((sku: any) => ({
      name: sku.name,
      family: sku.family,
      type: sku.type,
      pvp: sku.pvp,
      cost: sku.cost,
      suggestedUnits: sku.suggestedUnits,
      drop: sku.drop || 1,
      expectedSales: sku.expectedSales
    }));

    // Verify final totals
    const finalTotal = finalSkus.reduce((sum: number, sku: any) => sum + sku.expectedSales, 0);
    console.log(`Generated ${finalSkus.length} SKUs with total expected sales: €${finalTotal.toFixed(2)} (target: €${totalSalesTarget})`);

    return NextResponse.json({ 
      skus: finalSkus,
      summary: {
        skuCount: finalSkus.length,
        totalExpectedSales: Math.round(finalTotal * 100) / 100,
        targetSales: totalSalesTarget
      }
    });
  } catch (error) {
    console.error('SKU generation error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

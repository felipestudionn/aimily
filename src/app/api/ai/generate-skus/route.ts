import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkAIUsage, usageDeniedResponse } from '@/lib/api-auth';
import { generateJSON } from '@/lib/ai/llm-client';

/**
 * Generate SKUs based on the collection framework from AI Advisor
 * CRITICAL: Must generate EXACTLY the requested number of SKUs
 * CRITICAL: Total expected_sales must equal EXACTLY the totalSalesTarget
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const usage = await checkAIUsage(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  try {
    const body = await req.json();
    const { setupData, count } = body;

    if (!setupData) {
      return NextResponse.json({ error: 'setupData is required' }, { status: 400 });
    }

    const exactSkuCount = count || setupData.expectedSkus;
    const totalSalesTarget = setupData.totalSalesTarget;
    const targetMargin = setupData.targetMargin;
    const salePercentage = 60;

    const system = `You are a senior fashion merchandiser who builds SKU assortments for brands like Zara, COS, and Massimo Dutti.

You create product names that feel real and commercially viable — not generic placeholders. Each SKU name should sound like something you'd see on a retail website: specific silhouette + material + distinguishing detail (e.g., "Oversized Linen Blazer," "Cropped Wide-Leg Trouser," "Leather Chelsea Boot").

NAMING RULES:
- Every name must be unique and descriptive enough to visualize the product
- Use actual fashion product naming conventions: [Fit/Detail] + [Material if relevant] + [Core Item]
- REVENUE items: commercial bestseller names (classic, wearable)
- IMAGEN items: editorial, statement names (distinctive, press-worthy)
- ENTRY items: accessible, hook names (easy to buy, gift-worthy)

Return ONLY raw JSON, no markdown.`;

    const userPrompt = `Generate EXACTLY ${exactSkuCount} SKUs for this collection.

COLLECTION FRAMEWORK:
- Total Sales Target: €${totalSalesTarget}
- Product Families: ${JSON.stringify(setupData.productFamilies)}
- Price Range: €${setupData.minPrice} - €${setupData.maxPrice}
- Average Price: €${setupData.avgPriceTarget}
- Target Margin: ${targetMargin}%
- Type Mix: ${JSON.stringify(setupData.productTypeSegments)}
- Price Segments: ${JSON.stringify(setupData.priceSegments)}
- Drops: ${setupData.dropsCount}

Return a JSON array with EXACTLY ${exactSkuCount} items:
[
  {
    "name": "Specific Product Name",
    "family": "Family from productFamilies",
    "type": "REVENUE" | "IMAGEN" | "ENTRY",
    "pvp": number,
    "cost": number,
    "suggestedUnits": number,
    "drop": number (1 to ${setupData.dropsCount}),
    "salesWeight": number (all must sum to 100)
  }
]

RULES:
1. EXACTLY ${exactSkuCount} SKUs — no more, no less
2. Distribute across families proportionally
3. margin = (pvp - cost) / pvp ≈ ${targetMargin}%
4. salesWeight must sum to exactly 100`;

    const { data: rawSkus } = await generateJSON<unknown[]>({
      system,
      user: userPrompt,
      temperature: 0.7,
    });

    // POST-PROCESSING: Ensure exact SKU count and sales target
    let parsedSkus = Array.isArray(rawSkus) ? rawSkus : [];

    // 1. Ensure exact SKU count
    while (parsedSkus.length < exactSkuCount) {
      const lastSku = parsedSkus[parsedSkus.length - 1];
      parsedSkus.push({
        ...(lastSku as Record<string, unknown>),
        name: `${(lastSku as Record<string, unknown>).name} Variant ${parsedSkus.length + 1}`,
        salesWeight: 100 / exactSkuCount,
      });
    }
    if (parsedSkus.length > exactSkuCount) {
      parsedSkus = parsedSkus.slice(0, exactSkuCount);
    }

    // 2. Normalize salesWeight to sum to exactly 100
    const totalWeight = parsedSkus.reduce(
      (sum: number, sku: unknown) => sum + ((sku as Record<string, number>).salesWeight || 100 / exactSkuCount),
      0
    );
    parsedSkus = parsedSkus.map((sku: unknown) => ({
      ...(sku as Record<string, unknown>),
      salesWeight: (((sku as Record<string, number>).salesWeight || 100 / exactSkuCount) / totalWeight) * 100,
    }));

    // 3. Calculate units to achieve EXACT sales target
    const processedSkus = parsedSkus.map((sku: unknown) => {
      const s = sku as Record<string, number>;
      const skuSalesTarget = (s.salesWeight / 100) * totalSalesTarget;
      const pvp = s.pvp || setupData.avgPriceTarget;
      const cost = s.cost || pvp * (1 - targetMargin / 100);
      const unitsNeeded = Math.round(skuSalesTarget / ((salePercentage / 100) * pvp));
      const expectedSales = unitsNeeded * (salePercentage / 100) * pvp;

      return {
        ...(sku as Record<string, unknown>),
        pvp: Math.round(pvp * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        suggestedUnits: Math.max(1, unitsNeeded),
        expectedSales: Math.round(expectedSales * 100) / 100,
        targetSales: skuSalesTarget,
      };
    });

    // 4. Final rounding adjustment
    const currentTotal = processedSkus.reduce((sum: number, sku) => sum + (sku.expectedSales as number), 0);
    const difference = totalSalesTarget - currentTotal;

    if (Math.abs(difference) > 0.01) {
      const largestIdx = processedSkus.reduce(
        (maxIdx: number, sku, idx, arr) =>
          (sku.expectedSales as number) > (arr[maxIdx].expectedSales as number) ? idx : maxIdx,
        0
      );
      processedSkus[largestIdx].expectedSales =
        Math.round(((processedSkus[largestIdx].expectedSales as number) + difference) * 100) / 100;
      const s = processedSkus[largestIdx];
      s.suggestedUnits = Math.round((s.expectedSales as number) / ((salePercentage / 100) * (s.pvp as number)));
    }

    const finalSkus = processedSkus.map((sku) => {
      const s = sku as Record<string, unknown>;
      return {
        name: s.name,
        family: s.family,
        type: s.type,
        pvp: sku.pvp,
        cost: sku.cost,
        suggestedUnits: sku.suggestedUnits,
        drop: (s.drop as number) || 1,
        expectedSales: sku.expectedSales,
      };
    });

    const finalTotal = finalSkus.reduce((sum: number, sku) => sum + (sku.expectedSales as number), 0);
    console.log(`Generated ${finalSkus.length} SKUs: €${finalTotal.toFixed(2)} (target: €${totalSalesTarget})`);

    return NextResponse.json({
      skus: finalSkus,
      summary: {
        skuCount: finalSkus.length,
        totalExpectedSales: Math.round(finalTotal * 100) / 100,
        targetSales: totalSalesTarget,
      },
    });
  } catch (error) {
    console.error('SKU generation error', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

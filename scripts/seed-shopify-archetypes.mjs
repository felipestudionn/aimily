/**
 * Targeted archetype seeder · Felipe 2026-05-19.
 *
 * Replaces the random power-law seeder. Assigns each aimily-SKU
 * (model+color) to one of 10 archetypes and applies the manipulations
 * (publishedAt, stock per location, compareAtPrice, orders, refunds) so the
 * In-Season engine produces the canonical verdict for each archetype.
 *
 * Read first: memory/shopify-lane-kpi-canon-and-scenarios-2026-05-19.md
 * (§3 archetype catalog · §4 build plan).
 *
 * Archetypes (45 SKUs total):
 *   1. Recién lanzado + hero        (5 SKUs)
 *   2. Recién lanzado + loser        (5 SKUs)
 *   3. Reposición llega tarde        (4 SKUs)
 *   4. Hero mid-season               (5 SKUs)
 *   5. Loser mid-season              (5 SKUs)
 *   6. Carryover survivor            (4 SKUs)
 *   7. Returns problem               (5 SKUs)
 *   8. Color winner brothers lagging (5 SKUs · multi-color only)
 *   9. Stockout total                (3 SKUs)
 *  10. Hold weak signal              (4 SKUs)
 *
 * Usage:
 *   SHOPIFY_DEMO_SHOP=… SHOPIFY_DEMO_TOKEN=… node scripts/seed-shopify-archetypes.mjs
 *
 * Flags:
 *   --plan-only    print assignment + manipulations, don't fire mutations
 *   --orders-only  skip stock/publishedAt/compareAtPrice; only do orders+refunds
 *   --no-orders    skip orders+refunds (just do stock + publishedAt + compareAtPrice)
 */

const SHOP = process.env.SHOPIFY_DEMO_SHOP;
const TOKEN = process.env.SHOPIFY_DEMO_TOKEN;
const API_VERSION = '2026-01';
const SEED_TAG = 'aimily-seed-archetypes-2026-05-19';

const PLAN_ONLY = process.argv.includes('--plan-only');
const ORDERS_ONLY = process.argv.includes('--orders-only');
const NO_ORDERS = process.argv.includes('--no-orders');

if (!SHOP || !TOKEN) {
  console.error('SHOPIFY_DEMO_SHOP and SHOPIFY_DEMO_TOKEN required');
  process.exit(1);
}
const GQL_URL = `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`;

async function gql(query, variables) {
  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data;
}

const LOCATIONS = {
  toronto: 'gid://shopify/Location/89110315253',
  nyc: 'gid://shopify/Location/89113231605',
  la: 'gid://shopify/Location/89113264373',
  madrid: 'gid://shopify/Location/89113297141',
  barcelona: 'gid://shopify/Location/89113329909',
};
const ALL_LOC_IDS = Object.values(LOCATIONS);

// ---------------------------------------------------------------------------
// Fetch + aggregate to aimily-SKU level (model + color)
// ---------------------------------------------------------------------------

async function fetchAllProducts() {
  const Q = /* GraphQL */ `
    query Snapshot($after: String) {
      products(first: 25, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id handle title vendor productType publishedAt tags
            variants(first: 30) {
              edges {
                node {
                  id sku price compareAtPrice
                  selectedOptions { name value }
                  inventoryItem { id }
                }
              }
            }
          }
        }
      }
    }
  `;
  const out = [];
  let after = null;
  while (true) {
    const data = await gql(Q, { after });
    for (const e of data.products.edges) out.push(e.node);
    if (!data.products.pageInfo.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
  }
  return out;
}

/** Aggregate variants of same product by color → one aimily-SKU per (product, color). */
function aggregateToAimilySkus(products) {
  const aimilySkus = [];
  for (const p of products) {
    const byColor = new Map();
    for (const ve of p.variants.edges) {
      const v = ve.node;
      const colorOpt = v.selectedOptions.find((o) => /color|colour|colore/i.test(o.name));
      const color = colorOpt?.value || '_default_';
      const arr = byColor.get(color) || [];
      arr.push(v);
      byColor.set(color, arr);
    }
    for (const [color, variants] of byColor) {
      aimilySkus.push({
        product_id: p.id,
        product_handle: p.handle,
        product_title: p.title,
        vendor: p.vendor,
        product_type: p.productType,
        color,
        variants, // size-level Shopify variants
        representative_sku: variants[0].sku,
        rep_variant_id: variants[0].id,
        rep_inventory_item_id: variants[0].inventoryItem.id,
        price: parseFloat(variants[0].price),
        compareAtPrice: variants[0].compareAtPrice ? parseFloat(variants[0].compareAtPrice) : null,
      });
    }
  }
  return aimilySkus;
}

// ---------------------------------------------------------------------------
// Archetype assignment
// ---------------------------------------------------------------------------

const ARCHETYPES = [
  { id: 1, name: 'newly-launched-hero',       count: 5 },
  { id: 2, name: 'newly-launched-loser',      count: 5 },
  { id: 3, name: 'late-replenishment',        count: 4 },
  { id: 4, name: 'midseason-hero',            count: 5 },
  { id: 5, name: 'midseason-loser',           count: 5 },
  { id: 6, name: 'carryover-survivor',        count: 4 },
  { id: 7, name: 'returns-problem',           count: 5 },
  { id: 8, name: 'color-winner-brothers',     count: 5, requires: 'multicolor' },
  { id: 9, name: 'total-stockout',            count: 3 },
  { id: 10, name: 'hold-weak-signal',         count: 4 },
];

/** Assign aimily-SKUs to archetypes deterministically.
 *  Color-winner archetype consumes multi-color product groups (2+ aimily-SKUs
 *  sharing product_id) — we assign 5 SKUs across ~2 multi-color products. */
function assignArchetypes(aimilySkus) {
  // Group by product_id to detect multi-color
  const byProduct = new Map();
  for (const s of aimilySkus) {
    const arr = byProduct.get(s.product_id) || [];
    arr.push(s);
    byProduct.set(s.product_id, arr);
  }
  const multiColorProducts = [...byProduct.values()].filter((arr) => arr.length >= 2);

  const assigned = new Map(); // aimily-SKU.representative_sku → archetype_id
  const archetypeBuckets = {};
  for (const a of ARCHETYPES) archetypeBuckets[a.id] = [];

  // Arquetipo 8: multi-color groups (5 SKUs across 2-3 multi-color products)
  // Pick the first 2-3 multi-color products and take all their colors (up to 5)
  let archetype8Count = 0;
  for (const group of multiColorProducts) {
    if (archetype8Count >= 5) break;
    for (const s of group) {
      if (archetype8Count >= 5) break;
      if (!assigned.has(s.representative_sku)) {
        assigned.set(s.representative_sku, 8);
        archetypeBuckets[8].push(s);
        archetype8Count++;
      }
    }
  }

  // Assign the rest in order to archetypes 1-7, 9, 10
  const remaining = aimilySkus.filter((s) => !assigned.has(s.representative_sku));
  const ordered = [1, 2, 3, 4, 5, 6, 7, 9, 10];
  let idx = 0;
  for (const archId of ordered) {
    const a = ARCHETYPES.find((x) => x.id === archId);
    let added = 0;
    while (added < a.count && idx < remaining.length) {
      const s = remaining[idx++];
      assigned.set(s.representative_sku, archId);
      archetypeBuckets[archId].push(s);
      added++;
    }
  }
  return { assigned, archetypeBuckets };
}

// ---------------------------------------------------------------------------
// Manipulations per archetype
// ---------------------------------------------------------------------------

function archetypeSpec(id) {
  // Returns { publishedAtOffsetDays, stockProfile, compareAtPriceMultiplier, ordersPerSku, refundRate, ordersWindow }
  switch (id) {
    case 1: return { // newly-launched-hero
      publishedAtOffsetDays: -4,
      stockProfile: { toronto: 8, nyc: 4, la: 4, madrid: 3, barcelona: 2 }, // low, cayendo
      compareAtPriceMultiplier: null, // not on sale
      ordersPerSku: 10,
      ordersWindow: { fromDays: 0.04, toDays: 4 }, // last 4 days
      refundRate: 0.05,
    };
    case 2: return { // newly-launched-loser
      publishedAtOffsetDays: -5,
      stockProfile: { toronto: 60, nyc: 30, la: 30, madrid: 25, barcelona: 25 }, // full stock untouched
      compareAtPriceMultiplier: null,
      ordersPerSku: 1, // basically nothing
      ordersWindow: { fromDays: 0.5, toDays: 5 },
      refundRate: 0,
    };
    case 3: return { // late-replenishment
      publishedAtOffsetDays: -30,
      stockProfile: { toronto: 0, nyc: 0, la: 0, madrid: 12, barcelona: 8 }, // 3/5 stockouts
      compareAtPriceMultiplier: null,
      ordersPerSku: 8,
      ordersWindow: { fromDays: 0.04, toDays: 10 },
      refundRate: 0.05,
    };
    case 4: return { // midseason-hero
      publishedAtOffsetDays: -28,
      stockProfile: { toronto: 12, nyc: 8, la: 6, madrid: 5, barcelona: 4 }, // bajando
      compareAtPriceMultiplier: null,
      ordersPerSku: 15,
      ordersWindow: { fromDays: 0.04, toDays: 14 },
      refundRate: 0.04,
    };
    case 5: return { // midseason-loser
      publishedAtOffsetDays: -35,
      stockProfile: { toronto: 80, nyc: 50, la: 50, madrid: 40, barcelona: 35 },
      compareAtPriceMultiplier: 1.4, // signals markdown candidate
      ordersPerSku: 2,
      ordersWindow: { fromDays: 1, toDays: 14 },
      refundRate: 0.10,
    };
    case 6: return { // carryover-survivor — also tag 'carryover:true'
      publishedAtOffsetDays: -120,
      stockProfile: { toronto: 25, nyc: 15, la: 15, madrid: 10, barcelona: 8 },
      compareAtPriceMultiplier: null,
      ordersPerSku: 8,
      ordersWindow: { fromDays: 0.04, toDays: 14 },
      refundRate: 0.05,
      addTag: 'carryover:true',
    };
    case 7: return { // returns-problem
      publishedAtOffsetDays: -45,
      stockProfile: { toronto: 30, nyc: 20, la: 20, madrid: 15, barcelona: 12 },
      compareAtPriceMultiplier: null,
      ordersPerSku: 6,
      ordersWindow: { fromDays: 0.04, toDays: 14 },
      refundRate: 0.30, // ~30% refund rate → returns_pct ~25-30%
    };
    case 8: return { // color-winner-brothers — heroic boost on the FIRST sku of each multi-color cluster, brothers stay quiet
      // Note: assigned in clusters of same product. The seeder will boost the
      // first SKU of each product cluster and leave the rest with token orders.
      publishedAtOffsetDays: -28,
      stockProfile: { toronto: 18, nyc: 10, la: 10, madrid: 8, barcelona: 6 },
      compareAtPriceMultiplier: null,
      ordersPerSku: 12, // averaged — first SKU gets 30, brothers get 3
      ordersWindow: { fromDays: 0.04, toDays: 14 },
      refundRate: 0.04,
      colorWinnerBoost: true,
    };
    case 9: return { // total-stockout
      publishedAtOffsetDays: -21,
      stockProfile: { toronto: 0, nyc: 0, la: 0, madrid: 0, barcelona: 0 },
      compareAtPriceMultiplier: null,
      ordersPerSku: 6, // sold before stockout
      ordersWindow: { fromDays: 3, toDays: 14 },
      refundRate: 0.05,
    };
    case 10: return { // hold-weak-signal
      publishedAtOffsetDays: -10,
      stockProfile: { toronto: 22, nyc: 12, la: 12, madrid: 10, barcelona: 8 },
      compareAtPriceMultiplier: null,
      ordersPerSku: 4,
      ordersWindow: { fromDays: 0.04, toDays: 10 },
      refundRate: 0.08,
    };
  }
}

// ---------------------------------------------------------------------------
// API mutations
// ---------------------------------------------------------------------------

async function productUpdate(productId, input) {
  const Q = /* GraphQL */ `
    mutation P($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id }
        userErrors { field message }
      }
    }
  `;
  const data = await gql(Q, { input: { id: productId, ...input } });
  return data.productUpdate;
}

async function productVariantsBulkUpdate(productId, variants) {
  const Q = /* GraphQL */ `
    mutation V($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id }
        userErrors { field message }
      }
    }
  `;
  return (await gql(Q, { productId, variants })).productVariantsBulkUpdate;
}

async function inventorySetQuantities(quantities) {
  // quantities: [{inventoryItemId, locationId, quantity}]
  const Q = /* GraphQL */ `
    mutation IS($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        userErrors { field message }
      }
    }
  `;
  return (await gql(Q, { input: { reason: 'correction', name: 'available', referenceDocumentUri: 'https://aimily.app/inventory-adjustment/archetypes-2026-05-19', ignoreCompareQuantity: true, quantities } })).inventorySetQuantities;
}

const ORDER_CREATE = /* GraphQL */ `
  mutation O($order: OrderCreateOrderInput!) {
    orderCreate(order: $order) {
      order { id name }
      userErrors { field message }
    }
  }
`;

function randomEmail() {
  const n = Math.random().toString(36).slice(2, 8);
  return `aimily.archetype.${n}@aimily-seed.test`;
}

async function createOrder(variantId, processedAt, qty, price, archetype_id) {
  const amount = (price * qty).toFixed(2);
  const input = {
    processedAt,
    test: true,
    tags: [SEED_TAG, `archetype-${archetype_id}`],
    customer: {
      toUpsert: { email: randomEmail(), firstName: 'Test', lastName: 'Buyer' },
    },
    lineItems: [{ variantId, quantity: qty }],
    transactions: [{
      kind: 'SALE', status: 'SUCCESS', gateway: 'bogus', test: true,
      processedAt, amountSet: { shopMoney: { amount, currencyCode: 'USD' } },
    }],
    financialStatus: 'PAID',
  };
  return gql(ORDER_CREATE, { order: input });
}

// ---------------------------------------------------------------------------
// Refund pass
// ---------------------------------------------------------------------------

async function fetchSeedOrders() {
  const Q = /* GraphQL */ `
    query SeedOrders($after: String) {
      orders(first: 25, after: $after, query: "tag:${SEED_TAG}") {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id name tags
            lineItems(first: 5) {
              edges {
                node { id sku quantity }
              }
            }
          }
        }
      }
    }
  `;
  const all = [];
  let after = null;
  while (true) {
    const d = await gql(Q, { after });
    for (const e of d.orders.edges) all.push(e.node);
    if (!d.orders.pageInfo.hasNextPage) break;
    after = d.orders.pageInfo.endCursor;
  }
  return all;
}

async function refundOrder(orderId, lineItemId, qty) {
  const Q = /* GraphQL */ `
    mutation R($input: RefundInput!) {
      refundCreate(input: $input) {
        refund { id }
        userErrors { field message }
      }
    }
  `;
  return gql(Q, {
    input: {
      orderId, note: 'aimily-archetype-refund',
      refundLineItems: [{ lineItemId, quantity: qty, restockType: 'RETURN', locationId: LOCATIONS.toronto }],
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  console.log(`Shop: ${SHOP}`);
  console.log('\n=== Phase 0: snapshot store ===');
  const products = await fetchAllProducts();
  console.log(`Products: ${products.length}`);
  const aimilySkus = aggregateToAimilySkus(products);
  console.log(`aimily-SKUs (model+color): ${aimilySkus.length}`);

  console.log('\n=== Phase 1: assign archetypes ===');
  const { assigned, archetypeBuckets } = assignArchetypes(aimilySkus);
  for (const a of ARCHETYPES) {
    const bucket = archetypeBuckets[a.id];
    console.log(`  ${a.id}. ${a.name} (target ${a.count}): ${bucket.length} SKUs`);
    for (const s of bucket.slice(0, 2)) {
      console.log(`     - ${s.vendor} · ${s.product_title.slice(0, 40)} (${s.color}) · €${s.price}`);
    }
  }
  console.log(`Total assigned: ${assigned.size} / ${aimilySkus.length}`);

  if (PLAN_ONLY) { console.log('\n--plan-only · stopping'); return; }

  // Skip stock+publishedAt+price if orders-only
  if (!ORDERS_ONLY) {
    console.log('\n=== Phase 2: apply per-product manipulations ===');
    let manipCount = 0;
    // Track which products we've already updated (to avoid double-publishing or tagging)
    const productsTouched = new Set();
    for (const [archId, bucket] of Object.entries(archetypeBuckets)) {
      const spec = archetypeSpec(Number(archId));
      for (const s of bucket) {
        const publishedAt = new Date(Date.now() + spec.publishedAtOffsetDays * 86400000).toISOString();
        // 1. productUpdate publishedAt (once per product)
        if (!productsTouched.has(s.product_id)) {
          try {
            const productInput = { publishedAt };
            if (spec.addTag) {
              const existingTags = products.find((p) => p.id === s.product_id)?.tags || [];
              productInput.tags = [...new Set([...existingTags, spec.addTag])];
            }
            const r = await productUpdate(s.product_id, productInput);
            if (r.userErrors.length === 0) manipCount++;
            else console.log(`  productUpdate FAIL ${s.product_title}: ${JSON.stringify(r.userErrors).slice(0, 100)}`);
            productsTouched.add(s.product_id);
          } catch (e) { console.log(`  productUpdate ERR ${s.product_title}: ${e.message.slice(0, 100)}`); }
        }
        // 2. compareAtPrice on all variants of this aimily-SKU
        if (spec.compareAtPriceMultiplier) {
          const newCompare = (s.price * spec.compareAtPriceMultiplier).toFixed(2);
          try {
            const variantsInput = s.variants.map((v) => ({ id: v.id, compareAtPrice: newCompare }));
            const r = await productVariantsBulkUpdate(s.product_id, variantsInput);
            if (r.userErrors.length === 0) manipCount++;
            else console.log(`  variantUpdate FAIL ${s.product_title}: ${JSON.stringify(r.userErrors).slice(0, 100)}`);
          } catch (e) { console.log(`  variantUpdate ERR ${s.product_title}: ${e.message.slice(0, 100)}`); }
        }
        // 3. inventorySetQuantities for all 5 locations × all variants of aimily-SKU
        const quantities = [];
        for (const v of s.variants) {
          for (const [locKey, locId] of Object.entries(LOCATIONS)) {
            quantities.push({ inventoryItemId: v.inventoryItem.id, locationId: locId, quantity: spec.stockProfile[locKey] || 0 });
          }
        }
        try {
          // Split into chunks of 100 to avoid hitting limits
          for (let i = 0; i < quantities.length; i += 80) {
            const chunk = quantities.slice(i, i + 80);
            const r = await inventorySetQuantities(chunk);
            if (r.userErrors.length === 0) manipCount++;
            else console.log(`  inventorySet FAIL: ${JSON.stringify(r.userErrors).slice(0, 100)}`);
          }
        } catch (e) { console.log(`  inventorySet ERR: ${e.message.slice(0, 100)}`); }
        await sleep(150);
      }
    }
    console.log(`Phase 2 manipulations: ${manipCount}`);
  }

  // Skip orders if no-orders
  if (NO_ORDERS) {
    console.log('\n--no-orders · skipping order seeding');
    return;
  }

  console.log('\n=== Phase 3: seed archetype-targeted orders ===');
  // Build all (sku, archetype) → orderPlan tuples
  const allOrders = [];
  for (const [archId, bucket] of Object.entries(archetypeBuckets)) {
    const spec = archetypeSpec(Number(archId));
    if (spec.ordersPerSku === 0) continue;
    for (let idx = 0; idx < bucket.length; idx++) {
      const s = bucket[idx];
      // Color winner boost: archetype 8 → first SKU of each product cluster gets 30 orders, rest get 3
      let ordersForThisSku = spec.ordersPerSku;
      if (spec.colorWinnerBoost) {
        // First SKU in same product gets the boost (color winner)
        const isFirstColor = idx === 0 || s.product_id !== bucket[idx - 1].product_id;
        ordersForThisSku = isFirstColor ? 20 : 2;
      }
      for (let i = 0; i < ordersForThisSku; i++) {
        const offsetDays = spec.ordersWindow.fromDays + Math.random() * (spec.ordersWindow.toDays - spec.ordersWindow.fromDays);
        const processedAt = new Date(Date.now() - offsetDays * 86400000).toISOString();
        allOrders.push({
          variantId: s.rep_variant_id,
          price: s.price,
          processedAt,
          archetype_id: Number(archId),
          sku: s.representative_sku,
        });
      }
    }
  }
  console.log(`Total orders planned: ${allOrders.length} (5/min cap → ~${Math.ceil(allOrders.length / 5)} min)`);

  // Shuffle so orders aren't perfectly grouped
  for (let i = allOrders.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allOrders[i], allOrders[j]] = [allOrders[j], allOrders[i]];
  }

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < allOrders.length; i++) {
    const o = allOrders[i];
    try {
      const r = await createOrder(o.variantId, o.processedAt, 1, o.price, o.archetype_id);
      if (r.orderCreate.userErrors.length === 0) {
        ok++;
      } else {
        fail++;
        if (fail < 3) console.log(`  [${i + 1}] FAIL ${o.sku} (arq ${o.archetype_id}): ${JSON.stringify(r.orderCreate.userErrors).slice(0, 100)}`);
      }
    } catch (e) {
      fail++;
      if (/throttled|rate/i.test(e.message)) await sleep(60_000);
    }
    if ((i + 1) % 25 === 0) console.log(`  [${i + 1}/${allOrders.length}] ${ok} OK / ${fail} FAIL`);
    await sleep(12_500); // 5/min cap
  }
  console.log(`Phase 3: ${ok} OK / ${fail} FAIL`);

  console.log('\n=== Phase 4: refunds for archetypes with refundRate > 0 ===');
  const seedOrders = await fetchSeedOrders();
  console.log(`Found ${seedOrders.length} seed-tagged orders`);
  let refundOk = 0;
  let refundFail = 0;
  // Group orders by archetype tag
  for (const order of seedOrders) {
    const archTag = (order.tags || []).find((t) => /^archetype-\d+$/.test(t));
    if (!archTag) continue;
    const archId = Number(archTag.replace('archetype-', ''));
    const spec = archetypeSpec(archId);
    if (!spec.refundRate || Math.random() >= spec.refundRate) continue;
    const li = order.lineItems.edges[0]?.node;
    if (!li) continue;
    try {
      const r = await refundOrder(order.id, li.id, li.quantity);
      if (r.refundCreate.userErrors.length === 0) refundOk++;
      else refundFail++;
    } catch (e) { refundFail++; }
    await sleep(1500);
  }
  console.log(`Phase 4: ${refundOk} OK / ${refundFail} FAIL`);

  console.log('\n=== DONE ===');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});

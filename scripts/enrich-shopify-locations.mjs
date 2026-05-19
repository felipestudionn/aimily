/**
 * Enrich the Shopify dev store with multi-location topology · 2026-05-19.
 *
 * Adds 4 retail locations alongside the existing Toronto warehouse, then
 * activates inventory at each location for every variant with a realistic
 * power-law split. This unlocks the In-Season `AMPLIFY_DISTRIBUTION` verb
 * and the `stores_with_stock` / `stores_total` signal (previously stuck at
 * 1/1 because Shopify dev stores ship with one default location).
 *
 * Locations created:
 *   - New York · 235 Bowery, New York NY 10002
 *   - Los Angeles · 8543 Melrose Ave, West Hollywood CA 90069
 *   - Madrid · Calle Serrano 27, 28001 Madrid
 *   - Barcelona · Passeig de Gràcia 17, 08007 Barcelona
 *
 * Inventory distribution per variant (power-law w/ stockouts):
 *   - Toronto (existing): unchanged (the CSV-seeded quantity)
 *   - NYC:        rand(0,40), 8% chance stockout
 *   - LA:         rand(0,30), 12% chance stockout
 *   - Madrid:     rand(0,25), 15% chance stockout
 *   - Barcelona:  rand(0,20), 20% chance stockout
 *
 * Idempotency: re-running creates duplicate locations unless --skip-locations
 * is passed. We dedupe by name match.
 */

const SHOP = process.env.SHOPIFY_DEMO_SHOP;
const TOKEN = process.env.SHOPIFY_DEMO_TOKEN;
const API_VERSION = '2026-01';

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
  if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data;
}

const NEW_LOCATIONS = [
  {
    name: 'New York',
    address: { address1: '235 Bowery', city: 'New York', countryCode: 'US', provinceCode: 'NY', zip: '10002' },
    qtyMax: 40,
    stockoutChance: 0.08,
  },
  {
    name: 'Los Angeles',
    address: { address1: '8543 Melrose Ave', city: 'West Hollywood', countryCode: 'US', provinceCode: 'CA', zip: '90069' },
    qtyMax: 30,
    stockoutChance: 0.12,
  },
  {
    name: 'Madrid',
    address: { address1: 'Calle Serrano 27', city: 'Madrid', countryCode: 'ES', zip: '28001' },
    qtyMax: 25,
    stockoutChance: 0.15,
  },
  {
    name: 'Barcelona',
    address: { address1: 'Passeig de Gràcia 17', city: 'Barcelona', countryCode: 'ES', zip: '08007' },
    qtyMax: 20,
    stockoutChance: 0.20,
  },
];

async function listLocations() {
  const data = await gql(
    /* GraphQL */ `{
      locations(first: 50, includeInactive: false) {
        edges { node { id name isActive } }
      }
    }`,
    {}
  );
  return data.locations.edges.map((e) => e.node);
}

async function addLocation(spec) {
  const data = await gql(
    /* GraphQL */ `
      mutation LocationAdd($input: LocationAddInput!) {
        locationAdd(input: $input) {
          location { id name }
          userErrors { field message }
        }
      }
    `,
    {
      input: {
        name: spec.name,
        address: spec.address,
        fulfillsOnlineOrders: true,
      },
    }
  );
  if (data.locationAdd.userErrors.length > 0) {
    throw new Error(`locationAdd: ${JSON.stringify(data.locationAdd.userErrors)}`);
  }
  return data.locationAdd.location;
}

async function listAllInventoryItems() {
  const data = await gql(
    /* GraphQL */ `
      query Variants($after: String) {
        products(first: 20, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              variants(first: 30) {
                edges {
                  node { id sku inventoryItem { id } }
                }
              }
            }
          }
        }
      }
    `,
    {}
  );
  const items = [];
  for (const e of data.products.edges) {
    for (const ve of e.node.variants.edges) {
      items.push({ variantId: ve.node.id, sku: ve.node.sku, inventoryItemId: ve.node.inventoryItem.id });
    }
  }
  let cursor = data.products.pageInfo.endCursor;
  let hasNext = data.products.pageInfo.hasNextPage;
  while (hasNext) {
    const page = await gql(
      /* GraphQL */ `
        query Variants($after: String) {
          products(first: 20, after: $after) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                variants(first: 30) {
                  edges { node { id sku inventoryItem { id } } }
                }
              }
            }
          }
        }
      `,
      { after: cursor }
    );
    for (const e of page.products.edges) {
      for (const ve of e.node.variants.edges) {
        items.push({ variantId: ve.node.id, sku: ve.node.sku, inventoryItemId: ve.node.inventoryItem.id });
      }
    }
    cursor = page.products.pageInfo.endCursor;
    hasNext = page.products.pageInfo.hasNextPage;
  }
  return items;
}

async function inventoryActivate(inventoryItemId, locationId, available) {
  const data = await gql(
    /* GraphQL */ `
      mutation Activate($inventoryItemId: ID!, $locationId: ID!, $available: Int) {
        inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) {
          inventoryLevel { id }
          userErrors { field message }
        }
      }
    `,
    { inventoryItemId, locationId, available }
  );
  if (data.inventoryActivate.userErrors.length > 0) {
    return { ok: false, errors: data.inventoryActivate.userErrors };
  }
  return { ok: true };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`Shop: ${SHOP}`);

  // 1. Create new locations (or reuse existing matches by name)
  console.log('\n=== Phase 1: ensure 4 retail locations exist ===');
  const existing = await listLocations();
  const byName = new Map(existing.map((l) => [l.name, l]));
  console.log(`Existing locations: ${existing.length} (${existing.map((l) => l.name).join(', ')})`);

  const created = [];
  for (const spec of NEW_LOCATIONS) {
    if (byName.has(spec.name)) {
      console.log(`  KEEP ${spec.name} → ${byName.get(spec.name).id}`);
      created.push({ ...spec, id: byName.get(spec.name).id });
    } else {
      const loc = await addLocation(spec);
      console.log(`  ADD  ${spec.name} → ${loc.id}`);
      created.push({ ...spec, id: loc.id });
      await sleep(200);
    }
  }

  // 2. Fetch all variants with their inventoryItemIds
  console.log('\n=== Phase 2: fetch all variants ===');
  const variants = await listAllInventoryItems();
  console.log(`Found ${variants.length} variants`);

  // 3. Activate inventory for each variant at each new location
  console.log('\n=== Phase 3: activate inventory at each new location ===');
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    for (const loc of created) {
      const stockout = Math.random() < loc.stockoutChance;
      const qty = stockout ? 0 : Math.floor(Math.random() * loc.qtyMax);
      const r = await inventoryActivate(v.inventoryItemId, loc.id, qty);
      if (r.ok) {
        ok++;
      } else {
        fail++;
        // "Inventory item is already activated at the location" → idempotent skip
        const benign = r.errors.some((e) => /already.*activated|already.*stocking/i.test(e.message));
        if (!benign) {
          console.log(`  FAIL ${v.sku}@${loc.name}: ${JSON.stringify(r.errors).slice(0, 200)}`);
        }
      }
      await sleep(100); // gentle pacing
    }
    if ((i + 1) % 20 === 0) {
      console.log(`  [${i + 1}/${variants.length}] variants processed (${ok} OK / ${fail} skipped or failed)`);
    }
  }
  console.log(`\nPhase 3 total: ${ok} activations OK, ${fail} skipped/failed`);
  console.log('\n=== DONE ===');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});

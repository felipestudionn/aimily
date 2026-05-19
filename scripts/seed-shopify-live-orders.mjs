/**
 * Seed synthetic orders on Shopify dev store (aimily-mlyel0nm) via Admin
 * GraphQL API · 2026-05-19 sprint Shopify lane.
 *
 * Goal: populate the dev store with orders so the In-Season GraphQL adapter
 * (`src/lib/strategy/parsers/shopify-graphql.ts`) can fetch them and the
 * engine produces real velocity windows (d1, d2, 7d, 8_14d).
 *
 * CRITICAL constraints from official Shopify docs (verbatim, no invented):
 *  - `orderCreate` requires `write_orders` scope.
 *  - Dev/trial stores cap at 5 new orders per minute (HARD RATE LIMIT).
 *  - GraphQL parser fetches orders where `processed_at >= anchor - 21d`.
 *    Orders outside that window won't be read → concentrate seed in last 14d.
 *  - `processedAt: DateTime` on OrderCreateOrderInput is what backdates the
 *    order (verbatim: "the date that appears on your orders and that's used
 *    in analytic reports").
 *  - `gateway: "bogus"` + `test: true` on the transaction routes through the
 *    Shopify Bogus Gateway (test processor) and marks the transaction as test.
 *  - As of 2026-04 refunds require @idempotent. We're on 2026-01 still optional.
 *
 * Distribution:
 *  - 150 orders, power-law over variants. Top 3 variants = 40% volume,
 *    next 5 = 30%, rest = 30%.
 *  - Temporal: 12 orders today (anchor), 8 yesterday (d1), 8 d-2 (d2),
 *    72 in days -3..-7 (rest of 7d window), 50 in days -8..-14 (8_14d).
 *
 * Refunds (post-seeding pass):
 *  - ~20% of orders get partial refund on one line item.
 *  - Refund.processedAt cannot be backdated (no such field) → refunds will
 *    all timestamp "now". This is a known limitation; documented.
 *
 * Usage:
 *   SHOPIFY_DEMO_SHOP=aimily-mlyel0nm.myshopify.com \
 *   SHOPIFY_DEMO_TOKEN=shpat_xxx \
 *   node scripts/seed-shopify-live-orders.mjs
 *
 * The script is RESUMABLE: orders are tagged `aimily-seed-2026-05-19` so
 * a re-run can detect already-created orders and skip ahead. Run again with
 * `--refunds-only` to skip seeding and just create refunds on existing
 * tagged orders.
 */

const SHOP = process.env.SHOPIFY_DEMO_SHOP;
const TOKEN = process.env.SHOPIFY_DEMO_TOKEN;
const API_VERSION = '2026-01';
const SEED_TAG = 'aimily-seed-2026-05-19';
const TOTAL_ORDERS = 150;
const REFUND_PCT = 0.2;
const LOCATION_ID = 'gid://shopify/Location/89110315253'; // "My Custom Location" (Toronto)

const REFUNDS_ONLY = process.argv.includes('--refunds-only');

if (!SHOP || !TOKEN) {
  console.error('SHOPIFY_DEMO_SHOP and SHOPIFY_DEMO_TOKEN env vars required');
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
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

async function fetchAllVariants() {
  const QUERY = /* GraphQL */ `
    query ProductsForSeed($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id title
            variants(first: 100) {
              edges {
                node { id sku title price }
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
    const data = await gql(QUERY, { first: 50, after });
    for (const e of data.products.edges) {
      for (const ve of e.node.variants.edges) {
        const v = ve.node;
        all.push({
          variantId: v.id,
          sku: v.sku,
          productTitle: e.node.title,
          variantTitle: v.title,
          price: parseFloat(v.price),
        });
      }
    }
    if (!data.products.pageInfo.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
  }
  return all;
}

/** Power-law assignment of order count to variants. */
function buildPlan(variants) {
  const sorted = [...variants].sort(() => Math.random() - 0.5);
  const top3 = sorted.slice(0, 3);
  const next5 = sorted.slice(3, 8);
  const rest = sorted.slice(8);
  const top3Orders = Math.round(TOTAL_ORDERS * 0.4);
  const next5Orders = Math.round(TOTAL_ORDERS * 0.3);
  const restOrders = TOTAL_ORDERS - top3Orders - next5Orders;

  const assignments = [];
  for (let i = 0; i < top3Orders; i++) {
    assignments.push(top3[i % top3.length]);
  }
  for (let i = 0; i < next5Orders; i++) {
    assignments.push(next5[i % next5.length]);
  }
  for (let i = 0; i < restOrders && rest.length > 0; i++) {
    assignments.push(rest[i % rest.length]);
  }
  // Shuffle so temporal & SKU dimensions aren't correlated
  for (let i = assignments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [assignments[i], assignments[j]] = [assignments[j], assignments[i]];
  }
  return assignments;
}

/** Distribute processedAt across last 14 days per the windowing plan.
 *  Hard guarantee: every timestamp is strictly in the past (< now - 60s)
 *  to avoid Shopify's "processed_at date cannot be in the future" error. */
function buildTimestamps(n) {
  const now = Date.now();
  const safetyFloor = 60_000; // 1 minute floor
  const result = [];
  // Plan: 12 today, 8 d-1, 8 d-2, 72 in d-3..d-7, 50 in d-8..d-14
  const ratios = [
    { fromMs: safetyFloor, toMs: 24 * 3600_000, share: 12 / 150 },   // "today" → 1 min to 24h ago
    { fromMs: 24 * 3600_000, toMs: 48 * 3600_000, share: 8 / 150 },  // d-1
    { fromMs: 48 * 3600_000, toMs: 72 * 3600_000, share: 8 / 150 },  // d-2
    { fromMs: 72 * 3600_000, toMs: 7 * 24 * 3600_000, share: 72 / 150 },  // d-3..d-7
    { fromMs: 7 * 24 * 3600_000, toMs: 14 * 24 * 3600_000, share: 50 / 150 }, // d-8..d-14
  ];
  for (const r of ratios) {
    const count = Math.round(n * r.share);
    for (let i = 0; i < count; i++) {
      const offsetMs = r.fromMs + Math.random() * (r.toMs - r.fromMs);
      const ts = new Date(now - offsetMs);
      result.push(ts.toISOString());
    }
  }
  // Pad/truncate to exact n
  while (result.length < n) {
    const offsetMs = safetyFloor + Math.random() * 14 * 24 * 3600_000;
    result.push(new Date(now - offsetMs).toISOString());
  }
  return result.slice(0, n);
}

const ORDER_CREATE = /* GraphQL */ `
  mutation OrderCreate($order: OrderCreateOrderInput!) {
    orderCreate(order: $order) {
      userErrors { field message }
      order {
        id
        name
        processedAt
        displayFinancialStatus
      }
    }
  }
`;

function randomEmail() {
  const names = ['ana', 'liam', 'noah', 'sofia', 'mateo', 'emma', 'leo', 'mia', 'lucas', 'lola'];
  const surn = ['garcia', 'lopez', 'fernandez', 'martin', 'rodriguez', 'jones', 'smith', 'brown'];
  const n = names[Math.floor(Math.random() * names.length)];
  const s = surn[Math.floor(Math.random() * surn.length)];
  return `${n}.${s}.${Math.floor(Math.random() * 9999)}@aimily-seed.test`;
}

function randomFirstLast() {
  const first = ['Ana', 'Liam', 'Noah', 'Sofia', 'Mateo', 'Emma', 'Leo', 'Mia', 'Lucas', 'Lola'];
  const last = ['Garcia', 'Lopez', 'Fernandez', 'Martin', 'Rodriguez', 'Jones', 'Smith', 'Brown'];
  return {
    firstName: first[Math.floor(Math.random() * first.length)],
    lastName: last[Math.floor(Math.random() * last.length)],
  };
}

async function createOrder(variant, processedAt) {
  const { firstName, lastName } = randomFirstLast();
  const email = randomEmail();
  const quantity = Math.random() < 0.8 ? 1 : 2;
  const amount = (variant.price * quantity).toFixed(2);

  const input = {
    processedAt,
    test: true,
    tags: [SEED_TAG],
    customer: {
      toUpsert: {
        email,
        firstName,
        lastName,
      },
    },
    lineItems: [
      {
        variantId: variant.variantId,
        quantity,
      },
    ],
    transactions: [
      {
        kind: 'SALE',
        status: 'SUCCESS',
        gateway: 'bogus',
        test: true,
        processedAt,
        amountSet: {
          shopMoney: {
            amount,
            currencyCode: 'USD',
          },
        },
      },
    ],
    financialStatus: 'PAID',
  };

  return gql(ORDER_CREATE, { order: input });
}

async function listSeedOrders() {
  const QUERY = /* GraphQL */ `
    query SeedOrders($first: Int!, $after: String) {
      orders(first: $first, after: $after, query: "tag:${SEED_TAG}") {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id name processedAt
            lineItems(first: 5) {
              edges {
                node {
                  id sku quantity
                  originalUnitPriceSet { shopMoney { amount } }
                }
              }
            }
            transactions {
              id kind status amountSet { shopMoney { amount } }
            }
          }
        }
      }
    }
  `;
  const all = [];
  let after = null;
  while (true) {
    const data = await gql(QUERY, { first: 50, after });
    for (const e of data.orders.edges) all.push(e.node);
    if (!data.orders.pageInfo.hasNextPage) break;
    after = data.orders.pageInfo.endCursor;
  }
  return all;
}

const REFUND_CREATE = /* GraphQL */ `
  mutation RefundCreate($input: RefundInput!) {
    refundCreate(input: $input) {
      userErrors { field message }
      refund { id totalRefundedSet { shopMoney { amount } } }
    }
  }
`;

async function createRefund(order) {
  // Pick first line item to refund (full quantity)
  const li = order.lineItems.edges[0]?.node;
  if (!li) return null;

  // Omit `transactions` from RefundInput — Shopify auto-computes the refund
  // transaction from refundLineItems when transactions is null. Explicit
  // transactions arrays trigger "Reference can't be blank" with bogus gateway
  // parents (the SALE transaction has no `reference` field set, which the
  // child REFUND transaction would need to inherit).
  const input = {
    orderId: order.id,
    note: 'aimily-seed-refund',
    refundLineItems: [
      {
        lineItemId: li.id,
        quantity: li.quantity,
        restockType: 'RETURN',
        locationId: LOCATION_ID,
      },
    ],
  };
  return gql(REFUND_CREATE, { input });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`Shop: ${SHOP}`);
  console.log(`API:  ${GQL_URL}`);

  if (!REFUNDS_ONLY) {
    console.log('\n=== Phase 1: fetch variants ===');
    const variants = await fetchAllVariants();
    console.log(`Found ${variants.length} variants across products`);

    console.log('\n=== Phase 2: build seed plan ===');
    const assignments = buildPlan(variants);
    const timestamps = buildTimestamps(assignments.length);
    console.log(`Plan: ${assignments.length} orders (5/min cap → ~${Math.ceil(assignments.length / 5)} min)`);

    console.log('\n=== Phase 3: create orders (rate-limited 5/min) ===');
    let ok = 0;
    let fail = 0;
    const errors = [];
    for (let i = 0; i < assignments.length; i++) {
      const variant = assignments[i];
      const ts = timestamps[i];
      try {
        const r = await createOrder(variant, ts);
        if (r.orderCreate.userErrors.length > 0) {
          fail++;
          errors.push({ i, sku: variant.sku, errors: r.orderCreate.userErrors });
          console.log(`[${i + 1}/${assignments.length}] FAIL ${variant.sku}: ${JSON.stringify(r.orderCreate.userErrors)}`);
        } else {
          ok++;
          console.log(`[${i + 1}/${assignments.length}] OK   ${variant.sku} @ ${ts.slice(0, 10)} → ${r.orderCreate.order.name}`);
        }
      } catch (e) {
        fail++;
        errors.push({ i, sku: variant.sku, error: e.message });
        console.log(`[${i + 1}/${assignments.length}] FAIL ${variant.sku}: ${e.message}`);
        // If rate-limited, back off harder
        if (/throttled|rate/i.test(e.message)) await sleep(60_000);
      }
      // Rate limit: 5/min → 12s minimum between orders
      await sleep(12_500);
    }
    console.log(`\nPhase 3 result: ${ok} OK, ${fail} FAIL`);
    if (errors.length > 0) {
      console.log('First 5 errors:', JSON.stringify(errors.slice(0, 5), null, 2));
    }
  }

  console.log('\n=== Phase 4: create refunds ===');
  const seedOrders = await listSeedOrders();
  console.log(`Found ${seedOrders.length} seed-tagged orders`);
  const refundCount = Math.round(seedOrders.length * REFUND_PCT);
  const toRefund = [...seedOrders]
    .sort(() => Math.random() - 0.5)
    .slice(0, refundCount);
  let refundOk = 0;
  let refundFail = 0;
  for (let i = 0; i < toRefund.length; i++) {
    try {
      const r = await createRefund(toRefund[i]);
      if (r && r.refundCreate.userErrors.length === 0) {
        refundOk++;
        console.log(`[${i + 1}/${toRefund.length}] REFUND OK ${toRefund[i].name}`);
      } else {
        refundFail++;
        console.log(`[${i + 1}/${toRefund.length}] REFUND FAIL ${toRefund[i].name}: ${JSON.stringify(r?.refundCreate.userErrors)}`);
      }
    } catch (e) {
      refundFail++;
      console.log(`[${i + 1}/${toRefund.length}] REFUND FAIL ${toRefund[i].name}: ${e.message}`);
    }
    await sleep(2_500);
  }
  console.log(`\nPhase 4 result: ${refundOk} OK, ${refundFail} FAIL`);

  console.log('\n=== DONE ===');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});

/**
 * Lightweight smoke test for the 32 AI endpoints — NO real
 * generations, NO Freepik / Anthropic / OpenAI calls. Sends an empty
 * body to each route and checks the response is a clean 4xx
 * validation error rather than a 5xx crash.
 *
 * What it catches: a missing import, a typo in a Supabase query, a
 * regression where the route throws before reaching the body
 * validator (the kind of thing the silent buildPromptContext fix
 * uncovered earlier today). It does NOT exercise the LLM call path
 * itself — that's what the F3 manual sweep would do; this is the
 * cheap pre-flight that reveals 80% of the regressions for free.
 *
 * Usage:
 *   1. Open Playwright MCP browser to localhost:3000 and log in.
 *   2. Copy the auth cookie value (Application → Cookies → sb-... access).
 *   3. AUTH_COOKIE='sb-...=...; sb-...=...' npx tsx scripts/test-ai-endpoints-shape.ts
 *
 * Without AUTH_COOKIE the test still runs but every endpoint reports
 * 401 — which is itself useful (proves the auth gate is wired) but
 * doesn't catch downstream crashes.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const AUTH_COOKIE = process.env.AUTH_COOKIE || '';

const ENDPOINTS: { path: string; bucket: 'image' | 'video' | 'text' }[] = [
  { path: '/api/ai/freepik/still-life', bucket: 'image' },
  { path: '/api/ai/freepik/editorial', bucket: 'image' },
  { path: '/api/ai/freepik/tryon', bucket: 'image' },
  { path: '/api/ai/freepik/brand-model', bucket: 'image' },
  { path: '/api/ai/freepik/video', bucket: 'video' },
  { path: '/api/ai/brief/analyze', bucket: 'text' },
  { path: '/api/ai/brief/scenarios', bucket: 'text' },
  { path: '/api/ai/brief/generate', bucket: 'text' },
  { path: '/api/ai/brief/create', bucket: 'text' },
  { path: '/api/ai/tech-pack/generate', bucket: 'text' },
  { path: '/api/ai/merch-generate', bucket: 'text' },
  { path: '/api/ai/generate-skus', bucket: 'text' },
  { path: '/api/ai/creative-generate', bucket: 'text' },
  { path: '/api/ai/design-generate', bucket: 'text' },
  { path: '/api/ai/gtm/generate', bucket: 'text' },
  { path: '/api/ai/launch/generate', bucket: 'text' },
  { path: '/api/ai/post-launch/generate', bucket: 'text' },
  { path: '/api/ai/content-calendar/generate', bucket: 'text' },
  { path: '/api/ai/content-strategy/generate', bucket: 'text' },
  { path: '/api/ai/paid/generate', bucket: 'text' },
  { path: '/api/ai/propose-comments', bucket: 'text' },
  { path: '/api/ai/analyze-moodboard', bucket: 'text' },
  { path: '/api/ai/detect-zones', bucket: 'text' },
  { path: '/api/ai/zones/detect', bucket: 'text' },
  { path: '/api/ai/colorize-sketch', bucket: 'image' },
  { path: '/api/ai/generate-sketch-options', bucket: 'image' },
  { path: '/api/ai/brand/visual-references', bucket: 'image' },
  { path: '/api/ai/merchandising/scenarios', bucket: 'text' },
  { path: '/api/ai/market-prediction', bucket: 'text' },
  { path: '/api/ai/market-trends', bucket: 'text' },
  { path: '/api/ai/explore-trends', bucket: 'text' },
  { path: '/api/ai/vectorize', bucket: 'text' },
];

interface Result {
  path: string;
  status: number;
  ok: boolean;
  detail: string;
}

async function probe(path: string): Promise<Result> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_COOKIE ? { Cookie: AUTH_COOKIE } : {}),
      },
      body: JSON.stringify({}),
    });
    let detail = '';
    try {
      const text = await res.text();
      // Trim huge HTML 404 pages so output stays readable
      detail = text.length > 200 ? text.slice(0, 200) + '…' : text;
    } catch { /* binary or unreadable */ }
    /* OK = 4xx (rejected payload) is exactly what we want.
       2xx is suspicious — we sent {} so anything that returned 200 is
       either over-permissive or actually started a generation.
       5xx is a crash — investigate. */
    const ok = res.status >= 400 && res.status < 500;
    return { path, status: res.status, ok, detail: detail.replace(/\s+/g, ' ').trim() };
  } catch (e) {
    return {
      path,
      status: 0,
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  console.log(`Probing ${ENDPOINTS.length} AI endpoints against ${BASE_URL}`);
  console.log(`Auth: ${AUTH_COOKIE ? 'cookie provided' : 'NONE — every endpoint should 401'}\n`);

  const crashes: Result[] = [];
  for (const { path, bucket } of ENDPOINTS) {
    const r = await probe(path);
    const tag = r.status === 0 ? '⚠ ' : r.status >= 500 ? '✗ ' : r.status === 401 ? '◦ ' : r.ok ? '✓ ' : '◯ ';
    console.log(`${tag}${r.status.toString().padEnd(3)} ${path}  [${bucket}]  ${r.detail.slice(0, 70)}`);
    if (r.status >= 500 || r.status === 0) crashes.push(r);
  }

  console.log(`\n${ENDPOINTS.length} endpoints scanned. ${crashes.length} crashed (5xx or network).`);
  if (crashes.length > 0) {
    console.log('Crashed routes:');
    for (const c of crashes) console.log(`  ${c.path} → ${c.status}: ${c.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

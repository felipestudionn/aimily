/**
 * In-memory sliding-window rate limiter.
 *
 * Trade-offs for Vercel Fluid Compute:
 *   - Each warm instance has its own Map → distributed limit is not exact.
 *   - Good enough to stop pathological clients (loops, scripts, scrapers).
 *   - For coordinated DDoS, layer Vercel BotID on top.
 *
 * Use:
 *   if (!rateLimit.allow(`${userId}:ai`, 30, 60_000)) return 429
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 50_000;

function gc() {
  if (buckets.size < MAX_KEYS) return;
  const now = Date.now();
  buckets.forEach((b, k) => {
    if (b.resetAt < now) buckets.delete(k);
  });
}

export const rateLimit = {
  /**
   * Allow `limit` requests per `windowMs`. Returns false when over limit.
   */
  allow(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || b.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      gc();
      return true;
    }
    if (b.count >= limit) return false;
    b.count++;
    return true;
  },

  /**
   * Get remaining quota in current window.
   */
  remaining(key: string, limit: number): number {
    const b = buckets.get(key);
    if (!b || b.resetAt < Date.now()) return limit;
    return Math.max(0, limit - b.count);
  },
};

/**
 * Pull the best-available client IP from a Next.js request.
 * Falls back to a constant so unidentifiable callers share a bucket.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

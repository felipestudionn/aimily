/**
 * URL safety check for server-side fetches initiated by user input.
 *
 * Closes the SSRF window: an authenticated user can ask the API to
 * download an image from an arbitrary URL (Pinterest pin, Freepik
 * preview, their own CDN). Without sanitisation that arbitrary URL
 * could point at the AWS metadata service, an internal Vercel host,
 * or a private network address — and the server (with service-role
 * credentials in scope) would happily fetch it and either echo the
 * response back or rehost it as if it were the user's own asset.
 *
 * Policy:
 *   1. https only (no http, no file:, no data:, no gopher:, etc.).
 *   2. Hostname must resolve to a public IP — block 10/8, 172.16/12,
 *      192.168/16, 127/8, 169.254/16, link-local v6, unique-local v6,
 *      ::1, and the cloud metadata IP 169.254.169.254 explicitly.
 *   3. Hostname not in the explicit deny set (localhost variants).
 *   4. Optional allowlist of hosts the product genuinely needs to
 *      download from — passed in by the caller. If allowlist is
 *      provided, the host must match (suffix match, so `*.supabase.co`
 *      passes for any project).
 *
 * Returns `{ ok: true }` when safe, otherwise `{ ok: false, reason }`.
 *
 * Note: Node's fetch resolves DNS at the network layer, not here.
 * A determined attacker could DNS-rebind a public hostname to a
 * private IP between this check and the actual fetch (TOCTOU). For
 * the launch we accept that risk — closing it requires a custom
 * Agent that re-validates after DNS resolution. Track as deuda.
 */

import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/* Hosts we actually need to download from. Suffix match. */
const DEFAULT_ALLOWLIST = [
  'supabase.co',
  'supabase.in',
  'freepik.com',
  'cdn-magnific.freepik.com',
  'aifrog.b-cdn.net', // Freepik CDN edge
  'oaiusercontent.com', // OpenAI image hosting
  'fal.media',
  'fal.ai',
  'storage.googleapis.com',
  'aimily.app',
  'pinimg.com', // Pinterest CDN
];

const DENY_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
]);

const METADATA_IPS = new Set([
  '169.254.169.254', // AWS, GCP, Azure metadata
  '169.254.170.2',   // ECS task metadata
]);

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 10) return true;                          // 10/8
  if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16/12
  if (a === 192 && b === 168) return true;            // 192.168/16
  if (a === 127) return true;                         // 127/8 loopback
  if (a === 169 && b === 254) return true;            // 169.254/16 link-local
  if (a === 0) return true;                           // 0.0.0.0
  if (a >= 224) return true;                          // multicast / reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:')) return true;          // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local fc00::/7
  if (lower.startsWith('::ffff:')) {                   // IPv4-mapped — re-check as v4
    const v4 = lower.slice(7);
    if (isIP(v4) === 4) return isPrivateIPv4(v4);
  }
  return false;
}

export interface UrlGuardOptions {
  /** Suffix-match allowlist. If provided, host must end with one of these. */
  allowlist?: string[];
  /** Skip DNS resolution — only validate the literal hostname/IP in the URL.
   *  Faster but leaves DNS-rebinding via public hostname unchecked. */
  skipDnsResolve?: boolean;
}

export type UrlGuardResult =
  | { ok: true; url: URL }
  | { ok: false; reason: string };

export async function assertSafeExternalUrl(
  rawUrl: string,
  opts: UrlGuardOptions = {},
): Promise<UrlGuardResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'http_not_allowed' };
  }

  const host = url.hostname.toLowerCase();

  if (DENY_HOSTNAMES.has(host)) {
    return { ok: false, reason: 'localhost_denied' };
  }

  /* If the hostname is already a literal IP, validate it directly. */
  const literalIpKind = isIP(host);
  if (literalIpKind === 4) {
    if (METADATA_IPS.has(host) || isPrivateIPv4(host)) {
      return { ok: false, reason: 'private_ip_denied' };
    }
  } else if (literalIpKind === 6) {
    if (isPrivateIPv6(host)) {
      return { ok: false, reason: 'private_ipv6_denied' };
    }
  } else if (!opts.skipDnsResolve) {
    /* Resolve to make sure the host doesn't quietly point at a
       private address. This is best-effort — see TOCTOU note above. */
    try {
      const addresses = await dnsLookup(host, { all: true });
      for (const addr of addresses) {
        if (addr.family === 4) {
          if (METADATA_IPS.has(addr.address) || isPrivateIPv4(addr.address)) {
            return { ok: false, reason: 'resolves_to_private_ip' };
          }
        } else if (addr.family === 6) {
          if (isPrivateIPv6(addr.address)) {
            return { ok: false, reason: 'resolves_to_private_ipv6' };
          }
        }
      }
    } catch {
      /* DNS failure: treat as safe-to-attempt — fetch will fail on its
         own and surface to the caller. We don't want a flaky resolver
         to block legitimate user uploads. */
    }
  }

  /* Allowlist check (suffix match). Empty / undefined allowlist =
     accept any non-private host. */
  const allowlist = opts.allowlist ?? DEFAULT_ALLOWLIST;
  if (allowlist.length > 0) {
    const allowed = allowlist.some(suffix => host === suffix || host.endsWith('.' + suffix));
    if (!allowed) {
      return { ok: false, reason: 'host_not_in_allowlist' };
    }
  }

  return { ok: true, url };
}

/**
 * Convenience: throws on unsafe URL with a friendly message. Use in
 * routes where the URL was already validated as required up the call
 * chain and you only want to assert at fetch time.
 */
export async function ensureSafeExternalUrl(rawUrl: string, opts?: UrlGuardOptions): Promise<URL> {
  const r = await assertSafeExternalUrl(rawUrl, opts);
  if (!r.ok) {
    throw new Error(`URL rejected by safety check (${r.reason}): ${rawUrl.slice(0, 200)}`);
  }
  return r.url;
}

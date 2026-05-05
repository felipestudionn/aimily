/* ═══════════════════════════════════════════════════════════════════
   Reserved subdomains for *.aimily.shop

   These cannot be claimed by users — they are either:
   - Brand-owned (aimily, www, app, api, …)
   - Operationally dangerous (mail, ftp, admin, …)
   - Confusing for users (login, signup, dashboard, …)

   Add to this list aggressively when in doubt. It is much easier to
   release a reserved name than to revoke one already in use.
   ═══════════════════════════════════════════════════════════════════ */

export const RESERVED_SUBDOMAINS = new Set<string>([
  // Brand
  'aimily', 'www', 'app', 'web', 'public',
  // API / infra
  'api', 'admin', 'dashboard', 'console', 'panel', 'cdn', 'static', 'assets', 'media',
  // Email / DNS infra
  'mail', 'email', 'smtp', 'imap', 'pop', 'pop3', 'mx', 'dns', 'ns', 'ns1', 'ns2',
  'ftp', 'sftp', 'webmail', 'autodiscover', 'autoconfig', '_dmarc', '_domainkey',
  // Auth
  'login', 'logout', 'signup', 'signin', 'register', 'auth', 'sso', 'oauth',
  // Common ops
  'status', 'health', 'metrics', 'monitor', 'monitoring', 'logs', 'kibana', 'grafana',
  'help', 'support', 'docs', 'documentation', 'guide', 'kb',
  'blog', 'news', 'press', 'media-kit',
  // Legal / common
  'legal', 'privacy', 'terms', 'tos', 'cookies', 'gdpr',
  'about', 'careers', 'jobs', 'contact', 'team',
  // Test / local
  'test', 'staging', 'dev', 'preview', 'demo', 'sandbox', 'beta', 'alpha',
  'localhost', 'local', 'example',
  // Payment / financial
  'pay', 'payments', 'checkout', 'billing', 'invoice', 'invoices', 'subscribe',
  'stripe', 'paypal', 'shopify',
  // Catch-all reserved single chars and numbers
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  // Storefront-specific
  'shop', 'store', 'cart', 'order', 'orders', 'product', 'products', 'collection', 'collections',
  // Aimily product surfaces
  'creative', 'merchandising', 'design', 'marketing', 'calendar', 'presentation', 'presentation-export',
  'wholesale', 'tech-pack', 'techpack', 'plan', 'planner', 'p',
  // Misc danger
  'root', 'security', 'system', 'internal', 'private', 'secret',
]);

/**
 * Returns true if the subdomain is reserved and cannot be claimed.
 * Case-insensitive; assumes input has already passed regex validation.
 */
export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED_SUBDOMAINS.has(subdomain.toLowerCase());
}

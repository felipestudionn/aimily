---
name: Cloudflare credentials for aimily.shop
description: Cloudflare API token + zone ID + account ID for aimily.shop wildcard storefront. Stored in .env.local. Used by Ecom block for DNS automation (wildcard, custom domains, SSL).
type: reference
---

# Cloudflare · aimily.shop

> **Stored in `.env.local`** (gitignored). Read from there in any session — do NOT ask Felipe again.

## Vars

```bash
CLOUDFLARE_ACCOUNT_ID          # Felipe's Cloudflare account
CLOUDFLARE_API_TOKEN           # User API Token, scope=Zone:DNS:Edit on aimily.shop
CLOUDFLARE_ZONE_ID_AIMILY_SHOP # Zone ID for aimily.shop
```

## Token details (visible at https://dash.cloudflare.com/profile/api-tokens)

- **Token ID**: `fc76ceb20633136dbb02dc6179d3b3cd`
- **Type**: User API Token (prefix `cfut_`)
- **Scope**: Zone · DNS · Edit on `aimily.shop` only
- **TTL**: Never expires
- **Created**: 2026-05-05

## What to use it for

- Create / edit / delete DNS records on `aimily.shop`
- Manage wildcard `*.aimily.shop CNAME → cname.vercel-dns.com` (the storefront record)
- Future: custom domains for users via API automation

## What it CANNOT do

- Edit other zones (only aimily.shop)
- Account-level operations (billing, members, etc.)
- Read SSL certs (different scope)

## How to use in code

```ts
const cfToken = process.env.CLOUDFLARE_API_TOKEN!;
const zoneId = process.env.CLOUDFLARE_ZONE_ID_AIMILY_SHOP!;

// List DNS records
const r = await fetch(
  `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
  { headers: { Authorization: `Bearer ${cfToken}` } }
);

// Create a record
await fetch(
  `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'CNAME',
      name: 'foo',
      content: 'bar.example.com',
      proxied: false,
      ttl: 1,
    }),
  }
);
```

## Token rotation

If compromised, rotate via:

1. https://dash.cloudflare.com/profile/api-tokens
2. Click the existing token name
3. **Roll** button (regenerates secret, keeps same ID + scope)
4. Update `.env.local` + Vercel env var with new value

/**
 * Email preview script — sends every customer-facing transactional email to a
 * chosen address so Felipe can review tone + design without involving a real
 * customer or trial cycle.
 *
 * Usage:
 *   npx tsx scripts/email-preview.ts                                # all 6 to hello@aimily.app, EN
 *   npx tsx scripts/email-preview.ts hello@aimily.app               # all 6, EN
 *   npx tsx scripts/email-preview.ts hello@aimily.app --locale=es   # all 6 in Spanish
 *   npx tsx scripts/email-preview.ts hello@aimily.app welcome trial-3d
 *   npx tsx scripts/email-preview.ts hello@aimily.app welcome --locale=fr
 *   npx tsx scripts/email-preview.ts hello@aimily.app --locale=de --types=welcome,halfway
 *
 * Subjects are prefixed with "[PREVIEW {LOCALE}] " to keep them out of any
 * production funnel and identifiable by language at a glance.
 *
 * Loads .env.local automatically via dotenv so RESEND_API_KEY is read.
 */

import * as path from 'node:path';
import * as fs from 'node:fs';

// Load .env.local explicitly — tsx does not auto-load it the way Next.js does.
function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

import {
  sendWelcomeEmail,
  sendTrialEndingEmail,
  sendTwoDaysInEmail,
  sendHalfwayEmail,
  sendTrialExpiredEmail,
} from '../src/lib/transactional-emails';

type EmailType =
  | 'welcome'
  | 'two-days-in'
  | 'halfway'
  | 'trial-3d'
  | 'trial-1d'
  | 'trial-expired';

type Locale = 'en' | 'es' | 'fr' | 'it' | 'de' | 'pt' | 'nl' | 'sv' | 'no';

const ALL_TYPES: EmailType[] = ['welcome', 'two-days-in', 'halfway', 'trial-3d', 'trial-1d', 'trial-expired'];
const ALL_LOCALES: Locale[] = ['en', 'es', 'fr', 'it', 'de', 'pt', 'nl', 'sv', 'no'];

interface ParsedArgs {
  to: string;
  types: EmailType[];
  locales: Locale[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string> = {};
  const positional: string[] = [];

  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq < 0) continue;
      const key = arg.slice(2, eq);
      const value = arg.slice(eq + 1);
      flags[key] = value;
    } else {
      positional.push(arg);
    }
  }

  const to = positional[0] || 'hello@aimily.app';

  // Types: prefer --types flag, fall back to positional rest, fall back to ALL.
  let types: EmailType[];
  if (flags.types) {
    types = flags.types.split(',').map((s) => s.trim()) as EmailType[];
  } else if (positional.length > 1) {
    types = positional.slice(1) as EmailType[];
  } else {
    types = ALL_TYPES;
  }
  types = types.filter((t): t is EmailType => ALL_TYPES.includes(t as EmailType));

  // Locales: --locale=es (single) OR --locales=en,es,fr (multiple) OR default 'en'.
  let locales: Locale[] = ['en'];
  if (flags.locales) {
    locales = flags.locales.split(',').map((s) => s.trim()) as Locale[];
  } else if (flags.locale) {
    locales = [flags.locale] as Locale[];
  }
  locales = locales.filter((l): l is Locale => ALL_LOCALES.includes(l as Locale));
  if (locales.length === 0) locales = ['en'];

  return { to, types, locales };
}

async function main(): Promise<void> {
  const { to, types, locales } = parseArgs(process.argv.slice(2));

  if (!process.env.RESEND_API_KEY) {
    // eslint-disable-next-line no-console
    console.error('RESEND_API_KEY is missing in .env.local — aborting.');
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(
    `Sending ${types.length * locales.length} preview emails to ${to} ` +
      `(${types.length} types × ${locales.length} locale${locales.length > 1 ? 's' : ''}: ${locales.join(',')})...`,
  );

  const results: Array<{ type: EmailType; locale: Locale; ok: boolean; id?: string; error?: string }> = [];

  for (const locale of locales) {
    const prefix = `[PREVIEW ${locale.toUpperCase()}] `;
    for (const type of types) {
      try {
        let result: { id?: string } | null = null;
        if (type === 'welcome') {
          result = await sendWelcomeEmail({ to, name: 'Felipe', locale, _previewSubjectPrefix: prefix });
        } else if (type === 'two-days-in') {
          result = await sendTwoDaysInEmail({ to, name: 'Felipe', locale, _previewSubjectPrefix: prefix });
        } else if (type === 'halfway') {
          result = await sendHalfwayEmail({ to, name: 'Felipe', locale, _previewSubjectPrefix: prefix });
        } else if (type === 'trial-3d') {
          result = await sendTrialEndingEmail({ to, name: 'Felipe', daysLeft: 3, locale, _previewSubjectPrefix: prefix });
        } else if (type === 'trial-1d') {
          result = await sendTrialEndingEmail({ to, name: 'Felipe', daysLeft: 1, locale, _previewSubjectPrefix: prefix });
        } else if (type === 'trial-expired') {
          result = await sendTrialExpiredEmail({ to, name: 'Felipe', locale, _previewSubjectPrefix: prefix });
        }
        results.push({ type, locale, ok: !!result, id: result?.id });
      } catch (err) {
        results.push({ type, locale, ok: false, error: err instanceof Error ? err.message : String(err) });
      }
      // Resend free tier caps at 5 requests/sec. Pace at ~4/s so a multi-
      // locale preview run (e.g. 6 types × 9 locales = 54 emails) never
      // trips the rate limiter.
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

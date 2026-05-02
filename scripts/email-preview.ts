/**
 * Email preview script — sends every customer-facing transactional email to a
 * chosen address so Felipe can review tone + design without involving a real
 * customer or trial cycle.
 *
 * Usage:
 *   npx tsx scripts/email-preview.ts                       # → hello@aimily.app, all 3 (existing)
 *   npx tsx scripts/email-preview.ts hello@aimily.app      # → custom recipient
 *   npx tsx scripts/email-preview.ts hello@aimily.app welcome trial-3d trial-1d   # subset
 *
 * Subjects are prefixed with "[PREVIEW] " to keep them out of any production funnel.
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

import { sendWelcomeEmail, sendTrialEndingEmail } from '../src/lib/transactional-emails';

type EmailType = 'welcome' | 'trial-3d' | 'trial-1d';

const ALL_TYPES: EmailType[] = ['welcome', 'trial-3d', 'trial-1d'];

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const to = args[0] || 'hello@aimily.app';
  const types: EmailType[] =
    args.length > 1
      ? (args.slice(1) as EmailType[]).filter((t): t is EmailType => ALL_TYPES.includes(t as EmailType))
      : ALL_TYPES;

  if (!process.env.RESEND_API_KEY) {
    // eslint-disable-next-line no-console
    console.error('RESEND_API_KEY is missing in .env.local — aborting.');
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(`Sending ${types.length} preview emails to ${to}...`);

  const results: Array<{ type: EmailType; ok: boolean; id?: string; error?: string }> = [];

  for (const type of types) {
    try {
      let result: Awaited<ReturnType<typeof sendWelcomeEmail>> | null = null;
      if (type === 'welcome') {
        result = await sendWelcomeEmail({ to, name: 'Felipe', _previewSubjectPrefix: '[PREVIEW] ' });
      } else if (type === 'trial-3d') {
        result = await sendTrialEndingEmail({ to, name: 'Felipe', daysLeft: 3, _previewSubjectPrefix: '[PREVIEW] ' });
      } else if (type === 'trial-1d') {
        result = await sendTrialEndingEmail({ to, name: 'Felipe', daysLeft: 1, _previewSubjectPrefix: '[PREVIEW] ' });
      }
      results.push({ type, ok: !!result, id: (result as { id?: string } | null)?.id });
    } catch (err) {
      results.push({ type, ok: false, error: err instanceof Error ? err.message : String(err) });
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

/**
 * Apply the editorial dark Auth email templates to the production Supabase
 * project via the Management API. Idempotent — re-running it just rewrites
 * the same content.
 *
 * Usage:
 *   npx tsx scripts/update-supabase-auth-templates.ts
 *
 * Requires:
 *   SUPABASE_ACCESS_TOKEN — Personal Access Token from
 *     https://supabase.com/dashboard/account/tokens (NOT anon/service key).
 *   The token must have access to the `sbweszownvspzjfejmfx` project.
 *
 * What it does:
 *   PATCH https://api.supabase.com/v1/projects/{ref}/config/auth with the
 *   `mailer_templates_confirmation_content`, `mailer_subjects_confirmation`,
 *   `mailer_templates_recovery_content`, and `mailer_subjects_recovery`
 *   fields populated from supabase/templates/.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const PROJECT_REF = 'sbweszownvspzjfejmfx';

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

function readTemplate(name: string): string {
  const filepath = path.resolve(process.cwd(), 'supabase', 'templates', name);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Template not found: ${filepath}`);
  }
  return fs.readFileSync(filepath, 'utf-8');
}

async function main(): Promise<void> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    // eslint-disable-next-line no-console
    console.error('SUPABASE_ACCESS_TOKEN missing. Get one from https://supabase.com/dashboard/account/tokens and add it to .env.local.');
    process.exit(1);
  }

  const confirmHtml = readTemplate('confirm-signup.html');
  const recoveryHtml = readTemplate('recovery.html');

  const body = {
    mailer_subjects_confirmation: 'Confirm your aimily address',
    mailer_templates_confirmation_content: confirmHtml,
    mailer_subjects_recovery: 'Reset your aimily password',
    mailer_templates_recovery_content: recoveryHtml,
  };

  // eslint-disable-next-line no-console
  console.log(`Patching auth config for project ${PROJECT_REF}...`);

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    // eslint-disable-next-line no-console
    console.error(`Failed: HTTP ${res.status}`);
    // eslint-disable-next-line no-console
    console.error(text);
    process.exit(1);
  }

  const data = await res.json().catch(() => ({}));
  // eslint-disable-next-line no-console
  console.log('Auth config updated successfully.');
  // eslint-disable-next-line no-console
  console.log('Subjects:', body.mailer_subjects_confirmation, '|', body.mailer_subjects_recovery);
  // eslint-disable-next-line no-console
  console.log('Server response keys:', Object.keys(data).slice(0, 10).join(', '));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

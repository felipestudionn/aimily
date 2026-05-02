/**
 * Ingest aimily public docs into faq_documents (pgvector knowledge base).
 *
 * Sources:
 *   - i18n/en.ts → privacyPage / termsPage / cookiesPage strings
 *   - landing/MeetAimilyContent.tsx → marketing narrative + DWP framing
 *   - landing/PricingDetail.tsx → plans + credits + imagery table
 *   - faq.md (manual hand-curated FAQ — create at docs/faq.md if it doesn't exist)
 *
 * Pipeline per source:
 *   1. extract plain text
 *   2. chunk into ~500-token segments at paragraph boundaries
 *   3. compute SHA256 hash → dedupe against (source, content_hash) unique
 *   4. embed with OpenAI text-embedding-3-small
 *   5. upsert into faq_documents
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/ingest-faq-docs.ts
 *
 * Optional: pass --source <name> to ingest just one source.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const ROOT = join(process.cwd());
const ARG_SOURCE = process.argv.find((a) => a.startsWith('--source='))?.split('=')[1];

const TARGET_TOKENS = 500;
const CHARS_PER_TOKEN = 4; // rough heuristic for English+Spanish mix

interface Chunk {
  source: string;
  section: string | null;
  content: string;
}

async function main() {
  const chunks: Chunk[] = [];

  if (!ARG_SOURCE || ARG_SOURCE === 'i18n-en') {
    chunks.push(...(await extractFromI18n('en', ['privacyPage', 'termsPage', 'cookiesPage'])));
  }
  if (!ARG_SOURCE || ARG_SOURCE === 'i18n-es') {
    chunks.push(...(await extractFromI18n('es', ['privacyPage', 'termsPage', 'cookiesPage'])));
  }
  if (!ARG_SOURCE || ARG_SOURCE === 'meet-aimily') {
    chunks.push(...(await extractFromTsx('src/components/landing/MeetAimilyContent.tsx', 'meet-aimily')));
  }
  if (!ARG_SOURCE || ARG_SOURCE === 'pricing') {
    chunks.push(...(await extractFromTsx('src/components/landing/PricingDetail.tsx', 'pricing')));
  }
  if (!ARG_SOURCE || ARG_SOURCE === 'faq') {
    chunks.push(...(await extractFromMarkdown('docs/faq.md', 'faq')));
  }

  console.log(`extracted ${chunks.length} chunks`);

  let inserted = 0;
  let skipped = 0;
  for (const chunk of chunks) {
    const hash = sha256(chunk.content);
    const { data: existing } = await supabase
      .from('faq_documents')
      .select('id')
      .eq('source', chunk.source)
      .eq('content_hash', hash)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const embedding = await embed(chunk.content);
    if (!embedding) {
      console.error(`embedding failed for chunk in ${chunk.source}`);
      continue;
    }

    const { error } = await supabase.from('faq_documents').insert({
      source: chunk.source,
      section: chunk.section,
      content: chunk.content,
      content_hash: hash,
      embedding: embedding as unknown as string,
    });

    if (error) {
      console.error(`insert failed for ${chunk.source}:`, error.message);
      continue;
    }
    inserted++;
    process.stdout.write('.');
  }

  console.log(`\ndone — inserted=${inserted} skipped=${skipped} (deduped)`);
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

async function embed(text: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
      dimensions: 1536,
    });
    return response.data[0]?.embedding ?? null;
  } catch (e) {
    console.error('embedding api error', e);
    return null;
  }
}

function chunkText(text: string, sourceLabel: string, sectionLabel: string | null): Chunk[] {
  const targetChars = TARGET_TOKENS * CHARS_PER_TOKEN;
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: Chunk[] = [];
  let buf = '';

  for (const para of paragraphs) {
    if ((buf + '\n\n' + para).length > targetChars && buf.length > 0) {
      chunks.push({ source: sourceLabel, section: sectionLabel, content: buf });
      buf = para;
    } else {
      buf = buf ? buf + '\n\n' + para : para;
    }
  }
  if (buf.trim()) chunks.push({ source: sourceLabel, section: sectionLabel, content: buf });

  return chunks;
}

async function extractFromI18n(locale: string, namespaces: string[]): Promise<Chunk[]> {
  const path = join(ROOT, `src/i18n/${locale}.ts`);
  const file = await readFile(path, 'utf8');
  const out: Chunk[] = [];

  for (const ns of namespaces) {
    // Find the namespace block: ns: { ... } as a balanced-brace section
    const start = file.indexOf(`${ns}:`);
    if (start === -1) continue;
    const openBrace = file.indexOf('{', start);
    if (openBrace === -1) continue;

    // Walk braces to find matching close
    let depth = 0;
    let i = openBrace;
    for (; i < file.length; i++) {
      if (file[i] === '{') depth++;
      else if (file[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) continue;
    const block = file.slice(openBrace + 1, i);

    // Extract values: keyName: 'string' or "string" or `string`
    const valueRegex = /[a-zA-Z0-9_]+:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`)/g;
    const values: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = valueRegex.exec(block)) !== null) {
      const v = m[1] ?? m[2] ?? m[3];
      if (v && v.length > 30) values.push(unescape(v));
    }

    const text = values.join('\n\n');
    out.push(...chunkText(text, `i18n-${locale}-${ns}`, ns));
  }
  return out;
}

async function extractFromTsx(relPath: string, source: string): Promise<Chunk[]> {
  const path = join(ROOT, relPath);
  try {
    await access(path);
  } catch {
    console.warn(`source skipped (not found): ${relPath}`);
    return [];
  }
  const file = await readFile(path, 'utf8');

  // Pull all human-readable text from JSX: anything between > and < that isn't pure markup,
  // plus string literals in JSX attributes that look like prose (>= 30 chars and have spaces).
  const out: string[] = [];

  // Text between JSX tags
  const tagTextRegex = />([^<>{}\n][^<>{}]{20,})</g;
  let m: RegExpExecArray | null;
  while ((m = tagTextRegex.exec(file)) !== null) {
    const v = m[1].trim();
    if (v && v.match(/[a-zA-Z]{4,}/) && v.includes(' ')) out.push(v);
  }

  // String literal props (placeholders, alt text, descriptions)
  const litRegex = /['"`]([^'"`\n]{30,})['"`]/g;
  while ((m = litRegex.exec(file)) !== null) {
    const v = m[1].trim();
    if (v && v.match(/[a-zA-Z]{4,}/) && v.includes(' ') && !v.includes('://') && !v.startsWith('class')) {
      out.push(v);
    }
  }

  const dedup = Array.from(new Set(out));
  const text = dedup.join('\n\n');
  return chunkText(text, source, null);
}

async function extractFromMarkdown(relPath: string, source: string): Promise<Chunk[]> {
  const path = join(ROOT, relPath);
  try {
    await access(path);
  } catch {
    console.warn(`source skipped (not found): ${relPath} — create it with hand-curated Q/A`);
    return [];
  }
  const file = await readFile(path, 'utf8');

  // Split by H2 headings → each is a separate Q/A or topic
  const sections = file.split(/^##\s+/m).slice(1);
  const chunks: Chunk[] = [];
  for (const sec of sections) {
    const lines = sec.split('\n');
    const heading = (lines[0] ?? '').trim();
    const body = lines.slice(1).join('\n').trim();
    if (body.length < 30) continue;
    chunks.push({ source, section: heading, content: `# ${heading}\n\n${body}` });
  }
  return chunks;
}

function unescape(s: string): string {
  return s.replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

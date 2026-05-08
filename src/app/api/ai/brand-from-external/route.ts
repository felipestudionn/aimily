/**
 * POST /api/ai/brand-from-external
 *
 * Sprint A.3 (2026-05-08) — Brand DNA · rama A2 (external import).
 *
 * Synthesises a 6-axis BrandIdentityProposal from external sources
 * the user provided. Any combination of website URL, Instagram
 * handle, and brandbook PDF is valid (at least one is required).
 *
 * Pipeline:
 *   Sonar (Perplexity)    → web + IG live research with citations
 *   scrapeBrandContent()  → homepage + about-page copy
 *   Sonnet vision         → PDF brandbook extraction (when present)
 *   Sonnet synthesis      → final 6-axis proposal, marks contradictory
 *                            fields with `_needsConfirmation: true`
 *
 * Body:
 *   {
 *     url?: string,
 *     instagram?: string,
 *     pdfStoragePath?: string,   // path inside `collection-assets` bucket
 *     pdfBase64?: string,        // alt to pdfStoragePath, for direct uploads
 *     language?: string,
 *   }
 *
 * Returns: { result: BrandIdentityProposal, model: 'sonnet' | 'haiku' | 'gemini', fallback: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  getAuthenticatedUser,
  checkAuthOnly,
  usageDeniedResponse,
  enforceAiUserRateLimit,
} from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { researchBrand } from '@/lib/ai/perplexity-client';
import { scrapeBrandContent } from '@/lib/brand-scraper';
import { buildCreativePrompt } from '@/lib/ai/creative-prompts';
import { extractJSON, generateJSON } from '@/lib/ai/llm-client';
import { normalizeAiError } from '@/lib/ai/error-messages';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SONNET_MODEL = 'claude-sonnet-4-20250514';
const PDF_BUCKET = 'collection-assets';
const MAX_PDF_BYTES = 32 * 1024 * 1024;

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish (Castilian)', fr: 'French', it: 'Italian', de: 'German',
  pt: 'Portuguese (Brazilian)', nl: 'Dutch', sv: 'Swedish', no: 'Norwegian (Bokmål)',
};

interface ReqBody {
  url?: string;
  instagram?: string;
  pdfStoragePath?: string;
  pdfBase64?: string;
  language?: string;
}

async function loadPdfBase64(input: ReqBody): Promise<{ base64: string | null; bytes: number }> {
  if (input.pdfBase64) {
    // Strip a `data:application/pdf;base64,` prefix if present
    const cleaned = input.pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const approxBytes = Math.floor(cleaned.length * 0.75);
    if (approxBytes > MAX_PDF_BYTES) {
      throw new Error(`PDF too large (${Math.round(approxBytes / 1024 / 1024)}MB > 32MB limit)`);
    }
    return { base64: cleaned, bytes: approxBytes };
  }
  if (input.pdfStoragePath) {
    const { data, error } = await supabaseAdmin.storage.from(PDF_BUCKET).download(input.pdfStoragePath);
    if (error || !data) throw new Error(`PDF not found at ${input.pdfStoragePath}: ${error?.message ?? 'unknown'}`);
    const buf = Buffer.from(await data.arrayBuffer());
    if (buf.byteLength > MAX_PDF_BYTES) {
      throw new Error(`PDF too large (${Math.round(buf.byteLength / 1024 / 1024)}MB > 32MB limit)`);
    }
    return { base64: buf.toString('base64'), bytes: buf.byteLength };
  }
  return { base64: null, bytes: 0 };
}

// Sonnet vision read of the PDF — extract the brand-relevant text
// blocks (palette names, font specs, voice rules, brand statements).
// Output is a free-form paragraph that the synthesis call will
// cross-reference with Sonar + scrape.
async function extractPdfNarrative(base64: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) return '';
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: SONNET_MODEL,
    max_tokens: 4096,
    system: 'You read fashion brandbook PDFs. Extract every brand-relevant signal verbatim: brand name, taglines, colour palette (names + hex when shown), typography (font families and roles), voice rules (do/don\'t, vocabulary), photography direction, application examples. Quote the document where possible. Do NOT invent. If a section is missing, say so.',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          },
          {
            type: 'text',
            text: 'Extract the brand identity signals from this PDF. Return a structured paragraph that lists, in order: NAME + TAGLINE, PALETTE, TYPOGRAPHY, VOICE, PHOTOGRAPHY/VISUAL IDENTITY, APPLICATIONS. Quote text from the PDF when you cite a value. If a section is absent in the PDF, write "(not in PDF)" for that section.',
          },
        ],
      },
    ],
  });
  const block = response.content[0];
  return block?.type === 'text' ? block.text : '';
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  const rateLimited = enforceAiUserRateLimit(user.id, 'heavy-text');
  if (rateLimited) return rateLimited;

  const usage = await checkAuthOnly(user.id, user.email!);
  if (!usage.allowed) return usageDeniedResponse(usage);

  const body = (await req.json().catch(() => null)) as ReqBody | null;
  if (!body || (!body.url && !body.instagram && !body.pdfStoragePath && !body.pdfBase64)) {
    return NextResponse.json(
      { error: 'At least one of url, instagram, pdfStoragePath, or pdfBase64 is required' },
      { status: 400 },
    );
  }

  // Derive a brand hint for Sonar — domain or IG handle
  let brandHint = '';
  if (body.url) {
    try {
      brandHint = new URL(body.url.startsWith('http') ? body.url : 'https://' + body.url)
        .hostname.replace('www.', '').split('.')[0];
    } catch { brandHint = body.url; }
  }
  const igHandle = body.instagram?.replace(/^@/, '').replace(/\/$/, '') || '';
  if (!brandHint && igHandle) brandHint = igHandle;

  // Fan out the three slow IO operations in parallel.
  const [sonar, scraped, pdfBundle] = await Promise.all([
    (body.url || body.instagram) ? researchBrand(brandHint, body.url, body.instagram) : Promise.resolve(null),
    body.url ? scrapeBrandContent(body.url) : Promise.resolve(null),
    loadPdfBase64(body).catch(err => {
      console.error('[brand-from-external] PDF load failed:', err);
      return { base64: null, bytes: 0, _err: err instanceof Error ? err.message : String(err) } as { base64: string | null; bytes: number; _err?: string };
    }),
  ]);

  let pdfNarrative = '';
  if (pdfBundle.base64) {
    try {
      pdfNarrative = await extractPdfNarrative(pdfBundle.base64);
    } catch (err) {
      console.error('[brand-from-external] PDF vision failed:', err);
    }
  }

  // Compose the synthesis prompt input
  const sourcesList: string[] = [];
  const input: Record<string, string> = {};
  if (sonar?.content) {
    input._sonarResearch = sonar.content;
    if (sonar.sources?.length) sourcesList.push(...sonar.sources.slice(0, 5));
  }
  if (igHandle) input._instagramFindings = `Handle queried: @${igHandle}.`;
  if (scraped) {
    const scrapedBlock = [
      scraped.brandName ? `BRAND NAME (from <title>): ${scraped.brandName}` : '',
      scraped.tagline ? `TAGLINE: ${scraped.tagline}` : '',
      scraped.headings?.length ? `HEADINGS: ${scraped.headings.join(' | ')}` : '',
      scraped.bodyContent ? `HOMEPAGE COPY:\n${scraped.bodyContent}` : '',
      scraped.aboutContent ? `\nABOUT/STORY:\n${scraped.aboutContent}` : '',
      scraped.productDescriptions?.length ? `\nPRODUCT COPY:\n${scraped.productDescriptions.join('\n')}` : '',
    ].filter(Boolean).join('\n');
    input._scrapedSite = scrapedBlock;
    if (body.url) sourcesList.push(body.url);
  }
  if (pdfNarrative) {
    input._pdfExtraction = pdfNarrative;
    sourcesList.push('Brandbook PDF (uploaded by user)');
  }
  if (sourcesList.length) input._sources = sourcesList.join(', ');

  const prompt = buildCreativePrompt('brand-from-external-synthesis', input);
  if (!prompt) {
    return NextResponse.json({ error: 'Failed to build synthesis prompt' }, { status: 500 });
  }

  let system = prompt.system;
  if (body.language && body.language !== 'en' && LANG_NAMES[body.language]) {
    system += `\n\nIMPORTANT LANGUAGE INSTRUCTION: You MUST respond entirely in ${LANG_NAMES[body.language]}. ALL text content (names, taglines, descriptions, voice rules, vocabulary, rationales) must be written in ${LANG_NAMES[body.language]}. Do NOT mix English. Technical terms that are universally English (mood board, drop, SKU) may stay in English.`;
  }

  // Sonnet first; fall through to Haiku/Gemini if needed.
  if (ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: SONNET_MODEL,
        max_tokens: prompt.maxTokens ?? 8192,
        system,
        messages: [{ role: 'user', content: prompt.user }],
        temperature: prompt.temperature,
      });
      const block = response.content[0];
      if (block?.type === 'text' && block.text) {
        const data = extractJSON<{ sources?: string[] }>(block.text);
        if (data && !data.sources && sourcesList.length) data.sources = sourcesList;
        return NextResponse.json({ result: data, model: 'sonnet', fallback: false });
      }
    } catch (err) {
      console.warn('[brand-from-external] Sonnet failed, falling through:', err instanceof Error ? err.message : err);
    }
  }

  try {
    const { data, model, fallback } = await generateJSON<{ sources?: string[] }>({
      system,
      user: prompt.user,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
    });
    if (data && !data.sources && sourcesList.length) data.sources = sourcesList;
    return NextResponse.json({ result: data, model, fallback });
  } catch (err) {
    const friendly = normalizeAiError(err);
    return NextResponse.json({ error: friendly.userMessage }, { status: friendly.httpStatus ?? 500 });
  }
}

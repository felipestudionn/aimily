/**
 * Shared helper for extracting structured error info from an API Response.
 *
 * Every aimily hook follows the "setError + return null" pattern, which
 * silently swallows backend errors. That worked fine while the app was
 * read-heavy, but it blinds the UI to persistence failures (e.g. the
 * /api/ai-generations POST 500 that Felipe surfaced on 2026-04-11).
 *
 * The fix is structural: hooks now throw errors from their write paths
 * so components can land in their own catch and render something useful.
 * This helper extracts a rich message from Supabase-style error envelopes
 * so the thrown Error has actionable content.
 *
 * Supabase routes return shapes like:
 *   { error: "duplicate key value", details: "...", hint: "...", code: "23505" }
 * Other routes return simpler shapes:
 *   { error: "AI generation failed" }
 *
 * This helper handles both and gracefully falls back to HTTP status when
 * the body isn't JSON at all.
 */

export interface BackendErrorEnvelope {
  error?: string;
  details?: string;
  hint?: string;
  code?: string;
  message?: string;
}

/**
 * Read a non-ok Response and turn it into a thrown Error with a rich message.
 * Caller should:
 *   if (!res.ok) throw await backendError(res);
 */
export async function backendError(res: Response): Promise<Error> {
  let payload: BackendErrorEnvelope = {};
  try {
    payload = (await res.json()) as BackendErrorEnvelope;
  } catch {
    // non-JSON body — fall through to HTTP-status fallback
  }

  const parts = [
    payload.error || payload.message,
    payload.details,
    payload.hint,
    payload.code ? `(${payload.code})` : undefined,
  ].filter(Boolean);

  const message = parts.length > 0 ? parts.join(' — ') : `HTTP ${res.status} ${res.statusText}`;
  return new Error(message);
}

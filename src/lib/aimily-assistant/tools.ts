/**
 * Aimily Assistant — tool definitions
 *
 * One tool only for V1: navigateToWorkspace.
 *
 * It is a CLIENT-SIDE TOOL (no execute on the server). The model calls it,
 * the SDK streams the call to the client, the client renders a button.
 * The user clicks; only then we navigate. Auto-navigation is forbidden —
 * see the Cursor "destructive guardrails" lesson.
 *
 * The route is validated against ROUTE_WHITELIST in knowledge.ts before
 * navigation. The model can request any URL string; the client refuses
 * anything not on the whitelist (defense in depth — the model already
 * knows from the system prompt to stay on whitelisted routes).
 */

import { tool } from 'ai';
import { z } from 'zod';

export const navigateToWorkspace = tool({
  description:
    'Suggest a destination URL inside aimily that answers the user\'s next step. Renders as a "Take me there →" button — the user must click. Never auto-navigate. Only use whitelisted aimily internal routes (the routes listed in the knowledge base). For collection-scoped routes, use the [id] placeholder; the client will substitute the active collection id at click time.',
  inputSchema: z.object({
    url: z
      .string()
      .min(1)
      .describe(
        'Internal aimily route. Use [id] for collection placeholder, e.g. "/collection/[id]/creative?block=consumer".',
      ),
    label: z
      .string()
      .min(1)
      .max(30)
      .describe(
        'Short button label, max 30 chars. Examples: "Open Buying Strategy", "Go to Tech Pack", "Open the Calendar".',
      ),
  }),
  // Output schema — the client emits a synthetic acknowledgement via
  // addToolOutput() the moment the tool call arrives. This satisfies the
  // AI SDK contract that every tool call has a matching tool result, so
  // the next conversation turn doesn't blow up with AI_MissingToolResultsError.
  outputSchema: z.object({
    acknowledged: z.literal(true),
  }),
  // No `execute` — this is a client-side tool. The AI SDK will stream the
  // tool call to the client, the client renders the button + auto-emits
  // the acknowledged output so the conversation can continue cleanly.
});

/**
 * Tool registry exported as a typed object for streamText({ tools }).
 */
export const aimilyAssistantTools = {
  navigateToWorkspace,
} as const;

export type AimilyAssistantTools = typeof aimilyAssistantTools;

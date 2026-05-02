# Aimily — in-product AI assistant — implementation plan

> **Status**: research completed 2026-05-02 in session "auditoría de auditorías + Slack + FAQ".
> Implementation deferred to a fresh session. **Read this file first** before writing any code.
>
> Verified research with `mcp__context7__*` + WebFetch to official docs. Every architectural
> decision below has a cited URL. Claims that come from model knowledge (not docs) are tagged
> `[fuera de doc oficial verificada]` so future-Claude knows when to trust 100% vs spot-check.
>
> **Product naming clarification (2026-05-02 founder)**: the assistant is called **Aimily**,
> not "Emili". Same name as the product — the assistant is the product personified. This
> document used "Emili" in early drafts; treat all "Emili" references as "Aimily".

---

## 0. The vision in one paragraph

A floating "Ask Aimily" pill at bottom-right of the authenticated app + global hotkey
`Cmd/Ctrl + J`. Click opens a 480px right slide-over. Aimily is **(a) a product mentor**
that knows every workspace and tells the user the exact path to do anything ("Block 03
→ Sketch & Color → click the SKU → Colorize"), **(b) a fashion mentor** that explains
BOM / drop / range plan / tech pack to brilliant outsiders without fashion-school
background, and **(c) admin support** for billing/refund/account questions. The
differentiator is (a) — Excel and PowerPoint don't have a teacher inside them.

Founder framing: "It must feel like Felipe's actual assistant explaining the tool to
you in real time."

## 1. UX position — verified pattern

**Decision**: floating pill bottom-right (Linear's pattern, not GitHub's), NOT a third
icon next to profile/notifications in the header.

- Persistent **floating pill** `fixed bottom-6 right-6` (~52px circle collapsed, 140px
  pill on hover with label "Ask Aimily →"). bg-carbon text-white, rounded-full, shadow.
- **Hotkey `Cmd/Ctrl + J`** opens from anywhere (Linear's pattern, verified at
  https://linear.app/changelog).
- **Slide-over right** (shadcn `Sheet`) 480px wide. NOT a modal — modals interrupt;
  slide-overs let the user keep reading the workspace while chatting. `Esc` collapses
  back to the pill.
- **Symbolic header presence**: tiny "?" pill next to profile icon → on hover shows
  tooltip `Press ⌘ J to ask Aimily`. Discovery without permanent visual weight.

**Why not the header**: Felipe already has profile + notifications top-right. Adding
a third icon there clutters and demotes the assistant to peer-of-settings. Bottom-right
is unowned chrome (Intercom/Linear/Crisp/Drift all converge there) and gives the
assistant its own real estate.

## 2. Stack — verified

| Layer | Decision | URL |
|---|---|---|
| Orchestration | **Vercel AI SDK v5 stable** (v6 still beta as of research) | https://ai-sdk.dev/docs/introduction |
| Provider | `@ai-sdk/anthropic` directly (no AI Gateway yet) | https://ai-sdk.dev/providers/ai-sdk-providers/anthropic |
| Model | `anthropic('claude-haiku-4-5')` | https://platform.claude.com/docs/en/about-claude/pricing |
| Streaming | `streamText` server + `useChat` client | context7 `/vercel/ai` |
| Caching | Anthropic Prompt Caching, 5-min TTL on system prompt | https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching |
| Vector store | **Skip RAG for MVP**. KB ~22K tokens fits in cached system prompt. pgvector exists as escape hatch only. | n/a |
| Page context | Pass via `useChat` body, server reads with each request | context7 `/vercel/ai` cookbook `80-send-custom-body-from-use-chat.mdx` |

Deps to install (from a fresh session):
```bash
npm i ai @ai-sdk/react @ai-sdk/anthropic zod
```

Verify versions at install time — context7 reported `ai_6.0.0-beta.128` available;
v5 stable is the launch target.

## 3. Knowledge base — structured curation, not free-form articles

**Single typed file** `src/lib/aimily-assistant/knowledge.ts`:

```ts
export const AIMILY_FEATURES = [
  {
    block: '01',
    block_name: 'Creative & Brand',
    sub_block: '01.2',
    sub_block_name: 'Moodboard & Research',
    route: '/collection/[id]/creative?block=moodboard',
    short: 'Capture references — images, palettes, fabric swatches — that anchor the collection mood.',
    when_to_use: 'After Consumer Definition, before Brand Identity. Output: a moodboard you reuse in Tech Pack and Presentation.',
    related: ['01.1 Consumer', '01.3 Brand Identity'],
    actions: [
      { label: 'Upload reference image', shortcut: null, location: 'top-right of the canvas' },
      // ...
    ]
  },
  // ~70 entries
];
```

**Source of truth**: `architecture-tree-rubik-cube.md` already maps Block → Mini-block →
Micro-block. Future-Claude can scaffold the empty objects from that tree and Felipe
fills the `short` / `when_to_use` / `actions` per row in his voice.

**Effort**: ~70 entries × ~5 min each = **6-8 hours of Felipe writing** (not a delegation
target — voice matters). Future-Claude scaffolds the JSON, Felipe owns the copy.

## 4. Tool use — actions Aimily can suggest

### 4.1 `navigateToWorkspace` (client-side tool)

```ts
const navigateToWorkspace = tool({
  description: 'Suggest a destination URL inside aimily that answers the user\'s question. The button will appear as "Take me there →"; the user clicks to navigate. Never auto-navigate.',
  inputSchema: z.object({
    url: z.string().describe('Internal aimily route'),
    label: z.string().describe('Button label, max 30 chars'),
  }),
  // No `execute` — client-side tool, rendered as button in the panel
});
```

Verified pattern: AI SDK treats tools without `execute` as client-side; emits
`tool-call` part the client renders as a button. Source:
context7 `/vercel/ai` snippet `content/docs/04-ai-sdk-ui/03-chatbot-tool-usage.mdx`.

**Critical safety**: client validates `url` against a whitelist before allowing the
click. Never auto-navigate (Linear/Notion/Intercom all require click). Tool definitions
should use `strict: true` for guaranteed schema conformance.

### 4.2 `get_workspace_status` (server-side tool, V2)

Reads from `collection_decisions` (CIS) on demand instead of stuffing user data in
the system prompt. Cleaner privacy story.

```ts
const getWorkspaceStatus = tool({
  description: 'Read what the user has filled in for a specific workspace.',
  inputSchema: z.object({ collectionId: z.string().uuid(), block: z.string() }),
  execute: async ({ collectionId, block }) => /* read from collection_decisions */,
});
```

## 5. System prompt — Aimily's voice

~600-900 token identity section + ~22K token knowledge serialization + page-context
template. Total ~22-25K tokens, well above the 4,096 minimum-cache threshold.

**Voice rules** (system prompt outline):

```
You are Aimily, the in-product assistant for the aimily platform — a fashion-collection-management 
SaaS for indie brands and emerging designers. You carry the warmth of a real assistant: 
calm, useful, never condescending.

Voice: editorial calm matching aimily product copy. Lowercase brand names. Short, useful 
sentences. No emojis. No hype. No sycophancy ("Great question!").

You help with three things and ONLY these:
  1. How to use aimily — give the exact path: "Block 03 → Sketch & Color → click the SKU 
     → Colorize button". When relevant, call navigateToWorkspace.
  2. Fashion industry terms — explain BOM, drop, range plan, tech pack like you're 
     teaching a brilliant outsider, not a fashion-school grad.
  3. Account & billing — refer to /trust /pricing or escalate when needed.

When you don't know: say so plainly, never invent. Offer to send the question to 
the team.

Reply in the user's language: the request includes `userLocale`. Match it. Default English.
```

## 6. Multi-turn memory — Supabase, RLS-scoped

```sql
create table aimily_assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table aimily_assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references aimily_assistant_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  parts jsonb not null,
  created_at timestamptz default now()
);

alter table aimily_assistant_conversations enable row level security;
alter table aimily_assistant_messages enable row level security;

create policy "users see only their own conversations" on aimily_assistant_conversations
  for all to authenticated using ((select auth.uid()) = user_id);
create policy "users see only their own messages" on aimily_assistant_messages
  for all to authenticated using (
    conversation_id in (select id from aimily_assistant_conversations where user_id = (select auth.uid()))
  );
```

**Retention**: 90 days, purged via pg_cron. "Clear conversation" button deletes
immediately. Per-conversation budget: send last 12 messages OR last 6K tokens,
whichever is smaller.

**Privacy update needed**: `privacy.ts` must mention conversations are stored 90 days,
encrypted at rest, sent to Anthropic under no-training contract, deletable any time.

## 7. Page context awareness

Client passes `pathname` + `selectedSegments` + `collectionId` per `sendMessage`
via `body` field. Server templates them into the system prompt:
"The user is currently on: {pageContext.label}".

Verified pattern: context7 `/vercel/ai` snippet
`content/cookbook/01-next/80-send-custom-body-from-use-chat.mdx`.

## 8. Coste real (verified)

Anchored to https://platform.claude.com/docs/en/about-claude/pricing.
Haiku 4.5: $1/MTok input · $5/MTok output · $1.25/MTok 5-min cache write · $0.10/MTok cache read.

Single 4-turn conversation with 22K cached system prompt:
- Cache write (turn 1): 22K × $1.25 / 1M = **$0.0275**
- Cache reads (turns 2-4): 3 × 22K × $0.10 / 1M = **$0.0066**
- User messages + history: 8K × $1 / 1M = **$0.008**
- Output: 1.2K × $5 / 1M = **$0.006**
- **Per conversation: ~$0.048**

**100 conversations/day × 30 days ≈ $144/month**. Without caching: $360/month.
**Caching saves ~63%** at this scale. Pre-warm with `max_tokens: 0` on panel-open
to amortize the cache write further.

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Hallucinated routes | Closed-schema `navigateToWorkspace` tool + client whitelist + `strict: true` |
| Out-of-scope | System prompt explicit refusal + 3 areas only. QA pass with adversarial prompts. |
| Prompt injection | User content as data, never as instructions in system prompt. |
| Cost runaway | Rate limit per user (30/hour, 200/day). |
| Knowledge drift | CI check: any sidebar block change fails PR until knowledge file updated. |
| Privacy | Tool-based personalization (no user data in system prompt). RLS + 90-day retention. |

## 10. Implementation plan — sequential

### Level 1 — MVP (1.5 days, ~10-12h)

1. Install deps (15 min): `npm i ai @ai-sdk/react @ai-sdk/anthropic zod`
2. **Knowledge file** (~6h, founder-led): `src/lib/aimily-assistant/knowledge.ts`. ~70 entries scaffolded from `architecture-tree-rubik-cube.md`. Felipe fills copy.
3. System prompt builder (~30 min): `src/lib/aimily-assistant/system-prompt.ts`. Identity + scope + knowledge serialization + pageContext interpolation slot.
4. Route handler (~1h): `src/app/api/aimily-assistant/route.ts`. `streamText` + `anthropic('claude-haiku-4-5')` + `cache_control: { type: 'ephemeral' }` on system block. `maxDuration = 30`.
5. Floating pill UI (~1.5h): `src/components/aimily-assistant/AssistantFab.tsx` + `AssistantPanel.tsx`. shadcn `Sheet` slide-over. `useChat` hook.
6. Cmd/Ctrl+J binding (~15 min): global keyboard listener.
7. i18n strings (~30 min): 9 locales — empty state, button labels, error messages. NOT the system prompt.

**Closes**: scope, identity, basic streaming, discoverability.

### Level 2 — V1 public-launchable (additional 1-1.5 days, ~8-10h, total 2.5-3 days)

8. Tool: `navigateToWorkspace` (~1h) + client button rendering with `router.push` + whitelist validator.
9. Multi-turn persistence (~2h): 2 Supabase tables + RLS + `onFinish` save + Clear button + pg_cron purge job.
10. Page context awareness (~1.5h): `usePathname` + `useSelectedLayoutSegments` → `body.pageContext`.
11. Rate limiting (~1h): 30/hour, 200/day per user.
12. Streaming polish (~1.5h): pulse on `submitted`, cancel on `streaming`, tool-call button, error toast.
13. Refusal & out-of-scope test pass (~1h): 20 adversarial prompts. Iterate system prompt.

**Closes**: action affordance, context awareness, abuse protection, persistence.

### Level 3 — V2 world-class (additional 2-3 days, ~16-20h, total 5-6 days)

14. Tools: `get_user_collections`, `get_workspace_status` (~3h). Personalization without leaking data.
15. Suggested questions on empty state (~1h). Page-aware: in Moodboard show "How do I add a reference?", in Sales Dashboard "What does GMV mean?".
16. Personality QA pass with founder (~2h). Felipe records 30 transcripts, compares Aimily tone to his voice, iterates system prompt.
17. Analytics (~2h): PostHog events `aimily_assistant.opened|message_sent|tool_navigate_clicked|cleared`.
18. Pre-warm cache on panel open (~1h): `max_tokens: 0` request when user opens panel.
19. Deep-link from product surfaces (~3h): "Ask Aimily about this" buttons next to Buying Strategy, Tech Pack headers — pre-seed the question.
20. Optional RAG escape hatch (~3h): tool `search_help_corpus` over pgvector. Only if KB grows past 80K tokens.

**Closes**: power-user value, perceived speed, data-driven iteration, scalability.

## 11. Caveats — explicit list

These are NOT in the cited docs and need spot-check before publishing externally:
- Cursor's exact current keybindings (their docs page returned a stub).
- Notion AI's exact invocation surfaces (slash key, sparkle button, Cmd+J).
- "Strict tool use" exact JSON behavior — link is referenced by tool-use page but not fetched.
- AI SDK v5 vs v6 stable status as of implementation day — verify at https://www.npmjs.com/package/ai.
- AI SDK `cacheControl` provider option for Anthropic — exact field name. Confirm at https://ai-sdk.dev/providers/ai-sdk-providers/anthropic.
- 90-day retention is a recommended default, not a regulatory requirement.

## 12. Sources used in this research

- [Claude Prompt Caching](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching)
- [Claude Tool Use](https://platform.claude.com/docs/en/docs/build-with-claude/tool-use)
- [Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Vercel AI SDK introduction](https://ai-sdk.dev/docs/introduction)
- [Linear Agent changelog](https://linear.app/changelog)
- [GitHub Copilot Chat docs](https://docs.github.com/en/copilot/using-github-copilot/copilot-chat/asking-github-copilot-questions-in-your-ide)
- [Intercom Fin AI Agent](https://fin.ai/)
- [Notion AI guides](https://www.notion.com/help/guides/category/ai)
- context7 `/vercel/ai` (4521 snippets, trust 10)
- context7 `/anthropics/anthropic-sdk-typescript` (183 snippets, trust 8.8)

## 13. Companion files in this repo

- `architecture-tree-rubik-cube.md` — block/mini-block/micro-block taxonomy. Source for the knowledge file scaffold.
- `docs/SECURITY-DATABASE-BIBLE.md` — current state of Supabase (advisor 0/0, pg_cron, Database Webhooks, Vault).
- `docs/SLACK-AND-FAQ-SETUP.md` — the FAQ widget that already exists on the public landing. The Aimily assistant **replaces it for authenticated users**; the public widget can stay or be retired (founder decision).
- `docs/faq.md` — 60+ Q&A curated 2026-05-02. Candidate input for the assistant's admin-support side.

---

**Where to start in the fresh session**:

1. Read this file end to end.
2. Read `architecture-tree-rubik-cube.md` to understand the 4-block product taxonomy.
3. Confirm with Felipe: "Are we starting with MVP (1.5 days) or jumping to V1 (3 days)?"
4. Begin Step 1 of the chosen level.

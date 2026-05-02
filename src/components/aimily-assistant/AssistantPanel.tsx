'use client';

/**
 * AssistantPanel — 480px right slide-over with the live chat.
 *
 * Architecture:
 *   - useChat from @ai-sdk/react drives streaming + message state.
 *   - The active conversationId is captured from response headers and
 *     fed back to subsequent requests so refresh/resume works.
 *   - Tool calls render as NavigateButton (client-side, click-to-go).
 *   - Esc closes; click on the dim overlay closes; the panel itself
 *     does NOT consume keyboard events outside the input.
 *   - Page context (pathname, collectionId, mini-block) is read from
 *     props passed by AssistantMount and sent on each request via
 *     useChat's `body` option.
 *
 * Styling: editorial calm, lowercase, rounded-[20px] surfaces, carbon
 * text, bg-shade panel — same family as the workspace cards.
 */

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { X, Send, Eraser, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { NavigateButton } from './NavigateButton';
import { useAssistant } from './AssistantContext';

/* Local persistence — keep a single active conversation per user in
   localStorage so refresh / reopen restores the chat where the user
   left it. 7-day TTL — beyond that we treat the prior conversation as
   stale and start fresh (matches the 90-day server-side retention but
   keeps the UI clean for users who only return occasionally). */
const STORAGE_VERSION = 'v1';
const STORAGE_TTL_DAYS = 7;

interface PersistedConversation {
  conversationId: string;
  messages: UIMessage[];
  updatedAt: string; // ISO date
}

function storageKey(userId: string): string {
  return `aimily-assistant-active-conversation-${STORAGE_VERSION}-${userId}`;
}

function loadPersisted(userId: string): PersistedConversation | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedConversation;
    if (!parsed.conversationId || !Array.isArray(parsed.messages) || !parsed.updatedAt) {
      return null;
    }
    const ageDays = (Date.now() - new Date(parsed.updatedAt).getTime()) / 86_400_000;
    if (ageDays > STORAGE_TTL_DAYS) {
      localStorage.removeItem(storageKey(userId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function savePersisted(userId: string, conversationId: string, messages: UIMessage[]): void {
  try {
    const payload: PersistedConversation = {
      conversationId,
      messages,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey(userId), JSON.stringify(payload));
  } catch {
    // Quota exceeded or disabled storage — silent fail. Persistence is a
    // nice-to-have, not a correctness requirement.
  }
}

function clearPersisted(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* noop */
  }
}

interface PageContextLite {
  pathname: string;
  collectionId?: string | null;
  miniBlockId?: string | null;
  miniBlockTitle?: string | null;
  blockCoord?: string | null;
}

interface Props {
  pageContext: PageContextLite;
}

export function AssistantPanel({ pageContext }: Props) {
  const ctx = useAssistant();
  const open = ctx?.open ?? false;
  const onClose = ctx?.close ?? (() => {});
  const t = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const restoredRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* Custom transport sends pageContext + locale + conversationId on each
     turn; reads conversationId back from response headers and stores it
     in state for the next turn. */
  const transport = new DefaultChatTransport({
    api: '/api/aimily-assistant',
    body: () => ({
      conversationId,
      locale: language,
      pageContext,
    }),
    fetch: async (input, init) => {
      const res = await fetch(input, init);
      const id = res.headers.get('x-aimily-conversation-id');
      if (id && id !== conversationId) setConversationId(id);
      return res;
    },
  });

  const { messages, sendMessage, status, error, stop, setMessages, addToolOutput } = useChat({
    transport,
    /* When the model calls navigateToWorkspace (a client-side tool with no
       execute), AI SDK requires a matching tool result before the next
       conversation turn — otherwise the next /api/aimily-assistant POST
       fails with AI_MissingToolResultsError. We satisfy the contract
       immediately with a synthetic { acknowledged: true } output. The
       actual navigation only happens when the user clicks the button. */
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName === 'navigateToWorkspace') {
        addToolOutput({
          tool: 'navigateToWorkspace',
          toolCallId: toolCall.toolCallId,
          output: { acknowledged: true },
        });
      }
    },
  });

  /* Restore the last active conversation from localStorage on first
     mount once we know who the user is. We restore even when the panel
     is closed so the moment the user opens it, history is already there. */
  useEffect(() => {
    if (!userId || restoredRef.current) return;
    const persisted = loadPersisted(userId);
    if (persisted && persisted.messages.length > 0) {
      setConversationId(persisted.conversationId);
      setMessages(persisted.messages);
    }
    restoredRef.current = true;
  }, [userId, setMessages]);

  /* Persist on every message change after restore is settled. We skip
     while streaming to avoid writing partial deltas on every chunk —
     onFinish at the end of a turn naturally bumps the messages array
     once and we capture that. */
  useEffect(() => {
    if (!userId || !restoredRef.current) return;
    if (!conversationId) return;
    if (status === 'streaming' || status === 'submitted') return;
    if (messages.length === 0) return;
    savePersisted(userId, conversationId, messages);
  }, [userId, conversationId, messages, status]);

  /* Scroll to bottom whenever new content arrives. */
  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  /* Esc closes. Cmd+K toggles (handled at AssistantMount level too, but
     here we close so Esc on the textarea works as expected). */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  /* Autofocus on open. */
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(id);
    }
  }, [open]);

  const isStreaming = status === 'streaming' || status === 'submitted';

  const handleSend = (text?: string) => {
    const value = (text ?? draft).trim();
    if (!value || isStreaming) return;
    sendMessage({ text: value });
    setDraft('');
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setConversationId(null);
    if (userId) clearPersisted(userId);
  };

  /* Page-aware suggestions on empty state. Three picks: a how-it-works
     question, a fashion-concept question, a navigation question. */
  const suggestions = pickSuggestions(pageContext, t);

  return (
    <>
      {/* Dim overlay */}
      <div
        onClick={onClose}
        aria-hidden
        className={`
          fixed inset-0 z-40
          bg-carbon/10 backdrop-blur-[1px]
          transition-opacity duration-200
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* Slide-over */}
      <aside
        role="dialog"
        aria-label={t.aimilyAssistant.title}
        className={`
          fixed top-0 right-0 z-50
          h-screen w-full sm:w-[480px]
          bg-shade
          shadow-[0_0_60px_rgba(0,0,0,0.12)]
          transform transition-transform duration-300 ease-out
          flex flex-col
          ${open ? 'translate-x-0' : 'translate-x-full pointer-events-none'}
        `}
      >
        {/* Header — no icon. Editorial calm: just the name + subtitle. */}
        <header className="flex items-center justify-between px-6 py-5 border-b border-carbon/[0.06]">
          <div>
            <div className="text-[14px] font-semibold text-carbon tracking-[-0.02em]">
              {t.aimilyAssistant.title}
            </div>
            <div className="text-[11px] text-carbon/50">
              {t.aimilyAssistant.subtitle}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                aria-label={t.aimilyAssistant.clearConversation}
                title={t.aimilyAssistant.clearConversation}
                className="h-8 w-8 inline-flex items-center justify-center rounded-full text-carbon/50 hover:bg-carbon/[0.04] hover:text-carbon"
              >
                <Eraser className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t.aimilyAssistant.close}
              className="h-8 w-8 inline-flex items-center justify-center rounded-full text-carbon/50 hover:bg-carbon/[0.04] hover:text-carbon"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {messages.length === 0 ? (
            <EmptyState
              suggestions={suggestions}
              onPick={(q) => handleSend(q)}
              t={t}
            />
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                activeCollectionId={pageContext.collectionId}
                onNavigate={onClose}
              />
            ))
          )}
          {isStreaming && (
            <div className="flex items-center gap-2 text-[12px] text-carbon/35">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t.aimilyAssistant.thinking}
            </div>
          )}
          {error && (
            <div className="rounded-[12px] bg-red-50 text-red-700 px-4 py-3 text-[12px]">
              {error.message || t.aimilyAssistant.errors.generic}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="px-6 py-4 border-t border-carbon/[0.06] bg-shade">
          <div className="relative rounded-[14px] bg-white border border-carbon/[0.08] focus-within:border-carbon/30 transition-colors">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t.aimilyAssistant.placeholder}
              rows={2}
              maxLength={2000}
              className="
                w-full bg-transparent px-4 pt-3 pb-12
                text-[13px] text-carbon
                placeholder:text-carbon/30
                resize-none focus:outline-none
              "
            />
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
              <span className="text-[10px] text-carbon/30">
                {t.aimilyAssistant.composerHint}
              </span>
              {isStreaming ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-carbon/[0.06] text-carbon/70 px-3 py-1 text-[11px] hover:bg-carbon/[0.08]"
                >
                  {t.aimilyAssistant.stop}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!draft.trim()}
                  aria-label={t.aimilyAssistant.send}
                  className="
                    inline-flex items-center justify-center
                    h-7 w-7 rounded-full
                    bg-carbon text-white
                    transition-all hover:bg-carbon/90
                    disabled:bg-carbon/20 disabled:cursor-not-allowed
                  "
                >
                  <Send className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Empty state — three page-aware suggestions
   ────────────────────────────────────────────────────────────────── */

function EmptyState({
  suggestions,
  onPick,
  t,
}: {
  suggestions: string[];
  onPick: (q: string) => void;
  t: ReturnType<typeof useTranslation>;
}) {
  return (
    <div className="pt-8 pb-4">
      <div className="text-center mb-8">
        <div className="text-[22px] font-medium text-carbon tracking-[-0.03em] mb-2">
          {t.aimilyAssistant.empty.title}
        </div>
        <div className="text-[13px] text-carbon/50 leading-relaxed max-w-[340px] mx-auto">
          {t.aimilyAssistant.empty.subtitle}
        </div>
      </div>
      <div className="space-y-2">
        {suggestions.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(q)}
            className="
              w-full text-left
              rounded-[12px] bg-white border border-carbon/[0.06]
              px-4 py-3
              text-[12px] text-carbon/70 leading-relaxed
              transition-colors
              hover:border-carbon/20 hover:text-carbon
            "
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Message bubble — handles text + tool parts
   ────────────────────────────────────────────────────────────────── */

function MessageBubble({
  message,
  activeCollectionId,
  onNavigate,
}: {
  message: UIMessage;
  activeCollectionId?: string | null;
  onNavigate?: () => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[85%] space-y-2
          ${isUser
            ? 'bg-carbon text-white rounded-[16px] rounded-br-[4px] px-4 py-2.5 text-[13px]'
            : 'text-[13px] text-carbon leading-relaxed'
          }
        `}
      >
        {message.parts.map((part, idx) => {
          if (part.type === 'text') {
            return (
              <div key={idx} className={isUser ? '' : 'whitespace-pre-wrap'}>
                {part.text}
              </div>
            );
          }
          if (
            part.type === 'tool-navigateToWorkspace' &&
            'input' in part &&
            part.input &&
            typeof part.input === 'object'
          ) {
            const input = part.input as { url?: string; label?: string };
            if (input.url && input.label) {
              return (
                <div key={idx} className="mt-2">
                  <NavigateButton
                    url={input.url}
                    label={input.label}
                    activeCollectionId={activeCollectionId}
                    onNavigate={onNavigate}
                  />
                </div>
              );
            }
          }
          return null;
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Page-aware suggestions
   ────────────────────────────────────────────────────────────────── */

function pickSuggestions(
  ctx: PageContextLite,
  t: ReturnType<typeof useTranslation>,
): string[] {
  const generic = t.aimilyAssistant.empty.suggestions.generic;
  const path = ctx.pathname;

  if (path.includes('/creative')) return t.aimilyAssistant.empty.suggestions.creative;
  if (path.includes('/merchandising')) return t.aimilyAssistant.empty.suggestions.merchandising;
  if (path.includes('/product')) return t.aimilyAssistant.empty.suggestions.design;
  if (path.includes('/marketing')) return t.aimilyAssistant.empty.suggestions.marketing;
  if (path.includes('/calendar')) return t.aimilyAssistant.empty.suggestions.calendar;
  if (path.includes('/presentation')) return t.aimilyAssistant.empty.suggestions.presentation;
  if (path.includes('/account') || path.includes('/pricing')) return t.aimilyAssistant.empty.suggestions.account;

  return generic;
}

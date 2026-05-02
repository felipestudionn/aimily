'use client';

/**
 * FAQ chat widget — floating bubble bottom-right with expanding panel.
 * Hits /api/chat-faq on each user message, shows answer or human-handoff.
 *
 * Editorial calm style — matches aimily brand. No animations beyond the
 * panel slide-in. No emojis. Plain text first, branded chrome second.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  text: string;
  fallback?: boolean;
}

const SESSION_KEY = 'aimily_faq_session';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export default function FaqWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: '¿En qué te puedo ayudar? Te respondo sobre planes, privacidad, cómo funciona aimily, y todo lo público de la plataforma. Para temas de tu cuenta, escribe directamente a hello@aimily.app.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, sessionId: getSessionId() }),
      });

      if (res.status === 429) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            text: 'Has hecho muchas preguntas en poco tiempo. Inténtalo en un rato o escribe a hello@aimily.app.',
            fallback: true,
          },
        ]);
        return;
      }

      const data = (await res.json()) as { answer?: string; fallbackToHuman?: boolean; error?: string };
      if (!data.answer) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            text: 'Disculpa, hubo un error. Escríbenos a hello@aimily.app y te responderemos.',
            fallback: true,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: data.answer!, fallback: data.fallbackToHuman ?? false },
      ]);
    } catch (e) {
      console.error('[faq-widget]', e);
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: 'Disculpa, hubo un error. Escríbenos a hello@aimily.app.',
          fallback: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-carbon text-white text-[13px] font-semibold tracking-[-0.01em] shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:bg-carbon/90 transition-all hover:scale-[1.03]"
        >
          <MessageCircle className="h-4 w-4" />
          Ask aimily
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-100px)] bg-white rounded-[20px] shadow-[0_24px_60px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden border border-carbon/[0.06]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-carbon/[0.06]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-carbon/40 font-medium">aimily</div>
              <div className="text-[15px] font-semibold text-carbon tracking-[-0.02em]">Ask anything</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="p-2 rounded-full hover:bg-carbon/[0.04] transition-colors"
            >
              <X className="h-4 w-4 text-carbon/60" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-[14px] text-[13px] leading-[1.55] tracking-[-0.01em] ${
                    m.role === 'user'
                      ? 'bg-carbon text-white'
                      : m.fallback
                        ? 'bg-carbon/[0.04] text-carbon border border-carbon/10'
                        : 'bg-carbon/[0.04] text-carbon'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-carbon/[0.04] text-carbon/50 px-4 py-3 rounded-[14px] text-[13px]">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-carbon/30 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-carbon/30 animate-pulse [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-carbon/30 animate-pulse [animation-delay:0.3s]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-carbon/[0.06]">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Escribe tu pregunta…"
                rows={1}
                disabled={loading}
                className="flex-1 resize-none px-3 py-2.5 text-[13px] text-carbon bg-carbon/[0.03] rounded-[12px] border border-carbon/[0.06] focus:border-carbon/20 focus:outline-none transition-colors placeholder:text-carbon/30 max-h-24"
              />
              <button
                type="button"
                onClick={send}
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="p-2.5 rounded-full bg-carbon text-white disabled:bg-carbon/20 disabled:cursor-not-allowed hover:bg-carbon/90 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-[10px] text-carbon/30 mt-2 text-center">
              Asistente automático · respuestas verificadas a partir de información pública. Para tu cuenta escribe a hello@aimily.app.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

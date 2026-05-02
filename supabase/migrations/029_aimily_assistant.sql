-- Migration 029: Aimily Assistant (in-product mentor)
-- 3 tables + RLS + pg_cron 90-day purge + per-user daily usage tracking.
-- See src/lib/aimily-assistant/ for the application code.

BEGIN;

/* ──────────────────────────────────────────────────────────────────
   1. Conversations — one row per chat session
   ────────────────────────────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS aimily_assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  -- Snapshot of where the user was when the conversation started
  started_pathname TEXT,
  started_collection_id UUID REFERENCES collection_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aimily_assistant_conv_user_recent
  ON aimily_assistant_conversations (user_id, updated_at DESC);

/* ──────────────────────────────────────────────────────────────────
   2. Messages — one row per turn (user, assistant, tool)
      `parts` stores the AI SDK v6 UIMessage parts array as JSONB so
      tool calls, text deltas and reasoning all round-trip cleanly.
   ────────────────────────────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS aimily_assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES aimily_assistant_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  parts JSONB NOT NULL,
  -- Optional usage telemetry per assistant turn
  input_tokens INTEGER,
  output_tokens INTEGER,
  cache_read_tokens INTEGER,
  cache_write_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aimily_assistant_msg_conv_chrono
  ON aimily_assistant_messages (conversation_id, created_at);

/* ──────────────────────────────────────────────────────────────────
   3. Daily usage — per-user per-day cost & message counter
      Used by the rate limiter (30/hour, 200/day soft cap) and the
      per-user kill switch ($5/24h hard cap).
   ────────────────────────────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS aimily_assistant_user_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_count INTEGER NOT NULL DEFAULT 0,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  cache_read_tokens BIGINT NOT NULL DEFAULT 0,
  cache_write_tokens BIGINT NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
  -- Set to TRUE by the kill switch when this user breaches per-day cost cap
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  paused_at TIMESTAMPTZ,
  paused_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_aimily_assistant_usage_paused
  ON aimily_assistant_user_usage (user_id, usage_date) WHERE paused = TRUE;

/* ──────────────────────────────────────────────────────────────────
   RLS — owners only on conversations + messages.
   user_usage is service-role only (never exposed to clients).
   ────────────────────────────────────────────────────────────────── */
ALTER TABLE aimily_assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aimily_assistant_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE aimily_assistant_user_usage    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own conversations" ON aimily_assistant_conversations;
CREATE POLICY "users see own conversations"
  ON aimily_assistant_conversations
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "users see own messages" ON aimily_assistant_messages;
CREATE POLICY "users see own messages"
  ON aimily_assistant_messages
  FOR ALL
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM aimily_assistant_conversations
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM aimily_assistant_conversations
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- user_usage has NO authenticated policy on purpose — only the service role
-- (route handler with the service-role key) reads/writes it.
DROP POLICY IF EXISTS "service role manages usage" ON aimily_assistant_user_usage;
CREATE POLICY "service role manages usage"
  ON aimily_assistant_user_usage
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

/* ──────────────────────────────────────────────────────────────────
   pg_cron — purge conversations older than 90 days, daily at 03:30 UTC.
   Adjust the schedule freely; the retention claim lives in /trust copy.
   ────────────────────────────────────────────────────────────────── */
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('aimily-assistant-purge-old-conversations')
      WHERE EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'aimily-assistant-purge-old-conversations'
      );
    PERFORM cron.schedule(
      'aimily-assistant-purge-old-conversations',
      '30 3 * * *',
      $purge$
        DELETE FROM aimily_assistant_conversations
        WHERE updated_at < NOW() - INTERVAL '90 days';
        DELETE FROM aimily_assistant_user_usage
        WHERE usage_date < CURRENT_DATE - INTERVAL '90 days';
      $purge$
    );
  END IF;
END $$;

/* ──────────────────────────────────────────────────────────────────
   Helper RPC — atomic increment of usage counters.
   Called from the route handler after each completed assistant turn.
   ────────────────────────────────────────────────────────────────── */
CREATE OR REPLACE FUNCTION aimily_assistant_record_usage(
  p_user_id UUID,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER,
  p_cache_read_tokens INTEGER,
  p_cache_write_tokens INTEGER,
  p_cost_usd NUMERIC
) RETURNS aimily_assistant_user_usage
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result aimily_assistant_user_usage;
BEGIN
  INSERT INTO aimily_assistant_user_usage (
    user_id, usage_date, messages_count,
    input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
    estimated_cost_usd, updated_at
  )
  VALUES (
    p_user_id, CURRENT_DATE, 1,
    COALESCE(p_input_tokens, 0),
    COALESCE(p_output_tokens, 0),
    COALESCE(p_cache_read_tokens, 0),
    COALESCE(p_cache_write_tokens, 0),
    COALESCE(p_cost_usd, 0),
    now()
  )
  ON CONFLICT (user_id, usage_date) DO UPDATE SET
    messages_count = aimily_assistant_user_usage.messages_count + 1,
    input_tokens = aimily_assistant_user_usage.input_tokens + COALESCE(p_input_tokens, 0),
    output_tokens = aimily_assistant_user_usage.output_tokens + COALESCE(p_output_tokens, 0),
    cache_read_tokens = aimily_assistant_user_usage.cache_read_tokens + COALESCE(p_cache_read_tokens, 0),
    cache_write_tokens = aimily_assistant_user_usage.cache_write_tokens + COALESCE(p_cache_write_tokens, 0),
    estimated_cost_usd = aimily_assistant_user_usage.estimated_cost_usd + COALESCE(p_cost_usd, 0),
    updated_at = now()
  RETURNING * INTO result;

  -- Auto-pause if user breaches $5/day hard cap (kill switch)
  IF result.estimated_cost_usd > 5.0 AND NOT result.paused THEN
    UPDATE aimily_assistant_user_usage
    SET paused = TRUE,
        paused_at = now(),
        paused_reason = 'auto: daily cost cap $5 exceeded'
    WHERE user_id = result.user_id AND usage_date = result.usage_date
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION aimily_assistant_record_usage TO service_role;

COMMIT;

-- Rename ai_generations.fal_request_id to provider_request_id.
--
-- Context: aimily is migrating image/video generation off fal.ai onto a
-- provider-agnostic architecture (OpenAI gpt-image-1.5 for 3D renders,
-- Freepik Nano Banana for still-life/brand-models/try-on, Freepik Kling 2.1
-- for video). The column was previously fal-specific; it now stores the
-- request/task id from whichever provider handled the generation.
--
-- This migration was applied to Supabase via MCP (apply_migration) before
-- being committed. The file is here as the canonical migration history.

ALTER TABLE ai_generations RENAME COLUMN fal_request_id TO provider_request_id;

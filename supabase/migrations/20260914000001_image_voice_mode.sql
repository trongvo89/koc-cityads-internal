-- AI Livestream: "image_voice" render mode (per-product still image + TTS voice-over).
--
-- 1) Add render_mode to live_scripts so the stream worker knows how to build the
--    broadcast: "avatar" (existing HeyGen section videos) vs "image_voice"
--    (compose each segment from an uploaded image + generated audio).
-- 2) Backfill the stream-engine columns on live_sessions that were added to the
--    live DB out-of-band and never captured in a migration (schema drift).
--    IF NOT EXISTS keeps this idempotent where the columns already exist.
--
-- The per-section image_url / product_name / shopee_item_id live inside the
-- existing script_sections JSONB, so they need no column changes.

-- 1) render_mode
ALTER TABLE public.live_scripts
  ADD COLUMN IF NOT EXISTS render_mode text NOT NULL DEFAULT 'avatar';

ALTER TABLE public.live_scripts
  DROP CONSTRAINT IF EXISTS live_scripts_render_mode_check;
ALTER TABLE public.live_scripts
  ADD CONSTRAINT live_scripts_render_mode_check
  CHECK (render_mode IN ('avatar', 'image_voice'));

-- 2) Backfill drifted stream-engine columns on live_sessions
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS stream_status     text DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS stream_error      text,
  ADD COLUMN IF NOT EXISTS stream_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS stream_stopped_at timestamptz,
  ADD COLUMN IF NOT EXISTS stream_worker_id  text,
  ADD COLUMN IF NOT EXISTS loop_video        boolean DEFAULT true;

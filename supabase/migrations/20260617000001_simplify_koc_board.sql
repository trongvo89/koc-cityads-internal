-- Simplify KOC board: 3 statuses, custom thank you, new fields
-- Applied via Supabase MCP on 2026-06-17

-- 1a. Add new enum values for simplified operation status
ALTER TYPE public.operation_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.operation_status ADD VALUE IF NOT EXISTS 'cancelled';

-- 1b. Add new columns for campaign_kocs
ALTER TABLE campaign_kocs ADD COLUMN IF NOT EXISTS video_count INT DEFAULT 0;
ALTER TABLE campaign_kocs ADD COLUMN IF NOT EXISTS final_link TEXT;
ALTER TABLE campaign_kocs ADD COLUMN IF NOT EXISTS note_2 TEXT;

-- 1c. Add thank you message column for campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS registration_thank_you TEXT;

-- 2. Migrate existing records to 3 simplified statuses
UPDATE campaign_kocs SET operation_status = 'in_progress'
  WHERE operation_status IN (
    'draft', 'sent_to_client', 'client_approved', 'client_rejected',
    'waiting_address', 'address_submitted', 'waiting_sample_sent',
    'sample_sent', 'sample_received', 'waiting_video',
    'video_submitted', 'need_revision'
  );

UPDATE campaign_kocs SET operation_status = 'cancelled'
  WHERE operation_status = 'failed';

UPDATE campaign_kocs SET operation_status = 'completed'
  WHERE operation_status = 'video_approved';

-- 3. Update koc_submit_video RPC — no longer changes operation_status
CREATE OR REPLACE FUNCTION public.koc_submit_video(
  p_token UUID,
  p_video_url TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_campaign_koc_id UUID;
BEGIN
  SELECT campaign_koc_id INTO v_campaign_koc_id
  FROM public.campaign_kocs
  WHERE magic_link_token = p_token AND magic_link_expires_at > NOW();

  IF v_campaign_koc_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  UPDATE public.campaign_kocs SET
    video_url = p_video_url,
    content_status = 'submitted',
    video_submitted_at = NOW(),
    internal_note = CASE
      WHEN p_note IS NOT NULL THEN COALESCE(internal_note || E'\n', '') || '[KOC] ' || p_note
      ELSE internal_note
    END,
    updated_at = NOW()
  WHERE campaign_koc_id = v_campaign_koc_id;
END;
$$;

-- 4. Update get_campaign_by_registration_token to include thank_you
CREATE OR REPLACE FUNCTION get_campaign_by_registration_token(p_token UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_campaign RECORD;
BEGIN
  SELECT c.campaign_id, c.campaign_name, c.registration_brief,
         c.registration_instructions, c.registration_open,
         c.registration_thank_you, c.start_date, c.end_date,
         COUNT(a.id) AS application_count
  INTO v_campaign
  FROM campaigns c
  LEFT JOIN koc_applications a ON a.campaign_id = c.campaign_id
  WHERE c.registration_token = p_token
  GROUP BY c.campaign_id;

  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN row_to_json(v_campaign)::JSONB;
END;
$$;

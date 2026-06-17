-- Form builder, custom data, row coloring — sync repo with production DB
-- These changes were applied directly via Supabase MCP; this migration ensures
-- fresh setups from migrations produce an identical schema.

-- 1. Form config per campaign (dynamic registration form)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS registration_form_config JSONB;

-- 2. Custom field responses from dynamic forms
ALTER TABLE koc_applications ADD COLUMN IF NOT EXISTS custom_data JSONB;

-- 3. Manual row coloring for KOC board
ALTER TABLE campaign_kocs ADD COLUMN IF NOT EXISTS row_color TEXT;

-- 4. Drop video_style CHECK constraint to allow custom radio options
ALTER TABLE koc_applications DROP CONSTRAINT IF EXISTS koc_applications_video_style_check;

-- 5. Recreate submit_koc_application with p_custom_data parameter
--    Also drop old 8-arg signature so there is no ambiguity
DROP FUNCTION IF EXISTS submit_koc_application(UUID, TEXT, TEXT, TEXT, INT, BIGINT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.submit_koc_application(
  p_token uuid,
  p_handle text,
  p_name text,
  p_tiktok_url text,
  p_followers integer DEFAULT NULL,
  p_gmv_30d bigint DEFAULT NULL,
  p_zalo_phone text DEFAULT NULL,
  p_video_style text DEFAULT NULL,
  p_custom_data jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_campaign_id UUID;
  v_open        BOOLEAN;
  v_koc_id      UUID;
BEGIN
  SELECT campaign_id, registration_open
  INTO v_campaign_id, v_open
  FROM campaigns
  WHERE registration_token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  IF NOT v_open THEN
    RETURN jsonb_build_object('error', 'registration_closed');
  END IF;

  IF p_tiktok_url IS NOT NULL AND p_tiktok_url <> '' THEN
    INSERT INTO kocs (name, tiktok_url, tiktok_handle, phone, zalo, follower, status)
    VALUES (
      COALESCE(p_name, p_handle),
      p_tiktok_url,
      p_handle,
      p_zalo_phone,
      p_zalo_phone,
      COALESCE(p_followers, 0),
      'active'
    )
    ON CONFLICT (tiktok_url) WHERE tiktok_url IS NOT NULL DO UPDATE SET
      name          = EXCLUDED.name,
      tiktok_handle = EXCLUDED.tiktok_handle,
      follower      = EXCLUDED.follower,
      updated_at    = NOW()
    RETURNING koc_id INTO v_koc_id;
  END IF;

  INSERT INTO koc_applications (
    campaign_id, koc_id, tiktok_handle, tiktok_name, tiktok_url,
    follower_count, gmv_30d, zalo_phone, video_style, custom_data, status
  )
  VALUES (
    v_campaign_id, v_koc_id,
    COALESCE(p_handle, ''),
    COALESCE(p_name, ''),
    COALESCE(p_tiktok_url, ''),
    COALESCE(p_followers, 0),
    COALESCE(p_gmv_30d, 0),
    COALESCE(p_zalo_phone, ''),
    COALESCE(p_video_style, ''),
    COALESCE(p_custom_data, '{}'),
    'pending'
  )
  ON CONFLICT (campaign_id, tiktok_url) DO UPDATE SET
    koc_id         = COALESCE(EXCLUDED.koc_id, koc_applications.koc_id),
    tiktok_handle  = EXCLUDED.tiktok_handle,
    tiktok_name    = EXCLUDED.tiktok_name,
    follower_count = EXCLUDED.follower_count,
    gmv_30d        = EXCLUDED.gmv_30d,
    zalo_phone     = EXCLUDED.zalo_phone,
    video_style    = EXCLUDED.video_style,
    custom_data    = EXCLUDED.custom_data,
    applied_at     = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION submit_koc_application(UUID, TEXT, TEXT, TEXT, INT, BIGINT, TEXT, TEXT, JSONB) TO anon, authenticated;

-- 6. Recreate get_campaign_by_registration_token to return registration_form_config
CREATE OR REPLACE FUNCTION public.get_campaign_by_registration_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_campaign RECORD;
BEGIN
  SELECT c.campaign_id, c.campaign_name, c.registration_brief,
         c.registration_instructions, c.registration_open,
         c.registration_thank_you, c.registration_form_config,
         c.start_date, c.end_date,
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

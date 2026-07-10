-- Fix: new KOC registrations overwrote existing ones.
--
-- The applications upsert deduped on (campaign_id, tiktok_url), but when a
-- campaign's form disables/renames the builtin tiktok_url field, every public
-- submission sends tiktok_url = '' and collides on (campaign_id, ''), so each
-- new registration overwrote the previous one. Switch the identity to
-- tiktok_handle (always collected, the real KOC identity). tiktok_url is an
-- unreliable identity (KOCs use beacons.ai / non-tiktok links).

-- 1. Drop the old url-based unique constraint.
ALTER TABLE public.koc_applications
  DROP CONSTRAINT IF EXISTS koc_applications_campaign_id_tiktok_url_key;

-- 2. Dedupe by normalized handle per campaign (case/space-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS koc_applications_campaign_handle_uidx
  ON public.koc_applications (campaign_id, lower(btrim(tiktok_handle)));

-- 3. Rewrite the public submit RPC to conflict on the handle, and reject
--    submissions with no handle instead of silently overwriting.
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
  IF btrim(COALESCE(p_handle, '')) = '' THEN
    RETURN jsonb_build_object('error', 'missing_handle');
  END IF;

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
  ON CONFLICT (campaign_id, lower(btrim(tiktok_handle))) DO UPDATE SET
    koc_id         = COALESCE(EXCLUDED.koc_id, koc_applications.koc_id),
    tiktok_handle  = EXCLUDED.tiktok_handle,
    tiktok_name    = EXCLUDED.tiktok_name,
    tiktok_url     = EXCLUDED.tiktok_url,
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

-- KOC registration now auto-adds the applicant to the campaign as a pending
-- campaign_koc, so the client reviews/approves them directly in the portal.
-- A kocs master row is created on demand for URL-less applications. Idempotent:
-- never overrides an existing campaign_koc (preserves prior client decisions).

CREATE OR REPLACE FUNCTION public.submit_koc_application(
  p_token uuid, p_handle text, p_name text, p_tiktok_url text,
  p_followers integer DEFAULT NULL::integer, p_gmv_30d bigint DEFAULT NULL::bigint,
  p_zalo_phone text DEFAULT NULL::text, p_video_style text DEFAULT NULL::text,
  p_custom_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_campaign_id UUID; v_open BOOLEAN; v_koc_id UUID; v_app_id UUID;
BEGIN
  IF btrim(COALESCE(p_handle, '')) = '' THEN RETURN jsonb_build_object('error','missing_handle'); END IF;
  SELECT campaign_id, registration_open INTO v_campaign_id, v_open FROM campaigns WHERE registration_token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','invalid_token'); END IF;
  IF NOT v_open THEN RETURN jsonb_build_object('error','registration_closed'); END IF;

  IF p_tiktok_url IS NOT NULL AND p_tiktok_url <> '' THEN
    INSERT INTO kocs (name, tiktok_url, tiktok_handle, phone, zalo, follower, status)
    VALUES (COALESCE(p_name,p_handle), p_tiktok_url, p_handle, p_zalo_phone, p_zalo_phone, COALESCE(p_followers,0), 'active')
    ON CONFLICT (tiktok_url) WHERE tiktok_url IS NOT NULL DO UPDATE SET
      follower = EXCLUDED.follower, updated_at = NOW()
    RETURNING koc_id INTO v_koc_id;
  END IF;

  INSERT INTO koc_applications (campaign_id, koc_id, tiktok_handle, tiktok_name, tiktok_url, follower_count, gmv_30d, zalo_phone, video_style, custom_data, status)
  VALUES (v_campaign_id, v_koc_id, COALESCE(p_handle,''), COALESCE(p_name,''), COALESCE(p_tiktok_url,''), COALESCE(p_followers,0), COALESCE(p_gmv_30d,0), COALESCE(p_zalo_phone,''), COALESCE(p_video_style,''), COALESCE(p_custom_data,'{}'), 'pending')
  ON CONFLICT (campaign_id, lower(btrim(tiktok_handle))) DO UPDATE SET
    koc_id = COALESCE(EXCLUDED.koc_id, koc_applications.koc_id),
    tiktok_handle = EXCLUDED.tiktok_handle, tiktok_name = EXCLUDED.tiktok_name, tiktok_url = EXCLUDED.tiktok_url,
    follower_count = EXCLUDED.follower_count, gmv_30d = EXCLUDED.gmv_30d, zalo_phone = EXCLUDED.zalo_phone,
    video_style = EXCLUDED.video_style, custom_data = EXCLUDED.custom_data, applied_at = NOW()
  RETURNING id, koc_id INTO v_app_id, v_koc_id;

  -- Ensure a KOC master row exists (URL-less registrations have none yet).
  IF v_koc_id IS NULL THEN
    INSERT INTO kocs (name, tiktok_url, tiktok_handle, phone, zalo, follower, status)
    VALUES (COALESCE(NULLIF(p_name,''), p_handle), NULL, p_handle, p_zalo_phone, p_zalo_phone, COALESCE(p_followers,0), 'active')
    RETURNING koc_id INTO v_koc_id;
    UPDATE koc_applications SET koc_id = v_koc_id WHERE id = v_app_id;
  END IF;

  -- Auto-add to the campaign as pending client approval (never override existing).
  INSERT INTO campaign_kocs (campaign_id, koc_id, client_approval_status, operation_status)
  SELECT v_campaign_id, v_koc_id, 'pending', 'in_progress'
  WHERE NOT EXISTS (
    SELECT 1 FROM campaign_kocs ck WHERE ck.campaign_id = v_campaign_id AND ck.koc_id = v_koc_id
  );

  RETURN jsonb_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.submit_koc_application(uuid, text, text, text, integer, bigint, text, text, jsonb) TO anon, authenticated;

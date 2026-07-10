-- Auto-add a KOC to its campaign when the client approves the application on the
-- public /review link, so it shows up immediately in the client portal (which
-- reads campaign_kocs). Rejecting removes a still-pristine auto-added row.
-- SECURITY DEFINER because /review is unauthenticated and cannot write
-- campaign_kocs directly under RLS.

CREATE OR REPLACE FUNCTION public.submit_application_review(
  p_review_token uuid,
  p_application_id uuid,
  p_status text,
  p_note text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_app   koc_applications%ROWTYPE;
  v_koc_id UUID;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('error', 'invalid_status');
  END IF;

  SELECT a.* INTO v_app
  FROM koc_applications a
  JOIN campaigns c ON a.campaign_id = c.campaign_id
  WHERE c.review_token = p_review_token
    AND a.id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF v_app.agency_status IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'agency_reviewed');
  END IF;

  UPDATE koc_applications
  SET status = p_status, review_note = p_note, reviewed_at = NOW()
  WHERE id = p_application_id;

  IF p_status = 'approved' THEN
    v_koc_id := v_app.koc_id;

    -- Ensure a KOC master record exists (applications with an empty tiktok_url
    -- were saved without one). Non-destructive on conflict.
    IF v_koc_id IS NULL THEN
      INSERT INTO kocs (name, tiktok_url, tiktok_handle, phone, zalo, follower, status)
      VALUES (
        NULLIF(v_app.tiktok_name, ''),
        NULLIF(v_app.tiktok_url, ''),
        v_app.tiktok_handle,
        v_app.zalo_phone,
        v_app.zalo_phone,
        COALESCE(v_app.follower_count, 0),
        'active'
      )
      ON CONFLICT (tiktok_url) WHERE tiktok_url IS NOT NULL DO UPDATE SET
        follower = EXCLUDED.follower, updated_at = NOW()
      RETURNING koc_id INTO v_koc_id;

      UPDATE koc_applications SET koc_id = v_koc_id WHERE id = p_application_id;
    END IF;

    -- Upsert the campaign_koc as client-approved.
    UPDATE campaign_kocs
    SET client_approval_status = 'approved'
    WHERE campaign_id = v_app.campaign_id AND koc_id = v_koc_id;

    IF NOT FOUND THEN
      INSERT INTO campaign_kocs (campaign_id, koc_id, client_approval_status, operation_status)
      VALUES (v_app.campaign_id, v_koc_id, 'approved', 'in_progress');
    END IF;

  ELSIF p_status = 'rejected' THEN
    -- Remove a still-pristine auto-added row (don't touch KOCs already in production).
    IF v_app.koc_id IS NOT NULL THEN
      DELETE FROM campaign_kocs
      WHERE campaign_id = v_app.campaign_id
        AND koc_id = v_app.koc_id
        AND operation_status = 'in_progress'
        AND video_url IS NULL
        AND sample_sent_at IS NULL
        AND video_submitted_at IS NULL;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_application_review(uuid, uuid, text, text) TO anon, authenticated;

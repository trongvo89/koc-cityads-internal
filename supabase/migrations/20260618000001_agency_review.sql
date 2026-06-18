-- Agency review: allow operations team to override client rejections
-- Adds agency_status, agency_reviewed_at, agency_review_note to koc_applications
-- Updates RPCs to include agency fields and block client changes on agency-reviewed apps

-- 1. New columns
ALTER TABLE koc_applications
  ADD COLUMN IF NOT EXISTS agency_status TEXT DEFAULT NULL
    CHECK (agency_status IS NULL OR agency_status IN ('approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS agency_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agency_review_note TEXT;

-- 2. Update get_applications_by_review_token to return agency fields
CREATE OR REPLACE FUNCTION get_applications_by_review_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'campaign', jsonb_build_object(
      'campaign_name', c.campaign_name,
      'package_size',  c.package_size,
      'start_date',    c.start_date,
      'end_date',      c.end_date
    ),
    'applications', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',                 a.id,
        'tiktok_handle',      a.tiktok_handle,
        'tiktok_name',        a.tiktok_name,
        'tiktok_url',         a.tiktok_url,
        'follower_count',     a.follower_count,
        'gmv_30d',            a.gmv_30d,
        'zalo_phone',         a.zalo_phone,
        'video_style',        a.video_style,
        'status',             a.status,
        'review_note',        a.review_note,
        'applied_at',         a.applied_at,
        'agency_status',      a.agency_status,
        'agency_review_note', a.agency_review_note
      ) ORDER BY a.applied_at DESC
    ), '[]'::JSONB)
  ) INTO v_result
  FROM campaigns c
  LEFT JOIN koc_applications a ON a.campaign_id = c.campaign_id
  WHERE c.review_token = p_token
  GROUP BY c.campaign_id;

  RETURN v_result;
END;
$$;

-- 3. Update submit_application_review to block changes when agency has reviewed
CREATE OR REPLACE FUNCTION submit_application_review(
  p_review_token   UUID,
  p_application_id UUID,
  p_status         TEXT,
  p_note           TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_found BOOLEAN;
  v_agency_status TEXT;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('error', 'invalid_status');
  END IF;

  -- Block client from changing status if agency has already reviewed
  SELECT a.agency_status INTO v_agency_status
  FROM koc_applications a
  JOIN campaigns c ON a.campaign_id = c.campaign_id
  WHERE c.review_token = p_review_token
    AND a.id = p_application_id;

  IF v_agency_status IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'agency_reviewed');
  END IF;

  UPDATE koc_applications a
  SET
    status      = p_status,
    review_note = p_note,
    reviewed_at = NOW()
  FROM campaigns c
  WHERE a.campaign_id = c.campaign_id
    AND c.review_token = p_review_token
    AND a.id = p_application_id
  RETURNING true INTO v_found;

  IF NOT v_found THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

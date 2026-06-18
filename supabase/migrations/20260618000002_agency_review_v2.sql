-- Agency review v2: add "shortlisted" status + row_color for applications
-- "shortlisted" = internal-only status (not visible to client)
-- row_color = admin-chosen row highlight color

-- 1. Expand CHECK constraint to include 'shortlisted'
ALTER TABLE koc_applications DROP CONSTRAINT IF EXISTS koc_applications_agency_status_check;
ALTER TABLE koc_applications ADD CONSTRAINT koc_applications_agency_status_check
  CHECK (agency_status IS NULL OR agency_status IN ('approved', 'rejected', 'shortlisted'));

-- 2. Add row_color column
ALTER TABLE koc_applications
  ADD COLUMN IF NOT EXISTS row_color TEXT;

-- 3. Update get_applications_by_review_token — hide shortlisted from client
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
        'agency_status',      CASE WHEN a.agency_status = 'shortlisted' THEN NULL ELSE a.agency_status END,
        'agency_review_note', CASE WHEN a.agency_status = 'shortlisted' THEN NULL ELSE a.agency_review_note END
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

-- 4. Update submit_application_review — block changes on shortlisted too
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

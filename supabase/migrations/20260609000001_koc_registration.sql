-- KOC self-registration landing page for campaigns
-- Adds registration + review tokens to campaigns, koc_applications table, and public RPCs

-- 1. Add registration fields to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS registration_token UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS registration_open BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_brief TEXT,
  ADD COLUMN IF NOT EXISTS registration_instructions TEXT,
  ADD COLUMN IF NOT EXISTS review_token UUID UNIQUE DEFAULT gen_random_uuid();

-- 2. Add tiktok_handle to kocs
ALTER TABLE kocs
  ADD COLUMN IF NOT EXISTS tiktok_handle TEXT;

-- Unique index for tiktok_url (partial — only when set, allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS kocs_tiktok_url_unique_idx
  ON kocs (tiktok_url)
  WHERE tiktok_url IS NOT NULL;

-- 3. KOC applications table
CREATE TABLE IF NOT EXISTS koc_applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,

  -- KOC self-reported snapshot at time of application
  tiktok_handle    TEXT NOT NULL,
  tiktok_name      TEXT NOT NULL,
  tiktok_url       TEXT NOT NULL,
  follower_count   INT NOT NULL DEFAULT 0,
  gmv_30d          BIGINT NOT NULL DEFAULT 0,
  zalo_phone       TEXT NOT NULL,
  video_style      TEXT NOT NULL CHECK (video_style IN ('show_face_voice', 'ugc_style')),

  -- Status (updated by client via review page)
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note      TEXT,
  reviewed_at      TIMESTAMPTZ,

  -- Link to koc record (auto-set when KOC is upserted)
  koc_id           UUID REFERENCES kocs(koc_id) ON DELETE SET NULL,

  applied_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One application per KOC (by tiktok_url) per campaign
  UNIQUE(campaign_id, tiktok_url)
);

-- RLS: internal users manage all applications
ALTER TABLE koc_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage applications"
  ON koc_applications FOR ALL TO authenticated
  USING (is_internal_user())
  WITH CHECK (is_internal_user());

-- 4. RPC: Get campaign info for registration landing (public)
CREATE OR REPLACE FUNCTION get_campaign_by_registration_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'campaign_id',               c.campaign_id,
    'campaign_name',             c.campaign_name,
    'registration_brief',        c.registration_brief,
    'registration_instructions', c.registration_instructions,
    'registration_open',         c.registration_open,
    'start_date',                c.start_date,
    'end_date',                  c.end_date,
    'application_count',         COUNT(a.id)
  ) INTO v_result
  FROM campaigns c
  LEFT JOIN koc_applications a ON a.campaign_id = c.campaign_id
  WHERE c.registration_token = p_token
  GROUP BY c.campaign_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_campaign_by_registration_token(UUID) TO anon, authenticated;

-- 5. RPC: Submit KOC application — auto-upserts KOC into database (public)
CREATE OR REPLACE FUNCTION submit_koc_application(
  p_token        UUID,
  p_handle       TEXT,
  p_name         TEXT,
  p_tiktok_url   TEXT,
  p_followers    INT,
  p_gmv_30d      BIGINT,
  p_zalo_phone   TEXT,
  p_video_style  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Upsert KOC record immediately
  INSERT INTO kocs (name, tiktok_url, tiktok_handle, phone, zalo, follower, status)
  VALUES (p_name, p_tiktok_url, p_handle, p_zalo_phone, p_zalo_phone, p_followers, 'active')
  ON CONFLICT (tiktok_url) WHERE tiktok_url IS NOT NULL DO UPDATE SET
    name          = EXCLUDED.name,
    tiktok_handle = EXCLUDED.tiktok_handle,
    follower      = EXCLUDED.follower,
    updated_at    = NOW()
  RETURNING koc_id INTO v_koc_id;

  -- Upsert application snapshot
  INSERT INTO koc_applications (
    campaign_id, koc_id, tiktok_handle, tiktok_name, tiktok_url,
    follower_count, gmv_30d, zalo_phone, video_style, status
  )
  VALUES (
    v_campaign_id, v_koc_id, p_handle, p_name, p_tiktok_url,
    p_followers, p_gmv_30d, p_zalo_phone, p_video_style, 'pending'
  )
  ON CONFLICT (campaign_id, tiktok_url) DO UPDATE SET
    koc_id         = EXCLUDED.koc_id,
    tiktok_handle  = EXCLUDED.tiktok_handle,
    tiktok_name    = EXCLUDED.tiktok_name,
    follower_count = EXCLUDED.follower_count,
    gmv_30d        = EXCLUDED.gmv_30d,
    zalo_phone     = EXCLUDED.zalo_phone,
    video_style    = EXCLUDED.video_style,
    applied_at     = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION submit_koc_application(UUID, TEXT, TEXT, TEXT, INT, BIGINT, TEXT, TEXT) TO anon, authenticated;

-- 6. RPC: Get applications for client review page (public via review_token)
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
        'id',             a.id,
        'tiktok_handle',  a.tiktok_handle,
        'tiktok_name',    a.tiktok_name,
        'tiktok_url',     a.tiktok_url,
        'follower_count', a.follower_count,
        'gmv_30d',        a.gmv_30d,
        'zalo_phone',     a.zalo_phone,
        'video_style',    a.video_style,
        'status',         a.status,
        'review_note',    a.review_note,
        'applied_at',     a.applied_at
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

GRANT EXECUTE ON FUNCTION get_applications_by_review_token(UUID) TO anon, authenticated;

-- 7. RPC: Client approve/reject an application via review token (public)
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
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('error', 'invalid_status');
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

GRANT EXECUTE ON FUNCTION submit_application_review(UUID, UUID, TEXT, TEXT) TO anon, authenticated;

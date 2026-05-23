-- Add report fields to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS report_share_token UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS report_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS report_notes TEXT;

UPDATE campaigns SET report_share_token = gen_random_uuid()
WHERE report_share_token IS NULL;

-- Add video engagement metrics to campaign_kocs
ALTER TABLE campaign_kocs
  ADD COLUMN IF NOT EXISTS video_views BIGINT,
  ADD COLUMN IF NOT EXISTS video_likes BIGINT,
  ADD COLUMN IF NOT EXISTS video_comments INTEGER,
  ADD COLUMN IF NOT EXISTS video_shares INTEGER,
  ADD COLUMN IF NOT EXISTS video_gmv NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS metrics_updated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION get_report_by_token(p_token UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_campaign_id UUID;
  v_campaign JSONB;
  v_kocs JSONB;
BEGIN
  SELECT campaign_id INTO v_campaign_id
  FROM campaigns
  WHERE report_share_token = p_token
    AND report_published_at IS NOT NULL;

  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'campaign_id',         c.campaign_id,
    'campaign_name',       c.campaign_name,
    'client_name',         cl.company_name,
    'start_date',          c.start_date,
    'end_date',            c.end_date,
    'contract_value',      c.contract_value,
    'brief',               c.brief,
    'report_notes',        c.report_notes,
    'report_published_at', c.report_published_at
  )
  INTO v_campaign
  FROM campaigns c
  LEFT JOIN clients cl ON cl.client_id = c.client_id
  WHERE c.campaign_id = v_campaign_id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'campaign_koc_id',       ck.campaign_koc_id,
      'koc_name',              k.name,
      'koc_category',          k.category,
      'koc_follower',          k.follower,
      'koc_tiktok_url',        k.tiktok_url,
      'koc_instagram_url',     k.instagram_url,
      'koc_avatar_url',        k.avatar_url,
      'video_url',             ck.video_url,
      'video_submitted_at',    ck.video_submitted_at,
      'completed_at',          ck.completed_at,
      'client_quality_rating', ck.client_quality_rating,
      'client_quality_review', ck.client_quality_review,
      'video_views',           ck.video_views,
      'video_likes',           ck.video_likes,
      'video_comments',        ck.video_comments,
      'video_shares',          ck.video_shares,
      'video_gmv',             ck.video_gmv
    )
    ORDER BY ck.created_at
  )
  INTO v_kocs
  FROM campaign_kocs ck
  JOIN kocs k ON k.koc_id = ck.koc_id
  WHERE ck.campaign_id = v_campaign_id
    AND ck.video_url IS NOT NULL;

  RETURN v_campaign || jsonb_build_object('kocs', COALESCE(v_kocs, '[]'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION get_report_by_token(UUID) TO anon, authenticated;

-- Post-audit Phase 2 DB fixes.

-- ── H2: registration must not clobber an existing KOC's identity ──────────────
-- The kocs master row is still matched by tiktok_url (an unreliable identity —
-- KOCs paste shared/non-tiktok links). Make the on-conflict update NON-destructive:
-- only refresh the follower metric, never overwrite name/handle of an existing KOC.
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
      follower   = EXCLUDED.follower,
      updated_at = NOW()
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

-- ── M6: proposal token must not leak OTHER clients' identities ────────────────
-- past_videos (case studies) exposed campaign_name + client_name of unrelated
-- campaigns to whoever holds the proposal link. Drop those fields.
CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_proposal JSONB;
  v_kocs     JSONB;
BEGIN
  SELECT jsonb_build_object(
    'proposal_id',            p.proposal_id,
    'title',                  p.title,
    'notes',                  p.notes,
    'status',                 p.status,
    'client_id',              p.client_id,
    'client_name',            cl.company_name,
    'prospect_name',          p.prospect_name,
    'created_at',             p.created_at,
    'client_overall_comment', p.client_overall_comment,
    'linked_campaign_id',     p.linked_campaign_id
  )
  INTO v_proposal
  FROM proposals p
  LEFT JOIN clients cl ON cl.client_id = p.client_id
  WHERE p.share_token = p_token;

  IF v_proposal IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'proposal_koc_id',    pk.proposal_koc_id,
      'koc_id',             k.koc_id,
      'koc_name',           k.name,
      'koc_category',       k.category,
      'avatar_url',         k.avatar_url,
      'follower',           k.follower,
      'tiktok_url',         k.tiktok_url,
      'instagram_url',      k.instagram_url,
      'facebook_url',       k.facebook_url,
      'notes',              pk.notes,
      'ordering',           pk.ordering,
      'avg_rating',         kps.avg_rating,
      'total_campaigns',    kps.total_campaigns,
      'video_count',        kps.video_count,
      'rating_count',       kps.rating_count,
      'client_status',      pk.client_status,
      'client_comment',     pk.client_comment,
      'client_reviewed_at', pk.client_reviewed_at,
      -- Anonymous case studies: video links only, no other-client identities.
      'past_videos', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'campaign_koc_id',    ck.campaign_koc_id,
            'video_url',          ck.video_url,
            'video_submitted_at', ck.video_submitted_at
          )
          ORDER BY ck.video_submitted_at DESC NULLS LAST
        )
        FROM campaign_kocs ck
        WHERE ck.koc_id = k.koc_id
          AND ck.video_url IS NOT NULL
      ), '[]'::JSONB)
    )
    ORDER BY pk.ordering ASC, pk.created_at ASC
  )
  INTO v_kocs
  FROM proposal_kocs pk
  JOIN kocs k ON k.koc_id = pk.koc_id
  LEFT JOIN koc_performance_summary kps ON kps.koc_id = pk.koc_id
  WHERE pk.proposal_id = (v_proposal->>'proposal_id')::UUID;

  RETURN jsonb_build_object(
    'proposal', v_proposal,
    'kocs',     COALESCE(v_kocs, '[]'::JSONB)
  );
END;
$$;

-- ── H5: authoritative final definition of client_campaign_kocs_view ───────────
-- Guards against migration-order regressions: this includes in_progress +
-- final_link + video metrics. Re-running earlier view migrations out of order
-- would drop in_progress and blank the client's KOC list, so this is the source
-- of truth.
DROP VIEW IF EXISTS public.client_campaign_kocs_view;
CREATE VIEW public.client_campaign_kocs_view
WITH (security_invoker = true)
AS
SELECT
  c.campaign_id, c.campaign_name, ck.campaign_koc_id, ck.koc_id,
  k.name, k.avatar_url, k.tiktok_url, k.facebook_url, k.instagram_url,
  k.follower, k.category, k.location,
  ck.client_approval_status, ck.client_note, ck.content_status,
  ck.operation_status, ck.video_url, ck.final_link, ck.deadline_date,
  ck.sample_sent_at, ck.sample_received_at, ck.video_submitted_at, ck.completed_at,
  ck.client_video_feedback, ck.client_video_feedback_at,
  ck.client_quality_rating, ck.client_quality_review, ck.client_quality_rated_at,
  ck.video_views, ck.video_likes, ck.video_comments, ck.video_shares,
  ck.video_gmv, ck.metrics_updated_at
FROM campaign_kocs ck
JOIN kocs k ON k.koc_id = ck.koc_id
JOIN campaigns c ON c.campaign_id = ck.campaign_id
WHERE ck.operation_status = ANY (ARRAY[
  'in_progress'::operation_status,
  'sent_to_client'::operation_status,
  'client_approved'::operation_status,
  'client_rejected'::operation_status,
  'waiting_address'::operation_status,
  'address_submitted'::operation_status,
  'waiting_sample_sent'::operation_status,
  'sample_sent'::operation_status,
  'sample_received'::operation_status,
  'waiting_video'::operation_status,
  'video_submitted'::operation_status,
  'need_revision'::operation_status,
  'video_approved'::operation_status,
  'completed'::operation_status
]);

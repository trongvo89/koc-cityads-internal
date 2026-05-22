-- Add past_videos array to each KOC entry returned by get_proposal_by_token.
-- Videos come from campaign_kocs where video_url IS NOT NULL, joined with
-- campaigns + clients for context. Used to show case studies on public proposal page.

CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      -- Past submitted videos for this KOC — used as case studies in proposal
      'past_videos', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'campaign_koc_id',    ck.campaign_koc_id,
            'campaign_name',      cam.campaign_name,
            'client_name',        COALESCE(cli.company_name, '—'),
            'video_url',          ck.video_url,
            'video_submitted_at', ck.video_submitted_at
          )
          ORDER BY ck.video_submitted_at DESC NULLS LAST
        )
        FROM campaign_kocs ck
        JOIN campaigns cam ON cam.campaign_id = ck.campaign_id
        LEFT JOIN clients cli ON cli.client_id = cam.client_id
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

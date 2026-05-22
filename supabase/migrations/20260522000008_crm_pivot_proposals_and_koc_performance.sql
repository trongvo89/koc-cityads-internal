-- ─── 1. koc_performance_summary view ─────────────────────────────────────────
CREATE OR REPLACE VIEW public.koc_performance_summary AS
SELECT
  k.koc_id,
  COUNT(ck.campaign_koc_id)                                              AS total_campaigns,
  COUNT(ck.campaign_koc_id) FILTER (WHERE ck.final_status = 'completed') AS completed_campaigns,
  COUNT(ck.video_url)        FILTER (WHERE ck.video_url IS NOT NULL)      AS video_count,
  ROUND(AVG(ck.client_quality_rating), 1)                                AS avg_rating,
  COUNT(ck.client_quality_rating)                                        AS rating_count
FROM public.kocs k
LEFT JOIN public.campaign_kocs ck ON ck.koc_id = k.koc_id
GROUP BY k.koc_id;

-- ─── 2. proposals table ───────────────────────────────────────────────────────
CREATE TABLE public.proposals (
  proposal_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID        REFERENCES public.clients(client_id) ON DELETE SET NULL,
  prospect_name TEXT,
  title         TEXT        NOT NULL,
  notes         TEXT,
  status        TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','sent','accepted','rejected')),
  share_token   UUID        UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_by    UUID        REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. proposal_kocs table ───────────────────────────────────────────────────
CREATE TABLE public.proposal_kocs (
  proposal_koc_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id     UUID        NOT NULL REFERENCES public.proposals(proposal_id) ON DELETE CASCADE,
  koc_id          UUID        NOT NULL REFERENCES public.kocs(koc_id) ON DELETE CASCADE,
  notes           TEXT,
  ordering        INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (proposal_id, koc_id)
);

-- ─── 4. updated_at trigger for proposals ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER proposals_set_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 5. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.proposals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_kocs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internal users manage proposals"
  ON public.proposals FOR ALL
  USING (public.is_internal_user())
  WITH CHECK (public.is_internal_user());

CREATE POLICY "internal users manage proposal_kocs"
  ON public.proposal_kocs FOR ALL
  USING (public.is_internal_user())
  WITH CHECK (public.is_internal_user());

-- ─── 6. RPC: get_proposal_by_token (public, no auth) ─────────────────────────
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
  SELECT to_jsonb(p) - 'share_token' - 'created_by'
  INTO v_proposal
  FROM proposals p
  WHERE p.share_token = p_token;

  IF v_proposal IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'proposal_koc_id', pk.proposal_koc_id,
      'koc_id',          k.koc_id,
      'koc_name',        k.name,
      'koc_category',    k.category,
      'follower',        k.follower,
      'tiktok_url',      k.tiktok_url,
      'instagram_url',   k.instagram_url,
      'facebook_url',    k.facebook_url,
      'notes',           pk.notes,
      'ordering',        pk.ordering,
      'avg_rating',      kps.avg_rating,
      'total_campaigns', kps.total_campaigns,
      'video_count',     kps.video_count,
      'rating_count',    kps.rating_count
    )
    ORDER BY pk.ordering ASC, pk.created_at ASC
  )
  INTO v_kocs
  FROM proposal_kocs pk
  JOIN kocs k  ON k.koc_id = pk.koc_id
  LEFT JOIN koc_performance_summary kps ON kps.koc_id = pk.koc_id
  WHERE pk.proposal_id = (v_proposal->>'proposal_id')::UUID;

  RETURN jsonb_build_object(
    'proposal', v_proposal,
    'kocs',     COALESCE(v_kocs, '[]'::JSONB)
  );
END;
$$;

-- ─── 7. Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX idx_proposals_client_id    ON public.proposals(client_id);
CREATE INDEX idx_proposals_share_token  ON public.proposals(share_token);
CREATE INDEX idx_proposals_status       ON public.proposals(status);
CREATE INDEX idx_proposal_kocs_proposal ON public.proposal_kocs(proposal_id);
CREATE INDEX idx_proposal_kocs_koc      ON public.proposal_kocs(koc_id);

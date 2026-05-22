-- Client portal pivot: drop address/contact visibility (shipping is managed
-- on TikTok). Instead, expose progress timeline, allow per-video feedback,
-- and let client rate KOC quality once the video is approved.

-- 1. New columns on campaign_kocs --------------------------------------------

ALTER TABLE public.campaign_kocs
  ADD COLUMN IF NOT EXISTS client_video_feedback     TEXT,
  ADD COLUMN IF NOT EXISTS client_video_feedback_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_quality_rating     SMALLINT
    CHECK (client_quality_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS client_quality_review     TEXT,
  ADD COLUMN IF NOT EXISTS client_quality_rated_at   TIMESTAMPTZ;

-- 2. Rewrite client view -----------------------------------------------------
--    Drops receiver_* fields (client no longer ships through us).
--    Adds operation_status + milestone timestamps for progress tracking,
--    plus the new feedback / rating columns.
--    DROP + CREATE because column order/names change (CREATE OR REPLACE
--    would reject the rename).

DROP VIEW IF EXISTS public.client_campaign_kocs_view;

CREATE VIEW public.client_campaign_kocs_view
WITH (security_invoker = true)
AS
SELECT
  c.campaign_id,
  c.campaign_name,
  ck.campaign_koc_id,
  ck.koc_id,
  k.name,
  k.avatar_url,
  k.tiktok_url,
  k.facebook_url,
  k.instagram_url,
  k.follower,
  k.category,
  k.location,
  ck.client_approval_status,
  ck.client_note,
  ck.content_status,
  ck.operation_status,
  ck.video_url,
  ck.deadline_date,
  ck.sample_sent_at,
  ck.sample_received_at,
  ck.video_submitted_at,
  ck.completed_at,
  ck.client_video_feedback,
  ck.client_video_feedback_at,
  ck.client_quality_rating,
  ck.client_quality_review,
  ck.client_quality_rated_at
FROM campaign_kocs ck
JOIN kocs k ON k.koc_id = ck.koc_id
JOIN campaigns c ON c.campaign_id = ck.campaign_id
WHERE ck.operation_status = ANY (ARRAY[
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

-- 3. RPC: client_submit_video_feedback ---------------------------------------
--    Allowed once a video has been submitted. Pure comment — does NOT change
--    operation_status; admin/operator decides whether to ask for revision.

CREATE OR REPLACE FUNCTION public.client_submit_video_feedback(
  p_campaign_koc_id UUID,
  p_feedback TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_op operation_status;
BEGIN
  SELECT ck.operation_status INTO v_op
  FROM public.campaign_kocs ck
  JOIN public.campaigns c ON c.campaign_id = ck.campaign_id
  WHERE ck.campaign_koc_id = p_campaign_koc_id
    AND c.client_id = public.current_user_client_id();

  IF v_op IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_op NOT IN (
    'video_submitted'::operation_status,
    'need_revision'::operation_status,
    'video_approved'::operation_status,
    'completed'::operation_status
  ) THEN
    RAISE EXCEPTION 'Video chưa được nộp, không thể feedback';
  END IF;

  UPDATE public.campaign_kocs
  SET
    client_video_feedback    = NULLIF(TRIM(p_feedback), ''),
    client_video_feedback_at = CASE
      WHEN NULLIF(TRIM(p_feedback), '') IS NULL THEN NULL
      ELSE NOW()
    END,
    updated_at = NOW()
  WHERE campaign_koc_id = p_campaign_koc_id;
END;
$$;

-- 4. RPC: client_rate_koc ----------------------------------------------------
--    Allowed once the video has been approved (or campaign completed).

CREATE OR REPLACE FUNCTION public.client_rate_koc(
  p_campaign_koc_id UUID,
  p_rating SMALLINT,
  p_review TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_op operation_status;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating phải từ 1 đến 5';
  END IF;

  SELECT ck.operation_status INTO v_op
  FROM public.campaign_kocs ck
  JOIN public.campaigns c ON c.campaign_id = ck.campaign_id
  WHERE ck.campaign_koc_id = p_campaign_koc_id
    AND c.client_id = public.current_user_client_id();

  IF v_op IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_op NOT IN (
    'video_approved'::operation_status,
    'completed'::operation_status
  ) THEN
    RAISE EXCEPTION 'Chưa thể đánh giá — video chưa được duyệt';
  END IF;

  UPDATE public.campaign_kocs
  SET
    client_quality_rating   = p_rating,
    client_quality_review   = NULLIF(TRIM(p_review), ''),
    client_quality_rated_at = NOW(),
    updated_at = NOW()
  WHERE campaign_koc_id = p_campaign_koc_id;
END;
$$;

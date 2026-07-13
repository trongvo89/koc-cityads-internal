-- 1. GMV on the client portal: the view is security_invoker, so a subquery to
-- koc_applications runs as the client, who has no RLS read on that table → NULL.
-- Expose ONLY the gmv figure through a SECURITY DEFINER helper (no other columns
-- leak), and have the view call it.
CREATE OR REPLACE FUNCTION public.koc_app_gmv(p_campaign_id uuid, p_koc_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.gmv_30d
  FROM koc_applications a
  WHERE a.campaign_id = p_campaign_id AND a.koc_id = p_koc_id
  ORDER BY a.applied_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.koc_app_gmv(uuid, uuid) TO anon, authenticated;

DROP VIEW IF EXISTS public.client_campaign_kocs_view;
CREATE VIEW public.client_campaign_kocs_view
WITH (security_invoker = true)
AS
SELECT
  c.campaign_id, c.campaign_name, ck.campaign_koc_id, ck.koc_id,
  k.name, k.avatar_url, k.tiktok_url, k.tiktok_handle, k.facebook_url, k.instagram_url,
  k.follower, k.category, k.location,
  public.koc_app_gmv(ck.campaign_id, ck.koc_id) AS gmv_30d,
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
  'in_progress'::operation_status,'sent_to_client'::operation_status,'client_approved'::operation_status,
  'client_rejected'::operation_status,'waiting_address'::operation_status,'address_submitted'::operation_status,
  'waiting_sample_sent'::operation_status,'sample_sent'::operation_status,'sample_received'::operation_status,
  'waiting_video'::operation_status,'video_submitted'::operation_status,'need_revision'::operation_status,
  'video_approved'::operation_status,'completed'::operation_status]);

-- 2. Let the client undo an approve/reject decision (back to pending), but only
-- while the KOC is still pristine (not yet in production).
CREATE OR REPLACE FUNCTION public.client_reset_koc_review(p_campaign_koc_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.campaign_kocs ck
    JOIN public.campaigns c ON c.campaign_id = ck.campaign_id
    WHERE ck.campaign_koc_id = p_campaign_koc_id
      AND c.client_id = public.current_user_client_id()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.campaign_kocs
  SET
    client_approval_status = 'pending',
    operation_status = 'in_progress',
    client_note = NULL,
    updated_at = NOW()
  WHERE campaign_koc_id = p_campaign_koc_id
    AND sample_sent_at IS NULL
    AND video_url IS NULL
    AND video_submitted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_reset_koc_review(uuid) TO authenticated;

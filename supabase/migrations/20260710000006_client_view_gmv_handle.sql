-- Surface tiktok_handle + gmv_30d to the client portal so each KOC card can show
-- the channel link (built from handle when tiktok_url is empty) and the KOC's
-- self-reported 30-day GMV (from koc_applications).

DROP VIEW IF EXISTS public.client_campaign_kocs_view;
CREATE VIEW public.client_campaign_kocs_view
WITH (security_invoker = true)
AS
SELECT
  c.campaign_id, c.campaign_name, ck.campaign_koc_id, ck.koc_id,
  k.name, k.avatar_url, k.tiktok_url, k.tiktok_handle, k.facebook_url, k.instagram_url,
  k.follower, k.category, k.location,
  (SELECT a.gmv_30d FROM koc_applications a
     WHERE a.campaign_id = ck.campaign_id AND a.koc_id = ck.koc_id
     ORDER BY a.applied_at DESC LIMIT 1) AS gmv_30d,
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

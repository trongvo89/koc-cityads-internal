-- Add video metrics columns to client_campaign_kocs_view so brands can see
-- engagement data (views, likes, comments, shares, GMV) on their dashboard.

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
  ck.client_quality_rated_at,
  ck.video_views,
  ck.video_likes,
  ck.video_comments,
  ck.video_shares,
  ck.video_gmv,
  ck.metrics_updated_at
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

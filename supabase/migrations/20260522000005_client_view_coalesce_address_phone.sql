-- Client portal: show KOC phone and fall back to koc profile address when
-- campaign_kocs receiver fields are null (e.g. KOC added before default_address
-- feature, or before address was pre-filled).
CREATE OR REPLACE VIEW public.client_campaign_kocs_view
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
  ck.content_status,
  ck.video_url,
  ck.client_note,
  ck.deadline_date,
  COALESCE(ck.receiver_name, k.name)           AS receiver_name,
  COALESCE(ck.receiver_phone, k.phone)          AS receiver_phone,
  COALESCE(ck.receiver_address, k.default_address) AS receiver_address,
  COALESCE(ck.receiver_province, k.location)    AS receiver_province
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

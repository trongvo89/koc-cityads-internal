-- Fix: clients could not see KOC details in campaign detail page.
-- Root cause: client_campaign_kocs_view uses security_invoker=true and JOINs
-- kocs table, but kocs had no SELECT policy for clients, so the JOIN returned nothing.
-- The campaign list showed correct counts (queries campaign_kocs directly) but
-- the detail page showed empty (queries through the view).

-- Fix 1: Allow clients to SELECT kocs that are assigned to their campaigns.
CREATE POLICY kocs_select_client ON public.kocs
  FOR SELECT
  USING (
    is_client() AND EXISTS (
      SELECT 1
      FROM campaign_kocs ck
      JOIN campaigns c ON c.campaign_id = ck.campaign_id
      WHERE ck.koc_id = kocs.koc_id
        AND c.client_id = current_user_client_id()
    )
  );

-- Fix 2: Update view to only expose KOCs that have been formally sent to the client.
-- Prevents clients from seeing KOCs still in internal review stages.
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
  ck.deadline_date
FROM campaign_kocs ck
JOIN kocs k ON k.koc_id = ck.koc_id
JOIN campaigns c ON c.campaign_id = ck.campaign_id
WHERE ck.operation_status IN (
  'sent_to_client', 'client_approved', 'client_rejected',
  'waiting_address', 'address_submitted', 'waiting_sample_sent',
  'sample_sent', 'sample_received', 'waiting_video',
  'video_submitted', 'need_revision', 'video_approved', 'completed'
);

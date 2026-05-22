-- Bug: client_approve_koc only updated client_approval_status but left
-- operation_status at 'sent_to_client', requiring admins to manually advance it.
-- Fix: auto-transition operation_status when client approves or rejects.
CREATE OR REPLACE FUNCTION public.client_approve_koc(
  p_campaign_koc_id UUID,
  p_status public.client_approval_status,
  p_note TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    client_approval_status = p_status,
    operation_status = CASE p_status
      WHEN 'approved'  THEN 'client_approved'::public.operation_status
      WHEN 'rejected'  THEN 'client_rejected'::public.operation_status
      ELSE operation_status
    END,
    client_note = COALESCE(p_note, client_note),
    updated_at = NOW()
  WHERE campaign_koc_id = p_campaign_koc_id;
END;
$$;

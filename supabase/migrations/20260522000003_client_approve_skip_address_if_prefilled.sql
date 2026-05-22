-- When a KOC already has a pre-filled address (address_status='submitted'),
-- client approval should advance directly to 'address_submitted' so admins
-- can ship immediately without waiting for the KOC to fill in address again.
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
DECLARE
  v_address_status public.address_status;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.campaign_kocs ck
    JOIN public.campaigns c ON c.campaign_id = ck.campaign_id
    WHERE ck.campaign_koc_id = p_campaign_koc_id
      AND c.client_id = public.current_user_client_id()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT address_status INTO v_address_status
  FROM public.campaign_kocs
  WHERE campaign_koc_id = p_campaign_koc_id;

  UPDATE public.campaign_kocs
  SET
    client_approval_status = p_status,
    operation_status = CASE p_status
      WHEN 'approved' THEN
        CASE WHEN v_address_status = 'submitted'
          THEN 'address_submitted'::public.operation_status
          ELSE 'client_approved'::public.operation_status
        END
      WHEN 'rejected' THEN 'client_rejected'::public.operation_status
      ELSE operation_status
    END,
    client_note = COALESCE(p_note, client_note),
    updated_at = NOW()
  WHERE campaign_koc_id = p_campaign_koc_id;
END;
$$;

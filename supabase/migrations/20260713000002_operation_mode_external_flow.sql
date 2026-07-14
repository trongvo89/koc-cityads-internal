-- Two campaign operating modes:
--   tiktok_seller (default) — current lightweight flow, samples handled on TikTok
--   external — we ship samples ourselves; tracked via sub-status columns
--     (address_status, sample_status, content_status) + milestone timestamps.
-- operation_status stays the simple 3-value model for BOTH modes.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS operation_mode TEXT NOT NULL DEFAULT 'tiktok_seller'
    CHECK (operation_mode IN ('tiktok_seller', 'external'));

-- koc_submit_address: stop writing the retired granular operation_status
-- ('address_submitted'); sub-status + receiver fields carry the state.
CREATE OR REPLACE FUNCTION public.koc_submit_address(
  p_token UUID,
  p_receiver_name TEXT,
  p_receiver_phone TEXT,
  p_receiver_address TEXT,
  p_receiver_province TEXT,
  p_address_note TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_koc_id UUID;
BEGIN
  SELECT campaign_koc_id INTO v_campaign_koc_id
  FROM public.campaign_kocs
  WHERE magic_link_token = p_token
    AND magic_link_expires_at > NOW();

  IF v_campaign_koc_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  UPDATE public.campaign_kocs
  SET
    receiver_name = p_receiver_name,
    receiver_phone = p_receiver_phone,
    receiver_address = p_receiver_address,
    receiver_province = p_receiver_province,
    address_note = p_address_note,
    address_status = 'submitted',
    updated_at = NOW()
  WHERE campaign_koc_id = v_campaign_koc_id;
END;
$$;

-- get_campaign_koc_by_token: expose operation_mode + shipping/receiver info so
-- the KOC magic-link page can render the external-flow stepper.
DROP FUNCTION IF EXISTS public.get_campaign_koc_by_token(uuid);
CREATE FUNCTION public.get_campaign_koc_by_token(p_token uuid)
RETURNS TABLE(
  campaign_koc_id uuid, campaign_name text, koc_name text,
  operation_status operation_status, address_status address_status,
  sample_status sample_status, content_status content_status,
  deadline_date date, revision_note text,
  operation_mode text, shipping_code text, shipping_provider text,
  receiver_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ck.campaign_koc_id, c.campaign_name, k.name AS koc_name,
    ck.operation_status, ck.address_status, ck.sample_status, ck.content_status,
    ck.deadline_date, ck.revision_note,
    c.operation_mode, ck.shipping_code, ck.shipping_provider,
    ck.receiver_name
  FROM public.campaign_kocs ck
  JOIN public.campaigns c ON c.campaign_id = ck.campaign_id
  JOIN public.kocs k ON k.koc_id = ck.koc_id
  WHERE ck.magic_link_token = p_token
    AND ck.magic_link_expires_at > NOW();
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_campaign_koc_by_token(uuid) TO anon, authenticated;

-- koc_confirm_sample: same — only sample_status + timestamp.
CREATE OR REPLACE FUNCTION public.koc_confirm_sample(
  p_token UUID,
  p_status public.sample_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_koc_id UUID;
BEGIN
  SELECT campaign_koc_id INTO v_campaign_koc_id
  FROM public.campaign_kocs
  WHERE magic_link_token = p_token
    AND magic_link_expires_at > NOW();

  IF v_campaign_koc_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  UPDATE public.campaign_kocs
  SET
    sample_status = p_status,
    sample_received_at = CASE WHEN p_status = 'received' THEN NOW() ELSE sample_received_at END,
    updated_at = NOW()
  WHERE campaign_koc_id = v_campaign_koc_id;
END;
$$;

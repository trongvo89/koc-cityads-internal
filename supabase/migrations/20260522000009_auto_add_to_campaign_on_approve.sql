-- When a client approves a KOC on the public proposal page AND the proposal
-- has already been converted to a campaign, automatically add that KOC to the
-- campaign (operation_status = 'waiting_video') in the same transaction.
-- ON CONFLICT DO NOTHING is safe because campaign_kocs has UNIQUE (campaign_id, koc_id).

CREATE OR REPLACE FUNCTION public.submit_koc_review(
  p_token     UUID,
  p_koc_entry UUID,
  p_status    TEXT,
  p_comment   TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_koc_id          UUID;
  v_linked_campaign UUID;
  v_koc_name        TEXT;
  v_koc_phone       TEXT;
  v_koc_address     TEXT;
  v_koc_province    TEXT;
  v_update_rows     INT;
  v_insert_rows     INT;
BEGIN
  IF p_status NOT IN ('approved', 'rejected', 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trạng thái không hợp lệ');
  END IF;

  -- Update proposal_koc; capture koc_id and linked_campaign_id atomically via RETURNING
  UPDATE proposal_kocs pk
  SET client_status      = p_status,
      client_comment     = p_comment,
      client_reviewed_at = NOW()
  FROM proposals p
  WHERE pk.proposal_koc_id = p_koc_entry
    AND pk.proposal_id     = p.proposal_id
    AND p.share_token      = p_token
  RETURNING pk.koc_id, p.linked_campaign_id
  INTO v_koc_id, v_linked_campaign;

  GET DIAGNOSTICS v_update_rows = ROW_COUNT;
  IF v_update_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy');
  END IF;

  -- Auto-add to campaign only when approved and campaign exists
  IF p_status = 'approved' AND v_linked_campaign IS NOT NULL THEN
    SELECT k.name, k.phone, k.default_address, k.location
    INTO v_koc_name, v_koc_phone, v_koc_address, v_koc_province
    FROM kocs k
    WHERE k.koc_id = v_koc_id;

    INSERT INTO campaign_kocs (
      campaign_id,
      koc_id,
      operation_status,
      receiver_name,
      receiver_phone,
      receiver_address,
      receiver_province,
      address_status
    )
    VALUES (
      v_linked_campaign,
      v_koc_id,
      'waiting_video',
      v_koc_name,
      v_koc_phone,
      v_koc_address,
      v_koc_province,
      CASE WHEN v_koc_address IS NOT NULL
           THEN 'submitted'::address_status
           ELSE 'waiting'::address_status
      END
    )
    ON CONFLICT (campaign_id, koc_id) DO NOTHING;

    GET DIAGNOSTICS v_insert_rows = ROW_COUNT;

    -- Return campaign_id so the server action can revalidate the campaign page
    RETURN jsonb_build_object(
      'success',     true,
      'campaign_id', CASE WHEN v_insert_rows > 0 THEN v_linked_campaign ELSE NULL END
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'campaign_id', NULL);
END;
$$;

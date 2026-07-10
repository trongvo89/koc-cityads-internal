-- Enforce the super_admin-only rule for bonus/tier at the DB layer.
--
-- Previously tier_percent/bonus_sale_pct/bonus_ops_pct lived on `campaigns`,
-- whose table-level grants let any authenticated user (or a client, for their own
-- campaigns) read them directly via PostgREST — the UI gate was the only guard.
-- Column-level REVOKE is a no-op against table-level grants, and a
-- REVOKE-table + GRANT-columns scheme would silently break every future
-- ADD COLUMN. So move the sensitive figures into their own table with
-- super_admin-only RLS. `tier_month` stays on campaigns (non-sensitive group key).

CREATE TABLE IF NOT EXISTS public.campaign_bonus (
  campaign_id     UUID PRIMARY KEY REFERENCES public.campaigns(campaign_id) ON DELETE CASCADE,
  tier_percent    NUMERIC(5,2),
  bonus_sale_pct  NUMERIC(5,2) NOT NULL DEFAULT 100,
  bonus_ops_pct   NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_campaign_bonus_split CHECK (bonus_sale_pct + bonus_ops_pct = 100)
);

-- Migrate existing values.
INSERT INTO public.campaign_bonus (campaign_id, tier_percent, bonus_sale_pct, bonus_ops_pct)
SELECT campaign_id, tier_percent, COALESCE(bonus_sale_pct, 100), COALESCE(bonus_ops_pct, 0)
FROM public.campaigns
WHERE tier_percent IS NOT NULL
   OR COALESCE(bonus_sale_pct, 100) <> 100
   OR COALESCE(bonus_ops_pct, 0) <> 0
ON CONFLICT (campaign_id) DO NOTHING;

-- Super_admin-only RLS.
ALTER TABLE public.campaign_bonus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_bonus_super_admin ON public.campaign_bonus;
CREATE POLICY campaign_bonus_super_admin ON public.campaign_bonus
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Remove the sensitive columns from campaigns (drops the old chk_bonus_split too).
ALTER TABLE public.campaigns
  DROP COLUMN IF EXISTS tier_percent,
  DROP COLUMN IF EXISTS bonus_sale_pct,
  DROP COLUMN IF EXISTS bonus_ops_pct;

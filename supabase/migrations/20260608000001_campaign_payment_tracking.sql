ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_campaigns_deposit_paid_at ON public.campaigns(deposit_paid_at)
  WHERE deposit_paid_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_final_paid_at ON public.campaigns(final_paid_at)
  WHERE final_paid_at IS NOT NULL;

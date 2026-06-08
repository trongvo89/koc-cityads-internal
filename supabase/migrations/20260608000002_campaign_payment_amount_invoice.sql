ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS deposit_amount   BIGINT,
  ADD COLUMN IF NOT EXISTS deposit_invoice  TEXT,
  ADD COLUMN IF NOT EXISTS final_amount     BIGINT,
  ADD COLUMN IF NOT EXISTS final_invoice    TEXT;

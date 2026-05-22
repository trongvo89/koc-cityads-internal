-- Add contract value to campaigns for revenue tracking and super_admin stats
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS contract_value NUMERIC(15, 0) DEFAULT 0 NOT NULL;

-- KPI & Bonus system for sales
-- Tracks monthly KPI tier and calculates bonus per payment

-- 0A. Add columns to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS ngay_chot_hd DATE,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tier_month TEXT,
  ADD COLUMN IF NOT EXISTS tier_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS bonus_sale_pct NUMERIC(5,2) DEFAULT 100,
  ADD COLUMN IF NOT EXISTS bonus_ops_pct NUMERIC(5,2) DEFAULT 0;

ALTER TABLE campaigns
  ADD CONSTRAINT chk_bonus_split CHECK (bonus_sale_pct + bonus_ops_pct = 100);

CREATE INDEX IF NOT EXISTS idx_campaigns_tier_month ON campaigns(tier_month) WHERE tier_month IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_assigned_to ON campaigns(assigned_to) WHERE assigned_to IS NOT NULL;

-- 0B. monthly_kpi table
CREATE TABLE IF NOT EXISTS monthly_kpi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL UNIQUE,
  total_contract_value NUMERIC(15,0) NOT NULL DEFAULT 0,
  tier_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked')),
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER monthly_kpi_set_updated_at
  BEFORE UPDATE ON monthly_kpi
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 0C. monthly_kpi_log (audit trail)
CREATE TABLE IF NOT EXISTS monthly_kpi_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_kpi_id UUID NOT NULL REFERENCES monthly_kpi(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('lock', 'unlock')),
  old_tier_percent NUMERIC(5,2),
  new_tier_percent NUMERIC(5,2),
  old_total NUMERIC(15,0),
  new_total NUMERIC(15,0),
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 0D. RLS — super_admin only
ALTER TABLE monthly_kpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_kpi_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_kpi_super_admin" ON monthly_kpi
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "monthly_kpi_log_super_admin" ON monthly_kpi_log
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

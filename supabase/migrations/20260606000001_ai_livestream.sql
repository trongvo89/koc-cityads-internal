-- AI Livestream module: 4 new tables for managing AI hosts, product knowledge,
-- live scripts, and live session scheduling.

-- 1. ai_hosts: host persona profiles (LLM-generated or manual)
CREATE TABLE public.ai_hosts (
  host_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  generation_brief   TEXT,
  personality        TEXT,
  voice_style        TEXT CHECK (voice_style IN ('calm','enthusiastic','humorous','professional')),
  selling_style      TEXT CHECK (selling_style IN ('soft_sell','hard_sell','educational','storytelling')),
  avatar_url         TEXT,
  avatar_provider    TEXT,        -- null | 'heygen' | 'did' | 'custom'
  avatar_external_id TEXT,
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by         UUID REFERENCES auth.users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. product_knowledge: product info base for script generation
CREATE TABLE public.product_knowledge (
  product_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  campaign_id      UUID REFERENCES public.campaigns(campaign_id) ON DELETE SET NULL,
  category         TEXT,
  description      TEXT,
  key_features     TEXT[],
  target_audience  TEXT,
  price_range      TEXT,
  usp              TEXT,
  sourced_from     TEXT NOT NULL DEFAULT 'manual' CHECK (sourced_from IN ('manual','campaign')),
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. live_scripts: structured AI-generated live scripts
CREATE TABLE public.live_scripts (
  script_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  product_id       UUID REFERENCES public.product_knowledge(product_id) ON DELETE SET NULL,
  host_id          UUID REFERENCES public.ai_hosts(host_id) ON DELETE SET NULL,
  brief            TEXT,
  duration_minutes INT,
  script_sections  JSONB NOT NULL DEFAULT '[]',
  -- Each section: { section_type: string, content: string, duration_seconds: number }
  -- section_type: intro | hook | product_intro | demo | usp | social_proof | cta | outro
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','archived')),
  ai_generated     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. live_sessions: streaming session scheduling and reporting
CREATE TABLE public.live_sessions (
  session_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  campaign_id   UUID REFERENCES public.campaigns(campaign_id) ON DELETE SET NULL,
  host_id       UUID REFERENCES public.ai_hosts(host_id) ON DELETE SET NULL,
  script_id     UUID REFERENCES public.live_scripts(script_id) ON DELETE SET NULL,
  platform      TEXT NOT NULL DEFAULT 'tiktok'
                  CHECK (platform IN ('tiktok','shopee','lazada','facebook','youtube','other')),
  scheduled_at  TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','live','completed','cancelled')),
  rtmp_url      TEXT,
  stream_key    TEXT,
  stream_link   TEXT,
  notes         TEXT,
  -- Post-live report fields (manual input)
  peak_viewers  INT,
  total_orders  INT,
  gmv           NUMERIC(15, 2),
  report_notes  TEXT,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: all internal users (super_admin, admin, operator)
ALTER TABLE public.ai_hosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_hosts_internal" ON public.ai_hosts FOR ALL
  USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());

ALTER TABLE public.product_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_knowledge_internal" ON public.product_knowledge FOR ALL
  USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());

ALTER TABLE public.live_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_scripts_internal" ON public.live_scripts FOR ALL
  USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_sessions_internal" ON public.live_sessions FOR ALL
  USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());

-- updated_at triggers
CREATE TRIGGER set_ai_hosts_updated_at
  BEFORE UPDATE ON public.ai_hosts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_product_knowledge_updated_at
  BEFORE UPDATE ON public.product_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_live_scripts_updated_at
  BEFORE UPDATE ON public.live_scripts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_live_sessions_updated_at
  BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

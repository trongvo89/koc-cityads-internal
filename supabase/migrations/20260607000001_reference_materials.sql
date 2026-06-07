-- Reference Learning Pipeline: upload livestream recordings, transcribe,
-- extract selling insights, inject into script generation for uniqueness.

-- 1. reference_materials: uploaded video/audio/text sources
CREATE TABLE public.reference_materials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT,
  source_type       TEXT NOT NULL DEFAULT 'video'
                      CHECK (source_type IN ('video','audio','text')),
  source_platform   TEXT
                      CHECK (source_platform IN ('tiktok','shopee','lazada','facebook','youtube','other')),
  storage_path      TEXT,
  original_filename TEXT,
  file_size_bytes   BIGINT,
  duration_seconds  INT,
  product_id        UUID REFERENCES public.product_knowledge(product_id) ON DELETE SET NULL,
  campaign_id       UUID REFERENCES public.campaigns(campaign_id) ON DELETE SET NULL,
  category          TEXT,
  tags              TEXT[],
  status            TEXT NOT NULL DEFAULT 'uploaded'
                      CHECK (status IN ('uploaded','processing','transcribed','analyzed','failed')),
  error_message     TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. reference_transcripts: Whisper output (or pasted text)
CREATE TABLE public.reference_transcripts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id           UUID NOT NULL REFERENCES public.reference_materials(id) ON DELETE CASCADE,
  full_text              TEXT NOT NULL,
  language               TEXT NOT NULL DEFAULT 'vi',
  word_count             INT,
  segments               JSONB,  -- [{start: float, end: float, text: string}] from Whisper
  transcription_provider TEXT NOT NULL DEFAULT 'openai_whisper',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. reference_insights: structured selling insights extracted by Claude
CREATE TABLE public.reference_insights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id  UUID NOT NULL REFERENCES public.reference_materials(id) ON DELETE CASCADE,
  transcript_id UUID REFERENCES public.reference_transcripts(id) ON DELETE SET NULL,
  insight_data  JSONB NOT NULL,
  -- insight_data shape:
  -- { opening_hooks[], selling_techniques[{technique,example,effectiveness}],
  --   engagement_patterns[{pattern,example}], product_presentation_flow[],
  --   cta_styles[{style,example}], audience_interaction[{type,example}],
  --   tone_and_energy{overall_tone,energy_level,language_register,notable_phrases[]},
  --   objection_handling[{objection,response}], urgency_tactics[], summary, quality_score }
  category      TEXT,
  tags          TEXT[],
  is_approved   BOOLEAN NOT NULL DEFAULT FALSE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Track which references were used when generating a script
ALTER TABLE public.live_scripts
  ADD COLUMN IF NOT EXISTS reference_ids UUID[] DEFAULT '{}';

-- RLS
ALTER TABLE public.reference_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reference_materials_internal" ON public.reference_materials FOR ALL
  USING (is_internal_user()) WITH CHECK (is_internal_user());

ALTER TABLE public.reference_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reference_transcripts_internal" ON public.reference_transcripts FOR ALL
  USING (is_internal_user()) WITH CHECK (is_internal_user());

ALTER TABLE public.reference_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reference_insights_internal" ON public.reference_insights FOR ALL
  USING (is_internal_user()) WITH CHECK (is_internal_user());

-- updated_at triggers
CREATE TRIGGER set_reference_materials_updated_at
  BEFORE UPDATE ON public.reference_materials
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER set_reference_insights_updated_at
  BEFORE UPDATE ON public.reference_insights
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

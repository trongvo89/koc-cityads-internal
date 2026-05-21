-- =============================================================================
-- Phase 1: KOC Booking Platform — Full Schema
-- Project: koc-cityads (jchwvtjrkzimbirhkkzs)
-- =============================================================================

-- =====================
-- ENUMS
-- =====================

CREATE TYPE public.user_role AS ENUM (
  'super_admin', 'admin', 'operator', 'client'
);

CREATE TYPE public.campaign_status AS ENUM (
  'draft', 'active', 'completed', 'paused', 'cancelled'
);

CREATE TYPE public.koc_status AS ENUM (
  'active', 'inactive', 'blacklisted'
);

CREATE TYPE public.operation_status AS ENUM (
  'draft',
  'sent_to_client',
  'client_approved',
  'client_rejected',
  'waiting_address',
  'address_submitted',
  'waiting_sample_sent',
  'sample_sent',
  'sample_received',
  'waiting_video',
  'video_submitted',
  'need_revision',
  'video_approved',
  'completed',
  'failed'
);

CREATE TYPE public.client_approval_status AS ENUM (
  'pending', 'approved', 'rejected'
);

CREATE TYPE public.address_status AS ENUM (
  'waiting', 'submitted', 'issue'
);

CREATE TYPE public.sample_status AS ENUM (
  'waiting', 'sent', 'received', 'not_received', 'issue'
);

CREATE TYPE public.content_status AS ENUM (
  'waiting', 'submitted', 'need_revision', 'approved', 'invalid_link', 'late'
);

CREATE TYPE public.final_status AS ENUM (
  'active', 'completed', 'failed', 'dropped'
);

CREATE TYPE public.notification_channel AS ENUM (
  'zalo_manual', 'telegram', 'email', 'sms', 'system'
);

CREATE TYPE public.notification_status AS ENUM (
  'draft', 'copied', 'sent', 'failed'
);

CREATE TYPE public.notification_type AS ENUM (
  'address_request',
  'address_reminder',
  'sample_check',
  'sample_reminder',
  'video_brief',
  'video_reminder',
  'revision_request',
  'custom'
);

-- =====================
-- TABLES
-- =====================

CREATE TABLE public.clients (
  client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'operator',
  client_id UUID REFERENCES public.clients(client_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.campaigns (
  campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(client_id) ON DELETE RESTRICT,
  campaign_name TEXT NOT NULL,
  package_size INT NOT NULL DEFAULT 0,
  brief TEXT,
  start_date DATE,
  end_date DATE,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.kocs (
  koc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  email TEXT,
  zalo TEXT,
  tiktok_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  follower INT DEFAULT 0,
  category TEXT[] DEFAULT '{}',
  location TEXT,
  default_address TEXT,
  note TEXT,
  status public.koc_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.campaign_kocs (
  campaign_koc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(campaign_id) ON DELETE RESTRICT,
  koc_id UUID NOT NULL REFERENCES public.kocs(koc_id) ON DELETE RESTRICT,
  magic_link_token UUID NOT NULL DEFAULT gen_random_uuid(),
  magic_link_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  operation_status public.operation_status NOT NULL DEFAULT 'draft',
  client_approval_status public.client_approval_status NOT NULL DEFAULT 'pending',
  address_status public.address_status NOT NULL DEFAULT 'waiting',
  sample_status public.sample_status NOT NULL DEFAULT 'waiting',
  content_status public.content_status NOT NULL DEFAULT 'waiting',
  final_status public.final_status NOT NULL DEFAULT 'active',
  video_url TEXT,
  video_submitted_at TIMESTAMPTZ,
  shipping_code TEXT,
  shipping_provider TEXT,
  receiver_name TEXT,
  receiver_phone TEXT,
  receiver_address TEXT,
  receiver_province TEXT,
  address_note TEXT,
  internal_note TEXT,
  client_note TEXT,
  revision_note TEXT,
  deadline_date DATE,
  sample_sent_at TIMESTAMPTZ,
  sample_received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, koc_id),
  UNIQUE (magic_link_token)
);

CREATE TABLE public.notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_koc_id UUID NOT NULL REFERENCES public.campaign_kocs(campaign_koc_id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  channel public.notification_channel NOT NULL DEFAULT 'zalo_manual',
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  status public.notification_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================
-- INDEXES
-- =====================

CREATE INDEX idx_campaigns_client_id ON public.campaigns(client_id);
CREATE INDEX idx_campaign_kocs_campaign_id ON public.campaign_kocs(campaign_id);
CREATE INDEX idx_campaign_kocs_koc_id ON public.campaign_kocs(koc_id);
CREATE INDEX idx_campaign_kocs_magic_link_token ON public.campaign_kocs(magic_link_token);
CREATE INDEX idx_campaign_kocs_operation_status ON public.campaign_kocs(operation_status);
CREATE INDEX idx_campaign_kocs_final_status ON public.campaign_kocs(final_status);
CREATE INDEX idx_notifications_campaign_koc_id ON public.notifications(campaign_koc_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_client_id ON public.profiles(client_id);
CREATE INDEX idx_kocs_status ON public.kocs(status);
CREATE INDEX idx_kocs_category ON public.kocs USING GIN(category);

-- =====================
-- HELPER FUNCTIONS
-- =====================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'super_admin';
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'operator';
$$;

CREATE OR REPLACE FUNCTION public.is_client()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'client';
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_internal_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('super_admin', 'admin', 'operator');
$$;

CREATE OR REPLACE FUNCTION public.current_user_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM public.profiles WHERE id = auth.uid();
$$;

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kocs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_kocs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_super_admin" ON public.profiles
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "profiles_insert_super_admin" ON public.profiles
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "profiles_update_super_admin" ON public.profiles
  FOR UPDATE USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "profiles_delete_super_admin" ON public.profiles
  FOR DELETE USING (public.is_super_admin());

-- clients
CREATE POLICY "clients_select_internal" ON public.clients
  FOR SELECT USING (public.is_internal_user());

CREATE POLICY "clients_select_own_client" ON public.clients
  FOR SELECT USING (public.is_client() AND client_id = public.current_user_client_id());

CREATE POLICY "clients_insert_admin" ON public.clients
  FOR INSERT WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "clients_update_admin" ON public.clients
  FOR UPDATE USING (public.is_admin_or_super_admin());

CREATE POLICY "clients_delete_super_admin" ON public.clients
  FOR DELETE USING (public.is_super_admin());

-- campaigns
CREATE POLICY "campaigns_select_internal" ON public.campaigns
  FOR SELECT USING (public.is_internal_user());

CREATE POLICY "campaigns_select_client" ON public.campaigns
  FOR SELECT USING (public.is_client() AND client_id = public.current_user_client_id());

CREATE POLICY "campaigns_insert_internal" ON public.campaigns
  FOR INSERT WITH CHECK (public.is_internal_user());

CREATE POLICY "campaigns_update_internal" ON public.campaigns
  FOR UPDATE USING (public.is_internal_user());

CREATE POLICY "campaigns_delete_admin" ON public.campaigns
  FOR DELETE USING (public.is_admin_or_super_admin());

-- kocs (client CANNOT select directly)
CREATE POLICY "kocs_select_internal" ON public.kocs
  FOR SELECT USING (public.is_internal_user());

CREATE POLICY "kocs_insert_admin" ON public.kocs
  FOR INSERT WITH CHECK (public.is_admin_or_super_admin());

CREATE POLICY "kocs_update_admin" ON public.kocs
  FOR UPDATE USING (public.is_admin_or_super_admin());

CREATE POLICY "kocs_delete_super_admin" ON public.kocs
  FOR DELETE USING (public.is_super_admin());

-- campaign_kocs
CREATE POLICY "campaign_kocs_select_internal" ON public.campaign_kocs
  FOR SELECT USING (public.is_internal_user());

CREATE POLICY "campaign_kocs_select_client" ON public.campaign_kocs
  FOR SELECT USING (
    public.is_client() AND campaign_id IN (
      SELECT campaign_id FROM public.campaigns
      WHERE client_id = public.current_user_client_id()
    )
  );

CREATE POLICY "campaign_kocs_insert_internal" ON public.campaign_kocs
  FOR INSERT WITH CHECK (public.is_internal_user());

CREATE POLICY "campaign_kocs_update_internal" ON public.campaign_kocs
  FOR UPDATE USING (public.is_internal_user());

CREATE POLICY "campaign_kocs_delete_admin" ON public.campaign_kocs
  FOR DELETE USING (public.is_admin_or_super_admin());

-- notifications
CREATE POLICY "notifications_select_internal" ON public.notifications
  FOR SELECT USING (public.is_internal_user());

CREATE POLICY "notifications_insert_internal" ON public.notifications
  FOR INSERT WITH CHECK (public.is_internal_user());

CREATE POLICY "notifications_update_internal" ON public.notifications
  FOR UPDATE USING (public.is_internal_user());

-- =====================
-- VIEWS
-- =====================

CREATE OR REPLACE VIEW public.client_campaign_kocs_view
WITH (security_invoker = true)
AS
SELECT
  c.campaign_id,
  c.campaign_name,
  ck.campaign_koc_id,
  ck.koc_id,
  k.name,
  k.avatar_url,
  k.tiktok_url,
  k.facebook_url,
  k.instagram_url,
  k.follower,
  k.category,
  k.location,
  ck.client_approval_status,
  ck.content_status,
  ck.video_url,
  ck.client_note,
  ck.deadline_date
FROM public.campaign_kocs ck
JOIN public.kocs k ON k.koc_id = ck.koc_id
JOIN public.campaigns c ON c.campaign_id = ck.campaign_id;

CREATE OR REPLACE VIEW public.koc_active_campaign_counts
AS
SELECT
  koc_id,
  COUNT(*) AS active_campaign_count
FROM public.campaign_kocs
WHERE final_status NOT IN ('completed', 'failed', 'dropped')
GROUP BY koc_id;

-- =====================
-- RPCs
-- =====================

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
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.campaign_kocs ck
    JOIN public.campaigns c ON c.campaign_id = ck.campaign_id
    WHERE ck.campaign_koc_id = p_campaign_koc_id
      AND c.client_id = public.current_user_client_id()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.campaign_kocs
  SET
    client_approval_status = p_status,
    client_note = COALESCE(p_note, client_note),
    updated_at = NOW()
  WHERE campaign_koc_id = p_campaign_koc_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_campaign_koc_by_token(p_token UUID)
RETURNS TABLE (
  campaign_koc_id UUID,
  campaign_name TEXT,
  koc_name TEXT,
  operation_status public.operation_status,
  address_status public.address_status,
  sample_status public.sample_status,
  content_status public.content_status,
  deadline_date DATE,
  revision_note TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ck.campaign_koc_id,
    c.campaign_name,
    k.name AS koc_name,
    ck.operation_status,
    ck.address_status,
    ck.sample_status,
    ck.content_status,
    ck.deadline_date,
    ck.revision_note
  FROM public.campaign_kocs ck
  JOIN public.campaigns c ON c.campaign_id = ck.campaign_id
  JOIN public.kocs k ON k.koc_id = ck.koc_id
  WHERE ck.magic_link_token = p_token
    AND ck.magic_link_expires_at > NOW();
END;
$$;

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
    operation_status = 'address_submitted',
    updated_at = NOW()
  WHERE campaign_koc_id = v_campaign_koc_id;
END;
$$;

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
  v_new_operation_status public.operation_status;
BEGIN
  SELECT campaign_koc_id INTO v_campaign_koc_id
  FROM public.campaign_kocs
  WHERE magic_link_token = p_token
    AND magic_link_expires_at > NOW();

  IF v_campaign_koc_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  v_new_operation_status := CASE p_status
    WHEN 'received' THEN 'sample_received'
    ELSE 'sample_sent'
  END;

  UPDATE public.campaign_kocs
  SET
    sample_status = p_status,
    operation_status = v_new_operation_status,
    sample_received_at = CASE WHEN p_status = 'received' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE campaign_koc_id = v_campaign_koc_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.koc_submit_video(
  p_token UUID,
  p_video_url TEXT,
  p_note TEXT DEFAULT NULL
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
    video_url = p_video_url,
    content_status = 'submitted',
    operation_status = 'video_submitted',
    video_submitted_at = NOW(),
    internal_note = CASE
      WHEN p_note IS NOT NULL THEN COALESCE(internal_note || E'\n', '') || '[KOC Note] ' || p_note
      ELSE internal_note
    END,
    updated_at = NOW()
  WHERE campaign_koc_id = v_campaign_koc_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_user_id UUID,
  p_new_role public.user_role,
  p_client_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: super_admin only';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Cannot change role of another super_admin';
  END IF;

  IF p_new_role = 'client' AND p_client_id IS NULL THEN
    RAISE EXCEPTION 'client_id is required when role is client';
  END IF;

  UPDATE public.profiles
  SET
    role = p_new_role,
    client_id = CASE WHEN p_new_role = 'client' THEN p_client_id ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- =====================
-- BOOTSTRAP SUPER ADMIN
-- =====================
INSERT INTO public.profiles (id, full_name, role, client_id)
SELECT
  id,
  'Vo Van Trong',
  'super_admin',
  NULL
FROM auth.users
WHERE email = 'vovantrong.89@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'super_admin', client_id = NULL, updated_at = NOW();

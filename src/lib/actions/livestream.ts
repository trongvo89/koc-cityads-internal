"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";
import type { ScriptSection } from "./ai-generation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AiHostListItem = {
  host_id: string;
  name: string;
  personality: string | null;
  voice_style: "calm" | "enthusiastic" | "humorous" | "professional" | null;
  selling_style: "soft_sell" | "hard_sell" | "educational" | "storytelling" | null;
  avatar_url: string | null;
  status: "active" | "inactive";
  created_at: string;
};

export type ProductListItem = {
  product_id: string;
  name: string;
  category: string | null;
  description: string | null;
  key_features: string[] | null;
  target_audience: string | null;
  price_range: string | null;
  usp: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  sourced_from: "manual" | "campaign";
  created_at: string;
};

export type ScriptListItem = {
  script_id: string;
  title: string;
  product_id: string | null;
  product_name: string | null;
  host_id: string | null;
  host_name: string | null;
  duration_minutes: number | null;
  status: "draft" | "approved" | "archived";
  ai_generated: boolean;
  created_at: string;
};

export type ScriptDetail = ScriptListItem & {
  brief: string | null;
  voice_id: string | null;
  script_sections: ScriptSection[];
};

export type SessionListItem = {
  session_id: string;
  title: string;
  platform: string;
  scheduled_at: string | null;
  status: "scheduled" | "live" | "completed" | "cancelled";
  host_id: string | null;
  host_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  script_id: string | null;
  gmv: number | null;
  created_at: string;
};

export type SessionDetail = SessionListItem & {
  rtmp_url: string | null;
  stream_key: string | null;
  stream_link: string | null;
  notes: string | null;
  started_at: string | null;
  ended_at: string | null;
  peak_viewers: number | null;
  total_orders: number | null;
  report_notes: string | null;
  script_title: string | null;
};

export type LivestreamOverview = {
  total_hosts: number;
  approved_scripts: number;
  sessions_this_week: number;
  total_gmv: number;
  upcoming_sessions: SessionListItem[];
};

// ─── Hosts ────────────────────────────────────────────────────────────────────

export async function getHosts(): Promise<ActionResult<AiHostListItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_hosts")
    .select("host_id, name, personality, voice_style, selling_style, avatar_url, status, created_at")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as AiHostListItem[] };
}

const hostSchema = z.object({
  name: z.string().min(1, "Tên host không được để trống"),
  generation_brief: z.string().optional(),
  personality: z.string().optional(),
  voice_style: z.enum(["calm", "enthusiastic", "humorous", "professional"]).optional(),
  selling_style: z.enum(["soft_sell", "hard_sell", "educational", "storytelling"]).optional(),
  avatar_url: z.string().url().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
});

export async function createHost(
  data: z.infer<typeof hostSchema>
): Promise<ActionResult<{ host_id: string }>> {
  const parsed = hostSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("ai_hosts")
    .insert({
      ...parsed.data,
      avatar_url: parsed.data.avatar_url || null,
    })
    .select("host_id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/livestream");
  revalidatePath("/admin/livestream/hosts");
  return { success: true, data: { host_id: row.host_id } };
}

export async function updateHost(
  host_id: string,
  data: Partial<z.infer<typeof hostSchema>>
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_hosts")
    .update({ ...data, avatar_url: data.avatar_url || null })
    .eq("host_id", host_id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/livestream/hosts");
  return { success: true, data: undefined };
}

export async function deleteHost(host_id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("ai_hosts").delete().eq("host_id", host_id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/livestream");
  revalidatePath("/admin/livestream/hosts");
  return { success: true, data: undefined };
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(): Promise<ActionResult<ProductListItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_knowledge")
    .select(
      "product_id, name, category, description, key_features, target_audience, price_range, usp, campaign_id, sourced_from, created_at, campaigns(campaign_name)"
    )
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  const rows = (data ?? []).map((p: Record<string, unknown>) => ({
    product_id: p.product_id as string,
    name: p.name as string,
    category: p.category as string | null,
    description: p.description as string | null,
    key_features: p.key_features as string[] | null,
    target_audience: p.target_audience as string | null,
    price_range: p.price_range as string | null,
    usp: p.usp as string | null,
    campaign_id: p.campaign_id as string | null,
    campaign_name: (p.campaigns as { campaign_name: string } | null)?.campaign_name ?? null,
    sourced_from: p.sourced_from as "manual" | "campaign",
    created_at: p.created_at as string,
  }));

  return { success: true, data: rows };
}

const productSchema = z.object({
  name: z.string().min(1, "Tên sản phẩm không được để trống"),
  category: z.string().optional(),
  description: z.string().optional(),
  key_features: z.array(z.string()).optional(),
  target_audience: z.string().optional(),
  price_range: z.string().optional(),
  usp: z.string().optional(),
  campaign_id: z.string().uuid().optional(),
  sourced_from: z.enum(["manual", "campaign"]).default("manual"),
});

export async function createProduct(
  data: z.infer<typeof productSchema>
): Promise<ActionResult<{ product_id: string }>> {
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("product_knowledge")
    .insert(parsed.data)
    .select("product_id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/livestream/products");
  return { success: true, data: { product_id: row.product_id } };
}

export async function importProductFromCampaign(
  campaign_id: string
): Promise<ActionResult<{ product_id: string }>> {
  const supabase = await createClient();

  const { data: campaign, error: ce } = await supabase
    .from("campaigns")
    .select("campaign_id, campaign_name, brief")
    .eq("campaign_id", campaign_id)
    .single();

  if (ce) return { success: false, error: ce.message };

  const { data: row, error } = await supabase
    .from("product_knowledge")
    .insert({
      name: campaign.campaign_name,
      description: campaign.brief ?? null,
      campaign_id: campaign.campaign_id,
      sourced_from: "campaign",
    })
    .select("product_id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/livestream/products");
  return { success: true, data: { product_id: row.product_id } };
}

export async function updateProduct(
  product_id: string,
  data: Partial<z.infer<typeof productSchema>>
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_knowledge")
    .update(data)
    .eq("product_id", product_id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/livestream/products");
  return { success: true, data: undefined };
}

export async function deleteProduct(product_id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_knowledge")
    .delete()
    .eq("product_id", product_id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/livestream/products");
  return { success: true, data: undefined };
}

// ─── Scripts ──────────────────────────────────────────────────────────────────

export async function getScripts(): Promise<ActionResult<ScriptListItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("live_scripts")
    .select(
      "script_id, title, product_id, host_id, duration_minutes, status, ai_generated, created_at, product_knowledge(name), ai_hosts(name)"
    )
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  const rows = (data ?? []).map((s: Record<string, unknown>) => ({
    script_id: s.script_id as string,
    title: s.title as string,
    product_id: s.product_id as string | null,
    product_name: (s.product_knowledge as { name: string } | null)?.name ?? null,
    host_id: s.host_id as string | null,
    host_name: (s.ai_hosts as { name: string } | null)?.name ?? null,
    duration_minutes: s.duration_minutes as number | null,
    status: s.status as "draft" | "approved" | "archived",
    ai_generated: s.ai_generated as boolean,
    created_at: s.created_at as string,
  }));

  return { success: true, data: rows };
}

export async function getScriptDetail(script_id: string): Promise<ActionResult<ScriptDetail>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("live_scripts")
    .select(
      "script_id, title, product_id, host_id, duration_minutes, status, ai_generated, brief, voice_id, script_sections, created_at, product_knowledge(name), ai_hosts(name)"
    )
    .eq("script_id", script_id)
    .single();

  if (error) return { success: false, error: error.message };

  const s = data as Record<string, unknown>;
  return {
    success: true,
    data: {
      script_id: s.script_id as string,
      title: s.title as string,
      product_id: s.product_id as string | null,
      product_name: (s.product_knowledge as { name: string } | null)?.name ?? null,
      host_id: s.host_id as string | null,
      host_name: (s.ai_hosts as { name: string } | null)?.name ?? null,
      duration_minutes: s.duration_minutes as number | null,
      status: s.status as "draft" | "approved" | "archived",
      ai_generated: s.ai_generated as boolean,
      brief: s.brief as string | null,
      voice_id: s.voice_id as string | null,
      script_sections: (s.script_sections as ScriptSection[]) ?? [],
      created_at: s.created_at as string,
    },
  };
}

const scriptSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống"),
  product_id: z.string().uuid().optional().nullable(),
  host_id: z.string().uuid().optional().nullable(),
  brief: z.string().optional(),
  duration_minutes: z.number().int().min(1).optional(),
});

export async function createScript(
  data: z.infer<typeof scriptSchema>
): Promise<ActionResult<{ script_id: string }>> {
  const parsed = scriptSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("live_scripts")
    .insert(parsed.data)
    .select("script_id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/livestream/scripts");
  return { success: true, data: { script_id: row.script_id } };
}

export async function updateScript(
  script_id: string,
  data: Partial<z.infer<typeof scriptSchema>> & { status?: "draft" | "approved" | "archived" }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("live_scripts")
    .update(data)
    .eq("script_id", script_id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/livestream/scripts/${script_id}`);
  revalidatePath("/admin/livestream/scripts");
  return { success: true, data: undefined };
}

export async function saveScriptSections(
  script_id: string,
  sections: ScriptSection[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("live_scripts")
    .update({ script_sections: sections })
    .eq("script_id", script_id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/livestream/scripts/${script_id}`);
  return { success: true, data: undefined };
}

export async function deleteScript(script_id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("live_scripts").delete().eq("script_id", script_id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/livestream/scripts");
  return { success: true, data: undefined };
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function getSessions(): Promise<ActionResult<SessionListItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("live_sessions")
    .select(
      "session_id, title, platform, scheduled_at, status, host_id, campaign_id, script_id, gmv, created_at, ai_hosts(name), campaigns(campaign_name)"
    )
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (error) return { success: false, error: error.message };

  const rows = (data ?? []).map((s: Record<string, unknown>) => ({
    session_id: s.session_id as string,
    title: s.title as string,
    platform: s.platform as string,
    scheduled_at: s.scheduled_at as string | null,
    status: s.status as "scheduled" | "live" | "completed" | "cancelled",
    host_id: s.host_id as string | null,
    host_name: (s.ai_hosts as { name: string } | null)?.name ?? null,
    campaign_id: s.campaign_id as string | null,
    campaign_name: (s.campaigns as { campaign_name: string } | null)?.campaign_name ?? null,
    script_id: s.script_id as string | null,
    gmv: s.gmv as number | null,
    created_at: s.created_at as string,
  }));

  return { success: true, data: rows };
}

export async function getSessionDetail(
  session_id: string
): Promise<ActionResult<SessionDetail>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("live_sessions")
    .select(
      "*, ai_hosts(name), campaigns(campaign_name), live_scripts(title)"
    )
    .eq("session_id", session_id)
    .single();

  if (error) return { success: false, error: error.message };

  const s = data as Record<string, unknown>;
  return {
    success: true,
    data: {
      session_id: s.session_id as string,
      title: s.title as string,
      platform: s.platform as string,
      scheduled_at: s.scheduled_at as string | null,
      status: s.status as "scheduled" | "live" | "completed" | "cancelled",
      host_id: s.host_id as string | null,
      host_name: (s.ai_hosts as { name: string } | null)?.name ?? null,
      campaign_id: s.campaign_id as string | null,
      campaign_name: (s.campaigns as { campaign_name: string } | null)?.campaign_name ?? null,
      script_id: s.script_id as string | null,
      script_title: (s.live_scripts as { title: string } | null)?.title ?? null,
      gmv: s.gmv as number | null,
      rtmp_url: s.rtmp_url as string | null,
      stream_key: s.stream_key as string | null,
      stream_link: s.stream_link as string | null,
      notes: s.notes as string | null,
      started_at: s.started_at as string | null,
      ended_at: s.ended_at as string | null,
      peak_viewers: s.peak_viewers as number | null,
      total_orders: s.total_orders as number | null,
      report_notes: s.report_notes as string | null,
      created_at: s.created_at as string,
    },
  };
}

const sessionSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống"),
  platform: z.enum(["tiktok", "shopee", "lazada", "facebook", "youtube", "other"]),
  scheduled_at: z.string().optional().nullable(),
  host_id: z.string().uuid().optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
  script_id: z.string().uuid().optional().nullable(),
  rtmp_url: z.string().optional().nullable(),
  stream_key: z.string().optional().nullable(),
  stream_link: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createSession(
  data: z.infer<typeof sessionSchema>
): Promise<ActionResult<{ session_id: string }>> {
  const parsed = sessionSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("live_sessions")
    .insert(parsed.data)
    .select("session_id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/livestream/sessions");
  revalidatePath("/admin/livestream");
  return { success: true, data: { session_id: row.session_id } };
}

export async function updateSession(
  session_id: string,
  data: Partial<z.infer<typeof sessionSchema>> & {
    status?: "scheduled" | "live" | "completed" | "cancelled";
    started_at?: string | null;
    ended_at?: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("live_sessions")
    .update(data)
    .eq("session_id", session_id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/livestream/sessions/${session_id}`);
  revalidatePath("/admin/livestream/sessions");
  revalidatePath("/admin/livestream");
  return { success: true, data: undefined };
}

export async function updateSessionReport(
  session_id: string,
  report: {
    peak_viewers?: number | null;
    total_orders?: number | null;
    gmv?: number | null;
    report_notes?: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("live_sessions")
    .update(report)
    .eq("session_id", session_id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/livestream/sessions/${session_id}`);
  revalidatePath("/admin/livestream");
  return { success: true, data: undefined };
}

export async function deleteSession(session_id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("live_sessions").delete().eq("session_id", session_id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/livestream/sessions");
  revalidatePath("/admin/livestream");
  return { success: true, data: undefined };
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export async function getLivestreamOverview(): Promise<ActionResult<LivestreamOverview>> {
  const supabase = await createClient();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const [hosts, scripts, sessions, gmvResult] = await Promise.all([
    supabase.from("ai_hosts").select("host_id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("live_scripts").select("script_id", { count: "exact", head: true }).eq("status", "approved"),
    supabase
      .from("live_sessions")
      .select("session_id", { count: "exact", head: true })
      .gte("scheduled_at", weekStart.toISOString())
      .lt("scheduled_at", weekEnd.toISOString()),
    supabase
      .from("live_sessions")
      .select("gmv")
      .eq("status", "completed")
      .not("gmv", "is", null),
  ]);

  const totalGmv = (gmvResult.data ?? []).reduce(
    (sum, s) => sum + Number(s.gmv ?? 0),
    0
  );

  const { data: upcoming } = await supabase
    .from("live_sessions")
    .select(
      "session_id, title, platform, scheduled_at, status, host_id, campaign_id, script_id, gmv, created_at, ai_hosts(name), campaigns(campaign_name)"
    )
    .in("status", ["scheduled", "live"])
    .order("scheduled_at", { ascending: true })
    .limit(5);

  const upcomingRows: SessionListItem[] = (upcoming ?? []).map((s: Record<string, unknown>) => ({
    session_id: s.session_id as string,
    title: s.title as string,
    platform: s.platform as string,
    scheduled_at: s.scheduled_at as string | null,
    status: s.status as "scheduled" | "live" | "completed" | "cancelled",
    host_id: s.host_id as string | null,
    host_name: (s.ai_hosts as { name: string } | null)?.name ?? null,
    campaign_id: s.campaign_id as string | null,
    campaign_name: (s.campaigns as { campaign_name: string } | null)?.campaign_name ?? null,
    script_id: s.script_id as string | null,
    gmv: s.gmv as number | null,
    created_at: s.created_at as string,
  }));

  return {
    success: true,
    data: {
      total_hosts: hosts.count ?? 0,
      approved_scripts: scripts.count ?? 0,
      sessions_this_week: sessions.count ?? 0,
      total_gmv: totalGmv,
      upcoming_sessions: upcomingRows,
    },
  };
}

// ─── Helpers for dropdowns ────────────────────────────────────────────────────

export async function getHostsForSelect(): Promise<{ host_id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_hosts")
    .select("host_id, name")
    .eq("status", "active")
    .order("name");
  return (data ?? []) as { host_id: string; name: string }[];
}

export async function getProductsForSelect(): Promise<{ product_id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_knowledge")
    .select("product_id, name")
    .order("name");
  return (data ?? []) as { product_id: string; name: string }[];
}

export async function getScriptsForSelect(): Promise<{ script_id: string; title: string; status: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("live_scripts")
    .select("script_id, title, status")
    .neq("status", "archived")
    .order("title");
  return (data ?? []) as { script_id: string; title: string; status: string }[];
}

// ─── Teleprompter (public — no RTMP credentials) ──────────────────────────────

export type TeleprompterData = {
  session_id: string;
  title: string;
  platform: string;
  status: string;
  host_name: string | null;
  script_title: string | null;
  sections: ScriptSection[];
};

export async function getTeleprompterData(
  session_id: string
): Promise<ActionResult<TeleprompterData>> {
  // Service client bypasses RLS — safe here because we return no sensitive fields
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("live_sessions")
    .select("session_id, title, platform, status, ai_hosts(name), live_scripts(title, script_sections)")
    .eq("session_id", session_id)
    .single();

  if (error) return { success: false, error: error.message };

  const s = data as Record<string, unknown>;
  const script = s.live_scripts as { title: string; script_sections: ScriptSection[] } | null;

  return {
    success: true,
    data: {
      session_id: s.session_id as string,
      title: s.title as string,
      platform: s.platform as string,
      status: s.status as string,
      host_name: (s.ai_hosts as { name: string } | null)?.name ?? null,
      script_title: script?.title ?? null,
      sections: script?.script_sections ?? [],
    },
  };
}

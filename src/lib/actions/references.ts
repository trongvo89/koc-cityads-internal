"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";
import type { ReferenceKnowledgeType } from "./reference-constants";
// Re-export type only — constants must be imported from reference-constants directly
export type { ReferenceKnowledgeType } from "./reference-constants";

export type ReferenceStatus = "uploaded" | "processing" | "transcribed" | "analyzed" | "failed";

export type ReferenceMaterial = {
  id: string;
  title: string;
  description: string | null;
  knowledge_type: ReferenceKnowledgeType;
  source_type: "video" | "audio" | "text";
  source_platform: string | null;
  storage_path: string | null;
  original_filename: string | null;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  product_id: string | null;
  campaign_id: string | null;
  category: string | null;
  tags: string[] | null;
  status: ReferenceStatus;
  error_message: string | null;
  created_at: string;
  // Joined
  product_name: string | null;
};

export type ReferenceInsightData = {
  opening_hooks: string[];
  selling_techniques: { technique: string; example: string; effectiveness: string }[];
  engagement_patterns: { pattern: string; example: string }[];
  product_presentation_flow: string[];
  cta_styles: { style: string; example: string }[];
  audience_interaction: { type: string; example: string }[];
  tone_and_energy: {
    overall_tone: string;
    energy_level: string;
    language_register: string;
    notable_phrases: string[];
  };
  objection_handling: { objection: string; response: string }[];
  urgency_tactics: string[];
  summary: string;
  quality_score: number;
};

export type ReferenceInsight = {
  id: string;
  reference_id: string;
  transcript_id: string | null;
  insight_data: ReferenceInsightData;
  category: string | null;
  tags: string[] | null;
  is_approved: boolean;
  notes: string | null;
  created_at: string;
};

export type ReferenceDetail = ReferenceMaterial & {
  transcript: {
    id: string;
    full_text: string;
    word_count: number | null;
    transcription_provider: string;
    created_at: string;
  } | null;
  insight: ReferenceInsight | null;
};

// Knowledge items for script generation — type-aware
export type ReferenceKnowledgeItem = {
  id: string;
  title: string;
  knowledge_type: ReferenceKnowledgeType;
  insight_data?: ReferenceInsightData; // koc_insight only
  raw_text?: string; // all non-koc_insight types
};

// ─── List ──────────────────────────────────────────────────────────────────────

export async function getReferences(): Promise<ActionResult<ReferenceMaterial[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reference_materials" as any)
    .select("*, product_knowledge(name)")
    .order("created_at", { ascending: false }) as any;

  if (error) return { success: false, error: error.message };

  const items: ReferenceMaterial[] = (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    knowledge_type: (r.knowledge_type ?? "koc_insight") as ReferenceKnowledgeType,
    source_type: r.source_type,
    source_platform: r.source_platform,
    storage_path: r.storage_path,
    original_filename: r.original_filename,
    file_size_bytes: r.file_size_bytes,
    duration_seconds: r.duration_seconds,
    product_id: r.product_id,
    campaign_id: r.campaign_id,
    category: r.category,
    tags: r.tags,
    status: r.status,
    error_message: r.error_message,
    created_at: r.created_at,
    product_name: r.product_knowledge?.name ?? null,
  }));

  return { success: true, data: items };
}

// ─── Detail ────────────────────────────────────────────────────────────────────

export async function getReferenceDetail(id: string): Promise<ActionResult<ReferenceDetail>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reference_materials" as any)
    .select(`
      *,
      product_knowledge(name),
      reference_transcripts(*),
      reference_insights(*)
    `)
    .eq("id", id)
    .single() as any;

  if (error) return { success: false, error: error.message };

  const transcripts: any[] = data.reference_transcripts ?? [];
  const insights: any[] = data.reference_insights ?? [];

  const detail: ReferenceDetail = {
    id: data.id,
    title: data.title,
    description: data.description,
    knowledge_type: (data.knowledge_type ?? "koc_insight") as ReferenceKnowledgeType,
    source_type: data.source_type,
    source_platform: data.source_platform,
    storage_path: data.storage_path,
    original_filename: data.original_filename,
    file_size_bytes: data.file_size_bytes,
    duration_seconds: data.duration_seconds,
    product_id: data.product_id,
    campaign_id: data.campaign_id,
    category: data.category,
    tags: data.tags,
    status: data.status,
    error_message: data.error_message,
    created_at: data.created_at,
    product_name: data.product_knowledge?.name ?? null,
    transcript: transcripts[0]
      ? {
          id: transcripts[0].id,
          full_text: transcripts[0].full_text,
          word_count: transcripts[0].word_count,
          transcription_provider: transcripts[0].transcription_provider,
          created_at: transcripts[0].created_at,
        }
      : null,
    insight: insights[0]
      ? {
          id: insights[0].id,
          reference_id: insights[0].reference_id,
          transcript_id: insights[0].transcript_id,
          insight_data: insights[0].insight_data as ReferenceInsightData,
          category: insights[0].category,
          tags: insights[0].tags,
          is_approved: insights[0].is_approved,
          notes: insights[0].notes,
          created_at: insights[0].created_at,
        }
      : null,
  };

  return { success: true, data: detail };
}

// ─── Create (file upload) ──────────────────────────────────────────────────────

export async function createReferenceFromFile(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const title = (formData.get("title") as string)?.trim();
  if (!title) return { success: false, error: "Tiêu đề không được để trống" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { success: false, error: "Vui lòng chọn file" };

  const maxSize = 500 * 1024 * 1024; // 500MB
  if (file.size > maxSize) return { success: false, error: "File không được lớn hơn 500MB" };

  const knowledge_type = (formData.get("knowledge_type") as ReferenceKnowledgeType) || "koc_insight";
  const source_platform = (formData.get("source_platform") as string) || null;
  const category = (formData.get("category") as string)?.trim() || null;
  const product_id = (formData.get("product_id") as string) || null;
  const campaign_id = (formData.get("campaign_id") as string) || null;
  const tagsRaw = (formData.get("tags") as string)?.trim() || "";
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : null;

  const mime = file.type;
  const source_type: "video" | "audio" | "text" =
    mime.startsWith("video/") ? "video" :
    mime.startsWith("audio/") ? "audio" : "video";

  const serviceClient = await createServiceClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const storagePath = `references/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error: uploadErr } = await serviceClient.storage
    .from("live-video")
    .upload(storagePath, buffer, { contentType: mime, upsert: false });

  if (uploadErr) return { success: false, error: `Upload lỗi: ${uploadErr.message}` };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("reference_materials" as any)
    .insert({
      title,
      knowledge_type,
      source_type,
      source_platform: source_platform || null,
      storage_path: storagePath,
      original_filename: file.name,
      file_size_bytes: file.size,
      category,
      product_id: product_id || null,
      campaign_id: campaign_id || null,
      tags,
      status: "uploaded",
      created_by: user?.id,
    })
    .select("id")
    .single() as any;

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/livestream/references");
  return { success: true, data: { id: data.id } };
}

// ─── Create (paste text) ──────────────────────────────────────────────────────

export async function createReferenceFromText(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const title = (formData.get("title") as string)?.trim();
  if (!title) return { success: false, error: "Tiêu đề không được để trống" };

  const text = (formData.get("text") as string)?.trim();
  if (!text || text.length < 20)
    return { success: false, error: "Nội dung cần ít nhất 20 ký tự" };

  const knowledge_type = (formData.get("knowledge_type") as ReferenceKnowledgeType) || "koc_insight";
  const source_platform = (formData.get("source_platform") as string) || null;
  const category = (formData.get("category") as string)?.trim() || null;
  const product_id = (formData.get("product_id") as string) || null;
  const campaign_id = (formData.get("campaign_id") as string) || null;
  const tagsRaw = (formData.get("tags") as string)?.trim() || "";
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : null;

  // Non-koc_insight text goes straight to analyzed — no AI processing needed, raw text IS the knowledge
  const initialStatus = knowledge_type === "koc_insight" ? "transcribed" : "analyzed";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: matData, error: matErr } = await supabase
    .from("reference_materials" as any)
    .insert({
      title,
      knowledge_type,
      source_type: "text",
      source_platform: source_platform || null,
      category,
      product_id: product_id || null,
      campaign_id: campaign_id || null,
      tags,
      status: initialStatus,
      created_by: user?.id,
    })
    .select("id")
    .single() as any;

  if (matErr) return { success: false, error: matErr.message };

  const referenceId = matData.id;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const { error: transcriptErr } = await supabase
    .from("reference_transcripts" as any)
    .insert({
      reference_id: referenceId,
      full_text: text,
      word_count: wordCount,
      transcription_provider: "manual",
    }) as any;

  if (transcriptErr) return { success: false, error: transcriptErr.message };

  revalidatePath("/admin/livestream/references");
  return { success: true, data: { id: referenceId } };
}

// ─── Delete ────────────────────────────────────────────────────────────────────

export async function deleteReference(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: mat } = await supabase
    .from("reference_materials" as any)
    .select("storage_path")
    .eq("id", id)
    .single() as any;

  if (mat?.storage_path) {
    const serviceClient = await createServiceClient();
    await serviceClient.storage.from("live-video").remove([mat.storage_path]);
  }

  const { error } = await supabase
    .from("reference_materials" as any)
    .delete()
    .eq("id", id) as any;

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/livestream/references");
  return { success: true, data: undefined };
}

// ─── Get knowledge for script generation (type-aware) ─────────────────────────

export async function getInsightsForReferences(
  ids: string[]
): Promise<ActionResult<ReferenceKnowledgeItem[]>> {
  if (ids.length === 0) return { success: true, data: [] };

  const supabase = await createClient();

  // Fetch material metadata + transcripts + insights in one joined query
  const { data, error } = await supabase
    .from("reference_materials" as any)
    .select(`
      id, title, knowledge_type,
      reference_transcripts(full_text),
      reference_insights(insight_data)
    `)
    .in("id", ids)
    .eq("status", "analyzed") as any;

  if (error) return { success: false, error: error.message };

  const items: ReferenceKnowledgeItem[] = (data ?? []).map((row: any) => {
    const kt: ReferenceKnowledgeType = row.knowledge_type ?? "koc_insight";
    const transcripts: any[] = row.reference_transcripts ?? [];
    const insights: any[] = row.reference_insights ?? [];

    const item: ReferenceKnowledgeItem = {
      id: row.id,
      title: row.title,
      knowledge_type: kt,
    };

    if (kt === "koc_insight" && insights[0]) {
      item.insight_data = insights[0].insight_data as ReferenceInsightData;
    } else if (transcripts[0]) {
      item.raw_text = transcripts[0].full_text as string;
    }

    return item;
  });

  return { success: true, data: items };
}

// ─── Get approved scripts by category (for few-shot examples) ─────────────────

export async function getApprovedScriptsByCategory(
  category: string | null,
  limit = 2
): Promise<ActionResult<{ title: string; sections: { section_type: string; content: string }[] }[]>> {
  const supabase = await createClient();

  let query = supabase
    .from("live_scripts" as any)
    .select(`
      title,
      script_sections,
      product_knowledge!inner(category)
    `)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit) as any;

  if (category) {
    query = query.eq("product_knowledge.category", category);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };

  const items = (data ?? []).map((row: any) => ({
    title: row.title,
    sections: ((row.script_sections as any[]) ?? []).map((s: any) => ({
      section_type: s.section_type,
      content: (s.content as string).slice(0, 300),
    })),
  }));

  return { success: true, data: items };
}

// ─── Update status (called from API routes) ───────────────────────────────────

export async function updateReferenceStatus(
  id: string,
  status: ReferenceStatus,
  error_message?: string
): Promise<ActionResult> {
  const serviceClient = await createServiceClient();
  const { error } = await serviceClient
    .from("reference_materials" as any)
    .update({ status, error_message: error_message ?? null })
    .eq("id", id) as any;

  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/livestream/references`);
  return { success: true, data: undefined };
}

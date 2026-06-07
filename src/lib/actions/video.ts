"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";
import type { ScriptSection } from "./ai-generation";

const HEYGEN_BASE = "https://api.heygen.com";

function heygenHeaders() {
  return {
    "X-Api-Key": process.env.HEYGEN_API_KEY!,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type HeyGenAvatar = {
  avatar_id: string;
  avatar_name: string;
  preview_image_url: string | null;
  gender: string | null;
};

export type VideoGenerationStatus = {
  video_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  video_url: string | null;
  error: string | null;
};

// ─── List avatars ───────────────────────────────────────────────────────────

export async function getHeyGenAvatars(): Promise<ActionResult<HeyGenAvatar[]>> {
  if (!process.env.HEYGEN_API_KEY) {
    return { success: false, error: "HEYGEN_API_KEY chưa được cấu hình" };
  }

  const res = await fetch(`${HEYGEN_BASE}/v2/avatars`, {
    headers: heygenHeaders(),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return { success: false, error: `HeyGen API lỗi ${res.status}` };
  }

  const json = await res.json() as { data?: { avatars?: Record<string, unknown>[] } };
  const avatars: HeyGenAvatar[] = (json.data?.avatars ?? []).map((a) => ({
    avatar_id: a.avatar_id as string,
    avatar_name: a.avatar_name as string,
    preview_image_url: (a.preview_image_url as string) ?? null,
    gender: (a.gender as string) ?? null,
  }));

  return { success: true, data: avatars };
}

// ─── Generate video for a single section ────────────────────────────────────

export async function generateSectionVideo(
  script_id: string,
  section_index: number,
  avatar_id: string
): Promise<ActionResult<{ video_id: string }>> {
  if (!process.env.HEYGEN_API_KEY) {
    return { success: false, error: "HEYGEN_API_KEY chưa được cấu hình" };
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scriptRow, error: fetchErr } = await (supabase
    .from("live_scripts")
    .select("script_sections")
    .eq("script_id", script_id)
    .single() as any);

  if (fetchErr) return { success: false, error: (fetchErr as { message: string }).message };

  const sections = (scriptRow.script_sections as ScriptSection[]) ?? [];
  const section = sections[section_index];
  if (!section) return { success: false, error: "Section không tồn tại" };

  // Determine input: use audio_url if exists, otherwise use text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let voiceInput: any;
  if (section.audio_url) {
    voiceInput = { type: "audio", audio_url: section.audio_url };
  } else {
    voiceInput = {
      type: "text",
      input_text: section.content,
      voice_id: "vi-VN-HoaiMyNeural",
    };
  }

  const body = {
    video_inputs: [
      {
        character: { type: "avatar", avatar_id, avatar_style: "normal" },
        voice: voiceInput,
      },
    ],
    dimension: { width: 1080, height: 1920 },
  };

  const res = await fetch(`${HEYGEN_BASE}/v2/video/generate`, {
    method: "POST",
    headers: heygenHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { success: false, error: `HeyGen lỗi ${res.status}: ${errText.slice(0, 300)}` };
  }

  const json = await res.json() as { data?: { video_id?: string } };
  const videoId = json.data?.video_id;
  if (!videoId) return { success: false, error: "HeyGen không trả về video_id" };

  // Save heygen_video_id to section
  sections[section_index] = { ...sections[section_index], heygen_video_id: videoId };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase
    .from("live_scripts")
    .update({ script_sections: sections } as any)
    .eq("script_id", script_id) as any);

  revalidatePath(`/admin/livestream/scripts/${script_id}`);
  return { success: true, data: { video_id: videoId } };
}

// ─── Check video status ─────────────────────────────────────────────────────

export async function checkSectionVideoStatus(
  script_id: string,
  section_index: number
): Promise<ActionResult<VideoGenerationStatus>> {
  if (!process.env.HEYGEN_API_KEY) {
    return { success: false, error: "HEYGEN_API_KEY chưa được cấu hình" };
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scriptRow, error: fetchErr } = await (supabase
    .from("live_scripts")
    .select("script_sections")
    .eq("script_id", script_id)
    .single() as any);

  if (fetchErr) return { success: false, error: (fetchErr as { message: string }).message };

  const sections = (scriptRow.script_sections as ScriptSection[]) ?? [];
  const section = sections[section_index];
  if (!section?.heygen_video_id) {
    return { success: false, error: "Section chưa có video đang render" };
  }

  const res = await fetch(
    `${HEYGEN_BASE}/v1/video_status.get?video_id=${section.heygen_video_id}`,
    { headers: heygenHeaders(), cache: "no-store" }
  );

  if (!res.ok) {
    return { success: false, error: `HeyGen status lỗi ${res.status}` };
  }

  const json = await res.json() as { data?: Record<string, unknown> };
  const d = json.data ?? {};
  const status = d.status as string;

  const result: VideoGenerationStatus = {
    video_id: section.heygen_video_id,
    status: (["pending", "processing", "completed", "failed"].includes(status) ? status : "processing") as VideoGenerationStatus["status"],
    video_url: (d.video_url as string) ?? null,
    error: (d.error as string) ?? null,
  };

  // If completed, save video_url to section
  if (result.status === "completed" && result.video_url) {
    sections[section_index] = {
      ...sections[section_index],
      video_url: result.video_url,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase
      .from("live_scripts")
      .update({ script_sections: sections } as any)
      .eq("script_id", script_id) as any);

    revalidatePath(`/admin/livestream/scripts/${script_id}`);
  }

  return { success: true, data: result };
}

// ─── Generate all section videos ────────────────────────────────────────────

export async function generateAllSectionVideos(
  script_id: string,
  avatar_id: string
): Promise<ActionResult<{ submitted: number; errors: string[] }>> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scriptRow, error: fetchErr } = await (supabase
    .from("live_scripts")
    .select("script_sections")
    .eq("script_id", script_id)
    .single() as any);

  if (fetchErr) return { success: false, error: (fetchErr as { message: string }).message };

  const sections = (scriptRow.script_sections as ScriptSection[]) ?? [];
  let submitted = 0;
  const errors: string[] = [];

  for (let i = 0; i < sections.length; i++) {
    // Skip sections that already have a completed video
    if (sections[i].video_url) { submitted++; continue; }

    const result = await generateSectionVideo(script_id, i, avatar_id);
    if (result.success) submitted++;
    else errors.push(`Section ${i + 1}: ${result.error}`);
  }

  return { success: true, data: { submitted, errors } };
}

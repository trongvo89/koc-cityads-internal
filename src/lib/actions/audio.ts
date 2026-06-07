"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";
import type { ScriptSection } from "./ai-generation";

export type ElevenLabsVoice = {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string | null;
};

export async function getElevenLabsVoices(): Promise<ActionResult<ElevenLabsVoice[]>> {
  if (!process.env.ELEVENLABS_API_KEY) {
    return { success: false, error: "ELEVENLABS_API_KEY chưa được cấu hình" };
  }

  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return { success: false, error: "Không thể lấy danh sách giọng ElevenLabs" };

  const data = await res.json() as { voices: Record<string, unknown>[] };
  const voices: ElevenLabsVoice[] = (data.voices ?? []).map((v) => ({
    voice_id: v.voice_id as string,
    name: v.name as string,
    category: (v.category as string) ?? "premade",
    labels: (v.labels as Record<string, string>) ?? {},
    preview_url: (v.preview_url as string | null) ?? null,
  }));

  return { success: true, data: voices };
}

export async function generateSectionAudio(
  script_id: string,
  section_index: number,
  content: string,
  voice_id: string
): Promise<ActionResult<{ audio_url: string }>> {
  if (!process.env.ELEVENLABS_API_KEY) {
    return { success: false, error: "ELEVENLABS_API_KEY chưa được cấu hình" };
  }
  if (!content.trim()) return { success: false, error: "Nội dung section trống" };

  // Generate audio via ElevenLabs
  const ttsRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
    {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: content,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
      }),
    }
  );

  if (!ttsRes.ok) {
    const errText = await ttsRes.text();
    return { success: false, error: `ElevenLabs lỗi ${ttsRes.status}: ${errText.slice(0, 200)}` };
  }

  const audioBuffer = await ttsRes.arrayBuffer();
  const fileName = `scripts/${script_id}/${section_index}_${Date.now()}.mp3`;

  // Upload to Supabase Storage (service client to bypass RLS)
  const supabase = await createServiceClient();
  const { error: uploadError } = await supabase.storage
    .from("live-audio")
    .upload(fileName, audioBuffer, { contentType: "audio/mpeg", upsert: true });

  if (uploadError) return { success: false, error: `Upload lỗi: ${uploadError.message}` };

  const { data: { publicUrl } } = supabase.storage.from("live-audio").getPublicUrl(fileName);

  // Update section audio_url in JSONB array
  const client = await createClient();
  const { data: scriptRow, error: fetchErr } = await client
    .from("live_scripts")
    .select("script_sections")
    .eq("script_id", script_id)
    .single();

  if (fetchErr) return { success: false, error: fetchErr.message };

  const sections = (scriptRow.script_sections as ScriptSection[]) ?? [];
  if (!sections[section_index]) return { success: false, error: "Section không tồn tại" };

  sections[section_index] = { ...sections[section_index], audio_url: publicUrl };

  const { error: updateErr } = await client
    .from("live_scripts")
    .update({ script_sections: sections })
    .eq("script_id", script_id);

  if (updateErr) return { success: false, error: updateErr.message };

  revalidatePath(`/admin/livestream/scripts/${script_id}`);
  return { success: true, data: { audio_url: publicUrl } };
}

export async function generateAllSectionsAudio(
  script_id: string,
  sections: ScriptSection[],
  voice_id: string
): Promise<ActionResult<{ results: { index: number; success: boolean; audio_url?: string; error?: string }[] }>> {
  const results: { index: number; success: boolean; audio_url?: string; error?: string }[] = [];

  for (let i = 0; i < sections.length; i++) {
    const r = await generateSectionAudio(script_id, i, sections[i].content, voice_id);
    if (r.success) {
      results.push({ index: i, success: true, audio_url: r.data.audio_url });
    } else {
      results.push({ index: i, success: false, error: r.error });
    }
  }

  return { success: true, data: { results } };
}

export async function updateScriptVoice(
  script_id: string,
  voice_id: string
): Promise<ActionResult> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from("live_scripts")
    .update({ voice_id } as any)
    .eq("script_id", script_id) as any);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/livestream/scripts/${script_id}`);
  return { success: true, data: undefined };
}

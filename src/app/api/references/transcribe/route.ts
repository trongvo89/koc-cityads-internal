import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { reference_id } = await req.json() as { reference_id: string };
  if (!reference_id) {
    return NextResponse.json({ error: "reference_id required" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY chưa được cấu hình" }, { status: 500 });
  }

  const supabase = await createServiceClient();

  // Mark as processing
  await supabase
    .from("reference_materials" as any)
    .update({ status: "processing", error_message: null })
    .eq("id", reference_id);

  // Fetch the reference record
  const { data: ref, error: refErr } = await supabase
    .from("reference_materials" as any)
    .select("storage_path, original_filename, source_type")
    .eq("id", reference_id)
    .single() as any;

  if (refErr || !ref?.storage_path) {
    await supabase
      .from("reference_materials" as any)
      .update({ status: "failed", error_message: "Không tìm thấy file" })
      .eq("id", reference_id);
    return NextResponse.json({ error: "Reference not found or no storage_path" }, { status: 404 });
  }

  try {
    // Download file from Supabase Storage
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("live-video")
      .download(ref.storage_path);

    if (downloadErr || !fileData) {
      throw new Error(`Download lỗi: ${downloadErr?.message ?? "empty file"}`);
    }

    const fileBuffer = await fileData.arrayBuffer();
    const fileSizeBytes = fileBuffer.byteLength;
    const maxWhisperBytes = 24 * 1024 * 1024; // 24MB safety limit

    let fullText = "";
    let segments: { start: number; end: number; text: string }[] = [];

    if (fileSizeBytes <= maxWhisperBytes) {
      // Single call
      const result = await callWhisper(fileBuffer, ref.original_filename ?? "audio.mp3");
      fullText = result.text;
      segments = result.segments ?? [];
    } else {
      // Chunk into ~20MB pieces (by byte range)
      const chunkSize = 20 * 1024 * 1024;
      const chunks = Math.ceil(fileSizeBytes / chunkSize);
      let timeOffset = 0;

      for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = Math.min((i + 1) * chunkSize, fileSizeBytes);
        const chunk = fileBuffer.slice(start, end);
        const ext = (ref.original_filename ?? "audio.mp3").split(".").pop() ?? "mp3";
        const result = await callWhisper(chunk, `chunk_${i}.${ext}`);
        fullText += (i > 0 ? " " : "") + result.text;
        const chunkSegs = (result.segments ?? []).map((s: any) => ({
          start: s.start + timeOffset,
          end: s.end + timeOffset,
          text: s.text,
        }));
        segments.push(...chunkSegs);
        // Estimate time offset from last segment
        if (chunkSegs.length > 0) {
          timeOffset = chunkSegs[chunkSegs.length - 1].end;
        } else {
          // Rough estimate: ~128kbps audio
          timeOffset += (chunkSize / (128 * 1024 / 8));
        }
      }
    }

    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    // Save transcript
    const { data: transcriptRow, error: insertErr } = await supabase
      .from("reference_transcripts" as any)
      .insert({
        reference_id,
        full_text: fullText,
        word_count: wordCount,
        segments: segments.length > 0 ? segments : null,
        transcription_provider: "openai_whisper",
      })
      .select("id")
      .single() as any;

    if (insertErr) throw new Error(insertErr.message);

    // Update status to transcribed — user manually triggers analysis to control cost
    await supabase
      .from("reference_materials" as any)
      .update({ status: "transcribed", error_message: null })
      .eq("id", reference_id);

    return NextResponse.json({ success: true, transcript_id: transcriptRow.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("reference_materials" as any)
      .update({ status: "failed", error_message: msg.slice(0, 500) })
      .eq("id", reference_id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function callWhisper(
  buffer: ArrayBuffer,
  filename: string
): Promise<{ text: string; segments?: any[] }> {
  const formData = new FormData();
  const blob = new Blob([buffer]);
  formData.append("file", blob, filename);
  formData.append("model", "whisper-1");
  formData.append("language", "vi");
  formData.append("response_format", "verbose_json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Whisper lỗi ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json() as { text: string; segments?: any[] };
  return data;
}

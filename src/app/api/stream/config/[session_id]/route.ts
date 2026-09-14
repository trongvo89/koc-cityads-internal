import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { ScriptSection } from "@/lib/actions/ai-generation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  const secret = request.headers.get("x-stream-secret");
  if (secret !== process.env.STREAM_WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { session_id } = await params;
  const supabase = await createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("live_sessions")
    .select("*, live_scripts(script_sections, title, render_mode)")
    .eq("session_id", session_id)
    .single() as any);

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const s = data as Record<string, unknown>;
  const script = s.live_scripts as {
    script_sections: ScriptSection[];
    title: string;
    render_mode?: "avatar" | "image_voice" | null;
  } | null;
  const sections = script?.script_sections ?? [];
  const renderMode = script?.render_mode ?? "avatar";

  // avatar mode: pre-rendered section videos (HeyGen), concatenated as-is.
  const videoUrls = sections
    .filter((sec) => sec.video_url)
    .map((sec) => sec.video_url as string);

  // image_voice mode: the worker builds each segment from image + TTS audio.
  const segments = sections
    .filter((sec) => sec.image_url && sec.audio_url)
    .map((sec) => ({
      image_url: sec.image_url as string,
      audio_url: sec.audio_url as string,
      product_name: sec.product_name ?? null,
      shopee_item_id: sec.shopee_item_id ?? null,
    }));

  return NextResponse.json({
    session_id: s.session_id,
    title: s.title,
    platform: s.platform,
    rtmp_url: s.rtmp_url,
    stream_key: s.stream_key,
    loop: s.loop_video ?? true,
    stream_status: s.stream_status,
    render_mode: renderMode,
    video_urls: videoUrls,
    segments,
    script_title: script?.title ?? null,
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/app.types";

export async function prepareStream(session_id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session, error: fetchErr } = await (supabase
    .from("live_sessions")
    .select("session_id, rtmp_url, stream_key, script_id")
    .eq("session_id", session_id)
    .single() as any);

  if (fetchErr) return { success: false, error: (fetchErr as { message: string }).message };

  const s = session as Record<string, unknown>;
  if (!s.rtmp_url) return { success: false, error: "Chưa nhập RTMP URL" };
  if (!s.stream_key) return { success: false, error: "Chưa nhập Stream Key" };
  if (!s.script_id) return { success: false, error: "Chưa gắn kịch bản vào phiên" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (supabase
    .from("live_sessions")
    .update({
      stream_status: "preparing",
      stream_error: null,
    } as any)
    .eq("session_id", session_id) as any);

  if (updateErr) return { success: false, error: (updateErr as { message: string }).message };

  revalidatePath(`/admin/livestream/sessions/${session_id}`);
  return { success: true, data: undefined };
}

export async function stopStream(session_id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from("live_sessions")
    .update({
      stream_status: "stopped",
      stream_stopped_at: new Date().toISOString(),
    } as any)
    .eq("session_id", session_id) as any);

  if (error) return { success: false, error: (error as { message: string }).message };

  revalidatePath(`/admin/livestream/sessions/${session_id}`);
  return { success: true, data: undefined };
}

export async function resetStream(session_id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from("live_sessions")
    .update({
      stream_status: "idle",
      stream_error: null,
      stream_worker_id: null,
    } as any)
    .eq("session_id", session_id) as any);

  if (error) return { success: false, error: (error as { message: string }).message };

  revalidatePath(`/admin/livestream/sessions/${session_id}`);
  return { success: true, data: undefined };
}

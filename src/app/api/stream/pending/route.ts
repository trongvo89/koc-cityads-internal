import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Polled by the stream worker: returns sessions the operator has marked
// "preparing" (via the AI Stream Engine button) that are ready to broadcast.
// Secret-authed the same way as /api/stream/config and /api/stream/status.
export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-stream-secret");
  if (secret !== process.env.STREAM_WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  // stream_status / stream_started_at are drifted columns not in generated
  // types, so query through an untyped client (same pattern as stream.ts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from("live_sessions")
    .select("session_id, rtmp_url, stream_key, script_id, stream_status")
    .eq("stream_status", "preparing")
    .order("stream_started_at", { ascending: true, nullsFirst: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data as Record<string, unknown>[]) ?? [];
  const pending = rows
    .filter((s) => s.rtmp_url && s.stream_key && s.script_id)
    .map((s) => s.session_id as string);

  return NextResponse.json({ pending });
}

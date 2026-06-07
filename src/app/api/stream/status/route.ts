import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-stream-secret");
  if (secret !== process.env.STREAM_WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    session_id: string;
    stream_status: "streaming" | "stopped" | "error";
    stream_worker_id?: string;
    error?: string;
  };

  const supabase = await createServiceClient();

  const update: Record<string, unknown> = {
    stream_status: body.stream_status,
  };

  if (body.stream_worker_id) update.stream_worker_id = body.stream_worker_id;
  if (body.stream_status === "streaming") update.stream_started_at = new Date().toISOString();
  if (body.stream_status === "stopped" || body.stream_status === "error") {
    update.stream_stopped_at = new Date().toISOString();
  }
  if (body.error) update.stream_error = body.error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from("live_sessions")
    .update(update as any)
    .eq("session_id", body.session_id) as any);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

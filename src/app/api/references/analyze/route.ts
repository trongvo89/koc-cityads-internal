import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// Attempt to close a truncated JSON object by balancing brackets
function repairJson(raw: string): Record<string, unknown> | null {
  try {
    // Walk backwards to find the last complete key-value pair
    let s = raw.trimEnd();
    // Remove trailing comma if present
    if (s.endsWith(",")) s = s.slice(0, -1);
    // Count open braces/brackets and close what's missing
    let depth = 0;
    const stack: string[] = [];
    for (const ch of s) {
      if (ch === "{" || ch === "[") stack.push(ch);
      else if (ch === "}" || ch === "]") stack.pop();
    }
    // Close in reverse order
    for (let i = stack.length - 1; i >= 0; i--) {
      s += stack[i] === "{" ? "}" : "]";
    }
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { reference_id, transcript_id } = await req.json() as {
    reference_id: string;
    transcript_id?: string;
  };

  if (!reference_id) {
    return NextResponse.json({ error: "reference_id required" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY chưa được cấu hình" }, { status: 500 });
  }

  const supabase = await createServiceClient();

  // Fetch transcript — either specific or latest for this reference
  let transcriptQuery = supabase
    .from("reference_transcripts" as any)
    .select("id, full_text")
    .eq("reference_id", reference_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (transcript_id) {
    transcriptQuery = supabase
      .from("reference_transcripts" as any)
      .select("id, full_text")
      .eq("id", transcript_id)
      .limit(1);
  }

  const { data: transcripts, error: tErr } = await transcriptQuery as any;
  if (tErr || !transcripts?.length) {
    return NextResponse.json({ error: "Không tìm thấy transcript" }, { status: 404 });
  }

  const transcript = transcripts[0];

  // Fetch reference metadata for context
  const { data: ref } = await supabase
    .from("reference_materials" as any)
    .select("source_platform, category")
    .eq("id", reference_id)
    .single() as any;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const anthropic = new Anthropic();

    // Trim transcript if very long (Claude Sonnet context limit is large but cost-wise trim at ~50K chars)
    const transcriptText = (transcript.full_text as string).slice(0, 50000);

    const prompt = `Bạn là chuyên gia phân tích livestream bán hàng Việt Nam. Phân tích transcript sau và trả về JSON ngắn gọn.

TRANSCRIPT (${transcriptText.length} ký tự):
${transcriptText}

Nền tảng: ${ref?.source_platform ?? "Không rõ"} | Ngành: ${ref?.category ?? "Không rõ"}

Trả về JSON (chỉ JSON thuần, không markdown). Mỗi array TỐI ĐA 3 items, mỗi string TỐI ĐA 80 ký tự:
{"opening_hooks":["hook1","hook2","hook3"],"selling_techniques":[{"technique":"tên","example":"ví dụ ngắn","effectiveness":"hiệu quả"}],"engagement_patterns":[{"pattern":"kiểu","example":"cách làm"}],"product_presentation_flow":["bước1","bước2","bước3"],"cta_styles":[{"style":"kiểu","example":"câu nói"}],"audience_interaction":[{"type":"kiểu","example":"cách"}],"tone_and_energy":{"overall_tone":"mô tả","energy_level":"low|medium|high|dynamic","language_register":"formal|casual|mixed","notable_phrases":["phrase1","phrase2"]},"objection_handling":[{"objection":"lo ngại","response":"cách xử lý"}],"urgency_tactics":["tactic1","tactic2"],"summary":"tóm tắt 2-3 câu ngắn về phong cách bán","quality_score":3}

Yêu cầu: trích xuất từ nội dung thực, không bịa, giữ tiếng Việt, quality_score 1-5.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI không trả về JSON hợp lệ");

    let insightData: Record<string, unknown>;
    try {
      insightData = JSON.parse(jsonMatch[0]);
    } catch {
      // JSON bị cắt giữa — thử repair bằng cách loại bỏ phần cuối không hợp lệ
      const raw = jsonMatch[0];
      const repaired = repairJson(raw);
      if (!repaired) throw new Error("Không thể parse JSON từ AI response");
      insightData = repaired;
    }

    // Save insights
    const { error: insightErr } = await supabase
      .from("reference_insights" as any)
      .insert({
        reference_id,
        transcript_id: transcript.id,
        insight_data: insightData,
        category: ref?.category ?? null,
        tags: null,
      }) as any;

    if (insightErr) throw new Error(insightErr.message);

    // Update status to analyzed
    await supabase
      .from("reference_materials" as any)
      .update({ status: "analyzed", error_message: null })
      .eq("id", reference_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("reference_materials" as any)
      .update({ status: "failed", error_message: `Phân tích lỗi: ${msg.slice(0, 400)}` })
      .eq("id", reference_id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

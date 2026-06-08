import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

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

    const prompt = `Bạn là chuyên gia phân tích nội dung livestream bán hàng tại Việt Nam (TikTok Live, Shopee Live, v.v.).

Phân tích bản ghi livestream dưới đây và trích xuất các insight bán hàng có cấu trúc.

=== BẢN GHI LIVESTREAM ===
${transcriptText}
=== KẾT THÚC ===

Thông tin bổ sung:
- Nền tảng: ${ref?.source_platform ?? "Không rõ"}
- Danh mục sản phẩm: ${ref?.category ?? "Không rõ"}

Trả về JSON (chỉ JSON, không markdown) với cấu trúc sau:
{
  "opening_hooks": ["Các câu mở đầu thu hút viewer (ít nhất 3 câu, nguyên văn hoặc paraphrase)"],
  "selling_techniques": [
    {"technique": "Tên kỹ thuật (VD: So sánh giá, Demo trực tiếp, FOMO...)", "example": "Trích dẫn hoặc mô tả cách host sử dụng", "effectiveness": "Đánh giá ngắn về hiệu quả"}
  ],
  "engagement_patterns": [
    {"pattern": "Kiểu tương tác (VD: Hỏi đáp, Minigame, Đếm ngược...)", "example": "Cách host thực hiện"}
  ],
  "product_presentation_flow": ["Bước 1: ...", "Bước 2: ...", "..."],
  "cta_styles": [
    {"style": "Kiểu kêu gọi mua (VD: Đếm ngược, Giới hạn số lượng...)", "example": "Câu nói cụ thể"}
  ],
  "audience_interaction": [
    {"type": "Kiểu tương tác (VD: Đọc comment, Trả lời câu hỏi...)", "example": "Cách thực hiện"}
  ],
  "tone_and_energy": {
    "overall_tone": "Mô tả giọng điệu chung",
    "energy_level": "low | medium | high | dynamic",
    "language_register": "formal | casual | mixed",
    "notable_phrases": ["Các catchphrase hoặc cách nói đặc trưng"]
  },
  "objection_handling": [
    {"objection": "Phản đối/lo ngại phổ biến", "response": "Cách host xử lý"}
  ],
  "urgency_tactics": ["Các chiến thuật tạo sự cấp bách"],
  "summary": "Tóm tắt 3-5 câu về phong cách bán hàng tổng thể và điểm mạnh của livestream này",
  "quality_score": 3
}

Yêu cầu:
- Trích xuất từ nội dung thực tế, không bịa
- Mỗi mục ít nhất 2-3 items nếu có trong transcript
- Nếu transcript quá ngắn hoặc không rõ ràng, cho quality_score thấp (1-2)
- quality_score từ 1-5 dựa trên độ phong phú và rõ ràng của nội dung
- Giữ nguyên tiếng Việt`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI không trả về JSON hợp lệ");

    const insightData = JSON.parse(jsonMatch[0]);

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

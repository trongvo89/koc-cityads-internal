"use server";

import type { ReferenceInsightData } from "./references";

export type GeneratedHostPersona = {
  name: string;
  personality: string;
  voice_style: "calm" | "enthusiastic" | "humorous" | "professional";
  selling_style: "soft_sell" | "hard_sell" | "educational" | "storytelling";
};

export type ScriptSection = {
  section_type:
    | "intro"
    | "hook"
    | "product_intro"
    | "demo"
    | "usp"
    | "social_proof"
    | "cta"
    | "outro";
  content: string;
  duration_seconds: number;
  audio_url?: string | null;
  video_url?: string | null;
  heygen_video_id?: string | null;
};

export async function generateHostPersona(
  brief: string
): Promise<{ success: true; data: GeneratedHostPersona } | { success: false; error: string }> {
  if (!brief.trim()) return { success: false, error: "Brief không được để trống" };
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: "ANTHROPIC_API_KEY chưa được cấu hình" };
  }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic();

  const prompt = `Bạn là chuyên gia tạo nhân vật AI host cho TikTok Live e-commerce. Dựa trên brief sau, tạo một host persona.

Brief: ${brief}

Trả về JSON (chỉ JSON, không có markdown):
{
  "name": "tên host (tiếng Việt, gần gũi, dễ nhớ)",
  "personality": "mô tả tính cách 2-3 câu (tiếng Việt)",
  "voice_style": "calm | enthusiastic | humorous | professional",
  "selling_style": "soft_sell | hard_sell | educational | storytelling"
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { success: false, error: "AI không trả về JSON hợp lệ" };

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedHostPersona;
    return { success: true, data: parsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Lỗi AI: ${msg}` };
  }
}

type GenerateScriptParams = {
  product: {
    name: string;
    description?: string | null;
    key_features?: string[] | null;
    usp?: string | null;
    target_audience?: string | null;
    price_range?: string | null;
  };
  host: {
    name: string;
    personality?: string | null;
    voice_style?: string | null;
    selling_style?: string | null;
  };
  brief: string;
  duration_minutes: number;
  // Optional: reference insights for uniqueness
  references?: {
    id: string;
    title: string;
    insight_data: ReferenceInsightData;
  }[];
  approvedScripts?: {
    title: string;
    sections: { section_type: string; content: string }[];
  }[];
};

export async function generateLiveScript(
  params: GenerateScriptParams
): Promise<{ success: true; data: ScriptSection[] } | { success: false; error: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: "ANTHROPIC_API_KEY chưa được cấu hình" };
  }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic();
  const { product, host, brief, duration_minutes, references, approvedScripts } = params;
  const totalSeconds = duration_minutes * 60;
  const hasReferences = references && references.length > 0;

  // Build reference context block
  let referenceBlock = "";
  if (hasReferences) {
    referenceBlock = `
═══════════════════════════════════════
TƯ LIỆU THAM KHẢO TỪ LIVESTREAM THỰC TẾ
═══════════════════════════════════════
${references!.map((ref, i) => {
  const d = ref.insight_data;
  return `
--- Tư liệu ${i + 1}: ${ref.title} ---
Tóm tắt: ${d.summary}

Câu hook hiệu quả:
${d.opening_hooks.slice(0, 3).map((h) => `• "${h}"`).join("\n")}

Kỹ thuật bán hàng:
${d.selling_techniques.slice(0, 4).map((t) => `• ${t.technique}: ${t.example}`).join("\n")}

Kêu gọi mua hàng (CTA):
${d.cta_styles.slice(0, 3).map((c) => `• ${c.style}: "${c.example}"`).join("\n")}

Tương tác khán giả:
${d.engagement_patterns.slice(0, 3).map((e) => `• ${e.pattern}: ${e.example}`).join("\n")}

Chiến thuật tạo sự cấp bách:
${d.urgency_tactics.slice(0, 3).map((u) => `• ${u}`).join("\n")}

Giọng điệu: ${d.tone_and_energy.overall_tone} | Năng lượng: ${d.tone_and_energy.energy_level}
${d.tone_and_energy.notable_phrases.length > 0 ? `Câu đặc trưng: ${d.tone_and_energy.notable_phrases.slice(0, 3).join(", ")}` : ""}`;
}).join("\n")}`;
  }

  let approvedBlock = "";
  if (approvedScripts && approvedScripts.length > 0) {
    approvedBlock = `
═══════════════════════════════════════
KỊCH BẢN ĐÃ DUYỆT TRƯỚC ĐÓ (THAM KHẢO PHONG CÁCH)
═══════════════════════════════════════
${approvedScripts.map((s, i) => `
--- Kịch bản ${i + 1}: ${s.title} ---
${s.sections.map((sec) => `[${sec.section_type}] ${sec.content.slice(0, 200)}...`).join("\n")}`).join("\n")}`;
  }

  const uniquenessRequirements = hasReferences ? `
═══════════════════════════════════════
YÊU CẦU ĐẶC BIỆT VỀ SỰ ĐỘC ĐÁO
═══════════════════════════════════════
- HỌC TỪ tư liệu tham khảo: áp dụng kỹ thuật bán hàng, kiểu hook, CTA, và giọng điệu tương tự
- KHÔNG sao chép y nguyên — sáng tạo nội dung MỚI nhưng theo phong cách đã chứng minh hiệu quả
- Kết hợp các kiểu tương tác thực tế (đọc comment, hỏi đáp, đếm ngược) vào kịch bản
- Thêm chi tiết CỤ THỂ về sản phẩm này, không dùng nội dung chung chung
- Mỗi section phải có điểm nhấn riêng biệt, không lặp lại ý tưởng` : "";

  const prompt = `Bạn là chuyên gia viết kịch bản TikTok Live bán hàng cho thị trường Việt Nam.
Viết kịch bản live dài ${duration_minutes} phút (${totalSeconds} giây).

Thông tin sản phẩm:
- Tên: ${product.name}
- Mô tả: ${product.description ?? "Không có"}
- Điểm nổi bật: ${product.key_features?.join(", ") ?? "Không có"}
- USP: ${product.usp ?? "Không có"}
- Đối tượng: ${product.target_audience ?? "Không có"}
- Mức giá: ${product.price_range ?? "Không có"}

Thông tin host:
- Tên: ${host.name}
- Tính cách: ${host.personality ?? "Không có"}
- Phong cách nói: ${host.voice_style ?? "Không có"}
- Phong cách bán: ${host.selling_style ?? "Không có"}

Brief thêm: ${brief ?? "Không có"}
${referenceBlock}${approvedBlock}${uniquenessRequirements}

Trả về JSON array (chỉ JSON, không markdown):
[
  {
    "section_type": "intro|hook|product_intro|demo|usp|social_proof|cta|outro",
    "content": "nội dung kịch bản cho phần này (tiếng Việt, tự nhiên, chi tiết)",
    "duration_seconds": <số giây>
  }
]

Yêu cầu:
- Tổng duration_seconds xấp xỉ ${totalSeconds} giây
- Dùng đủ các loại section: intro, hook, product_intro, demo, usp, cta, outro
- Nội dung tự nhiên, phù hợp phong cách host
- Mỗi section 2-4 đoạn ngắn, giàu chi tiết cụ thể`;

  try {
    const response = await anthropic.messages.create({
      model: hasReferences ? "claude-sonnet-4-20250514" : "claude-haiku-4-5-20251001",
      max_tokens: hasReferences ? 4096 : 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { success: false, error: "AI không trả về JSON hợp lệ" };

    const parsed = JSON.parse(jsonMatch[0]) as ScriptSection[];
    return { success: true, data: parsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Lỗi AI: ${msg}` };
  }
}

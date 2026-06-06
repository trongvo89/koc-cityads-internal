"use server";

import Anthropic from "@anthropic-ai/sdk";

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
};

export async function generateHostPersona(
  brief: string
): Promise<{ success: true; data: GeneratedHostPersona } | { success: false; error: string }> {
  if (!brief.trim()) return { success: false, error: "Brief không được để trống" };
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: "ANTHROPIC_API_KEY chưa được cấu hình" };
  }
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
};

export async function generateLiveScript(
  params: GenerateScriptParams
): Promise<{ success: true; data: ScriptSection[] } | { success: false; error: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: "ANTHROPIC_API_KEY chưa được cấu hình" };
  }
  const anthropic = new Anthropic();
  const { product, host, brief, duration_minutes } = params;
  const totalSeconds = duration_minutes * 60;

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

Trả về JSON array (chỉ JSON, không markdown):
[
  {
    "section_type": "intro|hook|product_intro|demo|usp|social_proof|cta|outro",
    "content": "nội dung kịch bản cho phần này (tiếng Việt, tự nhiên)",
    "duration_seconds": <số giây>
  }
]

Yêu cầu:
- Tổng duration_seconds xấp xỉ ${totalSeconds} giây
- Dùng đủ các loại section: intro, hook, product_intro, demo, usp, cta, outro
- Nội dung tự nhiên, phù hợp phong cách host
- Mỗi section 1-3 đoạn ngắn`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
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

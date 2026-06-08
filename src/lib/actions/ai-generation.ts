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

// Time budget per section type based on total duration
function sectionTimeBudget(duration_minutes: number): Record<string, number> {
  const t = duration_minutes * 60;
  if (t <= 900) { // ≤15 min
    return { intro: 30, hook: 45, product_intro: 90, demo: 120, usp: 90, social_proof: 60, cta: 90, outro: 30 };
  } else if (t <= 1800) { // ≤30 min
    return { intro: 45, hook: 60, product_intro: 150, demo: 240, usp: 150, social_proof: 120, cta: 150, outro: 45 };
  } else if (t <= 2700) { // ≤45 min
    return { intro: 60, hook: 90, product_intro: 210, demo: 360, usp: 210, social_proof: 180, cta: 210, outro: 60 };
  } else { // 60+ min
    return { intro: 60, hook: 90, product_intro: 300, demo: 480, usp: 300, social_proof: 240, cta: 300, outro: 60 };
  }
}

// Per-section writing guide injected into the prompt
const SECTION_WRITING_GUIDE = `
CHI TIẾT TỪNG SECTION (bắt buộc thực hiện):

[intro] — Chào hỏi & thiết lập năng lượng
• Xưng tên host, chào "các bạn ơi" / "ae ơi"
• Giới thiệu ngắn buổi hôm nay về gì
• Tạo cảm giác thân thiện, gần gũi ngay từ đầu
• Gọi viewer tương tác: "Ai đang xem thả tim nào", "comment số điện thoại để mình tư vấn nha"
• KHÔNG giới thiệu sản phẩm ở section này

[hook] — Câu dừng scroll / tạo tò mò
• Bắt đầu bằng câu gây sốc hoặc câu hỏi kích thích: "Bạn có biết... không?", "Mình vừa thử cái này và..."
• Nêu vấn đề/pain point của đối tượng mục tiêu — họ đang gặp khó khăn gì
• Hứa hẹn giải pháp sẽ tiết lộ ngay sau
• Tạo FOMO: "Buổi hôm nay có deal chỉ dành cho người xem live thôi nha"
• Dùng con số cụ thể nếu có: "Sau 7 ngày dùng...", "Tiết kiệm X% so với..."

[product_intro] — Giới thiệu sản phẩm
• Công bố tên sản phẩm rõ ràng, hào hứng
• Mô tả visual ngắn (màu sắc, size, bao bì) — như đang cầm trên tay
• Công bố giá sale vs giá gốc nếu có: "Giá gốc X nhưng hôm nay live exclusive chỉ Y thôi nha"
• Nêu 1-2 đặc điểm nổi bật nhất ngay lập tức để giữ sự chú ý
• Gọi tương tác: "Ai biết sản phẩm này rồi comment 'biết rồi' nha"

[demo] — Demo & trải nghiệm thực tế
• Mô tả chi tiết cách dùng, texture, feel, smell nếu phù hợp
• Đưa ra proof: kết quả trông như thế nào, cảm giác như thế nào
• So sánh before/after hoặc so sánh với đối thủ cạnh tranh
• Chia sẻ trải nghiệm cá nhân của host (tạo sự tin cậy)
• Đọc comment và phản hồi tự nhiên: "À bạn hỏi có dùng được cho da nhạy cảm không..."

[usp] — Điểm khác biệt & giá trị
• Nêu RÕ RÀNG điều này tốt hơn sản phẩm khác ở chỗ nào
• Dùng số liệu/chứng nhận nếu có: "công nghệ X", "chứng nhận Y", "X% người dùng thấy hiệu quả"
• Giải thích TẠI SAO giá trị này quan trọng với người dùng
• Xử lý objection phổ biến: "Nhiều bạn lo về giá thì..."

[social_proof] — Bằng chứng xã hội
• Trích dẫn feedback khách hàng thực (nếu có) với chi tiết cụ thể
• Nêu số lượng đã bán: "Đã có X người dùng", "hết hàng X lần rồi"
• Đọc comment feedback real-time nếu có
• Kể case study ngắn: "Khách mình ở HCM dùng 2 tuần thấy..."
• Nếu chưa có data: dùng uy tín thương hiệu hoặc chứng nhận

[cta] — Kêu gọi mua hàng (quan trọng nhất)
• Tạo khan hiếm: "Chỉ còn X suất giá này thôi nha", "Deal kết thúc lúc X giờ"
• Đếm ngược hoặc countdown cảm giác: "Còn 5... 4... 3..."
• Hướng dẫn cách mua CỤ THỂ: "Comment 'mua' để mình gửi link", "Bấm vào giỏ hàng phía dưới"
• Nhắc lại giá và ưu đãi một lần nữa
• Push urgency: "Mình đang chốt đơn trực tiếp nha, ai nhanh thì giá này còn"
• Gọi tương tác: "Tag bạn bè cần cái này vào nha"

[outro] — Kết thúc & giữ viewer
• Cảm ơn viewer đã xem
• Tóm tắt deal nhanh nếu còn slot
• Teaser buổi tiếp theo: "Hôm sau mình sẽ live sản phẩm X siêu hot, nhớ bật thông báo nha"
• CTA nhẹ: "Follow kênh để không miss deal nha ae"`;

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
  const timeBudget = sectionTimeBudget(duration_minutes);

  // Voice style → speaking pattern hints
  const voiceHints: Record<string, string> = {
    calm: "giọng nhẹ nhàng, ấm áp, thủ thỉ như nói chuyện 1-1, không hét",
    enthusiastic: "giọng sôi nổi, nhiều cảm x感, dùng nhiều dấu chấm than, tạo hype",
    humorous: "hay đùa vui, dùng slang, đôi khi tự trào, tạo không khí vui vẻ",
    professional: "rõ ràng, tự tin, dùng số liệu, chuyên nghiệp nhưng vẫn gần gũi",
  };

  const sellingHints: Record<string, string> = {
    soft_sell: "không push mạnh, tập trung educate và build trust, để khách tự quyết",
    hard_sell: "aggressive CTA, nhiều urgency, countdown, tạo áp lực mua ngay",
    educational: "giải thích chi tiết, so sánh, dạy cách chọn, tạo expertise",
    storytelling: "kể chuyện, case study, trải nghiệm cá nhân, emotional journey",
  };

  // Reference context block
  let referenceBlock = "";
  if (hasReferences) {
    referenceBlock = `

═══════════════════════════════════════════════════
HỌC TỪ LIVESTREAM THỰC TẾ ĐÃ THÀNH CÔNG
(Áp dụng kỹ thuật, KHÔNG copy nội dung)
═══════════════════════════════════════════════════
${references!.map((ref, i) => {
  const d = ref.insight_data;
  return `
▸ TƯ LIỆU ${i + 1}: ${ref.title}
  Tổng quan: ${d.summary}

  Hook mẫu (học phong cách, đổi nội dung):
  ${d.opening_hooks.slice(0, 2).map((h) => `  → "${h}"`).join("\n")}

  Kỹ thuật bán hiệu quả:
  ${d.selling_techniques.slice(0, 3).map((t) => `  • ${t.technique}: "${t.example}"`).join("\n")}

  CTA mạnh:
  ${d.cta_styles.slice(0, 2).map((c) => `  • ${c.style}: "${c.example}"`).join("\n")}

  Tương tác khán giả:
  ${d.engagement_patterns.slice(0, 2).map((e) => `  • ${e.pattern}: ${e.example}`).join("\n")}

  Tạo urgency:
  ${d.urgency_tactics.slice(0, 2).map((u) => `  • ${u}`).join("\n")}

  Năng lượng & giọng điệu: ${d.tone_and_energy.overall_tone} — level: ${d.tone_and_energy.energy_level}
  ${d.tone_and_energy.notable_phrases.length > 0 ? `  Catchphrase: "${d.tone_and_energy.notable_phrases.slice(0, 2).join('", "')}"` : ""}`;
}).join("\n")}`;
  }

  let approvedBlock = "";
  if (approvedScripts && approvedScripts.length > 0) {
    approvedBlock = `

─── Kịch bản đã duyệt (tham khảo phong cách viết) ───
${approvedScripts.map((s, i) => `[${i + 1}] ${s.title}:
${s.sections.slice(0, 3).map((sec) => `  [${sec.section_type}] ${sec.content.slice(0, 150)}…`).join("\n")}`).join("\n")}`;
  }

  const systemPrompt = `Bạn là copywriter chuyên viết kịch bản TikTok Live và Shopee Live bán hàng cho thị trường Việt Nam. Bạn đã viết hàng trăm kịch bản live đã tạo ra doanh thu thực.

Nguyên tắc viết của bạn:
1. NGÔN NGỮ TỰ NHIÊN như người thực sự đang nói — không văn chương, không sách giáo khoa
2. GIỌNG ĐIỆU VIỆT NAM: dùng "ơi", "nha", "nè", "á", "đó", "vậy nha", "chốt nha ae" tự nhiên
3. MỖI CÂU NGẮN — phù hợp để đọc to, dễ nghe, dễ hiểu ngay
4. TƯƠNG TÁC VIEWER: lồng ghép "comment 'mua' nha", "ai thấy hay thả tim đi", "đọc cmt bạn X..."
5. CÁC CON SỐ CỤ THỂ: giá, %, số ngày, số lượng — không dùng X, Y chung chung
6. SELLING PSYCHOLOGY: FOMO, scarcity, social proof, reciprocity — tích hợp tự nhiên, không lộ liễu`;

  const userPrompt = `Viết kịch bản TikTok/Shopee Live bán hàng, thời lượng ${duration_minutes} phút (${totalSeconds} giây tổng cộng).

━━━ SẢN PHẨM ━━━
Tên: ${product.name}
Mô tả: ${product.description ?? "Chưa có — hãy tập trung vào tên sản phẩm"}
Điểm nổi bật: ${product.key_features?.length ? product.key_features.join(" | ") : "Chưa có"}
Điểm khác biệt (USP): ${product.usp ?? "Chưa có"}
Đối tượng: ${product.target_audience ?? "Khách hàng phổ thông"}
Mức giá: ${product.price_range ?? "Chưa xác định"}

━━━ HOST ━━━
Tên host: ${host.name}
Tính cách: ${host.personality ?? "Thân thiện, năng động"}
Phong cách nói: ${host.voice_style ? `${host.voice_style} — ${voiceHints[host.voice_style] ?? ""}` : "Tự nhiên, gần gũi"}
Phong cách bán: ${host.selling_style ? `${host.selling_style} — ${sellingHints[host.selling_style] ?? ""}` : "Balanced"}

${brief ? `━━━ YÊU CẦU THÊM ━━━\n${brief}` : ""}
${referenceBlock}${approvedBlock}

━━━ THỜI LƯỢNG MỖI SECTION (seconds) ━━━
intro: ~${timeBudget.intro}s | hook: ~${timeBudget.hook}s | product_intro: ~${timeBudget.product_intro}s
demo: ~${timeBudget.demo}s | usp: ~${timeBudget.usp}s | social_proof: ~${timeBudget.social_proof}s
cta: ~${timeBudget.cta}s | outro: ~${timeBudget.outro}s
Tổng: ~${totalSeconds}s
${SECTION_WRITING_GUIDE}

━━━ OUTPUT FORMAT ━━━
Trả về JSON array thuần túy (KHÔNG có markdown, KHÔNG có chú thích ngoài JSON):
[
  {
    "section_type": "intro",
    "content": "nội dung kịch bản — viết như người đang nói, tự nhiên, đầy đủ câu, sẵn sàng đọc thành tiếng",
    "duration_seconds": ${timeBudget.intro}
  },
  ...
]

LƯU Ý QUAN TRỌNG:
- content phải ĐẦY ĐỦ, sẵn sàng đọc thành TTS ngay — không dùng [placeholder], không dùng "..."
- Mỗi section ít nhất 3-5 câu, section demo/usp ít nhất 6-8 câu
- Tổng tất cả duration_seconds phải bằng khoảng ${totalSeconds}
- ${hasReferences ? "HỌC kỹ thuật từ tư liệu tham khảo nhưng viết nội dung HOÀN TOÀN MỚI cho sản phẩm này" : "Sáng tạo nội dung độc đáo, không generic"}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
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

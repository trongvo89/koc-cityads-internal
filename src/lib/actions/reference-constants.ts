// Constants and types shared between server actions and client components.
// This file intentionally has no "use server" directive.

export type ReferenceKnowledgeType =
  | "product_info"
  | "koc_insight"
  | "faq_objection"
  | "allowed_claims"
  | "script_template";

export const KNOWLEDGE_TYPE_LABEL: Record<ReferenceKnowledgeType, string> = {
  product_info: "Product info",
  koc_insight: "KOC insight",
  faq_objection: "FAQ / Objection",
  allowed_claims: "Allowed & forbidden claims",
  script_template: "Script template / Tone",
};

export const KNOWLEDGE_TYPE_DESC: Record<ReferenceKnowledgeType, string> = {
  product_info: "Thông số, tính năng, chứng nhận, hình ảnh mô tả sản phẩm",
  koc_insight: "Video/audio livestream thực tế — AI học phong cách bán hàng",
  faq_objection: "Câu hỏi thường gặp, cách xử lý phản đối từ khách",
  allowed_claims: "Điều được phép và không được phép nói về sản phẩm",
  script_template: "Kịch bản mẫu, tone & style tham khảo",
};

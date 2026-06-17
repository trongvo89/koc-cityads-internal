export type FieldType = "textarea" | "text" | "url" | "number" | "tel" | "radio" | "select";

export type FormFieldConfig = {
  key: string;
  type: FieldType;
  label: string;
  hint?: string | null;
  placeholder?: string | null;
  required: boolean;
  enabled: boolean;
  options?: { value: string; label: string }[];
};

export const BUILTIN_KEYS = new Set([
  "tiktok_id_name",
  "tiktok_url",
  "follower_count",
  "gmv_30d",
  "zalo_phone",
  "video_style",
]);

export const DEFAULT_FORM_FIELDS: FormFieldConfig[] = [
  {
    key: "tiktok_id_name",
    type: "textarea",
    label: "ID & Tên TikTok của bạn là gì?",
    hint: "Ví dụ: @thichskincare\nThich Skincare",
    placeholder: "@thichskincare\nThich Skincare",
    required: true,
    enabled: true,
  },
  {
    key: "tiktok_url",
    type: "url",
    label: "Link kênh TikTok của bạn là gì?",
    placeholder: "https://www.tiktok.com/@thichskincare",
    required: true,
    enabled: true,
  },
  {
    key: "follower_count",
    type: "number",
    label: "Số lượng follower trên kênh của bạn là bao nhiêu?",
    hint: "Vui lòng chỉ điền số, không điền chữ (Ví dụ: 10.000 - không ghi 10k)",
    placeholder: "10000",
    required: true,
    enabled: true,
  },
  {
    key: "gmv_30d",
    type: "number",
    label: "GMV 30 ngày gần nhất của bạn là bao nhiêu?",
    hint: "Vui lòng chỉ điền số, không điền chữ (Ví dụ: 100.000.000 - không ghi 100M)",
    placeholder: "100000000",
    required: true,
    enabled: true,
  },
  {
    key: "zalo_phone",
    type: "tel",
    label: "SĐT Zalo của bạn là gì?",
    placeholder: "0901234567",
    required: true,
    enabled: true,
  },
  {
    key: "video_style",
    type: "radio",
    label: "Phong cách quay dựng video của bạn là gì?",
    required: true,
    enabled: true,
    options: [
      { value: "show_face_voice", label: "Show mặt & giọng" },
      { value: "ugc_style", label: "UGC & Style" },
    ],
  },
];

export function getFormConfig(raw: unknown): FormFieldConfig[] {
  if (!raw || !Array.isArray(raw)) return DEFAULT_FORM_FIELDS;
  return raw as FormFieldConfig[];
}

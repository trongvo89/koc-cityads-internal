"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitApplication } from "@/lib/actions/applications";
import type { FormFieldConfig } from "@/lib/types/form-config";
import { BUILTIN_KEYS, DEFAULT_FORM_FIELDS } from "@/lib/types/form-config";

function parseTiktokIdName(raw: string): { handle: string; displayName: string } {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const handle = lines.find((l) => l.startsWith("@")) ?? lines[0] ?? "";
  const displayName = lines.find((l) => !l.startsWith("@")) ?? "";
  return { handle, displayName };
}

interface Props {
  registrationToken: string;
  thankYouMessage?: string | null;
  formConfig?: FormFieldConfig[];
}

export default function KocRegistrationForm({
  registrationToken,
  thankYouMessage,
  formConfig,
}: Props) {
  const fields = (formConfig ?? DEFAULT_FORM_FIELDS).filter((f) => f.enabled);

  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const val = (values[f.key] ?? "").trim();
      if (f.required && !val) {
        errs[f.key] = "Trường này là bắt buộc";
        continue;
      }
      if (!val) continue;
      if (f.type === "url") {
        try { new URL(val); } catch { errs[f.key] = "Link không hợp lệ, vui lòng nhập đúng dạng https://..."; }
      }
      if (f.type === "number") {
        if (isNaN(Number(val))) errs[f.key] = "Vui lòng nhập số hợp lệ";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setServerError(null);

    const builtinData: Record<string, string> = {};
    const customData: Record<string, unknown> = {};

    for (const f of fields) {
      const val = (values[f.key] ?? "").trim();
      if (BUILTIN_KEYS.has(f.key)) {
        builtinData[f.key] = val;
      } else {
        customData[f.key] = f.type === "number" ? Number(val) || 0 : val;
      }
    }

    const { handle, displayName } = parseTiktokIdName(builtinData.tiktok_id_name ?? "");

    startTransition(async () => {
      const result = await submitApplication(registrationToken, {
        tiktok_handle: handle,
        tiktok_name: displayName || handle,
        tiktok_url: builtinData.tiktok_url ?? "",
        follower_count: Number(builtinData.follower_count) || 0,
        gmv_30d: Number(builtinData.gmv_30d) || 0,
        zalo_phone: builtinData.zalo_phone ?? "",
        video_style: builtinData.video_style ?? "",
        custom_data: Object.keys(customData).length > 0 ? customData : undefined,
      });

      if (result.success) {
        setSubmitted(true);
      } else {
        setServerError(result.error);
      }
    });
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
        {thankYouMessage ? (
          <div
            className="text-sm text-zinc-600 [&_p]:mb-2 [&_a]:text-blue-600 [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: thankYouMessage }}
          />
        ) : (
          <>
            <h2 className="text-lg font-bold text-zinc-800 mb-1">Đăng ký thành công!</h2>
            <p className="text-sm text-zinc-500">
              Thông tin của bạn đã được ghi nhận. CityAds sẽ liên hệ qua Zalo nếu bạn được chọn.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <h2 className="text-base font-semibold text-zinc-800 mb-4">
        Thông tin đăng ký
      </h2>

      <form onSubmit={onSubmit} className="space-y-4">
        {fields.map((field, idx) => (
          <DynamicField
            key={field.key}
            field={field}
            index={idx + 1}
            value={values[field.key] ?? ""}
            onChange={(val) => setValue(field.key, val)}
            error={errors[field.key]}
          />
        ))}

        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Đang gửi..." : "Gửi đăng ký"}
        </Button>
      </form>
    </div>
  );
}

function DynamicField({
  field,
  index,
  value,
  onChange,
  error,
}: {
  field: FormFieldConfig;
  index: number;
  value: string;
  onChange: (val: string) => void;
  error?: string;
}) {
  const id = `field_${field.key}`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {index}. {field.label}{" "}
        {field.required && <span className="text-red-500">*</span>}
      </Label>
      {field.hint && (
        <p className="text-xs text-zinc-400 italic whitespace-pre-line">
          {field.hint}
        </p>
      )}

      {field.type === "textarea" && (
        <Textarea
          id={id}
          rows={2}
          placeholder={field.placeholder ?? ""}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="resize-none"
        />
      )}

      {field.type === "radio" && (
        <div className="space-y-2">
          {(field.options ?? []).map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                value === opt.value
                  ? "border-zinc-900 bg-zinc-50"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  value === opt.value ? "border-zinc-900" : "border-zinc-300"
                }`}
              >
                {value === opt.value && (
                  <div className="h-2 w-2 rounded-full bg-zinc-900" />
                )}
              </div>
              <span className="text-sm text-zinc-700">{opt.label}</span>
              <input
                type="radio"
                className="sr-only"
                name={field.key}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
              />
            </label>
          ))}
        </div>
      )}

      {field.type === "select" && (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">Chọn...</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {(field.type === "text" ||
        field.type === "url" ||
        field.type === "number" ||
        field.type === "tel") && (
        <Input
          id={id}
          type={field.type}
          min={field.type === "number" ? 0 : undefined}
          placeholder={field.placeholder ?? ""}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

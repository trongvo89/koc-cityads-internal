"use client";

import { useState } from "react";
import type { FormFieldConfig, FieldType } from "@/lib/types/form-config";
import { BUILTIN_KEYS } from "@/lib/types/form-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Lock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface Props {
  config: FormFieldConfig[];
  onChange: (config: FormFieldConfig[]) => void;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  url: "URL",
  tel: "Phone",
  textarea: "Textarea",
  radio: "Radio",
  select: "Select",
};

const ADDABLE_TYPES: FieldType[] = [
  "text",
  "number",
  "url",
  "tel",
  "textarea",
  "radio",
  "select",
];

function nextCustomKey(fields: FormFieldConfig[]): string {
  let i = 1;
  const keys = new Set(fields.map((f) => f.key));
  while (keys.has(`custom_${i}`)) i++;
  return `custom_${i}`;
}

export default function FormConfigEditor({ config, onChange }: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function update(index: number, patch: Partial<FormFieldConfig>) {
    const next = config.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(next);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...config];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function moveDown(index: number) {
    if (index === config.length - 1) return;
    const next = [...config];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function removeField(index: number) {
    onChange(config.filter((_, i) => i !== index));
  }

  function addField(type: FieldType) {
    const key = nextCustomKey(config);
    const field: FormFieldConfig = {
      key,
      type,
      label: "",
      required: false,
      enabled: true,
      ...(type === "radio" || type === "select"
        ? { options: [{ value: "", label: "" }] }
        : {}),
    };
    onChange([...config, field]);
    setExpandedKeys((prev) => new Set(prev).add(key));
    setShowTypeMenu(false);
  }

  function updateOption(
    fieldIndex: number,
    optIndex: number,
    patch: { value?: string; label?: string },
  ) {
    const field = config[fieldIndex];
    const options = (field.options ?? []).map((o, i) =>
      i === optIndex ? { ...o, ...patch } : o,
    );
    update(fieldIndex, { options });
  }

  function removeOption(fieldIndex: number, optIndex: number) {
    const field = config[fieldIndex];
    const options = (field.options ?? []).filter((_, i) => i !== optIndex);
    update(fieldIndex, { options });
  }

  function addOption(fieldIndex: number) {
    const field = config[fieldIndex];
    const options = [...(field.options ?? []), { value: "", label: "" }];
    update(fieldIndex, { options });
  }

  return (
    <div className="space-y-2">
      {config.map((field, index) => {
        const isBuiltin = BUILTIN_KEYS.has(field.key);
        const isExpanded = expandedKeys.has(field.key);

        return (
          <div
            key={field.key}
            className="rounded-lg border border-zinc-200 bg-white"
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={index === 0}
                  onClick={() => moveUp(index)}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={index === config.length - 1}
                  onClick={() => moveDown(index)}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={field.enabled}
                onClick={() => update(index, { enabled: !field.enabled })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  field.enabled ? "bg-zinc-900" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    field.enabled ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>

              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-sm font-medium text-zinc-700">
                  {field.key}
                </span>
                <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                  {FIELD_TYPE_LABELS[field.type]}
                </span>
                <Input
                  value={field.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                  placeholder="Nhãn hiển thị"
                  className="h-7 flex-1 text-xs"
                />
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {isBuiltin ? (
                  <Lock className="h-4 w-4 text-zinc-400" />
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700"
                    onClick={() => removeField(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => toggleExpand(field.key)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="space-y-3 border-t border-zinc-100 px-4 py-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-500">Gợi ý</Label>
                    <Input
                      value={field.hint ?? ""}
                      onChange={(e) =>
                        update(index, { hint: e.target.value || null })
                      }
                      placeholder="Hint text"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-500">Placeholder</Label>
                    <Input
                      value={field.placeholder ?? ""}
                      onChange={(e) =>
                        update(index, { placeholder: e.target.value || null })
                      }
                      placeholder="Placeholder text"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs text-zinc-500">Bắt buộc</Label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.required}
                    onClick={() => update(index, { required: !field.required })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                      field.required ? "bg-zinc-900" : "bg-zinc-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                        field.required
                          ? "translate-x-[18px]"
                          : "translate-x-[3px]"
                      }`}
                    />
                  </button>
                </div>

                {(field.type === "radio" || field.type === "select") && (
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-500">
                      Tuỳ chọn
                    </Label>
                    {(field.options ?? []).map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <Input
                          value={opt.value}
                          onChange={(e) =>
                            updateOption(index, optIdx, {
                              value: e.target.value,
                            })
                          }
                          placeholder="Giá trị"
                          className="h-7 flex-1 text-xs"
                        />
                        <Input
                          value={opt.label}
                          onChange={(e) =>
                            updateOption(index, optIdx, {
                              label: e.target.value,
                            })
                          }
                          placeholder="Nhãn"
                          className="h-7 flex-1 text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => removeOption(index, optIdx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => addOption(index)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Thêm tuỳ chọn
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="relative pt-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setShowTypeMenu((v) => !v)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Thêm câu hỏi
        </Button>

        {showTypeMenu && (
          <div className="absolute left-0 top-full z-10 mt-1 rounded-md border border-zinc-200 bg-white py-1 shadow-md">
            {ADDABLE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="block w-full px-4 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                onClick={() => addField(type)}
              >
                {FIELD_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

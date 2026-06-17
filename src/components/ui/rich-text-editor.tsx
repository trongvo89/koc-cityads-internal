"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import {
  Bold, Italic, Link2, ImageIcon, List, ListOrdered,
  Heading2, Heading3, SmilePlus, Undo, Redo,
} from "lucide-react";
import { uploadCampaignImage } from "@/lib/actions/upload";

// ─── Emoji picker data ────────────────────────────────────────────────────────

const EMOJI_GROUPS = [
  { label: "Phổ biến", emojis: ["✨", "🔥", "💯", "👉", "📌", "🎯", "💪", "🙌", "❤️", "🌟", "⭐", "🏆"] },
  { label: "Mũi tên / ký hiệu", emojis: ["▶", "•", "→", "✅", "❌", "⚠️", "📢", "💡", "🔑", "🎁", "📦", "💰"] },
  { label: "Biểu cảm", emojis: ["😍", "🥰", "😊", "🥳", "🤩", "😎", "🤔", "😢", "👏", "🙏", "💖", "🫶"] },
  { label: "Sản phẩm/Marketing", emojis: ["💄", "💅", "🌿", "🧴", "🛍", "🛒", "📸", "🎬", "📱", "💻", "🚀", "📈"] },
];

function EmojiPicker({ onSelect }: { onSelect: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <ToolbarBtn
        active={open}
        title="Chèn emoji"
        onClick={() => setOpen((v) => !v)}
      >
        <SmilePlus className="h-3.5 w-3.5" />
      </ToolbarBtn>

      {open && (
        <div className="absolute left-0 top-8 z-50 bg-white border border-zinc-200 rounded-xl shadow-lg p-3 w-72">
          {EMOJI_GROUPS.map((g) => (
            <div key={g.label} className="mb-2">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">{g.label}</p>
              <div className="flex flex-wrap gap-1">
                {g.emojis.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="text-lg hover:bg-zinc-100 rounded px-0.5 transition-colors"
                    onClick={() => {
                      onSelect(em);
                      setOpen(false);
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors text-sm ${
        active
          ? "bg-zinc-800 text-white"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

// ─── Link dialog ──────────────────────────────────────────────────────────────

function LinkDialog({
  initial,
  onConfirm,
  onCancel,
}: {
  initial: string;
  onConfirm: (url: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initial);
  return (
    <div className="absolute left-0 top-9 z-50 bg-white border border-zinc-200 rounded-xl shadow-lg p-3 w-72 flex gap-2">
      <input
        autoFocus
        type="url"
        className="flex-1 text-sm border border-zinc-200 rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-zinc-400"
        placeholder="https://..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onConfirm(val); }
          if (e.key === "Escape") onCancel();
        }}
      />
      <button
        type="button"
        onClick={() => onConfirm(val)}
        className="text-xs bg-zinc-800 text-white px-3 py-1.5 rounded-md hover:bg-zinc-700"
      >
        OK
      </button>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  campaignId: string;
  minHeight?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  campaignId,
  minHeight = 120,
}: Props) {
  const [showLink, setShowLink] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkBtnRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-600 underline cursor-pointer" },
      }),
      Image.configure({
        HTMLAttributes: { class: "max-w-full rounded-lg my-2" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "outline-none text-sm text-zinc-700 leading-relaxed",
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return false;
            uploadFile(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Sync when value changes externally (e.g. reset)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== "<p></p>") {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadCampaignImage(campaignId, fd);
      if (result.success) {
        editor.chain().focus().setImage({ src: result.data.url }).run();
      }
      setUploading(false);
    },
    [editor, campaignId]
  );

  if (!editor) return null;

  const currentLink = editor.getAttributes("link").href ?? "";

  function handleLinkConfirm(url: string) {
    setShowLink(false);
    if (!url) {
      editor!.chain().focus().unsetLink().run();
    } else {
      editor!
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url.startsWith("http") ? url : `https://${url}` })
        .run();
    }
  }

  return (
    <div className="border border-zinc-200 rounded-lg overflow-visible bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-zinc-100 bg-zinc-50 rounded-t-lg">
        {/* Undo / Redo */}
        <ToolbarBtn
          title="Hoàn tác"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Làm lại"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-zinc-200 mx-1" />

        {/* Font family */}
        <select
          title="Phông chữ"
          value={editor.getAttributes("textStyle").fontFamily ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v) {
              editor.chain().focus().setFontFamily(v).run();
            } else {
              editor.chain().focus().unsetFontFamily().run();
            }
          }}
          className="h-7 text-xs border border-zinc-200 rounded px-1.5 bg-white text-zinc-600 outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
        >
          <option value="">Mặc định</option>
          <option value="Times New Roman, serif">Times New Roman</option>
          <option value="Arial, sans-serif">Arial</option>
        </select>

        <div className="w-px h-4 bg-zinc-200 mx-1" />

        {/* Headings */}
        <ToolbarBtn
          title="Tiêu đề H2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Tiêu đề H3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-zinc-200 mx-1" />

        {/* Bold / Italic */}
        <ToolbarBtn
          title="In đậm (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="In nghiêng (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-zinc-200 mx-1" />

        {/* Lists */}
        <ToolbarBtn
          title="Danh sách bullet"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Danh sách số"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-zinc-200 mx-1" />

        {/* Link */}
        <div ref={linkBtnRef} className="relative">
          <ToolbarBtn
            title="Chèn link"
            active={editor.isActive("link") || showLink}
            onClick={() => setShowLink((v) => !v)}
          >
            <Link2 className="h-3.5 w-3.5" />
          </ToolbarBtn>
          {showLink && (
            <LinkDialog
              initial={currentLink}
              onConfirm={handleLinkConfirm}
              onCancel={() => setShowLink(false)}
            />
          )}
        </div>

        {/* Image */}
        <ToolbarBtn
          title="Chèn ảnh từ file"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <span className="text-[10px]">...</span>
          ) : (
            <ImageIcon className="h-3.5 w-3.5" />
          )}
        </ToolbarBtn>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
            e.target.value = "";
          }}
        />

        <div className="w-px h-4 bg-zinc-200 mx-1" />

        {/* Emoji */}
        <EmojiPicker
          onSelect={(em) =>
            editor.chain().focus().insertContent(em).run()
          }
        />
      </div>

      {/* Editor area */}
      <div
        className="px-3 py-2.5 cursor-text"
        style={{ minHeight }}
        onClick={() => editor.commands.focus()}
      >
        <style>{`
          .tiptap p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #a1a1aa;
            pointer-events: none;
            height: 0;
          }
          .tiptap a { color: #2563eb; text-decoration: underline; }
          .tiptap h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.4rem; color: #18181b; }
          .tiptap h3 { font-size: 0.95rem; font-weight: 600; margin-bottom: 0.3rem; color: #27272a; }
          .tiptap ul { list-style: disc; padding-left: 1.25rem; margin-bottom: 0.5rem; }
          .tiptap ol { list-style: decimal; padding-left: 1.25rem; margin-bottom: 0.5rem; }
          .tiptap p { margin-bottom: 0.4rem; }
          .tiptap img { max-width: 100%; border-radius: 0.5rem; margin: 0.5rem 0; }
        `}</style>
        <EditorContent editor={editor} className="tiptap" />
      </div>
    </div>
  );
}

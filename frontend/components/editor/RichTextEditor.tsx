"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Youtube from "@tiptap/extension-youtube";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Highlighter,
  ImagePlus,
  Indent,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Outdent,
  Palette,
  Quote,
  Redo2,
  RemoveFormatting,
  SquareCode,
  Strikethrough,
  Subscript as SubIcon,
  Superscript as SupIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
  MonitorPlay as YoutubeIcon,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Upload ảnh (dán / kéo thả / chọn tệp) → trả về URL. Không truyền thì chỉ chèn ảnh bằng URL */
  onUploadImage?: (file: File) => Promise<string>;
  minHeight?: number;
  /** Bản rút gọn cho ô mô tả (ẩn bảng, video, ảnh…) */
  compact?: boolean;
}

const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#dc2626", "#ea580c", "#ca8a04", "#16a34a",
  "#0891b2", "#2563eb", "#7c3aed", "#db2777", "#7f1d1d", "#14532d", "#1e3a8a", "#581c87",
];
const HIGHLIGHT_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa", "#e9d5ff", "#e5e7eb"];

const BLOCK_OPTIONS = [
  { value: "p", label: "Đoạn văn" },
  { value: "h1", label: "Tiêu đề 1" },
  { value: "h2", label: "Tiêu đề 2" },
  { value: "h3", label: "Tiêu đề 3" },
  { value: "h4", label: "Tiêu đề 4" },
  { value: "code", label: "Khối mã" },
];

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-35 ${
        active ? "bg-blue-100 text-blue-700 hover:bg-blue-100 hover:text-blue-800" : ""
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-slate-200" />;
}

/** Popover đơn giản đóng khi bấm ra ngoài */
function Popover({
  trigger,
  children,
  open,
  onOpenChange,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative">
      {trigger}
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          {children}
        </div>
      )}
    </div>
  );
}

function ColorGrid({
  colors,
  onPick,
  onClear,
  clearLabel,
}: {
  colors: string[];
  onPick: (c: string) => void;
  onClear: () => void;
  clearLabel: string;
}) {
  return (
    <div className="w-[176px]">
      <div className="grid grid-cols-8 gap-1">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(c)}
            className="h-5 w-5 rounded border border-slate-200 transition hover:scale-110"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClear}
        className="mt-2 w-full rounded-md border border-slate-200 py-1 text-xs text-slate-600 hover:bg-slate-50"
      >
        {clearLabel}
      </button>
    </div>
  );
}

function TableSizePicker({ onPick }: { onPick: (rows: number, cols: number) => void }) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  return (
    <div>
      <div className="grid grid-cols-8 gap-0.5" onMouseLeave={() => setHover({ r: 0, c: 0 })}>
        {Array.from({ length: 64 }, (_, i) => {
          const r = Math.floor(i / 8) + 1;
          const c = (i % 8) + 1;
          const on = r <= hover.r && c <= hover.c;
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover({ r, c })}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(r, c)}
              className={`h-4 w-4 rounded-[3px] border ${on ? "border-blue-500 bg-blue-200" : "border-slate-200 bg-white"}`}
            />
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        {hover.r ? `${hover.r} × ${hover.c}` : "Chọn kích thước bảng"}
      </p>
    </div>
  );
}

function LinkForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const existing = editor.getAttributes("link") as { href?: string; target?: string };
  const [url, setUrl] = useState(existing.href ?? "");
  const [newTab, setNewTab] = useState(existing.target ? existing.target === "_blank" : true);

  const apply = () => {
    const href = url.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const normalized = /^(https?:|mailto:|tel:)/i.test(href) ? href : `https://${href}`;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: normalized, target: newTab ? "_blank" : null })
        .run();
    }
    onDone();
  };

  return (
    <div className="w-72 space-y-2">
      <label className="block text-xs font-semibold text-slate-700">Địa chỉ liên kết</label>
      <input
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }}
        placeholder="https://..."
        className="h-9 w-full rounded-lg border border-slate-300 px-2.5 text-sm outline-none focus:border-blue-500"
      />
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} />
        Mở trong tab mới
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-md px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100">
          Hủy
        </button>
        <button type="button" onClick={apply} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
          Áp dụng
        </button>
      </div>
    </div>
  );
}

function MediaUrlForm({
  label,
  placeholder,
  onSubmit,
  onDone,
}: {
  label: string;
  placeholder: string;
  onSubmit: (url: string) => boolean;
  onDone: () => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (onSubmit(url.trim())) onDone();
    else setError("Đường dẫn không hợp lệ");
  };
  return (
    <div className="w-72 space-y-2">
      <label className="block text-xs font-semibold text-slate-700">{label}</label>
      <input
        autoFocus
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-slate-300 px-2.5 text-sm outline-none focus:border-blue-500"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button type="button" onClick={submit} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
          Chèn
        </button>
      </div>
    </div>
  );
}

/** Trạng thái thanh công cụ (nút nào đang bật, có undo được không, đếm từ...) */
function readToolbarState(e: Editor) {
  return {
    block: e.isActive("heading", { level: 1 })
      ? "h1"
      : e.isActive("heading", { level: 2 })
        ? "h2"
        : e.isActive("heading", { level: 3 })
          ? "h3"
          : e.isActive("heading", { level: 4 })
            ? "h4"
            : e.isActive("codeBlock")
              ? "code"
              : "p",
    bold: e.isActive("bold"),
    italic: e.isActive("italic"),
    underline: e.isActive("underline"),
    strike: e.isActive("strike"),
    sub: e.isActive("subscript"),
    sup: e.isActive("superscript"),
    code: e.isActive("code"),
    link: e.isActive("link"),
    bullet: e.isActive("bulletList"),
    ordered: e.isActive("orderedList"),
    task: e.isActive("taskList"),
    quote: e.isActive("blockquote"),
    table: e.isActive("table"),
    align: (["left", "center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
    color: (e.getAttributes("textStyle").color as string | undefined) ?? "",
    canUndo: e.can().undo(),
    canRedo: e.can().redo(),
    canSink: e.can().sinkListItem("listItem") || e.can().sinkListItem("taskItem"),
    canLift: e.can().liftListItem("listItem") || e.can().liftListItem("taskItem"),
    words: e.storage.characterCount.words() as number,
    chars: e.storage.characterCount.characters() as number,
  };
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  onUploadImage,
  minHeight = 320,
  compact = false,
}: RichTextEditorProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [popover, setPopover] = useState<null | "color" | "highlight" | "link" | "image" | "youtube" | "table">(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef(onUploadImage);
  const editorRef = useRef<Editor | null>(null);
  useEffect(() => {
    uploadRef.current = onUploadImage;
  }, [onUploadImage]);

  const insertImageFiles = async (editor: Editor, files: File[], pos?: number) => {
    const upload = uploadRef.current;
    if (!upload) return;
    setUploading(true);
    setUploadError("");
    try {
      for (const file of files) {
        const src = await upload(file);
        const chain = editor.chain().focus();
        if (pos !== undefined) chain.insertContentAt(pos, { type: "image", attrs: { src, alt: file.name } }).run();
        else chain.setImage({ src, alt: file.name }).run();
      }
    } catch (err) {
      setUploadError((err as Error)?.message || "Tải ảnh lên thất bại");
    } finally {
      setUploading(false);
    }
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ allowBase64: false }),
      TableKit.configure({ table: { resizable: true } }),
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: value,
    editorProps: {
      attributes: { class: "rich-content focus:outline-none" },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
        if (!files.length || !uploadRef.current || !editorRef.current) return false;
        event.preventDefault();
        void insertImageFiles(editorRef.current, files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
        if (!files.length || !uploadRef.current || !editorRef.current) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertImageFiles(editorRef.current, files, pos);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Đồng bộ khi value đổi từ bên ngoài (vd. tải xong dữ liệu khi chỉnh sửa)
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  const selectedState = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? readToolbarState(e) : null),
  });
  // useEditorState chỉ tính lại sau transaction đầu tiên → editor mới tạo với nội dung rỗng sẽ trả về null mãi
  // (vòng xoay không bao giờ tắt). Khi đó đọc trực tiếp từ editor.
  const state = selectedState ?? (editor ? readToolbarState(editor) : null);

  // Esc thoát toàn màn hình
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  if (!editor || !state) {
    return (
      <div className="grid place-items-center rounded-xl border border-slate-300 bg-white" style={{ minHeight }}>
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const chain = () => editor.chain().focus();
  const setBlock = (v: string) => {
    if (v === "p") chain().setParagraph().run();
    else if (v === "code") chain().toggleCodeBlock().run();
    else chain().toggleHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 | 4 }).run();
  };
  const togglePopover = (p: NonNullable<typeof popover>) => setPopover((cur) => (cur === p ? null : p));
  const closePopover = () => setPopover(null);

  return (
    <div
      className={`flex flex-col overflow-hidden border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 ${
        fullscreen ? "fixed inset-0 z-[100] rounded-none" : "rounded-xl"
      }`}
    >
      {/* Thanh công cụ */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50/95 px-2 py-1.5 backdrop-blur">
        <ToolbarButton title="Hoàn tác (Ctrl+Z)" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Làm lại (Ctrl+Y)" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <Divider />

        <select
          value={state.block}
          onChange={(e) => setBlock(e.target.value)}
          aria-label="Kiểu đoạn"
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[13px] text-slate-700 outline-none hover:border-slate-300"
        >
          {BLOCK_OPTIONS.filter((o) => !compact || o.value === "p" || o.value === "h3" || o.value === "h4").map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Divider />

        <ToolbarButton title="In đậm (Ctrl+B)" active={state.bold} onClick={() => chain().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="In nghiêng (Ctrl+I)" active={state.italic} onClick={() => chain().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Gạch chân (Ctrl+U)" active={state.underline} onClick={() => chain().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Gạch ngang" active={state.strike} onClick={() => chain().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        {!compact && (
          <>
            <ToolbarButton title="Chỉ số dưới" active={state.sub} onClick={() => chain().toggleSubscript().run()}>
              <SubIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Chỉ số trên" active={state.sup} onClick={() => chain().toggleSuperscript().run()}>
              <SupIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Mã nội dòng" active={state.code} onClick={() => chain().toggleCode().run()}>
              <Code className="h-4 w-4" />
            </ToolbarButton>
          </>
        )}

        <Popover
          open={popover === "color"}
          onOpenChange={(o) => setPopover(o ? "color" : null)}
          trigger={
            <ToolbarButton title="Màu chữ" onClick={() => togglePopover("color")}>
              <span className="flex flex-col items-center">
                <Palette className="h-4 w-4" />
                <span className="mt-0.5 h-0.5 w-4 rounded" style={{ backgroundColor: state.color || "#0f172a" }} />
              </span>
            </ToolbarButton>
          }
        >
          <ColorGrid
            colors={TEXT_COLORS}
            clearLabel="Màu mặc định"
            onPick={(c) => {
              chain().setColor(c).run();
              closePopover();
            }}
            onClear={() => {
              chain().unsetColor().run();
              closePopover();
            }}
          />
        </Popover>
        <Popover
          open={popover === "highlight"}
          onOpenChange={(o) => setPopover(o ? "highlight" : null)}
          trigger={
            <ToolbarButton title="Tô sáng" onClick={() => togglePopover("highlight")}>
              <Highlighter className="h-4 w-4" />
            </ToolbarButton>
          }
        >
          <ColorGrid
            colors={HIGHLIGHT_COLORS}
            clearLabel="Bỏ tô sáng"
            onPick={(c) => {
              chain().toggleHighlight({ color: c }).run();
              closePopover();
            }}
            onClear={() => {
              chain().unsetHighlight().run();
              closePopover();
            }}
          />
        </Popover>
        <Divider />

        <ToolbarButton title="Căn trái" active={state.align === "left"} onClick={() => chain().setTextAlign("left").run()}>
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Căn giữa" active={state.align === "center"} onClick={() => chain().setTextAlign("center").run()}>
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Căn phải" active={state.align === "right"} onClick={() => chain().setTextAlign("right").run()}>
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Căn đều" active={state.align === "justify"} onClick={() => chain().setTextAlign("justify").run()}>
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>
        <Divider />

        <ToolbarButton title="Danh sách dấu chấm" active={state.bullet} onClick={() => chain().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Danh sách đánh số" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        {!compact && (
          <ToolbarButton title="Danh sách việc cần làm" active={state.task} onClick={() => chain().toggleTaskList().run()}>
            <ListChecks className="h-4 w-4" />
          </ToolbarButton>
        )}
        <ToolbarButton
          title="Giảm thụt lề"
          disabled={!state.canLift}
          onClick={() => {
            if (!chain().liftListItem("listItem").run()) chain().liftListItem("taskItem").run();
          }}
        >
          <Outdent className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Tăng thụt lề"
          disabled={!state.canSink}
          onClick={() => {
            if (!chain().sinkListItem("listItem").run()) chain().sinkListItem("taskItem").run();
          }}
        >
          <Indent className="h-4 w-4" />
        </ToolbarButton>
        <Divider />

        <ToolbarButton title="Trích dẫn" active={state.quote} onClick={() => chain().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        {!compact && (
          <>
            <ToolbarButton title="Khối mã" active={state.block === "code"} onClick={() => chain().toggleCodeBlock().run()}>
              <SquareCode className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton title="Đường kẻ ngang" onClick={() => chain().setHorizontalRule().run()}>
              <Minus className="h-4 w-4" />
            </ToolbarButton>
          </>
        )}

        <Popover
          open={popover === "link"}
          onOpenChange={(o) => setPopover(o ? "link" : null)}
          trigger={
            <ToolbarButton title="Chèn liên kết (Ctrl+K)" active={state.link} onClick={() => togglePopover("link")}>
              <LinkIcon className="h-4 w-4" />
            </ToolbarButton>
          }
        >
          <LinkForm editor={editor} onDone={closePopover} />
        </Popover>
        {state.link && (
          <ToolbarButton title="Bỏ liên kết" onClick={() => chain().extendMarkRange("link").unsetLink().run()}>
            <Unlink className="h-4 w-4" />
          </ToolbarButton>
        )}

        {!compact && (
          <>
            <Popover
              open={popover === "image"}
              onOpenChange={(o) => setPopover(o ? "image" : null)}
              trigger={
                <ToolbarButton title="Chèn ảnh" onClick={() => togglePopover("image")}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                </ToolbarButton>
              }
            >
              <div className="space-y-3">
                {onUploadImage && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-72 items-center justify-center gap-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/60 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      <ImagePlus className="h-4 w-4" /> Tải ảnh từ máy tính
                    </button>
                    <p className="text-center text-[11px] text-slate-400">PNG, JPEG, GIF, WEBP — tối đa 5MB. Có thể dán hoặc kéo thả ảnh vào khung soạn thảo.</p>
                  </>
                )}
                <MediaUrlForm
                  label="Hoặc chèn ảnh từ URL"
                  placeholder="https://.../anh.png"
                  onDone={closePopover}
                  onSubmit={(url) => {
                    if (!/^https?:\/\//i.test(url)) return false;
                    chain().setImage({ src: url }).run();
                    return true;
                  }}
                />
              </div>
            </Popover>
            <Popover
              open={popover === "youtube"}
              onOpenChange={(o) => setPopover(o ? "youtube" : null)}
              trigger={
                <ToolbarButton title="Nhúng video YouTube" onClick={() => togglePopover("youtube")}>
                  <YoutubeIcon className="h-4 w-4" />
                </ToolbarButton>
              }
            >
              <MediaUrlForm
                label="Đường dẫn video YouTube"
                placeholder="https://www.youtube.com/watch?v=..."
                onDone={closePopover}
                onSubmit={(url) => chain().setYoutubeVideo({ src: url }).run()}
              />
            </Popover>
            <Popover
              open={popover === "table"}
              onOpenChange={(o) => setPopover(o ? "table" : null)}
              trigger={
                <ToolbarButton title="Chèn bảng" active={state.table} onClick={() => togglePopover("table")}>
                  <TableIcon className="h-4 w-4" />
                </ToolbarButton>
              }
            >
              <TableSizePicker
                onPick={(rows, cols) => {
                  chain().insertTable({ rows, cols, withHeaderRow: true }).run();
                  closePopover();
                }}
              />
            </Popover>
          </>
        )}
        <Divider />

        <ToolbarButton title="Xóa định dạng" onClick={() => chain().unsetAllMarks().clearNodes().run()}>
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
        {!compact && (
          <ToolbarButton title={fullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình"} onClick={() => setFullscreen((f) => !f)}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </ToolbarButton>
        )}
      </div>

      {/* Thanh công cụ bảng — chỉ hiện khi con trỏ nằm trong bảng */}
      {state.table && (
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-blue-50/60 px-2 py-1 text-[12px]">
          <span className="mr-1 font-semibold text-blue-800">Bảng:</span>
          {[
            ["Thêm hàng trên", () => chain().addRowBefore().run()],
            ["Thêm hàng dưới", () => chain().addRowAfter().run()],
            ["Xóa hàng", () => chain().deleteRow().run()],
            ["Thêm cột trái", () => chain().addColumnBefore().run()],
            ["Thêm cột phải", () => chain().addColumnAfter().run()],
            ["Xóa cột", () => chain().deleteColumn().run()],
            ["Gộp / tách ô", () => chain().mergeOrSplit().run()],
            ["Bật/tắt hàng tiêu đề", () => chain().toggleHeaderRow().run()],
          ].map(([label, fn]) => (
            <button
              key={label as string}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={fn as () => void}
              className="rounded-md bg-white px-2 py-1 text-slate-700 shadow-2xs ring-1 ring-slate-200 hover:bg-slate-50"
            >
              {label as string}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => chain().deleteTable().run()}
            className="rounded-md bg-white px-2 py-1 text-red-600 shadow-2xs ring-1 ring-red-200 hover:bg-red-50"
          >
            Xóa bảng
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          closePopover();
          if (files.length) void insertImageFiles(editor, files);
        }}
      />

      <div
        className={`flex-1 cursor-text overflow-y-auto px-5 py-4 ${fullscreen ? "mx-auto w-full max-w-4xl" : ""}`}
        style={fullscreen ? undefined : { minHeight }}
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 py-1 text-[11.5px] text-slate-400">
        <span className="text-red-600">{uploadError}</span>
        <span>
          {state.words} từ · {state.chars} ký tự
        </span>
      </div>
    </div>
  );
}

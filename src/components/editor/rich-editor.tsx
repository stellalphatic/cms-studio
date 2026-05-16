"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote as QuoteIcon,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { uploadMedia } from "@/lib/media-upload";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  siteId: string;
  className?: string;
}

export function RichEditor({ value, onChange, placeholder, siteId, className }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "underline text-[var(--color-brand)]" },
      }),
      Image,
      Placeholder.configure({ placeholder: placeholder ?? "Write something exceptional…" }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-stone max-w-none focus:outline-none min-h-[280px] px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor) return;
      const url = await uploadMedia({ file, siteId });
      if (url) editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    },
    [editor, siteId],
  );

  if (!editor) return null;

  return (
    <div className={cn("rounded-lg border border-[var(--color-border-strong)] bg-white shadow-xs", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-border)] px-2 py-1.5">
        <Tool active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold className="h-4 w-4" /></Tool>
        <Tool active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="h-4 w-4" /></Tool>
        <Tool active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough className="h-4 w-4" /></Tool>
        <Sep />
        <Tool active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1"><Heading1 className="h-4 w-4" /></Tool>
        <Tool active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2"><Heading2 className="h-4 w-4" /></Tool>
        <Tool active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3"><Heading3 className="h-4 w-4" /></Tool>
        <Sep />
        <Tool active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><List className="h-4 w-4" /></Tool>
        <Tool active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered className="h-4 w-4" /></Tool>
        <Tool active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><QuoteIcon className="h-4 w-4" /></Tool>
        <Tool active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block"><Code className="h-4 w-4" /></Tool>
        <Sep />
        <Tool
          onClick={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("URL", prev ?? "https://");
            if (url === null) return;
            if (url === "") return editor.chain().focus().unsetLink().run();
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Tool>
        <Tool onClick={() => fileInputRef.current?.click()} title="Insert image">
          <ImageIcon className="h-4 w-4" />
        </Tool>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImageUpload(f);
            e.target.value = "";
          }}
        />
        <div className="ml-auto flex items-center gap-1">
          <Tool onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo2 className="h-4 w-4" /></Tool>
          <Tool onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo2 className="h-4 w-4" /></Tool>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function Tool({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "grid h-8 w-8 place-items-center rounded text-[var(--color-fg-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]",
        active && "bg-[var(--color-surface-2)] text-[var(--color-fg)]",
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-[var(--color-border)]" />;
}

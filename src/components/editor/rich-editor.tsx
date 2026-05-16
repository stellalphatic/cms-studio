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
  /**
   * When true, render without an outer card / toolbar chrome — the editor
   * blends into the surrounding page (Medium-style focused canvas).
   * Toolbar still appears, but as a sticky bar at the top of the viewport.
   */
  bare?: boolean;
}

export function RichEditor({
  value,
  onChange,
  placeholder,
  siteId,
  className,
  bare = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "underline" },
      }),
      Image,
      Placeholder.configure({ placeholder: placeholder ?? "Start writing. The first sentence is the hardest." }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "focus:outline-none",
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

  const toolbar = (
    <div className="editor-toolbar">
      <Tool pressed={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (⌘B)">
        <Bold className="h-3.5 w-3.5" />
      </Tool>
      <Tool pressed={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (⌘I)">
        <Italic className="h-3.5 w-3.5" />
      </Tool>
      <Tool pressed={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
        <Strikethrough className="h-3.5 w-3.5" />
      </Tool>
      <span className="sep" />
      <Tool pressed={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
        <Heading1 className="h-3.5 w-3.5" />
      </Tool>
      <Tool pressed={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
        <Heading2 className="h-3.5 w-3.5" />
      </Tool>
      <Tool pressed={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
        <Heading3 className="h-3.5 w-3.5" />
      </Tool>
      <span className="sep" />
      <Tool pressed={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
        <List className="h-3.5 w-3.5" />
      </Tool>
      <Tool pressed={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
        <ListOrdered className="h-3.5 w-3.5" />
      </Tool>
      <Tool pressed={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
        <QuoteIcon className="h-3.5 w-3.5" />
      </Tool>
      <Tool pressed={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block">
        <Code className="h-3.5 w-3.5" />
      </Tool>
      <span className="sep" />
      <Tool
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("URL", prev ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
        title="Link (⌘K)"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </Tool>
      <Tool onClick={() => fileInputRef.current?.click()} title="Insert image">
        <ImageIcon className="h-3.5 w-3.5" />
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
      <span className="sep" />
      <Tool onClick={() => editor.chain().focus().undo().run()} title="Undo">
        <Undo2 className="h-3.5 w-3.5" />
      </Tool>
      <Tool onClick={() => editor.chain().focus().redo().run()} title="Redo">
        <Redo2 className="h-3.5 w-3.5" />
      </Tool>
    </div>
  );

  if (bare) {
    return (
      <div className={cn("relative", className)}>
        <div className="sticky top-14 z-10 -mx-2 flex justify-center pb-3 pt-2">
          {toolbar}
        </div>
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]", className)}>
      <div className="flex items-center justify-center border-b border-[var(--color-border)] px-3 py-2">
        {toolbar}
      </div>
      <div className="px-5 py-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Tool({
  onClick,
  pressed,
  title,
  children,
}: {
  onClick: () => void;
  pressed?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} title={title} aria-pressed={pressed}>
      {children}
    </button>
  );
}

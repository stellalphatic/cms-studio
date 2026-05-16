"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  Film,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  Link2,
  List,
  ListOrdered,
  Quote as QuoteIcon,
  Redo2,
  Strikethrough,
  Undo2,
  Upload,
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

  const insertImageByUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Image URL (jpg, png, gif, webp)");
    if (!url) return;
    const alt = window.prompt("Alt text (for accessibility & SEO)") ?? "";
    editor.chain().focus().setImage({ src: url, alt }).run();
  }, [editor]);

  const insertEmbed = useCallback(() => {
    if (!editor) return;
    const url = window.prompt(
      "Embed URL (YouTube, Vimeo, Loom, or any iframe-able link)",
    );
    if (!url) return;
    const src = normalizeEmbedUrl(url);
    // Inline raw <iframe> via insertContent — preserves on save because the
    // body is stored as HTML and rendered with the same HTML on the public
    // sites.
    editor
      .chain()
      .focus()
      .insertContent(
        `<div class="embed"><iframe src="${escapeAttr(src)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:8px"></iframe></div><p></p>`,
      )
      .run();
  }, [editor]);

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
      <Tool onClick={() => fileInputRef.current?.click()} title="Upload image">
        <Upload className="h-3.5 w-3.5" />
      </Tool>
      <Tool onClick={insertImageByUrl} title="Insert image by URL">
        <ImageIcon className="h-3.5 w-3.5" />
      </Tool>
      <Tool onClick={insertEmbed} title="Embed video / iframe (YouTube, Vimeo, Loom…)">
        <Film className="h-3.5 w-3.5" />
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

// Used to silence an unused-import warning for an icon we may want to keep
// available for future bullet/list refactors.
void Link2;

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * Convert common watch URLs into embeddable equivalents. Anything else is
 * passed through unchanged so users can paste raw embed/iframe links.
 */
function normalizeEmbedUrl(input: string): string {
  try {
    const u = new URL(input);
    const host = u.hostname.replace(/^www\./, "");
    // YouTube — watch / share / shorts → embed
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") ?? u.pathname.split("/").pop();
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    // Vimeo — vimeo.com/<id> → player.vimeo.com/video/<id>
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    // Loom — loom.com/share/<id> → loom.com/embed/<id>
    if (host === "loom.com" && u.pathname.startsWith("/share/")) {
      return `https://www.loom.com/embed/${u.pathname.replace("/share/", "")}`;
    }
    return input;
  } catch {
    return input;
  }
}

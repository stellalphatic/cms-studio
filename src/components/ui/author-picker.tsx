"use client";

import { useId, useState } from "react";
import { Field, Input } from "@/components/ui/input";

export type AuthorOption = {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
};

/**
 * Author picker. Free-form text input with a native <datalist> for
 * autocomplete against existing authors on this site. Typing a new name
 * creates the author on save (handled in the server action). Optional avatar
 * URL appears below for new authors.
 */
export function AuthorPicker({
  authors,
  initialName = "",
  initialAvatarUrl = "",
}: {
  authors: AuthorOption[];
  initialName?: string;
  initialAvatarUrl?: string;
}) {
  const listId = useId();
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);

  const matched = authors.find((a) => a.name.toLowerCase() === name.toLowerCase());
  const isNew = name.trim().length > 0 && !matched;

  return (
    <div className="space-y-3">
      <Field
        label="Author"
        hint={
          matched
            ? "Existing author"
            : isNew
              ? "Will be created on save"
              : "Optional"
        }
      >
        <Input
          name="author_name"
          list={listId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ada Lovelace"
          autoComplete="off"
        />
        <datalist id={listId}>
          {authors.map((a) => (
            <option key={a.id} value={a.name} />
          ))}
        </datalist>
      </Field>

      {/* Preview row — appears once a name is selected or being typed */}
      {(matched || isNew) && (
        <div className="flex items-center gap-2.5 rounded-md bg-[var(--color-surface-2)] px-2.5 py-2">
          {matched?.avatar_url || avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={matched?.avatar_url || avatarUrl}
              alt=""
              className="h-7 w-7 rounded-full object-cover ring-1 ring-[var(--color-border)]"
            />
          ) : (
            <div className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-surface-3)] text-[10px] font-semibold text-[var(--color-fg-muted)]">
              {(matched?.name ?? name).charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-medium">
              {matched?.name ?? name}
            </div>
            <div className="font-mono text-[10.5px] text-[var(--color-fg-subtle)]">
              {matched ? "saved" : "new"}
            </div>
          </div>
        </div>
      )}

      {isNew && (
        <Field label="Avatar URL" hint="Square image, optional">
          <Input
            name="author_avatar_url"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
            className="font-mono text-[12px]"
          />
        </Field>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function EditableItem({
  title,
  subtitle,
  onSave,
  onDelete,
  fields,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onSave: (data: Record<string, string>) => Promise<void>;
  onDelete: () => Promise<void>;
  fields: {
    name: string;
    label: string;
    value: string;
    type: "input" | "textarea";
  }[];
}) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    fields.forEach((f) => {
      data[f.name] = fd.get(f.name) as string;
    });
    await onSave(data);
    setLoading(false);
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this item?")) return;
    setLoading(true);
    await onDelete();
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="rounded-md border border-gray-700 bg-gray-800/50 p-3 space-y-2"
      >
        {fields.map((field) =>
          field.type === "textarea" ? (
            <Textarea
              key={field.name}
              name={field.name}
              defaultValue={field.value}
              placeholder={field.label}
              rows={2}
            />
          ) : (
            <Input
              key={field.name}
              name={field.name}
              defaultValue={field.value}
              placeholder={field.label}
            />
          )
        )}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={loading}>
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="ml-auto text-red-400"
            disabled={loading}
          >
            Delete
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="cursor-pointer rounded-md border border-gray-800 p-3 hover:border-gray-700"
    >
      <div className="text-sm font-medium">{title}</div>
      {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
    </div>
  );
}

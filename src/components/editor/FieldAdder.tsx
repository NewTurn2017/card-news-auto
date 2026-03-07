"use client";

import { Plus } from "lucide-react";
import type { SlideContent } from "@/types";

interface FieldAdderProps {
  content: SlideContent;
  onAddField: (field: keyof SlideContent, defaultValue: string) => void;
}

const ADDABLE_FIELDS: {
  key: keyof SlideContent;
  label: string;
  defaultValue: string;
}[] = [
  { key: "category", label: "카테고리", defaultValue: "CATEGORY" },
  { key: "title", label: "제목", defaultValue: "제목을 입력하세요" },
  { key: "subtitle", label: "부제", defaultValue: "부제를 입력하세요" },
  { key: "body", label: "본문", defaultValue: "본문을 입력하세요" },
];

export default function FieldAdder({ content, onAddField }: FieldAdderProps) {
  const emptyFields = ADDABLE_FIELDS.filter(
    (f) => !content[f.key] || content[f.key]?.trim() === ""
  );

  if (emptyFields.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {emptyFields.map((f) => (
        <button
          key={f.key}
          onClick={() => onAddField(f.key, f.defaultValue)}
          className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <Plus size={12} />
          {f.label}
        </button>
      ))}
    </div>
  );
}

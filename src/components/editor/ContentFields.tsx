"use client";

import type { SlideContent } from "@/types";

interface ContentFieldsProps {
  content: SlideContent;
  onChange: (content: SlideContent) => void;
}

export default function ContentFields({ content, onChange }: ContentFieldsProps) {
  const update = (field: keyof SlideContent, value: string) => {
    onChange({ ...content, [field]: value });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">카테고리</label>
        <input
          type="text"
          value={content.category || ""}
          onChange={(e) => update("category", e.target.value)}
          placeholder="AI & INSIGHT"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">제목</label>
        <textarea
          value={content.title || ""}
          onChange={(e) => update("title", e.target.value)}
          placeholder="제목을 입력하세요"
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">부제</label>
        <input
          type="text"
          value={content.subtitle || ""}
          onChange={(e) => update("subtitle", e.target.value)}
          placeholder="부제를 입력하세요"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
        />
      </div>
      {content.body !== undefined && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">본문</label>
          <textarea
            value={content.body || ""}
            onChange={(e) => update("body", e.target.value)}
            placeholder="본문을 입력하세요"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

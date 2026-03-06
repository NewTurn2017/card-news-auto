"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";

interface TextInputProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

export default function TextInput({ onSubmit, isLoading }: TextInputProps) {
  const [text, setText] = useState("");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center gap-2 text-sm text-muted">
        <ClipboardList size={16} />
        <span className="font-medium text-foreground">텍스트 붙여넣기</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="블로그 글, 기사, 메모 등 긴본 텍스트를 여기에 붙여넣으세요"
        className="min-h-[120px] w-full resize-none rounded-lg border border-border bg-background p-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <button
        onClick={() => onSubmit(text)}
        disabled={!text.trim() || isLoading}
        className="w-full rounded-lg bg-accent py-3 font-semibold text-background transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "생성 중..." : "카드뉴스 만들기"}
      </button>
    </div>
  );
}

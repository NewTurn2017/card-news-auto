"use client";

import { Sparkles, Trash2 } from "lucide-react";

interface SlideActionsProps {
  onImprove: () => void;
  onDelete: () => void;
  canDelete: boolean;
  isImproving: boolean;
}

export default function SlideActions({
  onImprove,
  onDelete,
  canDelete,
  isImproving,
}: SlideActionsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onImprove}
        disabled={isImproving}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
      >
        <Sparkles size={14} />
        {isImproving ? "개선 중..." : "슬라이드 개선"}
      </button>
      <button
        onClick={onDelete}
        disabled={!canDelete}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-30"
      >
        <Trash2 size={14} />
        삭제
      </button>
    </div>
  );
}

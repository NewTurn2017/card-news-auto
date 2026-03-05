"use client";

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
    <div className="flex gap-2 border-t border-border pt-4">
      <button
        onClick={onImprove}
        disabled={isImproving}
        className="flex-1 rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
      >
        {isImproving ? "✨ 개선 중..." : "✨ 슬라이드 개선"}
      </button>
      <button
        onClick={onDelete}
        disabled={!canDelete}
        className="rounded-lg border border-border px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 disabled:opacity-30"
      >
        🗑 슬라이드 삭제
      </button>
    </div>
  );
}

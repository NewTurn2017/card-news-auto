"use client";

interface SlideNavigationProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onAdd: () => void;
  onFirst: () => void;
  onLast: () => void;
}

export default function SlideNavigation({
  current,
  total,
  onPrev,
  onNext,
  onAdd,
  onFirst,
  onLast,
}: SlideNavigationProps) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onAdd}
        className="rounded border border-border px-2 py-1 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
      >
        +
      </button>
      <div className="flex items-center gap-2">
        <button
          onClick={onFirst}
          disabled={current === 0}
          className="text-sm text-muted hover:text-foreground disabled:opacity-30"
        >
          «
        </button>
        <button
          onClick={onPrev}
          disabled={current === 0}
          className="text-sm text-muted hover:text-foreground disabled:opacity-30"
        >
          ‹
        </button>
        <span className="text-sm font-medium">
          {current + 1} / {total}
        </span>
        <button
          onClick={onNext}
          disabled={current === total - 1}
          className="text-sm text-muted hover:text-foreground disabled:opacity-30"
        >
          ›
        </button>
        <button
          onClick={onLast}
          disabled={current === total - 1}
          className="text-sm text-muted hover:text-foreground disabled:opacity-30"
        >
          »
        </button>
      </div>
    </div>
  );
}

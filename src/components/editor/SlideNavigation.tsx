"use client";

import {
  Plus,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";

interface SlideNavigationProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onAdd: () => void;
  onFirst: () => void;
  onLast: () => void;
}

const navBtn =
  "flex items-center justify-center min-w-8 min-h-8 md:min-w-11 md:min-h-11 rounded-lg transition-colors";

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
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={onAdd}
        className={`${navBtn} bg-accent/10 text-accent hover:bg-accent/20`}
      >
        <Plus size={18} />
      </button>
      <div className="flex items-center gap-1">
        <button
          onClick={onFirst}
          disabled={current === 0}
          className={`${navBtn} text-muted hover:text-foreground disabled:opacity-30`}
        >
          <ChevronsLeft size={18} />
        </button>
        <button
          onClick={onPrev}
          disabled={current === 0}
          className={`${navBtn} text-muted hover:text-foreground disabled:opacity-30`}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="mx-1 whitespace-nowrap rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent md:mx-2 md:px-3 md:py-1 md:text-sm">
          {current + 1} / {total}
        </span>
        <button
          onClick={onNext}
          disabled={current === total - 1}
          className={`${navBtn} text-muted hover:text-foreground disabled:opacity-30`}
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={onLast}
          disabled={current === total - 1}
          className={`${navBtn} text-muted hover:text-foreground disabled:opacity-30`}
        >
          <ChevronsRight size={18} />
        </button>
      </div>
    </div>
  );
}

"use client";

import { layouts } from "@/data/layouts";

interface LayoutSelectorProps {
  selected: string;
  onChange: (layoutId: string) => void;
}

// Position map for mini-preview: [justifyContent, alignItems]
const positionMap: Record<string, [string, string]> = {
  "top-left": ["flex-start", "flex-start"],
  "top-center": ["flex-start", "center"],
  "top-right": ["flex-start", "flex-end"],
  "center-left": ["center", "flex-start"],
  center: ["center", "center"],
  "center-right": ["center", "flex-end"],
  "bottom-left": ["flex-end", "flex-start"],
  "bottom-center": ["flex-end", "center"],
  "bottom-right": ["flex-end", "flex-end"],
};

function LayoutMiniPreview({
  layoutId,
  textAlign,
}: {
  layoutId: string;
  textAlign: string;
}) {
  const pos = positionMap[layoutId];

  // Special layouts
  if (layoutId === "big-title") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-[3px]">
          <div className="h-[3px] w-[28px] rounded-full bg-current opacity-80" />
          <div className="h-[2px] w-[18px] rounded-full bg-current opacity-40" />
        </div>
      </div>
    );
  }

  if (layoutId === "split") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-between py-[6px]">
        <div className="h-[2px] w-[14px] rounded-full bg-current opacity-50" />
        <div className="flex flex-col items-center gap-[2px]">
          <div className="h-[3px] w-[22px] rounded-full bg-current opacity-80" />
          <div className="h-[2px] w-[16px] rounded-full bg-current opacity-40" />
        </div>
        <div className="h-[2px] w-[14px] rounded-full bg-current opacity-50" />
      </div>
    );
  }

  if (layoutId === "editorial") {
    return (
      <div className="flex h-full w-full flex-col items-start justify-center gap-[3px] pl-[6px]">
        <div className="h-[2px] w-[10px] rounded-full bg-current opacity-50" />
        <div className="h-[3px] w-[24px] rounded-full bg-current opacity-80" />
        <div className="h-[2px] w-[20px] rounded-full bg-current opacity-40" />
        <div className="mt-[1px] h-[2px] w-[16px] rounded-full bg-current opacity-30" />
      </div>
    );
  }

  // Position grid layouts
  if (!pos) return null;

  const alignItems =
    textAlign === "center"
      ? "center"
      : textAlign === "right"
        ? "flex-end"
        : "flex-start";

  return (
    <div
      className="flex h-full w-full flex-col p-[5px]"
      style={{ justifyContent: pos[0], alignItems: pos[1] }}
    >
      <div
        className="flex flex-col gap-[2px]"
        style={{ alignItems }}
      >
        <div className="h-[2px] w-[10px] rounded-full bg-current opacity-50" />
        <div className="h-[3px] w-[20px] rounded-full bg-current opacity-80" />
        <div className="h-[2px] w-[14px] rounded-full bg-current opacity-40" />
      </div>
    </div>
  );
}

export default function LayoutSelector({
  selected,
  onChange,
}: LayoutSelectorProps) {
  // Group layouts: first 9 = position grid, rest = special
  const gridLayouts = layouts.slice(0, 9);
  const specialLayouts = layouts.slice(9);

  return (
    <div className="flex flex-col gap-3">
      {/* Position Grid */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted">
          텍스트 위치
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {gridLayouts.map((layout) => (
            <button
              key={layout.id}
              onClick={() => onChange(layout.id)}
              className={`group relative flex h-[52px] flex-col items-center rounded-lg border transition-all ${
                selected === layout.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:border-muted hover:text-foreground"
              }`}
              title={layout.description}
            >
              <div className="flex-1 w-full">
                <LayoutMiniPreview
                  layoutId={layout.id}
                  textAlign={layout.textAlign}
                />
              </div>
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[9px] leading-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {layout.name}
              </span>
            </button>
          ))}
        </div>
        {/* Position hint labels */}
        <div className="mt-1 flex justify-between text-[9px] text-muted/60">
          <span>좌</span>
          <span>중앙</span>
          <span>우</span>
        </div>
      </div>

      {/* Special Layouts */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted">
          특수 레이아웃
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {specialLayouts.map((layout) => (
            <button
              key={layout.id}
              onClick={() => onChange(layout.id)}
              className={`flex h-[52px] flex-col items-center rounded-lg border transition-all ${
                selected === layout.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:border-muted hover:text-foreground"
              }`}
              title={layout.description}
            >
              <div className="flex-1 w-full">
                <LayoutMiniPreview
                  layoutId={layout.id}
                  textAlign={layout.textAlign}
                />
              </div>
              <span className="pb-1 text-[9px] font-medium leading-none">
                {layout.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

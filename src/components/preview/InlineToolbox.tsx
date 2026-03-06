"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { X, GripHorizontal } from "lucide-react";
import { getFontByFamily } from "@/data/fonts";
import FontSelector from "@/components/editor/FontSelector";
import type { SlideStyle, SlideContent } from "@/types";

export type EditableField = "category" | "title" | "subtitle" | "body";

interface InlineToolboxProps {
  field: EditableField;
  anchorTop: number;
  anchorLeft: number;
  style: SlideStyle;
  content: SlideContent;
  onStyleChange: (style: Partial<SlideStyle>) => void;
  onFontChange: (fontId: string) => void;
  onContentChange: (content: SlideContent) => void;
  onClose: () => void;
}

const FIELD_LABELS: Record<EditableField, string> = {
  category: "카테고리",
  title: "제목",
  subtitle: "부제",
  body: "본문",
};

const FIELD_CONFIG: Record<
  EditableField,
  {
    sizeKey: keyof SlideStyle;
    lineHeightKey: keyof SlideStyle;
    letterSpacingKey: keyof SlideStyle;
    colorKey: keyof SlideStyle;
    contentKey: keyof SlideContent;
    defaultSize: number;
    sizeRange: [number, number];
    defaultLineHeight: number;
    defaultLetterSpacing: number;
  }
> = {
  category: {
    sizeKey: "categorySize",
    lineHeightKey: "titleLineHeight", // category shares title line height
    letterSpacingKey: "titleLetterSpacing", // category shares title letter spacing
    colorKey: "categoryColor",
    contentKey: "category",
    defaultSize: 20,
    sizeRange: [10, 40],
    defaultLineHeight: 1.3,
    defaultLetterSpacing: 0,
  },
  title: {
    sizeKey: "titleSize",
    lineHeightKey: "titleLineHeight",
    letterSpacingKey: "titleLetterSpacing",
    colorKey: "titleColor",
    contentKey: "title",
    defaultSize: 52,
    sizeRange: [24, 80],
    defaultLineHeight: 1.3,
    defaultLetterSpacing: 0,
  },
  subtitle: {
    sizeKey: "subtitleSize",
    lineHeightKey: "subtitleLineHeight",
    letterSpacingKey: "subtitleLetterSpacing",
    colorKey: "subtitleColor",
    contentKey: "subtitle",
    defaultSize: 30,
    sizeRange: [14, 50],
    defaultLineHeight: 1.4,
    defaultLetterSpacing: 0,
  },
  body: {
    sizeKey: "bodySize",
    lineHeightKey: "bodyLineHeight",
    letterSpacingKey: "bodyLetterSpacing",
    colorKey: "bodyColor",
    contentKey: "body",
    defaultSize: 24,
    sizeRange: [12, 40],
    defaultLineHeight: 1.6,
    defaultLetterSpacing: 0,
  },
};

const TOOLBOX_WIDTH = 320;
const VIEWPORT_PADDING = 8;

export default function InlineToolbox({
  field,
  anchorTop,
  anchorLeft,
  style,
  content,
  onStyleChange,
  onFontChange,
  onContentChange,
  onClose,
}: InlineToolboxProps) {
  const toolboxRef = useRef<HTMLDivElement>(null);
  const [toolboxHeight, setToolboxHeight] = useState(400);

  // Position state: absolute top/left in viewport
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, startTop: 0, startLeft: 0 });

  const config = FIELD_CONFIG[field];

  // Clamp position so entire toolbox stays within viewport
  const clampPos = useCallback((top: number, left: number, height: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      top: Math.max(VIEWPORT_PADDING, Math.min(top, vh - height - VIEWPORT_PADDING)),
      left: Math.max(VIEWPORT_PADDING, Math.min(left, vw - TOOLBOX_WIDTH - VIEWPORT_PADDING)),
    };
  }, []);

  // Reset position when field changes (new element selected)
  useEffect(() => {
    setPos(null);
  }, [field]);

  // Measure actual toolbox height after render
  useEffect(() => {
    if (toolboxRef.current) {
      setToolboxHeight(toolboxRef.current.offsetHeight);
    }
  });

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Drag handlers on document (so drag continues outside the toolbox)
  const handleDragMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const newTop = dragStart.current.startTop + dy;
    const newLeft = dragStart.current.startLeft + dx;
    const h = toolboxRef.current?.offsetHeight ?? toolboxHeight;
    setPos(clampPos(newTop, newLeft, h));
  }, [clampPos, toolboxHeight]);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener("pointermove", handleDragMove);
    document.removeEventListener("pointerup", handleDragEnd);
  }, [handleDragMove]);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    // Use current rendered position as the starting point
    const currentTop = pos?.top ?? clampPos(anchorTop, anchorLeft, toolboxHeight).top;
    const currentLeft = pos?.left ?? clampPos(anchorTop, anchorLeft, toolboxHeight).left;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startTop: currentTop,
      startLeft: currentLeft,
    };
    document.addEventListener("pointermove", handleDragMove);
    document.addEventListener("pointerup", handleDragEnd);
  }, [pos, anchorTop, anchorLeft, toolboxHeight, clampPos, handleDragMove, handleDragEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("pointermove", handleDragMove);
      document.removeEventListener("pointerup", handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  // Compute final position: dragged position or clamped anchor
  const finalPos = pos ?? clampPos(anchorTop, anchorLeft, toolboxHeight);

  const currentSize = (style[config.sizeKey] as number | undefined) ?? config.defaultSize;
  const currentLineHeight =
    (style[config.lineHeightKey] as number | undefined) ?? config.defaultLineHeight;
  const currentLetterSpacing =
    (style[config.letterSpacingKey] as number | undefined) ?? config.defaultLetterSpacing;

  const currentColor =
    (style[config.colorKey] as string | undefined) ??
    (field === "title" ? style.textColor : undefined) ??
    "rgba(255,255,255,0.7)";

  const currentText = (content[config.contentKey] as string | undefined) ?? "";
  const currentFontId = getFontByFamily(style.fontFamily)?.id ?? "pretendard";

  const handleTextChange = (value: string) => {
    onContentChange({ ...content, [config.contentKey]: value });
  };

  const sliderClass = "w-full h-1.5 accent-accent cursor-pointer";
  const labelRowClass = "flex justify-between text-[11px] text-muted mb-1";

  return (
    <div
      ref={toolboxRef}
      className="fixed z-50 flex w-[320px] flex-col gap-2.5 rounded-xl border border-border bg-surface p-3 shadow-2xl"
      style={{
        top: finalPos.top,
        left: finalPos.left,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header — drag handle */}
      <div
        className="flex cursor-grab items-center justify-between active:cursor-grabbing"
        onPointerDown={handleDragStart}
      >
        <div className="flex items-center gap-1.5">
          <GripHorizontal size={14} className="text-muted/50" />
          <span className="text-xs font-semibold text-foreground">
            {FIELD_LABELS[field]}
          </span>
        </div>
        <button
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded-md p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>

      {/* Text Input */}
      <textarea
        value={currentText}
        onChange={(e) => handleTextChange(e.target.value)}
        rows={2}
        className="w-full resize-y rounded-lg border border-border bg-surface-hover px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
        placeholder={`${FIELD_LABELS[field]}을 입력하세요`}
      />

      {/* Font Family */}
      <FontSelector
        selected={currentFontId}
        onChange={onFontChange}
      />

      {/* Size Slider */}
      <div>
        <div className={labelRowClass}>
          <span>크기</span>
          <span>{currentSize}px</span>
        </div>
        <input
          type="range"
          min={config.sizeRange[0]}
          max={config.sizeRange[1]}
          value={currentSize}
          onChange={(e) =>
            onStyleChange({ [config.sizeKey]: Number(e.target.value) })
          }
          className={sliderClass}
        />
      </div>

      {/* Line Height Slider */}
      <div>
        <div className={labelRowClass}>
          <span>행간</span>
          <span>{currentLineHeight.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.8}
          max={2.5}
          step={0.1}
          value={currentLineHeight}
          onChange={(e) =>
            onStyleChange({ [config.lineHeightKey]: Number(e.target.value) })
          }
          className={sliderClass}
        />
      </div>

      {/* Letter Spacing Slider */}
      <div>
        <div className={labelRowClass}>
          <span>자간</span>
          <span>{currentLetterSpacing}px</span>
        </div>
        <input
          type="range"
          min={-2}
          max={10}
          step={0.5}
          value={currentLetterSpacing}
          onChange={(e) =>
            onStyleChange({
              [config.letterSpacingKey]: Number(e.target.value),
            })
          }
          className={sliderClass}
        />
      </div>

      {/* Color Picker */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted">색상</span>
        <input
          type="color"
          value={currentColor}
          onChange={(e) =>
            onStyleChange({ [config.colorKey]: e.target.value })
          }
          className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
        <span className="text-[11px] text-muted">{currentColor}</span>
      </div>
    </div>
  );
}

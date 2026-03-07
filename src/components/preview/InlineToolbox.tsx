"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { X, GripHorizontal, RotateCcw } from "lucide-react";
import { getFontByFamily } from "@/data/fonts";
import FontSelector from "@/components/editor/FontSelector";
import type {
  EditableTextField,
  SlideStyle,
  SlideContent,
  TextFieldEffects,
} from "@/types";

export type EditableField = EditableTextField;

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
  textEffects?: {
    category?: TextFieldEffects;
    title?: TextFieldEffects;
    subtitle?: TextFieldEffects;
    body?: TextFieldEffects;
  };
  onTextEffectsChange: (field: EditableField, effects: Partial<TextFieldEffects>) => void;
  originalContent?: SlideContent;
  onResetField?: (field: EditableField) => void;
  position?: { x: number; y: number };
  onNudgePosition?: (field: EditableField, dx: number, dy: number) => void;
  onCenterPosition?: (field: EditableField, axis: "horizontal" | "vertical") => void;
  onResetPosition?: (field: EditableField) => void;
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
  textEffects,
  onTextEffectsChange,
  originalContent,
  onResetField,
  position,
  onNudgePosition,
  onCenterPosition,
  onResetPosition,
}: InlineToolboxProps) {
  const toolboxRef = useRef<HTMLDivElement>(null);
  const [toolboxHeight, setToolboxHeight] = useState(400);
  const [showShadow, setShowShadow] = useState(false);
  const [showTextBg, setShowTextBg] = useState(false);
  const [showStroke, setShowStroke] = useState(false);

  // Position state: absolute top/left in viewport
  // Restore last dragged position from localStorage
  const [pos, setPos] = useState<{ top: number; left: number } | null>(() => {
    try {
      const saved = localStorage.getItem("toolbox-pos");
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn("Failed to restore inline toolbox position", error);
      return null;
    }
  });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, startTop: 0, startLeft: 0 });

  const config = FIELD_CONFIG[field];
  const currentEffects: TextFieldEffects = textEffects?.[field] ?? {};
  const updateEffects = (partial: Partial<TextFieldEffects>) => {
    onTextEffectsChange(field, partial);
  };

  // Clamp position so entire toolbox stays within viewport
  const clampPos = useCallback((top: number, left: number, height: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      top: Math.max(VIEWPORT_PADDING, Math.min(top, vh - height - VIEWPORT_PADDING)),
      left: Math.max(VIEWPORT_PADDING, Math.min(left, vw - TOOLBOX_WIDTH - VIEWPORT_PADDING)),
    };
  }, []);

  // Keep saved position across field changes (no reset)

  useEffect(() => {
    const element = toolboxRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const nextHeight = entries[0]?.contentRect.height;
      if (!nextHeight) return;
      setToolboxHeight((current) => (current === nextHeight ? current : nextHeight));
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

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

  const handleDragEnd = useCallback(function handleDocumentPointerUp() {
    isDragging.current = false;
    document.removeEventListener("pointermove", handleDragMove);
    document.removeEventListener("pointerup", handleDocumentPointerUp);
    // Persist position to localStorage
    setPos((current) => {
      if (current) {
        try {
          localStorage.setItem("toolbox-pos", JSON.stringify(current));
        } catch (error) {
          console.warn("Failed to persist inline toolbox position", error);
        }
      }
      return current;
    });
  }, [handleDragMove]);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    // Use current rendered position as the starting point
    const shiftedTop = anchorTop - Math.round(toolboxHeight / 2);
    const currentTop = pos?.top ?? clampPos(shiftedTop, anchorLeft, toolboxHeight).top;
    const currentLeft = pos?.left ?? clampPos(shiftedTop, anchorLeft, toolboxHeight).left;
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
  // Center toolbox vertically on the mockup container center
  const adjustedTop = anchorTop - Math.round(toolboxHeight / 2);
  const finalPos = pos ?? clampPos(adjustedTop, anchorLeft, toolboxHeight);

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
        style={{ touchAction: "none" }}
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
      <div className="relative">
        <textarea
          value={currentText}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={2}
          className="w-full resize-y rounded-lg border border-border bg-surface-hover px-2.5 py-1.5 pr-8 text-xs text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
          placeholder={`${FIELD_LABELS[field]}을 입력하세요`}
        />
        {originalContent && onResetField &&
          originalContent[config.contentKey] !== undefined &&
          originalContent[config.contentKey] !== content[config.contentKey] && (
          <button
            onClick={() => onResetField(field)}
            className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted transition-colors hover:bg-accent/10 hover:text-accent"
            title="원본 복원"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>

      {/* Font Family */}
      <FontSelector
        selected={currentFontId}
        onChange={onFontChange}
      />

      {(position || onNudgePosition || onCenterPosition || onResetPosition) && (
        <div className="rounded-lg border border-border p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
              위치 / 정렬
            </span>
            {position && (
              <span className="text-[10px] text-muted">
                X {Math.round(position.x)} · Y {Math.round(position.y)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onCenterPosition?.(field, "horizontal")}
              className="rounded-lg border border-border px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              가로 중앙
            </button>
            <button
              type="button"
              onClick={() => onCenterPosition?.(field, "vertical")}
              className="rounded-lg border border-border px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              세로 중앙
            </button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => onNudgePosition?.(field, -1, 0)}
              className="rounded-lg border border-border px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              ← 1
            </button>
            <button
              type="button"
              onClick={() => onNudgePosition?.(field, 0, -1)}
              className="rounded-lg border border-border px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              ↑ 1
            </button>
            <button
              type="button"
              onClick={() => onNudgePosition?.(field, 1, 0)}
              className="rounded-lg border border-border px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              1 →
            </button>
            <button
              type="button"
              onClick={() => onNudgePosition?.(field, -10, 0)}
              className="rounded-lg border border-border px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              ← 10
            </button>
            <button
              type="button"
              onClick={() => onNudgePosition?.(field, 0, 1)}
              className="rounded-lg border border-border px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              ↓ 1
            </button>
            <button
              type="button"
              onClick={() => onNudgePosition?.(field, 10, 0)}
              className="rounded-lg border border-border px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              10 →
            </button>
          </div>

          <button
            type="button"
            onClick={() => onResetPosition?.(field)}
            className="mt-2 w-full rounded-lg border border-border px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            위치 초기화
          </button>
        </div>
      )}

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

      {/* Text Style Toggles */}
      <div>
        <span className="text-[11px] text-muted mb-1 block">텍스트 스타일</span>
        <div className="flex gap-1">
          <button
            onClick={() => updateEffects({ fontWeight: (currentEffects.fontWeight ?? 400) >= 700 ? 400 : 700 })}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold transition-colors ${
              (currentEffects.fontWeight ?? 400) >= 700
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:border-muted hover:text-foreground"
            }`}
            title="굵게"
          >
            B
          </button>
          <button
            onClick={() => updateEffects({ italic: !currentEffects.italic })}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm italic transition-colors ${
              currentEffects.italic
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:border-muted hover:text-foreground"
            }`}
            title="기울임"
          >
            I
          </button>
          <button
            onClick={() => updateEffects({ underline: !currentEffects.underline })}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm underline transition-colors ${
              currentEffects.underline
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:border-muted hover:text-foreground"
            }`}
            title="밑줄"
          >
            U
          </button>
          <button
            onClick={() => updateEffects({ strikethrough: !currentEffects.strikethrough })}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm line-through transition-colors ${
              currentEffects.strikethrough
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:border-muted hover:text-foreground"
            }`}
            title="취소선"
          >
            S
          </button>
          <button
            onClick={() => updateEffects({ uppercase: !currentEffects.uppercase })}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[10px] font-medium transition-colors ${
              currentEffects.uppercase
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:border-muted hover:text-foreground"
            }`}
            title="대문자"
          >
            AA
          </button>
        </div>
      </div>

      {/* Text Opacity */}
      <div>
        <div className={labelRowClass}>
          <span>불투명도</span>
          <span>{currentEffects.opacity ?? 100}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={currentEffects.opacity ?? 100}
          onChange={(e) => updateEffects({ opacity: Number(e.target.value) })}
          className={sliderClass}
        />
      </div>

      {/* Text Shadow */}
      <div>
        <button
          onClick={() => setShowShadow(!showShadow)}
          className="flex w-full items-center justify-between text-[11px] text-muted mb-1"
        >
          <span>그림자</span>
          <span className="text-[10px]">{showShadow ? "▲" : "▼"}</span>
        </button>
        {showShadow && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted w-8">색상</span>
              <input
                type="color"
                value={currentEffects.shadowColor ?? "#000000"}
                onChange={(e) => updateEffects({ shadowColor: e.target.value })}
                className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0.5"
              />
              <span className="text-[10px] text-muted">{currentEffects.shadowColor ?? "#000000"}</span>
            </div>
            <div>
              <div className={labelRowClass}>
                <span>흐림</span>
                <span>{currentEffects.shadowBlur ?? 0}px</span>
              </div>
              <input
                type="range" min={0} max={20} step={1}
                value={currentEffects.shadowBlur ?? 0}
                onChange={(e) => updateEffects({ shadowBlur: Number(e.target.value) })}
                className={sliderClass}
              />
            </div>
            <div>
              <div className={labelRowClass}>
                <span>X 오프셋</span>
                <span>{currentEffects.shadowX ?? 0}px</span>
              </div>
              <input
                type="range" min={-10} max={10} step={1}
                value={currentEffects.shadowX ?? 0}
                onChange={(e) => updateEffects({ shadowX: Number(e.target.value) })}
                className={sliderClass}
              />
            </div>
            <div>
              <div className={labelRowClass}>
                <span>Y 오프셋</span>
                <span>{currentEffects.shadowY ?? 0}px</span>
              </div>
              <input
                type="range" min={-10} max={10} step={1}
                value={currentEffects.shadowY ?? 0}
                onChange={(e) => updateEffects({ shadowY: Number(e.target.value) })}
                className={sliderClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* Text Background */}
      <div>
        <button
          onClick={() => setShowTextBg(!showTextBg)}
          className="flex w-full items-center justify-between text-[11px] text-muted mb-1"
        >
          <span>텍스트 배경</span>
          <span className="text-[10px]">{showTextBg ? "▲" : "▼"}</span>
        </button>
        {showTextBg && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted w-8">색상</span>
              <input
                type="color"
                value={currentEffects.bgColor ?? "#000000"}
                onChange={(e) => updateEffects({ bgColor: e.target.value })}
                className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0.5"
              />
              <button
                onClick={() => updateEffects({ bgColor: undefined, bgPadding: undefined, bgRadius: undefined })}
                className="text-[10px] text-muted hover:text-red-400 ml-auto"
              >
                초기화
              </button>
            </div>
            <div>
              <div className={labelRowClass}>
                <span>패딩</span>
                <span>{currentEffects.bgPadding ?? 0}px</span>
              </div>
              <input
                type="range" min={0} max={20} step={1}
                value={currentEffects.bgPadding ?? 0}
                onChange={(e) => updateEffects({ bgPadding: Number(e.target.value) })}
                className={sliderClass}
              />
            </div>
            <div>
              <div className={labelRowClass}>
                <span>둥글기</span>
                <span>{currentEffects.bgRadius ?? 0}px</span>
              </div>
              <input
                type="range" min={0} max={20} step={1}
                value={currentEffects.bgRadius ?? 0}
                onChange={(e) => updateEffects({ bgRadius: Number(e.target.value) })}
                className={sliderClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* Text Stroke */}
      <div>
        <button
          onClick={() => setShowStroke(!showStroke)}
          className="flex w-full items-center justify-between text-[11px] text-muted mb-1"
        >
          <span>텍스트 윤곽선</span>
          <span className="text-[10px]">{showStroke ? "▲" : "▼"}</span>
        </button>
        {showStroke && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted w-8">색상</span>
              <input
                type="color"
                value={currentEffects.strokeColor ?? "#000000"}
                onChange={(e) => updateEffects({ strokeColor: e.target.value })}
                className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0.5"
              />
              <button
                onClick={() => updateEffects({ strokeColor: undefined, strokeWidth: undefined })}
                className="text-[10px] text-muted hover:text-red-400 ml-auto"
              >
                초기화
              </button>
            </div>
            <div>
              <div className={labelRowClass}>
                <span>두께</span>
                <span>{currentEffects.strokeWidth ?? 0}px</span>
              </div>
              <input
                type="range" min={0} max={5} step={0.5}
                value={currentEffects.strokeWidth ?? 0}
                onChange={(e) => updateEffects({ strokeWidth: Number(e.target.value) })}
                className={sliderClass}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
